-- Axe Realty OS: reference data every environment needs.
-- Business records (agents, properties, leads ...) come from the Airtable migration.

select set_config('app.change_source', 'migration', true);

-- ---------------------------------------------------------------------------
-- Role permissions (5.1). Change these rows to change who can do what.
-- ---------------------------------------------------------------------------
do $$
declare
  inventory text[] := array[
    'properties', 'property_photos', 'property_feature_links', 'property_source_external_agents',
    'owners', 'owner_source_external_agents', 'owner_buying_locations',
    'developments', 'development_towers', 'development_facilities', 'locations'];
  crm text[] := array[
    'leads', 'lead_preferred_locations', 'lead_preferred_developments', 'lead_features_wanted',
    'lead_gate_ticks', 'viewings', 'external_agents', 'external_agent_locations',
    'referral_partners', 'marketing_leads', 'activities', 'tasks', 'match_results'];
  crm_readonly text[] := array['lead_stage_history', 'gate_breach_attempts', 'price_history'];
  lookups text[] := array[
    'source_channels', 'owner_sources', 'referrer_categories', 'property_features', 'facilities',
    'provinces', 'lost_reasons', 'countries', 'marketing_sources', 'gate_items', 'settings', 'fx_rates'];
  lead_intake text[] := array[
    'leads', 'lead_preferred_locations', 'lead_preferred_developments', 'lead_features_wanted'];
  money text[] := array[
    'closings', 'commission_schedules', 'commission_schedule_rates', 'commission_receipts',
    'commission_payouts', 'company_targets', 'agent_targets'];
  t text;
begin
  -- Super Admin: everything (the audit log is read-only for everyone)
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    insert into public.role_permissions values ('super_admin', t, true, t <> 'audit_log', t <> 'audit_log', t <> 'audit_log');
  end loop;

  -- Agent: full operational access, no deletes, no money, no HR, no settings
  foreach t in array inventory || crm loop
    insert into public.role_permissions values ('agent', t, true, true, true, false);
  end loop;
  foreach t in array crm_readonly || lookups || array['agents'] loop
    insert into public.role_permissions values ('agent', t, true, false, false, false);
  end loop;

  -- Sales Manager (future): agent rights + read-only closings, commissions and targets
  foreach t in array inventory || crm loop
    insert into public.role_permissions values ('sales_manager', t, true, true, true, false);
  end loop;
  foreach t in array crm_readonly || lookups || money || array['agents'] loop
    insert into public.role_permissions values ('sales_manager', t, true, false, false, false);
  end loop;

  -- Data Entry: properties, owners, developments, locations, photos; can view and add
  -- leads but not edit them (no pipeline moves); no viewings, no closings
  foreach t in array inventory loop
    insert into public.role_permissions values ('data_entry', t, true, true, true, false);
  end loop;
  foreach t in array lead_intake loop
    insert into public.role_permissions values ('data_entry', t, true, true, false, false);
  end loop;
  insert into public.role_permissions values ('data_entry', 'lead_stage_history', true, false, false, false);
  foreach t in array lookups || array['agents', 'external_agents', 'referral_partners', 'price_history'] loop
    insert into public.role_permissions values ('data_entry', t, true, false, false, false);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Lookup lists (Appendix A)
-- ---------------------------------------------------------------------------
insert into public.source_channels (name, applies_to_leads, applies_to_properties, sort_order) values
  ('FB Ads – Direct WA', true, true, 10),
  ('FB Ads – Lead Form', true, true, 20),
  ('Referral', true, true, 30),
  ('Walk-in', true, true, 40),
  ('Website', true, true, 50),
  ('Website – Contact Us', true, false, 60),
  ('Google', true, true, 70),
  ('LPW (Lanka Property Web)', true, false, 80),
  ('Ikman.lk', true, false, 90),
  ('Facebook Marketplace', true, false, 100),
  ('Instagram', true, true, 110),
  ('BNI', true, true, 120),
  ('Networking Events', true, true, 130),
  ('Friends & Family', true, true, 140),
  ('YouTube', true, true, 150),
  ('Colombo Apartment Report', true, true, 160),
  ('Via External Agent', true, true, 170),
  ('Cold Call', false, true, 180);

