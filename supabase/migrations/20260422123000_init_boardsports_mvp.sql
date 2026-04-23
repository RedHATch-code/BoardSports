create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_status') then
    create type public.product_status as enum ('draft', 'active', 'sold', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'spot_visibility') then
    create type public.spot_visibility as enum ('public', 'sensitive', 'private');
  end if;

  if not exists (select 1 from pg_type where typname = 'favorite_target_type') then
    create type public.favorite_target_type as enum ('product', 'spot');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_target_type') then
    create type public.report_target_type as enum ('product', 'spot');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('open', 'reviewing', 'closed');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text not null,
  avatar_url text,
  bio text,
  location_label text,
  location_region text default 'Portugal',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_username_unique_idx on public.profiles (lower(username));

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_sports (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, sport_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  sport_id uuid not null references public.sports (id),
  title text not null,
  slug text not null unique,
  description text not null,
  category text not null,
  condition text not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'EUR',
  location_label text not null,
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists products_seller_id_idx on public.products (seller_id);
create index if not exists products_sport_id_idx on public.products (sport_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_price_idx on public.products (price_cents);
create index if not exists products_slug_idx on public.products (slug);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists product_images_product_id_idx on public.product_images (product_id);

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  sport_id uuid not null references public.sports (id),
  title text not null,
  slug text not null unique,
  description text not null,
  visibility public.spot_visibility not null default 'public',
  difficulty text not null,
  best_time text,
  safety_notes text,
  location_label text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists spots_owner_id_idx on public.spots (owner_id);
create index if not exists spots_sport_id_idx on public.spots (sport_id);
create index if not exists spots_visibility_idx on public.spots (visibility);
create index if not exists spots_slug_idx on public.spots (slug);

create table if not exists public.spot_images (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists spot_images_spot_id_idx on public.spot_images (spot_id);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.favorite_target_type not null,
  product_id uuid references public.products (id) on delete cascade,
  spot_id uuid references public.spots (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint favorites_target_check check (
    (target_type = 'product' and product_id is not null and spot_id is null)
    or
    (target_type = 'spot' and spot_id is not null and product_id is null)
  )
);

create unique index if not exists favorites_product_unique_idx on public.favorites (user_id, product_id) where product_id is not null;
create unique index if not exists favorites_spot_unique_idx on public.favorites (user_id, spot_id) where spot_id is not null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_sender_recipient_check check (
    sender_id <> recipient_id
    and sender_id in (buyer_id, seller_id)
    and recipient_id in (buyer_id, seller_id)
  ),
  constraint messages_body_not_empty check (length(trim(body)) > 0)
);

create index if not exists messages_product_id_idx on public.messages (product_id);
create index if not exists messages_buyer_id_idx on public.messages (buyer_id);
create index if not exists messages_seller_id_idx on public.messages (seller_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  product_id uuid references public.products (id) on delete cascade,
  spot_id uuid references public.spots (id) on delete cascade,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  constraint reports_target_check check (
    (target_type = 'product' and product_id is not null and spot_id is null)
    or
    (target_type = 'spot' and spot_id is not null and product_id is null)
  )
);

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_status_idx on public.reports (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists spots_set_updated_at on public.spots;
create trigger spots_set_updated_at
before update on public.spots
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
begin
  generated_username := lower(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'user-' || substr(new.id::text, 1, 8)
    )
  );

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    generated_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), generated_username)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.sports (slug, name)
values
  ('skate', 'Skate'),
  ('surf', 'Surf'),
  ('skimboard', 'Skimboard'),
  ('snowboard', 'Snowboard')
on conflict (slug) do update
set name = excluded.name;

create or replace view public.spot_map_points as
select
  s.id,
  s.slug,
  s.title,
  s.description,
  s.visibility,
  s.difficulty,
  s.best_time,
  s.location_label,
  case
    when s.visibility = 'sensitive' then round(s.latitude::numeric, 2)
    else s.latitude
  end as latitude,
  case
    when s.visibility = 'sensitive' then round(s.longitude::numeric, 2)
    else s.longitude
  end as longitude,
  sp.slug as sport_slug,
  sp.name as sport_name,
  p.username as owner_username,
  p.full_name as owner_name,
  (
    select public_url
    from public.spot_images si
    where si.spot_id = s.id
    order by si.sort_order asc, si.created_at asc
    limit 1
  ) as cover_image_url
from public.spots s
join public.sports sp on sp.id = s.sport_id
join public.profiles p on p.id = s.owner_id
where s.visibility <> 'private';

grant select on public.spot_map_points to anon, authenticated;

create or replace view public.spot_public_details as
select
  s.id,
  s.slug,
  s.title,
  s.description,
  s.visibility,
  s.difficulty,
  s.best_time,
  case
    when s.visibility = 'sensitive' then null
    else s.safety_notes
  end as safety_notes,
  s.location_label,
  case
    when s.visibility = 'sensitive' then round(s.latitude::numeric, 2)
    else s.latitude
  end as latitude,
  case
    when s.visibility = 'sensitive' then round(s.longitude::numeric, 2)
    else s.longitude
  end as longitude,
  sp.slug as sport_slug,
  sp.name as sport_name,
  p.username as owner_username,
  p.full_name as owner_name
