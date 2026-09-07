-- LeadFácil: all app writes use the authenticated user's JWT and RLS.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  avatar_url text check (avatar_url is null or avatar_url like 'https://%'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 250),
  category text not null default '', description text not null default '',
  address text not null default '', neighborhood text not null default '', city text not null default '', state text not null default '', postal_code text,
  latitude double precision check (latitude between -90 and 90), longitude double precision check (longitude between -180 and 180),
  phone text, whatsapp text, email text, website text, domain text, instagram text, facebook text, linkedin text,
  google_rating numeric(2,1) check (google_rating between 0 and 5), review_count integer not null default 0 check (review_count >= 0),
  opening_hours text, source text not null, source_url text, source_id text not null,
  status text not null default 'Novo' check (status in ('Novo','Contatado','Respondeu','Interessado','Reunião','Fechado','Descartado')),
  score smallint not null default 0 check (score between 0 and 100), notes text not null default '' check (char_length(notes) <= 10000), is_active boolean not null default false,
  analysis jsonb not null default '{"mode":"unavailable","checked_at":null,"https":null,"title":null,"meta_description":null,"viewport":null,"severe_issues":0,"seo_issues":0,"mobile_issues":0,"performance":"Não analisado","has_cta":null,"has_form":null,"broken_links":null}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_contacted_at timestamptz,
  unique(id,user_id), unique(user_id,source,source_id)
);
create table public.lists (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80), description text not null default '' check (char_length(description) <= 300),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create unique index lists_owner_name_unique on public.lists(user_id,lower(name));
create table public.tags (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40), color text not null default 'primary' check (color in ('primary','info','warning','success','violet')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create unique index tags_owner_name_unique on public.tags(user_id,lower(name));
create table public.lead_lists (
  lead_id uuid not null, list_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(lead_id,list_id),
  foreign key(lead_id,user_id) references public.leads(id,user_id) on delete cascade,
  foreign key(list_id,user_id) references public.lists(id,user_id) on delete cascade
);
create table public.lead_tags (
  lead_id uuid not null, tag_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(lead_id,tag_id),
  foreign key(lead_id,user_id) references public.leads(id,user_id) on delete cascade,
  foreign key(tag_id,user_id) references public.tags(id,user_id) on delete cascade
);
create table public.interactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, lead_id uuid not null,
  type text not null check (type in ('Ligação','WhatsApp','Email','Reunião','Nota','Resposta','Outro','Sistema')),
  observation text not null check (char_length(observation) between 1 and 5000), result text not null default '' check (char_length(result) <= 500),
  happened_at timestamptz not null default now(), created_at timestamptz not null default now(),
  foreign key(lead_id,user_id) references public.leads(id,user_id) on delete cascade
);
create table public.lead_score_factors (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, lead_id uuid not null,
  factor_key text not null, label text not null, description text not null, points smallint not null check (points between 0 and 100),
  created_at timestamptz not null default now(), unique(lead_id,factor_key),
  foreign key(lead_id,user_id) references public.leads(id,user_id) on delete cascade
);
create table public.searches (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  niche text not null check (char_length(niche) between 2 and 80), location text not null check (char_length(location) between 2 and 120),
  quantity integer not null check (quantity in (10,25,50,100)), result_count integer not null default 0 check (result_count >= 0),
  status text not null check (status in ('completed','failed')), provider text not null, created_at timestamptz not null default now()
);
create index leads_owner_created on public.leads(user_id,created_at desc);
create index leads_owner_score on public.leads(user_id,score desc);
create index leads_owner_status on public.leads(user_id,status);
create index leads_owner_city on public.leads(user_id,city);
create index lead_lists_owner on public.lead_lists(user_id);
create index lead_lists_list on public.lead_lists(list_id,user_id);
create index lead_tags_owner on public.lead_tags(user_id);
create index lead_tags_tag on public.lead_tags(tag_id,user_id);
create index interactions_owner_date on public.interactions(user_id,happened_at desc);
create index interactions_lead on public.interactions(lead_id,user_id);
create index factors_owner on public.lead_score_factors(user_id);
create index searches_owner_created on public.searches(user_id,created_at desc);