insert into public.owner_sources (name, sort_order) values
  ('Website', 10), ('Referral', 20), ('Friends & Family', 30), ('Instagram', 40), ('Facebook', 50),
  ('LinkedIn', 60), ('TikTok', 70), ('LankaPropertyWeb', 80), ('ikman', 90),
  ('Cold Outreach / Prospected', 100), ('Other', 110), ('BNI', 120), ('Networking Events', 130);

insert into public.referrer_categories (name, sort_order) values
  ('Individual', 10), ('Past Client', 20), ('Corporate – HR/Relocation', 30),
  ('Corporate – Other', 40), ('Security Staff', 50), ('Reception Staff', 60);

insert into public.property_features (name, slug, sort_order) values
  ('Penthouse', 'penthouse', 10), ('Duplex', 'duplex', 20),
  ('Pet Friendly', 'pet-friendly', 30), ('Sea View', 'sea-view', 40);

insert into public.provinces (name, sort_order) values ('Western', 10), ('Southern', 20), ('Central', 30);

insert into public.marketing_sources (name, sort_order) values
  ('Report – Landing Page', 10), ('Newsletter Signup', 20), ('Ad Lead Form', 30);

insert into public.lost_reasons (name, sort_order) values
  ('Chose another property', 10), ('Went with another agent', 20), ('Budget mismatch', 30),
  ('Plans changed', 40), ('Unresponsive', 50), ('Owner withdrew', 60), ('Other', 70);

-- ---------------------------------------------------------------------------
-- Pipeline gates (7.8). Data-driven: add a row to add a requirement.
-- ---------------------------------------------------------------------------
insert into public.gate_items (key, gate, required_for, label, sort_order) values
  ('gate1_offer_sent',              1, 'ongoing_negotiations', 'Offer sent using the Axe Realty offer template', 10),
  ('gate2_price_agreed',            2, 'deposit_paid',         'Price agreed', 20),
  ('gate2_payment_terms_agreed',    2, 'deposit_paid',         'Payment terms agreed', 30),
  ('gate2_flagged_items_addressed', 2, 'deposit_paid',         'All extra / flagged items addressed', 40),
  ('gate2_execution_date_agreed',   2, 'deposit_paid',         'Execution date agreed', 50),
  ('gate3_draft_agreement_shared',  3, 'documentation_ready',  'Draft agreement shared with buyer/tenant', 60),
  ('gate3_agreed_to_proceed',       3, 'documentation_ready',  'Buyer/tenant agreed to proceed', 70);

-- ---------------------------------------------------------------------------
-- Commission schedules (7.9): Schedule A v1.0 from 1 Sep 2026, legacy before.
-- ---------------------------------------------------------------------------
insert into public.commission_schedules (version, name, effective_from, effective_to, referrer_rate_pct, notes) values
  ('legacy', 'Solo-operator era', '2020-01-01', '2026-08-31', 0,
   'Before the two-sided model. Adhith was the only producer; 100% of commission is Axe''s.'),
  ('1.0', 'Schedule A, Version 1.0', '2026-09-01', null, 15,
   'Signed Schedule A. Forward-only: amend by adding a new version with a future effective date.');

insert into public.commission_schedule_rates (schedule_id, sourcing_model, tenure, agent_rate, referrer_rate, axe_rate)
select s.id, r.model::public.sourcing_model, r.tenure::public.agent_tenure, r.agent, r.referrer, r.axe
from public.commission_schedules s
cross join (values
  ('company_direct',       'confirmed', 17.5,  0, 32.5),
  ('company_via_referrer', 'confirmed', 17.5, 15, 17.5),
  ('agent_self_sourced',   'confirmed', 25,    0, 25),
  ('agent_via_referrer',   'confirmed', 20,   15, 15),
  ('company_direct',       'probation', 15,    0, 35),
  ('company_via_referrer', 'probation', 15,   15, 20),
  ('agent_self_sourced',   'probation', 25,    0, 25),
  ('agent_via_referrer',   'probation', 20,   15, 15)
) as r(model, tenure, agent, referrer, axe)
where s.version = '1.0';

