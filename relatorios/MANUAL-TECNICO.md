# Manual Tecnico - BoardSports

## Requisitos locais

- Node.js instalado.
- Navegador moderno.
- Conta/projeto Supabase configurado.
- Variaveis Supabase definidas no ambiente ou em `frontend/env.js` para desenvolvimento local.

## Estrutura principal

```text
frontend/
  assets/images/
  css/
  js/
  *.html

backend/
  scripts/build-static.js
  run_server.js
  smoke_test.js
  supabase/migrations/

relatorios/
  RELATORIO-PAP.md
  MANUAL-TECNICO.md
  MANUAL-UTILIZADOR.md
  documentacao-tecnica/
  evidencias-visuais/
```

## Comandos

### Servidor local

```bash
npm start
```

Este comando usa `backend/run_server.js` para servir o website localmente.

### Build

```bash
npm run build
```

Gera a pasta `dist/` com os ficheiros prontos para deploy.

### Smoke test

```bash
npm run smoke
```

Valida as principais paginas do website.

## Configuracao Supabase

O cliente Supabase esta em:

`frontend/js/supabase.js`

O ficheiro espera:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Em desenvolvimento, o exemplo esta em:

`frontend/env.example.js`

## Base de dados

As migrations estao em:

`backend/supabase/migrations/`

Estas migrations criam tabelas, indices, funcoes SQL, triggers e policies de Row Level Security.

## Autenticacao

A autenticacao e feita com Supabase Auth.

Ficheiros principais:

- `frontend/js/auth_utils.js`
- `frontend/js/auth.js`
- `frontend/js/register.js`
- `frontend/js/reset-password.js`
- `frontend/js/verify-email.js`

## Organizacao JavaScript

O projeto usa JavaScript vanilla.

Padrao usado:

- Cada pagina tem um ficheiro JS principal.
- Funcoes comuns de autenticacao ficam em `auth_utils.js`.
- Funcoes de dados ficam em `db_utils.js`.
- Feedback visual fica em `ui_feedback.js`.
- Navegacao global fica em `site_header.js`.

## Deploy

O deploy esta preparado para Netlify.

Ficheiro:

`netlify.toml`

O comando de build e:

```bash
npm run build
```

A pasta publicada e:

```text
dist/
```

## Validacao recomendada antes da entrega

1. Confirmar que `frontend/env.js` nao contem chaves privadas.
2. Executar `npm run build`.
3. Executar `npm run smoke`.
4. Testar login/registo.
5. Testar mapa em desktop e mobile.
6. Testar painel de moderacao com conta admin.
7. Rever screenshots em `relatorios/evidencias-visuais/`.

