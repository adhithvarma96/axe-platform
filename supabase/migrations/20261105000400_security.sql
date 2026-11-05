-- Axe Realty OS: grants, row-level security and generic triggers.
-- Deny by default: RLS is on for every table, the website's anonymous role
-- gets nothing, and every policy asks app.can(table, action), which reads
-- role_permissions (seeded in 0600).

-- ---------------------------------------------------------------------------
-- Grants. Table privileges only open the door; RLS decides row by row.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- The audit log is written only by the trigger (security definer).
revoke insert, update, delete on public.audit_log from authenticated;

grant usage on schema app to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;
revoke usage on schema app from anon;

-- ---------------------------------------------------------------------------
-- RLS policies, generated for every table from role_permissions.
-- Rows that are soft-deleted are visible only to roles that may delete.
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
  has_deleted boolean;
  sel text;
begin
  for t in
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.name);

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.name and column_name = 'deleted_at'
    ) into has_deleted;

    sel := format('app.can(%L, %L)', t.name, 'select');
    if has_deleted then
      sel := sel || format(' and (deleted_at is null or app.can(%L, %L))', t.name, 'delete');
    end if;

    execute format('create policy p_select on public.%I for select to authenticated using (%s)', t.name, sel);
    execute format('create policy p_insert on public.%I for insert to authenticated with check (app.can(%L, %L))', t.name, t.name, 'insert');
    execute format('create policy p_update on public.%I for update to authenticated using (app.can(%L, %L)) with check (app.can(%L, %L))',
                   t.name, t.name, 'update', t.name, 'update');
    execute format('create policy p_delete on public.%I for delete to authenticated using (app.can(%L, %L))', t.name, t.name, 'delete');
  end loop;
end $$;

-- Extra, narrower policies (policies of the same command are OR-ed).

-- Everyone sees and can mark read their own notifications.
create policy p_select_own on public.notifications for select to authenticated
  using (recipient_agent_id = app.my_agent_id() and deleted_at is null);
create policy p_update_own on public.notifications for update to authenticated
  using (recipient_agent_id = app.my_agent_id())
  with check (recipient_agent_id = app.my_agent_id());

-- Agents see their own targets ("My week vs target").
create policy p_select_own on public.agent_targets for select to authenticated
  using (agent_id = app.my_agent_id() and deleted_at is null);

-- Everyone sees their own agent record, even a role that cannot list the team.
create policy p_select_own on public.agents for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Generic triggers on every table:
--   t10_stamp        created/updated by + at
--   t20_soft_delete  only roles with delete permission may delete/restore
--   z90_audit        before/after into audit_log
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
  cols text[];
begin
  for t in
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'audit_log'
  loop
    select array_agg(column_name::text) into cols
    from information_schema.columns
    where table_schema = 'public' and table_name = t.name;

    if cols @> array['created_at', 'created_by', 'updated_at', 'updated_by'] then
      execute format('create trigger t10_stamp before insert or update on public.%I for each row execute function app.stamp()', t.name);
    end if;
    if cols @> array['deleted_at'] then
      execute format('create trigger t20_soft_delete before insert or update on public.%I for each row execute function app.guard_soft_delete()', t.name);
    end if;
    execute format('create trigger z90_audit after insert or update or delete on public.%I for each row execute function app.audit()', t.name);
  end loop;
end $$;