insert into public.commission_schedule_rates (schedule_id, sourcing_model, tenure, agent_rate, referrer_rate, axe_rate)
select s.id, m.model, t.tenure, 0, 0, 50
from public.commission_schedules s
cross join unnest(enum_range(null::public.sourcing_model)) as m(model)
cross join unnest(enum_range(null::public.agent_tenure)) as t(tenure)
where s.version = 'legacy';

-- ---------------------------------------------------------------------------
-- Company revenue target (6.12): LKR 10M per month, set 5 Nov 2026.
-- ---------------------------------------------------------------------------
insert into public.company_targets (metric, period, target_value, effective_from, notes)
values ('revenue_lkr', 'month', 10000000, '2026-11-01', 'Set by Adhith on 2026-11-05.');

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
insert into public.settings (key, value, description) values
  ('edit_window_hours', '24', 'Hours an agent may edit a record they created (5.2).'),
  ('restricted_fields', '{"properties": ["status", "asking_rent", "rent_currency", "asking_sale_price", "sale_currency", "listing_agent_id", "sourcing_model", "owner_id"], "owners": ["primary_phone", "whatsapp", "email"], "leads": ["assigned_agent_id", "sourcing_model"]}',
   'Fields that need Super Admin after the edit window (5.2).'),
  ('alert_watched_fields', '{"owners": ["primary_phone", "email"], "properties": ["asking_rent", "asking_sale_price", "status"]}',
   'Changes that email the Super Admin with old -> new values (7.5).'),
  ('alert_recipients', '[]', 'Work emails that receive change alerts and gate breaches. Empty = all Super Admins.'),
  ('whatsapp_footer', '"listing_agent"', 'Footer on WhatsApp write-ups: listing_agent or company.'),
  ('ai_model', '"claude-sonnet-5-5"', 'Model used for matching and summaries.'),
  ('revenue_definition', '"total commission - external co-broke - external referral fees"', 'What counts towards the revenue target.');

