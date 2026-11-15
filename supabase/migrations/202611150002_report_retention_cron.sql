-- Apply as the Supabase database owner after 202611150001_report_retention.sql.
-- Failure must be visible: do not silently skip scheduling when pg_cron is unavailable.
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('music-town-report-retention','17 * * * *',
  'select private.purge_town_reports()');
commit;
