-- Extend the existing CRM lead record; enrichment remains owned by the same user/RLS boundary.
alter table public.leads
  add column country text not null default 'Brasil',
  add column google_maps_url text not null default '',
  add column sources text[] not null default '{}',
  add column confidence jsonb not null default '{}'::jsonb,
  add column enrichment_confidence numeric(4,3) not null default 0 check (enrichment_confidence between 0 and 1),
  add column last_enriched_at timestamptz,
  add column discovery_distance_m integer check (discovery_distance_m is null or discovery_distance_m >= 0);

create index leads_owner_last_enriched
  on public.leads(user_id, last_enriched_at desc)
  where last_enriched_at is not null;
create index leads_owner_domain
  on public.leads(user_id, lower(domain))
  where domain is not null and domain <> '';

create or replace function public.crm_save_search(businesses jsonb, search_record jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare
  uid uuid=auth.uid(); business jsonb; factor jsonb; saved_id uuid;
  inserted integer=0; was_inserted boolean=false;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_array_length(businesses)>100 then raise exception 'Search limit exceeded'; end if;

  for business in select value from jsonb_array_elements(businesses) loop
    saved_id=null; was_inserted=false;
    select lead.id into saved_id
      from public.leads lead
      where lead.user_id=uid and (
        (lead.source=business->>'source' and lead.source_id=business->>'source_id')
        or (nullif(lead.domain,'') is not null and lower(lead.domain)=lower(business->>'domain'))
        or (length(regexp_replace(coalesce(lead.whatsapp,lead.phone,''),'\D','','g'))>=10
            and regexp_replace(coalesce(lead.whatsapp,lead.phone,''),'\D','','g')=
                regexp_replace(coalesce(business->>'whatsapp',business->>'phone',''),'\D','','g'))
        or (
          regexp_replace(lower(lead.company_name),'[^a-z0-9]','','g')=
            regexp_replace(lower(business->>'company_name'),'[^a-z0-9]','','g')
          and lead.latitude is not null and lead.longitude is not null
          and (business->>'latitude') is not null and (business->>'longitude') is not null
          and abs(lead.latitude-(business->>'latitude')::double precision)<0.0008
          and abs(lead.longitude-(business->>'longitude')::double precision)<0.0008
        )
      )
      order by (lead.source=business->>'source' and lead.source_id=business->>'source_id') desc
      limit 1;

    if saved_id is null then
      begin
        insert into public.leads
          select (jsonb_populate_record(null::public.leads,
            business||jsonb_build_object(
              'user_id',uid,'status','Novo','notes','',
              'created_at',now(),'updated_at',now(),'last_contacted_at',null
            ))).*
          returning id into saved_id;
        inserted=inserted+1; was_inserted=true;
      exception when unique_violation then
        select id into saved_id from public.leads
          where user_id=uid and source=business->>'source' and source_id=business->>'source_id';
      end;
    end if;

    if saved_id is not null and not was_inserted then
      update public.leads lead set
        category=coalesce(nullif(business->>'category',''),lead.category),
        description=coalesce(nullif(business->>'description',''),lead.description),
        address=coalesce(nullif(business->>'address',''),lead.address),
        neighborhood=coalesce(nullif(business->>'neighborhood',''),lead.neighborhood),
        city=coalesce(nullif(business->>'city',''),lead.city),
        state=coalesce(nullif(business->>'state',''),lead.state),
        country=coalesce(nullif(business->>'country',''),lead.country),
        postal_code=coalesce(lead.postal_code,nullif(business->>'postal_code','')),
        latitude=coalesce(lead.latitude,(business->>'latitude')::double precision),
        longitude=coalesce(lead.longitude,(business->>'longitude')::double precision),
        phone=coalesce(nullif(lead.phone,''),nullif(business->>'phone','')),
        whatsapp=coalesce(nullif(lead.whatsapp,''),nullif(business->>'whatsapp','')),
        email=coalesce(nullif(lead.email,''),nullif(business->>'email','')),
        website=coalesce(nullif(lead.website,''),nullif(business->>'website','')),
        domain=coalesce(nullif(lead.domain,''),nullif(business->>'domain','')),
        instagram=coalesce(nullif(lead.instagram,''),nullif(business->>'instagram','')),
        facebook=coalesce(nullif(lead.facebook,''),nullif(business->>'facebook','')),
        linkedin=coalesce(nullif(lead.linkedin,''),nullif(business->>'linkedin','')),
        google_maps_url=coalesce(nullif(business->>'google_maps_url',''),lead.google_maps_url),
        sources=(select array_agg(distinct item) from unnest(lead.sources || coalesce(array(select jsonb_array_elements_text(business->'sources')),'{}')) item),
        confidence=lead.confidence || coalesce(business->'confidence','{}'::jsonb),
        enrichment_confidence=greatest(lead.enrichment_confidence,coalesce((business->>'enrichment_confidence')::numeric,0)),
        last_enriched_at=greatest(lead.last_enriched_at,(business->>'last_enriched_at')::timestamptz),
        discovery_distance_m=coalesce((business->>'discovery_distance_m')::integer,lead.discovery_distance_m),
        analysis=case when business->'analysis'->>'mode'='live' then business->'analysis' else lead.analysis end,
        score=(business->>'score')::smallint,
        is_active=lead.is_active or coalesce((business->>'is_active')::boolean,false)
      where lead.id=saved_id and lead.user_id=uid;
    end if;

    if saved_id is not null then
      delete from public.lead_score_factors where lead_id=saved_id and user_id=uid;
      for factor in select value from jsonb_array_elements(coalesce(business->'score_factors','[]'::jsonb)) loop
        insert into public.lead_score_factors(user_id,lead_id,factor_key,label,description,points)
        values(uid,saved_id,factor->>'key',factor->>'label',factor->>'description',(factor->>'points')::smallint);
      end loop;
    end if;
  end loop;

  insert into public.searches(id,user_id,niche,location,quantity,result_count,status,provider)
  values((search_record->>'id')::uuid,uid,search_record->>'niche',search_record->>'location',
    (search_record->>'quantity')::integer,inserted,search_record->>'status',search_record->>'provider');
  return inserted;
end $$;

revoke all on function public.crm_save_search(jsonb,jsonb) from public,anon;
grant execute on function public.crm_save_search(jsonb,jsonb) to authenticated;
