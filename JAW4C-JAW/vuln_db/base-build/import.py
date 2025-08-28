#!/usr/bin/env python3
import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Iterable, Tuple, Optional, List

import psycopg2
import psycopg2.extras as extras

# --------------------------
# Config / connection
# --------------------------
PGHOST = os.getenv("PGHOST", "localhost")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGUSER = os.getenv("PGUSER", "postgres")
PGPASSWORD = os.getenv("PGPASSWORD", "")
PGDATABASE = os.getenv("PGDATABASE", "postgres")

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "/app/advisories")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"

# --------------------------
# Helpers
# --------------------------
def parse_iso8601(ts: Optional[str]) -> Optional[datetime]:
    if not ts or ts.strip() == "":
        return None
    # Handle trailing 'Z' (UTC) and ensure fromisoformat compatibility
    s = ts.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        # Fallback: be permissive; if unparsable, return None
        return None

def iter_advisory_rows(root: Path) -> Iterable[Tuple[str, dict, Optional[datetime], Optional[datetime], Path]]:
    for p in root.rglob("*.json"):
        try:
            with p.open("r", encoding="utf-8") as fh:
                doc = json.load(fh)
            ghsa_id = doc.get("id")
            if not ghsa_id:
                print(f"[WARN] Missing 'id' in {p}", file=sys.stderr)
                continue
            published = parse_iso8601(doc.get("published"))
            modified  = parse_iso8601(doc.get("modified"))
            yield (ghsa_id, doc, published, modified, p)
        except json.JSONDecodeError as e:
            print(f"[WARN] Bad JSON in {p}: {e}", file=sys.stderr)
        except Exception as e:
            print(f"[WARN] Skipping {p}: {e}", file=sys.stderr)

def chunked(it, n: int):
    buf: List = []
    for x in it:
        buf.append(x)
        if len(buf) >= n:
            yield buf
            buf = []
    if buf:
        yield buf

# --------------------------
# Main
# --------------------------
def main():
    if not ROOT.exists():
        print(f"[ERROR] Root path not found: {ROOT}", file=sys.stderr)
        sys.exit(1)

    dsn = f"host={PGHOST} port={PGPORT} dbname={PGDATABASE} user={PGUSER}"
    if PGPASSWORD:
        dsn += f" password={PGPASSWORD}"

    print(f"[INFO] Connecting to postgres on {PGHOST}:{PGPORT}/{PGDATABASE} as {PGUSER}")
    conn = psycopg2.connect(dsn)
    conn.autocommit = False

    upsert_sql = """
        INSERT INTO advisories_raw (ghsa_id, doc, published, modified)
        VALUES %s
        ON CONFLICT (ghsa_id) DO UPDATE
        SET doc = EXCLUDED.doc,
            published = EXCLUDED.published,
            modified = EXCLUDED.modified
    """
    # Note: cast JSON via ::jsonb in the template; psycopg2 will send JSON text safely.
    template = "(%s, %s::jsonb, %s, %s)"

    total = 0
    try:
        with conn.cursor() as cur:
            for batch in chunked(iter_advisory_rows(ROOT), BATCH_SIZE):
                rows = []
                for ghsa_id, doc, published, modified, path in batch:
                    rows.append((
                        ghsa_id,
                        json.dumps(doc, separators=(",", ":")),  # compact JSON
                        published,
                        modified,
                    ))
                if not rows:
                    continue

                if DRY_RUN:
                    print(f"[DRY-RUN] Would upsert {len(rows)} rows")
                    continue

                extras.execute_values(cur, upsert_sql, rows, template=template, page_size=BATCH_SIZE)
                total += len(rows)
                print(f"[INFO] Upserted {len(rows)} (cumulative {total})")

            conn.commit()
            print(f"[DONE] Total upserted: {total}")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Transaction rolled back: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