alter table public.profiles enable row level security;
create policy profiles_owner on public.profiles for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
do $$ declare table_name text; begin
  foreach table_name in array array['leads','lists','tags','lead_lists','lead_tags','interactions','lead_score_factors','searches'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',table_name);
  end loop;
end $$;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.profiles,public.leads,public.lists,public.tags,public.lead_lists,public.lead_tags,public.interactions,public.lead_score_factors,public.searches to authenticated;
revoke all on public.profiles,public.leads,public.lists,public.tags,public.lead_lists,public.lead_tags,public.interactions,public.lead_score_factors,public.searches from anon;

create function public.crm_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=now();return new;end $$;
do $$ declare table_name text; begin
  foreach table_name in array array['profiles','leads','lists','tags'] loop
    execute format('create trigger updated_at before update on public.%I for each row execute function public.crm_updated_at()',table_name);
  end loop;
end $$;
create function public.crm_lead_timeline() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.interactions(user_id,lead_id,type,observation) values(new.user_id,new.id,'Sistema','Lead encontrado e adicionado ao workspace.');
  else
    if old.status is distinct from new.status then
      insert into public.interactions(user_id,lead_id,type,observation) values(new.user_id,new.id,'Sistema','Status alterado de '||old.status||' para '||new.status||'.');
    end if;
    if old.notes is distinct from new.notes then
      insert into public.interactions(user_id,lead_id,type,observation) values(new.user_id,new.id,'Sistema','Anotações comerciais atualizadas.');
    end if;
  end if;
  return new;
end $$;
create trigger lead_timeline after insert or update of status,notes on public.leads for each row execute function public.crm_lead_timeline();

-- Atomic mutations and timeline updates. SECURITY INVOKER keeps RLS effective.
create function public.crm_mutate(payload jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid=auth.uid(); operation text=payload->>'type'; lead_uuid uuid; target_uuid uuid; affected integer;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
  if operation='status' then
    if jsonb_array_length(payload->'ids') not between 1 and 100 then raise exception 'Invalid selection';end if;
    update public.leads set status=payload->>'status' where user_id=uid and id in (select value::uuid from jsonb_array_elements_text(payload->'ids'));
    get diagnostics affected=row_count;
    if affected<>jsonb_array_length(payload->'ids') then raise exception 'Lead not found' using errcode='42501';end if;
  elsif operation='notes' then
    update public.leads set notes=payload->>'notes' where id=(payload->>'id')::uuid and user_id=uid;
    if not found then raise exception 'Lead not found' using errcode='42501';end if;
  elsif operation='interaction' then
    lead_uuid=(payload->>'lead_id')::uuid;
    insert into public.interactions(user_id,lead_id,type,observation,result,happened_at) values(uid,lead_uuid,payload->>'kind',payload->>'observation',coalesce(payload->>'result',''),(payload->>'happened_at')::timestamptz);
    if payload->>'kind'<>'Nota' then
      update public.leads set last_contacted_at=greatest(last_contacted_at,(payload->>'happened_at')::timestamptz) where id=lead_uuid and user_id=uid;
    end if;
  elsif operation='create_list' then
    insert into public.lists(user_id,name,description) values(uid,btrim(payload->>'name'),coalesce(payload->>'description',''));
  elsif operation='delete_list' then
    delete from public.lists where id=(payload->>'id')::uuid and user_id=uid;
    if not found then raise exception 'List not found' using errcode='42501';end if;
  elsif operation='list_membership' then
    target_uuid=(payload->>'list_id')::uuid;
    if not exists(select 1 from public.lists where id=target_uuid and user_id=uid) then raise exception 'List not found' using errcode='42501';end if;
    if jsonb_array_length(payload->'ids') not between 1 and 100 then raise exception 'Invalid selection';end if;
    for lead_uuid in select value::uuid from jsonb_array_elements_text(payload->'ids') loop
      if not exists(select 1 from public.leads where id=lead_uuid and user_id=uid) then raise exception 'Lead not found' using errcode='42501';end if;
      if coalesce((payload->>'remove')::boolean,false) then delete from public.lead_lists where lead_id=lead_uuid and list_id=target_uuid and user_id=uid;
      else insert into public.lead_lists(lead_id,list_id,user_id) values(lead_uuid,target_uuid,uid) on conflict do nothing;end if;
    end loop;
  elsif operation='create_tag' then
    insert into public.tags(user_id,name) values(uid,btrim(payload->>'name'));
  elsif operation='tag_membership' then
    lead_uuid=(payload->>'id')::uuid;target_uuid=(payload->>'tag_id')::uuid;
    if not exists(select 1 from public.leads where id=lead_uuid and user_id=uid) or not exists(select 1 from public.tags where id=target_uuid and user_id=uid) then raise exception 'Record not found' using errcode='42501';end if;
    if coalesce((payload->>'remove')::boolean,false) then delete from public.lead_tags where lead_id=lead_uuid and tag_id=target_uuid and user_id=uid;
    else insert into public.lead_tags(lead_id,tag_id,user_id) values(lead_uuid,target_uuid,uid) on conflict do nothing;end if;
  elsif operation='profile' then
    insert into public.profiles(id,name,avatar_url) values(uid,btrim(payload->>'name'),nullif(payload->>'avatar_url','')) on conflict(id) do update set name=excluded.name,avatar_url=excluded.avatar_url;
  else raise exception 'Unknown operation';end if;
end $$;

create function public.crm_save_search(businesses jsonb, search_record jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare uid uuid=auth.uid(); business jsonb; factor jsonb; saved_id uuid; inserted integer=0;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
  if jsonb_array_length(businesses)>100 then raise exception 'Search limit exceeded';end if;
  for business in select value from jsonb_array_elements(businesses) loop
    saved_id=null;
    insert into public.leads select (jsonb_populate_record(null::public.leads,business||jsonb_build_object('user_id',uid,'status','Novo','notes','','created_at',now(),'updated_at',now(),'last_contacted_at',null))).*
      on conflict(user_id,source,source_id) do nothing returning id into saved_id;
    if saved_id is not null then
      inserted=inserted+1;
      for factor in select value from jsonb_array_elements(coalesce(business->'score_factors','[]'::jsonb)) loop
        insert into public.lead_score_factors(user_id,lead_id,factor_key,label,description,points) values(uid,saved_id,factor->>'key',factor->>'label',factor->>'description',(factor->>'points')::smallint);
      end loop;
    end if;
  end loop;
  insert into public.searches(id,user_id,niche,location,quantity,result_count,status,provider) values((search_record->>'id')::uuid,uid,search_record->>'niche',search_record->>'location',(search_record->>'quantity')::integer,inserted,search_record->>'status',search_record->>'provider');
  return inserted;
end $$;
revoke all on function public.crm_mutate(jsonb),public.crm_save_search(jsonb,jsonb),public.crm_updated_at(),public.crm_lead_timeline() from public,anon;
grant execute on function public.crm_mutate(jsonb),public.crm_save_search(jsonb,jsonb),public.crm_updated_at(),public.crm_lead_timeline() to authenticated;
