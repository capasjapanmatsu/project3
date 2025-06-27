/*
# Database Maintenance Functions

1. Cleanup Functions
   - Functions to clean up expired QR codes, trusted devices, 2FA codes, logs, and notifications
   - Each function returns the count of affected rows

2. Database Analysis Functions
   - Functions to get database size information, index usage statistics, and table bloat
   - Functions to analyze, vacuum, and reindex tables
   - Function to refresh all materialized views

3. Performance Monitoring
   - Function to get slow queries
*/

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS cleanup_expired_qr_codes();
DROP FUNCTION IF EXISTS cleanup_expired_trusted_devices();
DROP FUNCTION IF EXISTS cleanup_expired_2fa_codes();
DROP FUNCTION IF EXISTS cleanup_old_error_logs(INTEGER);
DROP FUNCTION IF EXISTS cleanup_old_auth_logs(INTEGER);
DROP FUNCTION IF EXISTS cleanup_old_notifications(INTEGER);
DROP FUNCTION IF EXISTS get_database_size_info();
DROP FUNCTION IF EXISTS get_index_usage_stats();
DROP FUNCTION IF EXISTS get_table_bloat_info();
DROP FUNCTION IF EXISTS get_slow_queries(INTEGER);
DROP FUNCTION IF EXISTS analyze_all_tables();
DROP FUNCTION IF EXISTS vacuum_all_tables(BOOLEAN);
DROP FUNCTION IF EXISTS reindex_all_tables();
DROP FUNCTION IF EXISTS refresh_all_materialized_views();

-- Add function to clean up expired QR codes
CREATE OR REPLACE FUNCTION cleanup_expired_qr_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Update expired QR codes
  UPDATE entrance_qr_codes
  SET status = 'expired'
  WHERE 
    status = 'active'
    AND valid_until < NOW();
    
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Update expired temporary QR codes
  UPDATE entrance_qr_codes_temp
  SET status = 'expired'
  WHERE 
    status = 'active'
    AND expires_at < NOW();
    
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Update expired QR shares
  UPDATE qr_shares
  SET status = 'expired'
  WHERE 
    status = 'active'
    AND expires_at < NOW();
    
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up expired trusted devices
CREATE OR REPLACE FUNCTION cleanup_expired_trusted_devices()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM trusted_devices
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up expired 2FA codes
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM two_factor_codes
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up old auth logs
CREATE OR REPLACE FUNCTION cleanup_old_auth_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE 
    created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND read = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to get database size information
CREATE OR REPLACE FUNCTION get_database_size_info()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  total_size_bytes BIGINT,
  total_size_pretty TEXT,
  index_size_bytes BIGINT,
  index_size_pretty TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT AS table_name,
    c.reltuples::BIGINT AS row_count,
    pg_total_relation_size(quote_ident(t.tablename))::BIGINT AS total_size_bytes,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename))) AS total_size_pretty,
    pg_indexes_size(quote_ident(t.tablename))::BIGINT AS index_size_bytes,
    pg_size_pretty(pg_indexes_size(quote_ident(t.tablename))) AS index_size_pretty
  FROM
    pg_tables t
    JOIN pg_class c ON t.tablename = c.relname
  WHERE
    t.schemaname = 'public'
  ORDER BY
    total_size_bytes DESC;
END;
$$ LANGUAGE plpgsql;

-- Add function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size_pretty TEXT,
  index_scans BIGINT,
  rows_fetched BIGINT,
  rows_inserted BIGINT,
  rows_updated BIGINT,
  rows_deleted BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.relname::TEXT AS table_name,
    i.indexrelname::TEXT AS index_name,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size_pretty,
    s.idx_scan AS index_scans,
    s.idx_tup_fetch AS rows_fetched,
    s.idx_tup_insert AS rows_inserted,
    s.idx_tup_update AS rows_updated,
    s.idx_tup_delete AS rows_deleted
  FROM
    pg_stat_user_indexes s
    JOIN pg_index x ON s.indexrelid = x.indexrelid
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
  WHERE
    t.relkind = 'r'
  ORDER BY
    s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Add function to get table bloat information
