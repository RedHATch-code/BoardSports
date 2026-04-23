# Fase 1: Arquitetura do MVP

## Decisao base

- Nova aplicacao criada em `apps/web` para nao colidir com a base estatica atual.
- `supabase/` fica na raiz com migrations e seed.
- Mapa: `Leaflet`, por ser a opcao mais simples, madura e sustentavel para o MVP em Portugal sem custo adicional de licenciamento no arranque.
- Renderizacao: `Next.js App Router` com server components para leitura e client components apenas onde ha formulario, mapa, uploads e interacao rica.

## Objetivos tecnicos

- Separar UI, dominio e acesso a dados.
- Manter tipagem forte de ponta a ponta.
- Evitar dependencias e abstracoes desnecessarias.
- Preparar o projeto para crescer para reviews, reputacao, destaque e pagamentos sem refatoracoes grandes.

## Estrutura de pastas proposta

```text
apps/
  web/
    public/
    src/
      app/
        (marketing)/
          page.tsx
        (auth)/
          login/page.tsx
          registo/page.tsx
        (app)/
          produtos/page.tsx
          produtos/novo/page.tsx
          produtos/[slug]/page.tsx
          produtos/[id]/editar/page.tsx
          spots/page.tsx
          spots/novo/page.tsx
          spots/[slug]/page.tsx
          spots/[id]/editar/page.tsx
          favoritos/page.tsx
          inbox/page.tsx
          painel/page.tsx
          perfil/[username]/page.tsx
          conta/page.tsx
        api/
          upload/route.ts
        globals.css
        layout.tsx
      components/
        ui/
        layout/
        forms/
        cards/
        map/
      features/
        auth/
        profiles/
        marketplace/
        spots/
        favorites/
        messages/
        reports/
      lib/
        env.ts
        utils.ts
        routes.ts
        validations/
        supabase/
      types/
        database.ts
        domain.ts
supabase/
  migrations/
  seed.sql
docs/
  phase-1-architecture.md
```

## Organizacao por dominio

- `features/auth`: login, registo, sign-out, guards e helpers de sessao.
- `features/profiles`: perfil publico, perfil do proprio utilizador, avatar, modalidades.
- `features/marketplace`: anuncios, filtros, favoritos de produto e reports de produto.
- `features/spots`: spots, visibilidade, mapa, favoritos de spot e reports de spot.
- `features/messages`: inbox, threads e envio de mensagens ligadas a anuncio.
- `features/reports`: comandos e queries de denuncia.

## Modelo de dados

### Base principal

- `auth.users`: origem da autenticacao no Supabase.
- `public.profiles`: extensao do utilizador autenticado.
- `public.sports`: modalidades suportadas.
- `public.user_sports`: relacao N:N entre utilizador e modalidades.

### Marketplace

- `public.products`
- `public.product_images`
- `public.favorites`
- `public.reports`

### Spots

- `public.spots`
- `public.spot_images`
- `public.favorites`
- `public.reports`

### Mensagens

- `public.messages`

## Decisoes de modelacao

- `profiles` referencia `auth.users` com a mesma `id`.
- `favorites` e polimorfica por `target_type` (`product` ou `spot`) para evitar duas tabelas quase iguais.
- `reports` segue o mesmo principio (`product` ou `spot`).
- `messages` funciona por thread implicita: `product_id + buyer_id + seller_id`.
- `spots.visibility` suporta `public`, `sensitive` e `private`.
- Spots sensiveis expostos ao publico usam coordenadas aproximadas fora do dono do spot.

## Tabelas nucleares

### `profiles`

- `id uuid pk`
- `username text unique`
- `full_name text`
- `avatar_url text`
- `bio text`
- `location_label text`
- `location_region text`
- `created_at`
- `updated_at`

### `sports`

- `id uuid pk`
- `slug text unique`
- `name text unique`
- `created_at`

### `user_sports`

- `user_id uuid fk -> profiles.id`
- `sport_id uuid fk -> sports.id`
- `primary key (user_id, sport_id)`

### `products`

