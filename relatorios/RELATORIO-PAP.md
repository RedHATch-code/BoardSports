# Relatorio PAP - BoardSports

## 1. Identificacao do projeto

**Nome:** BoardSports  
**Tipo:** Website/aplicacao web para comunidade de board sports  
**Objetivo:** Criar uma plataforma onde utilizadores podem descobrir spots, publicar videos, consultar perfis, ganhar XP, participar em rankings e interagir com conteudo da comunidade.

## 2. Enquadramento

O projeto BoardSports foi desenvolvido como uma plataforma web ligada ao universo dos desportos de prancha, como surf, skate, skimboard, snowboard e sandboard. A ideia principal e centralizar informacao sobre spots, videos, riders e progresso da comunidade.

O sistema permite que um utilizador crie conta, consulte spots no mapa, publique videos associados a locais, submeta provas para XP e consulte rankings. Existe tambem uma area de moderacao para administradores validarem pedidos e denuncias.

## 3. Objetivos principais

- Criar um website responsivo.
- Implementar login, registo, recuperacao de password e perfil.
- Criar um mapa interativo com spots.
- Permitir publicacao de videos associados aos spots.
- Criar sistema de XP, conquistas e leaderboard.
- Criar area simples de administracao/moderacao.
- Usar base de dados organizada.
- Preparar documentacao tecnica e funcional para apresentacao PAP.

## 4. Tecnologias utilizadas

- **HTML5:** estrutura das paginas.
- **CSS3:** estilos, layout responsivo e identidade visual.
- **JavaScript vanilla:** comportamento das paginas, interacoes, chamadas a dados e renderizacao dinamica.
- **Supabase JS SDK:** autenticacao, sessoes, chamadas a base de dados e storage.
- **Supabase/PostgreSQL:** base de dados, policies e funcoes SQL.
- **Leaflet:** mapa interativo.
- **GSAP:** animacoes da pagina inicial.
- **Node.js:** scripts locais de build, servidor e smoke tests.
- **Netlify:** deploy do website estatico.

## 5. Nota sobre JavaScript vanilla

O projeto nao utiliza uma framework JavaScript como React, Vue ou Angular. A opcao foi manter JavaScript puro porque a estrutura do projeto e composta por paginas HTML independentes, com ficheiros JavaScript especificos para cada area funcional.

Foram usadas bibliotecas externas apenas quando havia uma necessidade concreta:

- Leaflet para o mapa.
- GSAP para animacoes.
- Supabase JS SDK para autenticacao e dados.

Esta abordagem reduz complexidade, evita dependencias desnecessarias e torna o projeto mais facil de explicar numa PAP.

## 6. Funcionalidades implementadas

### Autenticacao

- Login.
- Registo em dois passos.
- Verificacao de email.
- Recuperacao e alteracao de password.
- Logout.
- Protecao de paginas privadas.

Ficheiros principais:

- `frontend/login.html`
- `frontend/register.html`
- `frontend/reset-password.html`
- `frontend/verify-email.html`
- `frontend/js/auth_utils.js`
- `frontend/js/auth.js`
- `frontend/js/register.js`

### Mapa e spots

- Mapa interativo com Leaflet.
- Listagem de spots.
- Filtros por modalidade, categoria, pais e criador.
- Criacao e edicao de spots.
- Pesquisa de localizacao.
- Associacao de videos a spots.
- Submissao de provas para XP.

Ficheiros principais:

- `frontend/mapa.html`
- `frontend/spot.html`
- `frontend/js/mapa_page.js`
- `frontend/js/spot_page.js`
- `frontend/css/map-page.css`

### Videos

- Galeria de videos.
- Filtros por modalidade e pesquisa.
- Separacao entre formatos curtos e longos.
- Embeds de plataformas externas.

Ficheiros principais:

- `frontend/videos.html`
- `frontend/js/videos_page.js`
- `frontend/css/videos-page.css`

### Perfil e comunidade

- Perfil de utilizador.
- Foto de perfil.
- Publicacoes.
- Seguidores.
- Mensagens.
- Resumo de XP.

Ficheiros principais:

- `frontend/perfil.html`
- `frontend/configuracao.html`
- `frontend/js/perfil_page.js`
- `frontend/js/configuracao_page.js`
- `frontend/css/profile-page.css`

### XP e ranking

- Sistema de XP.
- Niveis.
- Conquistas diarias.
- Leaderboard global e por filtros.
- Moderacao de submissoes XP.

Ficheiros principais:

- `frontend/leaderboard.html`
- `frontend/js/leaderboard_page.js`
- `frontend/css/xp-system.css`
- `backend/supabase/migrations/20260429093000_boardsports_xp_system.sql`

### Administracao e moderacao

- Painel restrito a administradores.
- Aprovar/rejeitar spots pendentes.
- Validar submissoes XP.
- Gerir denuncias.

Ficheiros principais:

- `frontend/moderacao.html`
- `frontend/js/moderacao_page.js`
- `frontend/css/moderation.css`

## 7. Base de dados

A base de dados esta definida em migrations SQL na pasta:

`backend/supabase/migrations/`

Principais tabelas:

- `profiles`
- `modalidades`
- `categorias`
- `spots`
- `spot_videos`
- `notificacoes`
- `comentarios`
- `spot_favoritos`
- `spot_imagens`
- `denuncias`
- `submissoes`
- `xp_logs`
- `manobras`

O projeto usa Row Level Security no Supabase para limitar acesso a dados conforme o utilizador autenticado, autor do conteudo ou administrador.

## 8. Responsividade

O website foi desenvolvido com estilos especificos para desktop e mobile.

Ficheiros relevantes:

- `frontend/css/responsive.css`
- `frontend/css/floating-dock.css`
- `frontend/css/rift-atlas.css`

Existem screenshots de verificacao visual em:

`relatorios/evidencias-visuais/`

## 9. Estrutura do projeto

- `frontend/` - codigo do website.
- `frontend/css/` - estilos.
- `frontend/js/` - scripts JavaScript.
- `frontend/assets/images/` - imagens.
- `backend/` - scripts de build, servidor local, testes e Supabase.
- `backend/supabase/migrations/` - estrutura da base de dados.
- `relatorios/` - documentacao PAP e evidencias.
- `deploy/` - ficheiros de publicacao.
- `dist/` - resultado gerado pelo build.

## 10. Testes e validacao

Foram usados comandos locais para validar o projeto:

```bash
npm run build
npm run smoke
```

O build gera a pasta `dist/`. O smoke test valida se as principais paginas existem e contem os elementos esperados.

## 11. Limites atuais

- O projeto usa Supabase/PostgreSQL em vez de PHP/MySQL.
- A documentacao deve ser adaptada ao formato final pedido pela escola.
- Algumas funcionalidades dependem de o Supabase estar corretamente configurado.
- A area de administracao e simples e focada em moderacao.

## 12. Conclusao

O BoardSports cumpre o objetivo de criar uma plataforma web responsiva para comunidade de board sports, com mapa interativo, autenticacao, perfis, videos, XP, ranking e moderacao. A solucao usa JavaScript vanilla com bibliotecas externas especificas, mantendo uma estrutura simples e explicavel para apresentacao.