from public.spots s
join public.sports sp on sp.id = s.sport_id
join public.profiles p on p.id = s.owner_id
where s.visibility <> 'private';

grant select on public.spot_public_details to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.user_sports enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.spots enable row level security;
alter table public.spot_images enable row level security;
alter table public.favorites enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
for select using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists sports_select_all on public.sports;
create policy sports_select_all on public.sports
for select using (true);

drop policy if exists user_sports_select_all on public.user_sports;
create policy user_sports_select_all on public.user_sports
for select using (true);

drop policy if exists user_sports_insert_self on public.user_sports;
create policy user_sports_insert_self on public.user_sports
for insert with check (auth.uid() = user_id);

drop policy if exists user_sports_delete_self on public.user_sports;
create policy user_sports_delete_self on public.user_sports
for delete using (auth.uid() = user_id);

drop policy if exists products_select_visible on public.products;
create policy products_select_visible on public.products
for select using (
  status = 'active' or seller_id = auth.uid()
);

drop policy if exists products_insert_self on public.products;
create policy products_insert_self on public.products
for insert with check (seller_id = auth.uid());

drop policy if exists products_update_self on public.products;
create policy products_update_self on public.products
for update using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists products_delete_self on public.products;
create policy products_delete_self on public.products
for delete using (seller_id = auth.uid());

drop policy if exists product_images_select_visible on public.product_images;
create policy product_images_select_visible on public.product_images
for select using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and (p.status = 'active' or p.seller_id = auth.uid())
  )
);

drop policy if exists product_images_insert_self on public.product_images;
create policy product_images_insert_self on public.product_images
for insert with check (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.seller_id = auth.uid()
  )
);

drop policy if exists product_images_update_self on public.product_images;
create policy product_images_update_self on public.product_images
for update using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.seller_id = auth.uid()
  )
);

drop policy if exists product_images_delete_self on public.product_images;
create policy product_images_delete_self on public.product_images
for delete using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.seller_id = auth.uid()
  )
);

drop policy if exists spots_select_owner_only on public.spots;
create policy spots_select_owner_only on public.spots
for select using (owner_id = auth.uid());

drop policy if exists spots_insert_self on public.spots;
create policy spots_insert_self on public.spots
for insert with check (owner_id = auth.uid());

drop policy if exists spots_update_self on public.spots;
create policy spots_update_self on public.spots
for update using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists spots_delete_self on public.spots;
create policy spots_delete_self on public.spots
for delete using (owner_id = auth.uid());

drop policy if exists spot_images_select_owner_only on public.spot_images;
create policy spot_images_select_owner_only on public.spot_images
for select using (
  exists (
    select 1
    from public.spots s
    where s.id = spot_images.spot_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists spot_images_insert_self on public.spot_images;
create policy spot_images_insert_self on public.spot_images
for insert with check (
  exists (
    select 1
    from public.spots s
    where s.id = spot_images.spot_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists spot_images_update_self on public.spot_images;
create policy spot_images_update_self on public.spot_images
for update using (
  exists (
    select 1
    from public.spots s
    where s.id = spot_images.spot_id
      and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.spots s
    where s.id = spot_images.spot_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists spot_images_delete_self on public.spot_images;
create policy spot_images_delete_self on public.spot_images
for delete using (
  exists (
    select 1
    from public.spots s
    where s.id = spot_images.spot_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists favorites_select_self on public.favorites;
create policy favorites_select_self on public.favorites
for select using (auth.uid() = user_id);

drop policy if exists favorites_insert_self on public.favorites;
create policy favorites_insert_self on public.favorites
for insert with check (auth.uid() = user_id);

drop policy if exists favorites_delete_self on public.favorites;
create policy favorites_delete_self on public.favorites
for delete using (auth.uid() = user_id);

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
for select using (
  auth.uid() in (buyer_id, seller_id)
);

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages
for insert with check (
  auth.uid() = sender_id
  and auth.uid() in (buyer_id, seller_id)
);

drop policy if exists messages_update_recipient on public.messages;
create policy messages_update_recipient on public.messages
for update using (
  auth.uid() = recipient_id
)
with check (
  auth.uid() = recipient_id
);

drop policy if exists reports_select_self on public.reports;
create policy reports_select_self on public.reports
for select using (auth.uid() = reporter_id);

drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
for insert with check (auth.uid() = reporter_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('product-images', 'product-images', true, 6291456, array['image/png', 'image/jpeg', 'image/webp']),
  ('spot-images', 'spot-images', true, 6291456, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
for select using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
for update to authenticated using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists product_images_owner_insert on storage.objects;
create policy product_images_owner_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists product_images_owner_update on storage.objects;
create policy product_images_owner_update on storage.objects
for update to authenticated using (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists product_images_owner_delete on storage.objects;
create policy product_images_owner_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists spot_images_public_read on storage.objects;
create policy spot_images_public_read on storage.objects
for select using (bucket_id = 'spot-images');

drop policy if exists spot_images_owner_insert on storage.objects;
create policy spot_images_owner_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'spot-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists spot_images_owner_update on storage.objects;
create policy spot_images_owner_update on storage.objects
for update to authenticated using (
  bucket_id = 'spot-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'spot-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists spot_images_owner_delete on storage.objects;
create policy spot_images_owner_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'spot-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
