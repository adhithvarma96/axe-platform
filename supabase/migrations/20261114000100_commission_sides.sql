-- Commission by side (Adhith, 14 Nov 2026).
--
-- 1. A closing records what Axe earns from each side: the tenant / buyer (lead side) and the
--    landlord / seller (listing side). Our commission is their total. Closings without the
--    split (all older ones) keep the old behaviour: each side is half of our commission.
-- 2. Each side's agent and Axe shares are worked out on that side's own commission
--    (the Schedule A points: each side is worth 50 points = 100% of that side's commission).
-- 3. A referral fee is the referral partner's own rate (Referral partners -> rate, max 15%)
--    of the referred side's commission only. It comes out of Axe's share, never the agent's.
--    The rate is fixed on the closing when the partner is first set, so a later change to the
--    partner's rate doesn't rewrite an old closing.
--
-- Rates stay stored in points out of 50 per side (agent + referrer + Axe = 50), so a 15% referral
-- on a side is 7.5 points. The app shows them as % of the side.

alter table public.closings
  add column lead_side_commission numeric(16,2) check (lead_side_commission is null or lead_side_commission >= 0),
  add column listing_side_commission numeric(16,2) check (listing_side_commission is null or listing_side_commission >= 0);

comment on column public.closings.lead_side_commission is 'Axe''s commission from the tenant / buyer side (after any co-broke). Null on older closings: half of our_commission.';
comment on column public.closings.listing_side_commission is 'Axe''s commission from the landlord / seller side (after any co-broke). Null on older closings: half of our_commission.';
comment on column public.referral_partners.referral_rate_pct is 'Referral fee as % of the referred side''s commission (max 15). Fixed on a closing when the partner is set.';

create or replace function app.commission_engine()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  sched public.commission_schedules;
  ld record; pr record;
  lead_ped date; list_ped date;
  r_lead record; r_list record;
  lead_base numeric; list_base numeric;
  pct numeric;
  rate numeric := new.usd_lkr_rate;
begin
  -- schedule effective on the closing date (snapshot; re-picked if the date changes)
  if new.commission_schedule_id is null or (tg_op = 'UPDATE' and new.closing_date is distinct from old.closing_date) then
    select * into sched from public.commission_schedules
     where deleted_at is null and effective_from <= new.closing_date and (effective_to is null or effective_to >= new.closing_date)
     order by effective_from desc limit 1;
    new.commission_schedule_id := sched.id;
  end if;

  select * into ld from public.leads where id = new.lead_id;
  select * into pr from public.properties where id = new.property_id;

  -- sourcing snapshots from the lead and property, taken once (or when the link changes)
  if new.lead_sourcing_model is null or (tg_op = 'UPDATE' and new.lead_id is distinct from old.lead_id and new.lead_sourcing_model is not distinct from old.lead_sourcing_model) then
    new.lead_sourcing_model := coalesce(ld.sourcing_model, new.lead_sourcing_model);
  end if;
  if new.listing_sourcing_model is null or (tg_op = 'UPDATE' and new.property_id is distinct from old.property_id and new.listing_sourcing_model is not distinct from old.listing_sourcing_model) then
    new.listing_sourcing_model := coalesce(pr.sourcing_model, new.listing_sourcing_model);
  end if;
  new.lead_side_referral_partner_id := coalesce(new.lead_side_referral_partner_id, case when new.lead_sourcing_model in ('company_via_referrer', 'agent_via_referrer') then ld.referral_partner_id end);
  new.listing_side_referral_partner_id := coalesce(new.listing_side_referral_partner_id, case when new.listing_sourcing_model in ('company_via_referrer', 'agent_via_referrer') then pr.referral_partner_id end);

  -- tenure and owner exemption per side
  select probation_end_date, commission_exempt into lead_ped, new.lead_agent_exempt from public.agent_hr where agent_id = new.lead_side_agent_id;
  select probation_end_date, commission_exempt into list_ped, new.listing_agent_exempt from public.agent_hr where agent_id = new.listing_side_agent_id;
  new.lead_agent_exempt := coalesce(new.lead_agent_exempt, false);
  new.listing_agent_exempt := coalesce(new.listing_agent_exempt, false);
  new.lead_agent_tenure := case when lead_ped is not null and new.closing_date <= lead_ped then 'probation' else 'confirmed' end;
  new.listing_agent_tenure := case when list_ped is not null and new.closing_date <= list_ped then 'probation' else 'confirmed' end;

  select * into r_lead from public.commission_schedule_rates where schedule_id = new.commission_schedule_id and sourcing_model = new.lead_sourcing_model and tenure = new.lead_agent_tenure;
  select * into r_list from public.commission_schedule_rates where schedule_id = new.commission_schedule_id and sourcing_model = new.listing_sourcing_model and tenure = new.listing_agent_tenure;

  -- commission per side: entered, or (older closings) half each
  if new.lead_side_commission is not null or new.listing_side_commission is not null then
    new.our_commission := coalesce(new.lead_side_commission, 0) + coalesce(new.listing_side_commission, 0);
    lead_base := coalesce(new.lead_side_commission, 0);
    list_base := coalesce(new.listing_side_commission, 0);
  else
    lead_base := new.our_commission / 2;
    list_base := new.our_commission - lead_base;
  end if;

  -- lead side (tenant / buyer)
  if r_lead.schedule_id is not null then
    new.lead_agent_rate := case when new.lead_side_agent_id is null or new.lead_agent_exempt then 0 else r_lead.agent_rate end;
    if r_lead.referrer_rate = 0 then
      new.lead_referrer_rate := 0;
    elsif tg_op = 'UPDATE' and old.lead_referrer_rate is not null and old.lead_referrer_rate > 0
          and new.lead_side_referral_partner_id is not distinct from old.lead_side_referral_partner_id
          and new.lead_sourcing_model is not distinct from old.lead_sourcing_model then
      new.lead_referrer_rate := old.lead_referrer_rate; -- fixed when the partner was set
    else
      select referral_rate_pct into pct from public.referral_partners where id = new.lead_side_referral_partner_id;
      new.lead_referrer_rate := coalesce(pct, 15) / 2; -- % of the side -> points out of 50
    end if;
    new.lead_axe_rate := 50 - new.lead_agent_rate - new.lead_referrer_rate;
    new.lead_agent_payout := round(lead_base * new.lead_agent_rate / 50, 0);
    new.lead_referrer_payout := round(lead_base * new.lead_referrer_rate / 50, 0);
    new.lead_axe_payout := lead_base - new.lead_agent_payout - new.lead_referrer_payout;
  else
    new.lead_agent_rate := null; new.lead_referrer_rate := null; new.lead_axe_rate := null;
    new.lead_agent_payout := null; new.lead_referrer_payout := null; new.lead_axe_payout := null;
  end if;

  -- listing side (landlord / seller)
  if r_list.schedule_id is not null then
    new.listing_agent_rate := case when new.listing_side_agent_id is null or new.listing_agent_exempt then 0 else r_list.agent_rate end;
    if r_list.referrer_rate = 0 then
      new.listing_referrer_rate := 0;
    elsif tg_op = 'UPDATE' and old.listing_referrer_rate is not null and old.listing_referrer_rate > 0
          and new.listing_side_referral_partner_id is not distinct from old.listing_side_referral_partner_id
          and new.listing_sourcing_model is not distinct from old.listing_sourcing_model then
      new.listing_referrer_rate := old.listing_referrer_rate;
    else
      pct := null;
      select referral_rate_pct into pct from public.referral_partners where id = new.listing_side_referral_partner_id;
      new.listing_referrer_rate := coalesce(pct, 15) / 2;
    end if;
    new.listing_axe_rate := 50 - new.listing_agent_rate - new.listing_referrer_rate;
    new.listing_agent_payout := round(list_base * new.listing_agent_rate / 50, 0);
    new.listing_referrer_payout := round(list_base * new.listing_referrer_rate / 50, 0);
    new.listing_axe_payout := list_base - new.listing_agent_payout - new.listing_referrer_payout;
  else
    new.listing_agent_rate := null; new.listing_referrer_rate := null; new.listing_axe_rate := null;
    new.listing_agent_payout := null; new.listing_referrer_payout := null; new.listing_axe_payout := null;
  end if;

  new.agent_total := coalesce(new.lead_agent_payout, 0) + coalesce(new.listing_agent_payout, 0);
  new.referrer_total := coalesce(new.lead_referrer_payout, 0) + coalesce(new.listing_referrer_payout, 0);
  new.axe_total := coalesce(new.lead_axe_payout, 0) + coalesce(new.listing_axe_payout, 0);
  new.split_delta := coalesce(new.our_commission, 0) - new.agent_total - new.referrer_total - new.axe_total;

  -- Saved from the app: both sides must be sourced and the split must balance, unless a Super Admin explains why.
  if auth.uid() is not null and abs(new.split_delta) > 1 and nullif(trim(new.split_override_reason), '') is null then
    raise exception 'The commission split doesn''t balance (off by %). Set the sourcing model on both sides, or give an override reason.', new.split_delta
      using errcode = 'P0001';
  end if;

  -- USD views of the deal (internal only)
  new.monthly_rent_usd := case when new.deal_currency = 'USD' then new.monthly_rent when rate > 0 then round(new.monthly_rent / rate, 2) end;
  new.total_deal_value_usd := case when new.deal_currency = 'USD' then new.total_deal_value when rate > 0 then round(new.total_deal_value / rate, 2) end;
  new.rent_per_sqft_usd := case when pr.square_feet > 0 then round(new.monthly_rent_usd / pr.square_feet, 4) end;
  new.sale_price_per_sqft_usd := case when new.deal_type = 'sale' and pr.square_feet > 0 then round(new.total_deal_value_usd / pr.square_feet, 4) end;

  -- denormalised for reporting
  new.snap_location_id := pr.location_id; new.snap_development_id := pr.development_id; new.snap_beds := pr.beds;
  new.snap_furnished := pr.furnished; new.snap_property_type := pr.property_type; new.snap_square_feet := pr.square_feet;
  new.snap_property_source_channel_id := pr.source_channel_id;
  new.snap_lead_source_type := ld.lead_source_type; new.snap_lead_source_channel_id := ld.source_channel_id;
  return new;
end $$;
