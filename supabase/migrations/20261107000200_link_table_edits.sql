-- Editing a record's tags (features, preferred areas, source agents ...) replaces
-- rows in link tables. Those rows are not records, so roles that may edit the
-- parent may also remove its links. Every change is still in the audit log.
update public.role_permissions
set can_delete = true
where role in ('agent', 'sales_manager', 'data_entry')
  and can_update = true
  and resource in (
    'property_feature_links', 'property_source_external_agents',
    'owner_source_external_agents', 'owner_buying_locations',
    'development_facilities', 'external_agent_locations',
    'lead_preferred_locations', 'lead_preferred_developments', 'lead_features_wanted'
  );
