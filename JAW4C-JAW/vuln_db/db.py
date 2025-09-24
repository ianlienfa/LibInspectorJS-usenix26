# db.py
import os
import psycopg2
import psycopg2.extras
import json

class PostgresDB:
    """
    Minimal PostgreSQL wrapper.
    - connect(): open a connection
    - query(sql, params=None, fetch='all'|'one'|'none'): run SQL safely with parameters
    - close(): close the connection
    """
    def __init__(self,
                 host=None,
                 port=None,
                 dbname=None,
                 user=None,
                 password=None,
                 sslmode=None):
        self.host = host or os.getenv("PGHOST", "localhost")
        self.port = port or int(os.getenv("PGPORT", "5431"))
        self.dbname = dbname or os.getenv("PGDATABASE", "vulndb")
        self.user = user or os.getenv("PGUSER", "vulndb")
        self.password = password or os.getenv("PGPASSWORD", "vulndb_pwd")
        self.sslmode = sslmode or os.getenv("PGSSLMODE")  # e.g., 'require'
        self._conn = None

    def connect(self):
        if self._conn is not None:
            return self._conn
        dsn_parts = [
            f"host={self.host}",
            f"port={self.port}",
            f"dbname={self.dbname}",
            f"user={self.user}",
        ]
        if self.password:
            dsn_parts.append(f"password={self.password}")
        if self.sslmode:
            dsn_parts.append(f"sslmode={self.sslmode}")

        dsn = " ".join(dsn_parts)
        self._conn = psycopg2.connect(dsn, cursor_factory=psycopg2.extras.DictCursor)
        self._conn.autocommit = True  # toggle off if you want manual transactions
        return self._conn

    def query(self, sql, params=None, fetch="all"):
        """
        Run a parameterized query.
        - params: tuple/list/dict for %s placeholders (psycopg2-style)
        - fetch='all' | 'one' | 'none'
        Returns:
          - list[DictRow] for 'all'
          - DictRow or None for 'one'
          - None for 'none'
        """
        if self._conn is None:
            self.connect()

        with self._conn.cursor() as cur:
            cur.execute(sql, params)
            if fetch == "all":
                return cur.fetchall()
            elif fetch == "one":
                return cur.fetchone()
            elif fetch == "none":
                return None
            else:
                raise ValueError("fetch must be 'all', 'one', or 'none'")

    def close(self):
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    ## Deprecated
    # def package_vuln_search(self, package_name, version=None):
    #     all = self.query(
    #         "SELECT * FROM public.vulns WHERE package_name = %s LIMIT 1;",
    #         params=(package_name,),
    #         fetch="all"
    #     )
    #     res = [dict(i) for i in all]
    #     print("package_vuln_search on ", package_name, "res: ", res, all)  
    #     return res if all else None

    """
    version can be a list of versions ["3.1", "3.1 ~ 3.4"]
    return: None if nothing found, else an list of vulnerability objects
    [{}, ... , {'poc': 'LIBOBJ(WILDCARD).html(PAYLOAD)', 'gadget': 'false', 'payload': "<option><style></style><script>alert('XSS')</script></option>", 'exported': 'true', 'sink_type': 'javascript', 'payload_type': 'string', 'additional_info': {}, 'confidence_score': '0.8', 'vulnerability_type': 'xss'}, {'poc': 'LIBOBJ(WILDCARD).html(PAYLOAD)', 'gadget': 'false', 'payload': "<options>alert('XSS')</options>", 'exported': 'true', 'sink_type': 'javascript', 'payload_type': 'string', 'additional_info': {}, 'confidence_score': '0.8', 'vulnerability_type': 'xss'}, {'poc': 'LIBOBJ(WILDCARD).html(PAYLOAD)', 'gadget': False, 'payload': '<img src=x onerror=alert(1)>', 'exported': True, 'sink_type': 'javascript', 'payload_type': 'string', 'additional_info': {}, 'confidence_score': 0.8, 'vulnerability_type': 'xss'}]
    """
    def package_vuln_search(self, package_name: str, version: list | None = None):
        if version and (not isinstance(version, list)):        
            raise RuntimeError("Error during package_vuln_search, wrong version input, should be list", version)                
        res = []
        if version:            
            for v in version:
                try:
                    st_end = list(map(str.strip, v.split('~')))
                except Exception as e:
                    raise RuntimeError("Error during package_vuln_search, wrong version input, improper format in version", v)                
                if len(st_end) == 1:
                    st, end = st_end[0], st_end[0]
                elif len(st_end) == 2:
                    st, end = st_end[0], st_end[1]
                else:
                    raise RuntimeError("Error during package_vuln_search, wrong version input, improper format in version", v)
                query_str = """
                WITH input AS (
                SELECT %s::text AS name, %s::text AS version_st, %s::text AS version_end
                )
                SELECT v.doc #>> '{database_specific,exploit,data}' AS exploit_data
                FROM public.advisories_exploits v
                JOIN input i ON TRUE
                WHERE EXISTS (
                SELECT 1
                FROM jsonb_array_elements(v.doc #> '{affected}') aff
                WHERE aff #>> '{package,ecosystem}' = 'npm'
                    AND aff #>> '{package,name}' = i.name
                    AND EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(aff #> '{ranges}') rng,
                        LATERAL jsonb_array_elements(rng #> '{events}') ev_intro,
                        LATERAL jsonb_array_elements(rng #> '{events}') ev_fix
                    WHERE ev_intro ? 'introduced'
                        AND ev_fix ? 'fixed'
                        AND i.version_st >= ev_intro->>'introduced'
                        AND i.version_end <  ev_fix->>'fixed'
                    )
                );
                """            
                all = self.query(
                    query_str,
                    params=(package_name, st, end),
                    fetch="all"
                )
                try:
                    if all:
                        all = [ json.loads(i[0])[0] for i in all ]
                        res += all                      
                except Exception as e:
                    breakpoint()
                    raise RuntimeError('error parsing database output', all)
        else:
            query_str = """
                WITH input AS (
                SELECT %s::text AS name
                )
                SELECT v.doc #>> '{database_specific,exploit,data}' AS exploit_data
                FROM public.advisories_exploits v
                JOIN input i ON TRUE
                WHERE EXISTS (
                SELECT 1
                FROM jsonb_array_elements(v.doc #> '{affected}') aff
                WHERE aff #>> '{package,ecosystem}' = 'npm'
                    AND aff #>> '{package,name}' = i.name
                );
            """
            all = self.query(
                query_str,
                params=(package_name,),
                fetch="all"
            )
            try:
                if all:
                    res = dict(all)[0]['exploit_data']
            except Exception as e:
                raise RuntimeError('error parsing database output', all)
        print("package_vuln_search on ", package_name, "res: ", res)  
        return res if res else None


# ----- Example usage -----
if __name__ == "__main__":
    db = PostgresDB(
        # # or set PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD env vars
        # host="localhost",
        # port=5431,
        # dbname="vulndb",
        # user="vulndb",
        # password="vulndb_pwd",
    )

    try:
        # 1) SELECT * FROM public.vulns LIMIT 5;
        rows = db.query("SELECT * FROM public.vulns LIMIT 5;", fetch="all")
        for r in rows:
            print(dict(r))  # DictRow -> dict for easy printing

        # 2) List column names for 'public.vulns'
        cols = db.query("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position;
        """, params=("public", "vulns"), fetch="all")
        print("Columns:", [c["column_name"] for c in cols])

        # 3) Parameterized example (safe)
        one = db.query(
            "SELECT * FROM public.vulns WHERE cve = %s LIMIT 1;",
            params=("CVE-2024-1234",),
            fetch="one"
        )
        print("One row:", dict(one) if one else None)

    finally:
        db.close()
