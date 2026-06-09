Entrega PAP - BoardSports
=========================

Projeto: BoardSports
Tipo: Website / aplicacao web para comunidade de board sports
Autor: Tiago Mendes
Data de preparacao: 2026-06-05

Conteudo desta pasta
--------------------

1. produto-final/BoardSports-codigo-fonte.zip
   Ficheiro comprimido com o codigo-fonte do produto final.
   Inclui frontend, backend, configuracao Netlify, package.json, package-lock.json e documentacao do projeto.
   Nao inclui node_modules, .git, dist, .netlify nem ficheiros temporarios.

2. base-dados/BoardSports-base-dados-migrations.sql
   Ficheiro SQL com a estrutura da base de dados a partir das migrations do Supabase.
   Inclui criacao/alteracao de tabelas, funcoes, triggers, policies e dados seed existentes nas migrations.

3. documentacao/MANUAL-UTILIZADOR-ENTREGA.md
   Manual do utilizador com instrucoes de instalacao, configuracao, teste e utilizacao.

4. ACESSOS-SERVICOS-EXTERNOS.txt
   Ficheiro para preencher com acessos de visualizacao ao Netlify e Supabase.
   Deve ser revisto e preenchido antes da entrega ao professor.

Servico online
--------------

Website publicado:
https://riftboardsports.netlify.app

Ultimo deploy feito em producao:
https://6a229fbaf0ab97052ba8cf55--riftboardsports.netlify.app

Notas importantes
-----------------

- O projeto utiliza Supabase como servico externo para autenticacao, base de dados e storage.
- Para cumprir totalmente o enunciado, deve ser disponibilizado ao professor acesso de visualizacao ao projeto Supabase.
- Se o professor exigir dados reais da base de dados e nao apenas a estrutura/migrations, deve ser feita uma exportacao completa pelo painel do Supabase ou pela CLI com permissoes de base de dados.
- Nao colocar passwords reais em repositorios publicos.
