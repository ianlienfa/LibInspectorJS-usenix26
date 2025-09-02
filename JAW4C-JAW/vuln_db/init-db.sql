\connect vulndb

-- Install the pg-semver extension
CREATE EXTENSION IF NOT EXISTS semver;

-- Create custom range types if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'semver_range') THEN
    CREATE TYPE semver_range AS RANGE (
      subtype = semver,
      multirange_type_name = semver_multirange
    );
  END IF;
END$$;

-- Create SourceDB enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sourcedb') THEN
    CREATE TYPE sourcedb AS ENUM (
      'cdnjs', 'snyk', 'opencve', 'cveorg', 'other'
    );
  END IF;
END$$;

-- Create VulnType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vulntype') THEN
    CREATE TYPE vulntype AS ENUM (
      'ace', 'aci', 'prototype pollution', 'xss', 'xssi', 'dos',
      'redos', 'improper sanitization', 'csp bypass', 'template injection',
      'dom clobbering', 'ssrf', 'csrf', 'other'
    );
  END IF;
END$$;

-- Create SinkType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sinktype') THEN
    CREATE TYPE sinktype AS ENUM (
      'function call', 'file load', 'html element', 'assignment'
    );
  END IF;
END$$;

-- Setup main table
CREATE TABLE IF NOT EXISTS vulns (
    cve TEXT PRIMARY KEY,
    package_name TEXT,
    versions semver_multirange,
    url TEXT,
    source_db sourcedb,
    source_url TEXT,
    vuln_type vulntype,
    cwe TEXT,
    sink_type sinktype,
    gadget BOOLEAN,
    poc TEXT,
    payload TEXT,
    keywords TEXT,
    validated BOOLEAN
);

CREATE TABLE advisories_raw (
  ghsa_id text PRIMARY KEY,
  doc jsonb NOT NULL,
  published timestamptz,
  modified  timestamptz
);

-- Load table data
COPY vulns FROM '/app/data.csv' DELIMITER ',' CSV HEADER;
COPY advisories_raw FROM '/app/advisories.csv' DELIMITER ',' CSV HEADER;

-- postgrest api related setups
CREATE ROLE web_anon nologin
grant usage on schema public to web_anon;
grant select on public.advisories_raw to web_anon;
grant select on public.vulns to web_anon;


