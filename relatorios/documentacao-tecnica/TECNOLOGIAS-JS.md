# Tecnologia JavaScript usada

## Decisao tecnica

O projeto BoardSports usa **JavaScript vanilla**, ou seja, JavaScript puro sem frameworks como React, Vue, Angular, Svelte, Next.js ou Nuxt.

Esta escolha foi feita porque o projeto e composto por paginas HTML independentes, cada uma com um ficheiro JavaScript proprio. Assim, a estrutura fica mais simples, direta e facil de explicar.

## Bibliotecas externas usadas

### Supabase JS SDK

Usado para:

- Login.
- Registo.
- Recuperacao de password.
- Sessao do utilizador.
- Leitura e escrita na base de dados.
- Storage de imagens.

Ficheiro principal:

`frontend/js/supabase.js`

### Leaflet

Usado para:

- Renderizar o mapa.
- Mostrar marcadores de spots.
- Permitir foco em coordenadas.
- Trabalhar com localizacoes.

Ficheiros principais:

- `frontend/mapa.html`
- `frontend/js/mapa_page.js`

### GSAP

Usado para:

- Animacoes da pagina inicial.
- Efeitos de entrada.
- Interacoes visuais com scroll.

Ficheiros principais:

- `frontend/index.html`
- `frontend/js/landing_page.js`

## Porque nao foi usada uma framework JS

Nao foi usada framework porque nao era obrigatorio e porque o projeto ja tinha uma estrutura funcional em HTML, CSS e JavaScript puro.

Adicionar uma framework nesta fase iria aumentar a complexidade, obrigar a refatorar varias paginas e nao resolver diretamente os objetivos principais da PAP.

## Frase para usar na apresentacao

> O projeto foi desenvolvido com JavaScript vanilla, complementado por bibliotecas externas especificas. Usei Leaflet para o mapa interativo, GSAP para animacoes e Supabase JS SDK para autenticacao e comunicacao com a base de dados. Como a aplicacao e composta por paginas HTML independentes, nao foi necessario usar uma framework JavaScript pesada.

