# BoardSports Portugal MVP

Base tecnica de um marketplace web para desportos de prancha com foco inicial em Portugal.

O novo MVP vive em `apps/web` e foi construido com:

- Next.js 15 + TypeScript
- Tailwind CSS v4
- Supabase para auth, Postgres, RLS e storage
- Leaflet + OpenStreetMap para spots

O repositorio ainda contem artefactos do prototipo estatico anterior na raiz, mas o produto atual e o projeto em `apps/web` com schema e seeds em `supabase/`.

## O que o MVP cobre

- autenticacao com registo, login, logout e perfil basico
- perfis com username, avatar, bio, localizacao e modalidades
- marketplace com CRUD de anuncios, imagens, filtros e favoritos
- spots com CRUD, mapa Leaflet, visibilidade, imagens e favoritos
- inbox simples por anuncio
- reports basicos para produto e spot
- painel para gerir conteudo proprio

## Estrutura principal

```text
apps/web
  src/app                 App Router pages
  src/components          UI, forms, marketplace, spots, messages
  src/features            Dominios por area (auth, profiles, marketplace, spots, messages, reports)
  src/lib                 Env, Supabase clients, validations, utils
  src/types               Tipos de apoio
supabase/migrations       Schema inicial + ajustes incrementais
supabase/seed.sql         Dados de demo para desenvolvimento local
docs/phase-1-architecture.md
```

## Setup local

### 1. Preparar o Supabase

Podes usar um projeto Supabase cloud ou local.

Se estiveres a usar Supabase local com CLI:

```bash
supabase db reset
```

Se estiveres a usar um projeto remoto:

1. cria o projeto no Supabase;
2. aplica os ficheiros de `supabase/migrations/` pela ordem do timestamp;
3. opcionalmente aplica `supabase/seed.sql` para dados de demo.

As migrations criam:

- tabelas e enums
- trigger para criar `profiles` a partir de `auth.users`
- views publicas para spots
- buckets `avatars`, `product-images` e `spot-images`
- policies RLS para o MVP

### 2. Configurar variaveis de ambiente

Dentro de `apps/web`, copia `.env.example` para `.env.local` e preenche:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Instalar dependencias

```bash
cd apps/web
npm install
```

### 4. Arrancar a app

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Validacao local

No projeto `apps/web`:

```bash
npm run typecheck
npm run build
```

Estas duas verificacoes foram usadas durante a implementacao desta base.

## Seed de demo

`supabase/seed.sql` cria tres utilizadores confirmados, favoritos, mensagens, anuncios e spots de exemplo.

Contas seeded:

- `alice@boardsports.local`
- `bruno@boardsports.local`
- `rita@boardsports.local`

Password comum:

```text
Password123!
```

Se estiveres em Supabase local, o caminho mais simples e:

```bash
supabase db reset
```

Isto aplica migrations e seed de uma vez.

## Decisoes tecnicas

- Leaflet foi escolhido em vez de Mapbox para manter o MVP simples e sem dependencia extra de billing.
- O marketplace nao integra pagamentos nesta fase. O contacto e feito por inbox simples por anuncio.
- Spots publicos e sensiveis saem por views publicas; spots privados ficam apenas para o dono.
- Imagens usam buckets separados por dominio para manter regras e evolucao simples.
- A app esta organizada por dominios em `src/features` para crescer sem overengineering.

## Proximos passos naturais

- reviews e reputacao entre utilizadores
- destaque de anuncios
- pesquisa textual
- moderacao mais rica com painel dedicado
- pagamentos e fluxo de transacao