CREATE OR REPLACE FUNCTION get_table_bloat_info()
RETURNS TABLE (
  table_name TEXT,
  table_size_pretty TEXT,
  bloat_size_pretty TEXT,
  bloat_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH constants AS (
    SELECT current_setting('block_size')::NUMERIC AS bs
  ),
  table_stats AS (
    SELECT
      c.oid,
      c.relname,
      c.relpages,
      c.reltuples,
      c.relnatts,
      c.relkind,
      n.nspname,
      pc.proname AS toast_proc,
      pc.pronamespace AS toast_proc_ns
    FROM
      pg_class c
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_proc pc ON pc.oid = c.reltoastproc
    WHERE
      c.relkind = 'r'
      AND n.nspname = 'public'
  ),
  table_bloat AS (
    SELECT
      s.oid,
      s.relname AS table_name,
      s.reltuples,
      s.relpages,
      CEIL((cc.reltuples * (CASE WHEN att.attlen > 0 THEN att.attlen ELSE COALESCE(stats.stawidth, 1024) END)::NUMERIC) / (constants.bs - CASE WHEN att.attalign = 'i'::CHAR THEN 3 ELSE 1 END)::NUMERIC + 1) * (constants.bs)::NUMERIC AS expected_bytes,
      CASE WHEN cc.relpages > 0 THEN cc.relpages::BIGINT * constants.bs ELSE 0 END AS actual_bytes
    FROM
      table_stats s
      JOIN constants ON true
      JOIN pg_attribute att ON att.attrelid = s.oid AND att.attnum > 0
      JOIN pg_stats stats ON stats.schemaname = s.nspname AND stats.tablename = s.relname AND stats.attname = att.attname
      JOIN pg_class cc ON cc.oid = s.oid
    GROUP BY
      s.oid, s.relname, s.reltuples, s.relpages, constants.bs, cc.relpages, cc.reltuples
  )
  SELECT
    b.table_name::TEXT,
    pg_size_pretty(b.actual_bytes) AS table_size_pretty,
    pg_size_pretty(GREATEST(0, b.actual_bytes - b.expected_bytes)) AS bloat_size_pretty,
    CASE
      WHEN b.actual_bytes > 0 THEN ROUND(100 * GREATEST(0, b.actual_bytes - b.expected_bytes) / b.actual_bytes)
      ELSE 0
    END AS bloat_percentage
  FROM
    table_bloat b
  ORDER BY
    bloat_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- Add function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(min_execution_time_ms INTEGER DEFAULT 1000)
RETURNS TABLE (
  query_id TEXT,
  database_name TEXT,
  username TEXT,
  query TEXT,
  calls BIGINT,
  total_exec_time DOUBLE PRECISION,
  min_exec_time DOUBLE PRECISION,
  max_exec_time DOUBLE PRECISION,
  mean_exec_time DOUBLE PRECISION,
  rows_returned BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.queryid::TEXT,
    d.datname::TEXT AS database_name,
    u.usename::TEXT AS username,
    s.query::TEXT,
    s.calls,
    s.total_exec_time,
    s.min_exec_time,
    s.max_exec_time,
    s.mean_exec_time,
    s.rows
  FROM
    pg_stat_statements s
    JOIN pg_database d ON s.dbid = d.oid
    JOIN pg_user u ON s.userid = u.usesysid
  WHERE
    s.mean_exec_time > min_execution_time_ms
  ORDER BY
    s.mean_exec_time DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Add function to analyze all tables
CREATE OR REPLACE FUNCTION analyze_all_tables()
RETURNS VOID AS $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ANALYZE ' || quote_ident(tbl);
    RAISE NOTICE 'Analyzed table: %', tbl;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add function to vacuum all tables
CREATE OR REPLACE FUNCTION vacuum_all_tables(analyze_only BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    IF analyze_only THEN
      EXECUTE 'VACUUM ANALYZE ' || quote_ident(tbl);
      RAISE NOTICE 'Vacuumed and analyzed table: %', tbl;
    ELSE
      EXECUTE 'VACUUM FULL ANALYZE ' || quote_ident(tbl);
      RAISE NOTICE 'Vacuumed full and analyzed table: %', tbl;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add function to reindex all tables
CREATE OR REPLACE FUNCTION reindex_all_tables()
RETURNS VOID AS $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'REINDEX TABLE ' || quote_ident(tbl);
    RAISE NOTICE 'Reindexed table: %', tbl;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
DECLARE
  mv TEXT;
BEGIN
  FOR mv IN 
    SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
  LOOP
    EXECUTE 'REFRESH MATERIALIZED VIEW ' || quote_ident(mv);
    RAISE NOTICE 'Refreshed materialized view: %', mv;
  END LOOP;
END;
$$ LANGUAGE plpgsql;