- `id uuid pk`
- `seller_id uuid fk -> profiles.id`
- `sport_id uuid fk -> sports.id`
- `title text`
- `slug text unique`
- `description text`
- `category text`
- `condition text`
- `price_cents int`
- `currency text default 'EUR'`
- `location_label text`
- `status text` (`draft`, `active`, `sold`, `archived`)
- `is_featured boolean default false`
- `created_at`
- `updated_at`

### `product_images`

- `id uuid pk`
- `product_id uuid fk -> products.id`
- `storage_path text`
- `public_url text`
- `sort_order int`
- `created_at`

### `spots`

- `id uuid pk`
- `owner_id uuid fk -> profiles.id`
- `sport_id uuid fk -> sports.id`
- `title text`
- `slug text unique`
- `description text`
- `visibility text` (`public`, `sensitive`, `private`)
- `difficulty text`
- `best_time text`
- `safety_notes text`
- `location_label text`
- `latitude numeric`
- `longitude numeric`
- `created_at`
- `updated_at`

### `spot_images`

- `id uuid pk`
- `spot_id uuid fk -> spots.id`
- `storage_path text`
- `public_url text`
- `sort_order int`
- `created_at`

### `favorites`

- `id uuid pk`
- `user_id uuid fk -> profiles.id`
- `target_type text` (`product`, `spot`)
- `product_id uuid nullable`
- `spot_id uuid nullable`
- `created_at`

### `messages`

- `id uuid pk`
- `product_id uuid fk -> products.id`
- `buyer_id uuid fk -> profiles.id`
- `seller_id uuid fk -> profiles.id`
- `sender_id uuid fk -> profiles.id`
- `recipient_id uuid fk -> profiles.id`
- `body text`
- `read_at timestamptz null`
- `created_at`

### `reports`

- `id uuid pk`
- `reporter_id uuid fk -> profiles.id`
- `target_type text` (`product`, `spot`)
- `product_id uuid nullable`
- `spot_id uuid nullable`
- `reason text`
- `details text`
- `status text` (`open`, `reviewing`, `closed`)
- `created_at`

## Views e funcoes iniciais

- `public.visible_spots`: vista/logica para devolver coordenadas aproximadas para spots `sensitive`.
- `public.profile_summary`: vista simples para cards e listas.
- trigger `handle_new_user_profile`: cria perfil basico a partir de `auth.users`.
- helper `set_updated_at`: atualiza `updated_at`.

## Politicas de acesso

- Perfis publicos legiveis por todos.
- Cada utilizador edita apenas o proprio perfil.
- Produtos: todos podem ler `active`; vendedor gere os seus.
- Spots:
  - `public`: legiveis por todos.
  - `sensitive`: legiveis por todos autenticados, mas com coordenada aproximada fora do dono.
  - `private`: apenas dono.
- Favoritos, mensagens e reports: apenas autenticado e apenas sobre os seus registos.

## Paginas do MVP

- `/` Home
- `/login`
- `/registo`
- `/produtos`
- `/produtos/novo`
- `/produtos/[slug]`
- `/produtos/[id]/editar`
- `/spots`
- `/spots/novo`
- `/spots/[slug]`
- `/spots/[id]/editar`
- `/favoritos`
- `/inbox`
- `/painel`
- `/perfil/[username]`
- `/conta`

## Componentes reutilizaveis esperados

- `AppShell`
- `TopNav`
- `MobileBottomNav`
- `SectionHeader`
- `EmptyState`
- `LoadingState`
- `ProductCard`
- `SpotCard`
- `FavoriteButton`
- `ReportButton`
- `AvatarUploader`
- `ImageUploader`
- `FormField`
- `FilterBar`
- `LeafletSpotMap`
- `MessageThread`

## Decisoes importantes para o README

- Leaflet escolhido sobre Mapbox no MVP.
- Sem pagamentos integrados por decisao de produto.
- Mensagens ligadas ao anuncio, nao chat livre global.
- Spots sensiveis com coordenada aproximada para reduzir exposicao.
- Nova app criada em paralelo ao projeto antigo para migracao segura.
