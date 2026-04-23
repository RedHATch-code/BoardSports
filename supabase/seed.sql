-- Demo seed for local development.
-- Creates three confirmed users plus sample marketplace, spots, favorites, messages and reports.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'alice@boardsports.local',
    crypt('Password123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}',
    '{"username":"alice-wave","full_name":"Alice Wave"}',
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'bruno@boardsports.local',
    crypt('Password123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}',
    '{"username":"bruno-rides","full_name":"Bruno Rides"}',
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'rita@boardsports.local',
    crypt('Password123!', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}',
    '{"username":"rita-line","full_name":"Rita Line"}',
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    '',
    false,
    false
  )
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@boardsports.local"}',
    'email',
    'alice@boardsports.local',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"bruno@boardsports.local"}',
    'email',
    'bruno@boardsports.local',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"rita@boardsports.local"}',
    'email',
    'rita@boardsports.local',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do nothing;

update public.profiles
set
  avatar_url = case id
    when '11111111-1111-1111-1111-111111111111' then 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
    when '22222222-2222-2222-2222-222222222222' then 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
    when '33333333-3333-3333-3333-333333333333' then 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
    else avatar_url
  end,
  bio = case id
    when '11111111-1111-1111-1111-111111111111' then 'Surf e skimboard entre a Ericeira e Peniche.'
    when '22222222-2222-2222-2222-222222222222' then 'Skater de bowls e linhas urbanas no norte.'
    when '33333333-3333-3333-3333-333333333333' then 'Snowboard e pesquisa de material usado para trips.'
    else bio
  end,
  location_label = case id
    when '11111111-1111-1111-1111-111111111111' then 'Ericeira, Portugal'
    when '22222222-2222-2222-2222-222222222222' then 'Vila Nova de Gaia, Portugal'
    when '33333333-3333-3333-3333-333333333333' then 'Covilha, Portugal'
    else location_label
  end
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

insert into public.user_sports (user_id, sport_id)
select '11111111-1111-1111-1111-111111111111', id from public.sports where slug in ('surf', 'skimboard')
on conflict do nothing;

insert into public.user_sports (user_id, sport_id)
select '22222222-2222-2222-2222-222222222222', id from public.sports where slug in ('skate')
on conflict do nothing;

insert into public.user_sports (user_id, sport_id)
select '33333333-3333-3333-3333-333333333333', id from public.sports where slug in ('snowboard', 'surf')
on conflict do nothing;

insert into public.products (
  id,
  seller_id,
  sport_id,
  title,
  slug,
  description,
  category,
  condition,
  price_cents,
  currency,
  location_label,
  status
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.sports where slug = 'surf'),
    'Fish twin fin 5''8',
    'fish-twin-fin-58-demo',
    'Prancha curta para ondas pequenas, glass reforcado e bom volume para daily driver.',
    'boards',
    'good',
    42000,
    'EUR',
    'Ericeira, Portugal',
    'active'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '22222222-2222-2222-2222-222222222222',
    (select id from public.sports where slug = 'skate'),
    'Deck 8.25 completo',
    'deck-825-completo-demo',
    'Setup completo com trucks independentes, rodas 54mm e shape com pouco uso.',
    'components',
    'like-new',
    18000,
    'EUR',
    'Porto, Portugal',
    'active'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '33333333-3333-3333-3333-333333333333',
    (select id from public.sports where slug = 'snowboard'),
    'Bindings all mountain M',
    'bindings-all-mountain-demo',
    'Fixacoes versateis para pista e powder, ideais para rider intermédio.',
    'accessories',
    'good',
    16000,
    'EUR',
    'Serra da Estrela, Portugal',
    'active'
  )
on conflict (id) do nothing;

insert into public.product_images (product_id, storage_path, public_url, sort_order)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'seed/products/fish-twin-fin.jpg',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    0
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'seed/products/deck-825.jpg',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
    0
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'seed/products/bindings.jpg',
    'https://images.unsplash.com/photo-1517292987719-0369a794ec0f?auto=format&fit=crop&w=1200&q=80',
    0
  )
on conflict do nothing;

insert into public.spots (
  id,
  owner_id,
  sport_id,
  title,
  slug,
  description,
  visibility,
  difficulty,
  best_time,
  safety_notes,
  location_label,
  latitude,
  longitude
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.sports where slug = 'surf'),
    'Ribeira d''Ilhas point',
    'ribeira-dilhas-point-demo',
    'Point bem conhecido para surf de linha longa, com melhor leitura em mar medio e vento favoravel.',
    'public',
    'intermediate',
    'Manhas com vento fraco',
    'Entradas e saidas com atencao em dias cheios.',
    'Ericeira, Portugal',
    38.995100,
    -9.422200
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '22222222-2222-2222-2222-222222222222',
    (select id from public.sports where slug = 'skate'),
    'Bowl tecnico de Gaia',
    'bowl-tecnico-gaia-demo',
    'Bowl rapido com transicoes fundas, indicado para quem ja controla velocidade e coping.',
    'sensitive',
    'advanced',
    'Fim de tarde',
    'Piso escorregadio em dias humidos.',
    'Vila Nova de Gaia, Portugal',
    41.133100,
    -8.611000
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    '33333333-3333-3333-3333-333333333333',
    (select id from public.sports where slug = 'snowboard'),
    'Linha privada para powder',
    'linha-privada-powder-demo',
    'Ponto privado de acesso limitado, usado para guardar referencias de backcountry pessoal.',
    'private',
    'expert',
    'Depois de nevada recente',
    'Avaliar sempre estabilidade do manto e acesso.',
    'Serra da Estrela, Portugal',
    40.321000,
    -7.612000
  )
on conflict (id) do nothing;

insert into public.spot_images (spot_id, storage_path, public_url, sort_order)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'seed/spots/ribeira.jpg',
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
    0
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'seed/spots/bowl.jpg',
    'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=1200&q=80',
    0
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'seed/spots/powder.jpg',
    'https://images.unsplash.com/photo-1516557070061-c3d1653fa646?auto=format&fit=crop&w=1200&q=80',
    0
  )
on conflict do nothing;

insert into public.favorites (user_id, target_type, product_id)
values
  ('33333333-3333-3333-3333-333333333333', 'product', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
on conflict do nothing;

insert into public.favorites (user_id, target_type, spot_id)
values
  ('33333333-3333-3333-3333-333333333333', 'spot', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1')
on conflict do nothing;

insert into public.messages (
  product_id,
  buyer_id,
  seller_id,
  sender_id,
  recipient_id,
  body
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'O fish ainda esta disponivel? Consegues enviar mais detalhes das medidas?'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Sim, continua disponivel. Posso enviar fotos extra da rabeta pela inbox.'
  )
on conflict do nothing;

insert into public.reports (reporter_id, target_type, product_id, reason, details)
values
  (
    '33333333-3333-3333-3333-333333333333',
    'product',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Descricao insuficiente',
    'O anuncio nao explica o estado real do nose e tail.'
  )
on conflict do nothing;