-- ISO 3166-1 countries (nationality list)
insert into public.countries (code, name) values
  ('AD', 'Andorra'),
  ('AE', 'United Arab Emirates'),
  ('AF', 'Afghanistan'),
  ('AG', 'Antigua & Barbuda'),
  ('AI', 'Anguilla'),
  ('AL', 'Albania'),
  ('AM', 'Armenia'),
  ('AO', 'Angola'),
  ('AQ', 'Antarctica'),
  ('AR', 'Argentina'),
  ('AS', 'American Samoa'),
  ('AT', 'Austria'),
  ('AU', 'Australia'),
  ('AW', 'Aruba'),
  ('AX', 'Åland Islands'),
  ('AZ', 'Azerbaijan'),
  ('BA', 'Bosnia & Herzegovina'),
  ('BB', 'Barbados'),
  ('BD', 'Bangladesh'),
  ('BE', 'Belgium'),
  ('BF', 'Burkina Faso'),
  ('BG', 'Bulgaria'),
  ('BH', 'Bahrain'),
  ('BI', 'Burundi'),
  ('BJ', 'Benin'),
  ('BL', 'St. Barthélemy'),
  ('BM', 'Bermuda'),
  ('BN', 'Brunei'),
  ('BO', 'Bolivia'),
  ('BQ', 'Caribbean Netherlands'),
  ('BR', 'Brazil'),
  ('BS', 'Bahamas'),
  ('BT', 'Bhutan'),
  ('BV', 'Bouvet Island'),
  ('BW', 'Botswana'),
  ('BY', 'Belarus'),
  ('BZ', 'Belize'),
  ('CA', 'Canada'),
  ('CC', 'Cocos (Keeling) Islands'),
  ('CD', 'Congo - Kinshasa'),
  ('CF', 'Central African Republic'),
  ('CG', 'Congo - Brazzaville'),
  ('CH', 'Switzerland'),
  ('CI', 'Côte d’Ivoire'),
  ('CK', 'Cook Islands'),
  ('CL', 'Chile'),
  ('CM', 'Cameroon'),
  ('CN', 'China'),
  ('CO', 'Colombia'),
  ('CR', 'Costa Rica'),
  ('CU', 'Cuba'),
  ('CV', 'Cape Verde'),
  ('CW', 'Curaçao'),
  ('CX', 'Christmas Island'),
  ('CY', 'Cyprus'),
  ('CZ', 'Czechia'),
  ('DE', 'Germany'),
  ('DJ', 'Djibouti'),
  ('DK', 'Denmark'),
  ('DM', 'Dominica'),
  ('DO', 'Dominican Republic'),
  ('DZ', 'Algeria'),
  ('EC', 'Ecuador'),
  ('EE', 'Estonia'),
  ('EG', 'Egypt'),
  ('EH', 'Western Sahara'),
  ('ER', 'Eritrea'),
  ('ES', 'Spain'),
  ('ET', 'Ethiopia'),
  ('FI', 'Finland'),
  ('FJ', 'Fiji'),
  ('FK', 'Falkland Islands'),
  ('FM', 'Micronesia'),
  ('FO', 'Faroe Islands'),
  ('FR', 'France'),
  ('GA', 'Gabon'),
  ('GB', 'United Kingdom'),
  ('GD', 'Grenada'),
  ('GE', 'Georgia'),
  ('GF', 'French Guiana'),
  ('GG', 'Guernsey'),
  ('GH', 'Ghana'),
  ('GI', 'Gibraltar'),
  ('GL', 'Greenland'),
  ('GM', 'Gambia'),
  ('GN', 'Guinea'),
  ('GP', 'Guadeloupe'),
  ('GQ', 'Equatorial Guinea'),
  ('GR', 'Greece'),
  ('GS', 'South Georgia & South Sandwich Islands'),
  ('GT', 'Guatemala'),
  ('GU', 'Guam'),
  ('GW', 'Guinea-Bissau'),
  ('GY', 'Guyana'),
  ('HK', 'Hong Kong SAR China'),
  ('HM', 'Heard & McDonald Islands'),
  ('HN', 'Honduras'),
  ('HR', 'Croatia'),
  ('HT', 'Haiti'),
  ('HU', 'Hungary'),
  ('ID', 'Indonesia'),
  ('IE', 'Ireland'),
  ('IL', 'Israel'),
  ('IM', 'Isle of Man'),
  ('IN', 'India'),
  ('IO', 'British Indian Ocean Territory'),
  ('IQ', 'Iraq'),
  ('IR', 'Iran'),
  ('IS', 'Iceland'),
  ('IT', 'Italy'),
  ('JE', 'Jersey'),
  ('JM', 'Jamaica'),
  ('JO', 'Jordan'),
  ('JP', 'Japan'),
  ('KE', 'Kenya'),
  ('KG', 'Kyrgyzstan'),
  ('KH', 'Cambodia'),
  ('KI', 'Kiribati'),
  ('KM', 'Comoros'),
  ('KN', 'St. Kitts & Nevis'),
  ('KP', 'North Korea'),
  ('KR', 'South Korea'),
  ('KW', 'Kuwait'),
  ('KY', 'Cayman Islands'),
  ('KZ', 'Kazakhstan'),
  ('LA', 'Laos'),
  ('LB', 'Lebanon'),
  ('LC', 'St. Lucia'),
  ('LI', 'Liechtenstein'),
  ('LK', 'Sri Lanka'),
  ('LR', 'Liberia'),
  ('LS', 'Lesotho'),
  ('LT', 'Lithuania'),
  ('LU', 'Luxembourg'),
  ('LV', 'Latvia'),
  ('LY', 'Libya'),
  ('MA', 'Morocco'),
  ('MC', 'Monaco'),
  ('MD', 'Moldova'),
  ('ME', 'Montenegro'),
  ('MF', 'St. Martin'),
  ('MG', 'Madagascar'),
  ('MH', 'Marshall Islands'),
  ('MK', 'North Macedonia'),
  ('ML', 'Mali'),
  ('MM', 'Myanmar (Burma)'),
  ('MN', 'Mongolia'),
  ('MO', 'Macao SAR China'),
  ('MP', 'Northern Mariana Islands'),
  ('MQ', 'Martinique'),
  ('MR', 'Mauritania'),
  ('MS', 'Montserrat'),
  ('MT', 'Malta'),
  ('MU', 'Mauritius'),
  ('MV', 'Maldives'),
  ('MW', 'Malawi'),
  ('MX', 'Mexico'),
  ('MY', 'Malaysia'),
  ('MZ', 'Mozambique'),
  ('NA', 'Namibia'),
  ('NC', 'New Caledonia'),
  ('NE', 'Niger'),
  ('NF', 'Norfolk Island'),
  ('NG', 'Nigeria'),
  ('NI', 'Nicaragua'),
  ('NL', 'Netherlands'),
  ('NO', 'Norway'),
  ('NP', 'Nepal'),
  ('NR', 'Nauru'),
  ('NU', 'Niue'),
  ('NZ', 'New Zealand'),
  ('OM', 'Oman'),
  ('PA', 'Panama'),
  ('PE', 'Peru'),
  ('PF', 'French Polynesia'),
  ('PG', 'Papua New Guinea'),
  ('PH', 'Philippines'),
  ('PK', 'Pakistan'),
  ('PL', 'Poland'),
  ('PM', 'St. Pierre & Miquelon'),
  ('PN', 'Pitcairn Islands'),
  ('PR', 'Puerto Rico'),
  ('PS', 'Palestinian Territories'),
  ('PT', 'Portugal'),
  ('PW', 'Palau'),
  ('PY', 'Paraguay'),
  ('RE', 'Réunion'),
  ('RO', 'Romania'),
  ('RS', 'Serbia'),
  ('RU', 'Russia'),
  ('RW', 'Rwanda'),
  ('SA', 'Saudi Arabia'),
  ('SB', 'Solomon Islands'),
  ('SC', 'Seychelles'),
  ('SD', 'Sudan'),
  ('SE', 'Sweden'),
  ('SG', 'Singapore'),
  ('SH', 'St. Helena'),
  ('SI', 'Slovenia'),
  ('SJ', 'Svalbard & Jan Mayen'),
  ('SK', 'Slovakia'),
  ('SL', 'Sierra Leone'),
  ('SM', 'San Marino'),
  ('SN', 'Senegal'),
  ('SO', 'Somalia'),
  ('SR', 'Suriname'),
  ('SS', 'South Sudan'),
  ('ST', 'São Tomé & Príncipe'),
  ('SV', 'El Salvador'),
  ('SX', 'Sint Maarten'),
  ('SY', 'Syria'),
  ('SZ', 'Eswatini'),
  ('TC', 'Turks & Caicos Islands'),
  ('TD', 'Chad'),
  ('TF', 'French Southern Territories'),
  ('TG', 'Togo'),
  ('TH', 'Thailand'),
  ('TJ', 'Tajikistan'),
  ('TK', 'Tokelau'),
  ('TL', 'Timor-Leste'),
  ('TM', 'Turkmenistan'),
  ('TN', 'Tunisia'),
  ('TO', 'Tonga'),
  ('TR', 'Türkiye'),
  ('TT', 'Trinidad & Tobago'),
  ('TV', 'Tuvalu'),
  ('TW', 'Taiwan'),
  ('TZ', 'Tanzania'),
  ('UA', 'Ukraine'),
  ('UG', 'Uganda'),
  ('UM', 'U.S. Outlying Islands'),
  ('US', 'United States'),
  ('UY', 'Uruguay'),
  ('UZ', 'Uzbekistan'),
  ('VA', 'Vatican City'),
  ('VC', 'St. Vincent & Grenadines'),
  ('VE', 'Venezuela'),
  ('VG', 'British Virgin Islands'),
  ('VI', 'U.S. Virgin Islands'),
  ('VN', 'Vietnam'),
  ('VU', 'Vanuatu'),
  ('WF', 'Wallis & Futuna'),
  ('WS', 'Samoa'),
  ('YE', 'Yemen'),
  ('YT', 'Mayotte'),
  ('ZA', 'South Africa'),
  ('ZM', 'Zambia'),
  ('ZW', 'Zimbabwe')
on conflict (code) do nothing;
