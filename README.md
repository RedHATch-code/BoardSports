# BoardSports

Projeto PAP desenvolvido como website/aplicacao web para uma comunidade de board sports.

## Estrutura do projeto

```text
BoardSportsInc TM2026/
  frontend/                 Codigo do website
    assets/images/          Imagens usadas pela interface
    css/                    Ficheiros de estilos
    js/                     Logica JavaScript das paginas
    *.html                  Paginas do website

  backend/                  Scripts e configuracao tecnica
    scripts/                Scripts auxiliares de build
    supabase/               Configuracao e migrations da base de dados
    run_server.js           Servidor local de desenvolvimento
    smoke_test.js           Teste rapido das paginas principais

  relatorios/               Documentacao da PAP
    documentacao-tecnica/   Documentacao tecnica complementar
    evidencias-visuais/     Capturas de ecra e validacoes visuais
    MANUAL-TECNICO.md       Manual tecnico
    MANUAL-UTILIZADOR.md    Manual de utilizador
    RELATORIO-PAP.md        Relatorio principal

  deploy/                   Artefactos de publicacao alternativos
    packages/               Pacotes de upload, quando aplicavel

  entrega-pap/              Pasta pronta para entrega final
    base-dados/             Exportacao SQL/migrations da base de dados
    documentacao/           Manual do utilizador atualizado para entrega
    produto-final/          Zip com o codigo-fonte do produto final

  dist/                     Build gerado automaticamente por npm run build
  netlify.toml              Configuracao de deploy Netlify
  package.json              Scripts npm do projeto
```

## Comandos principais

```bash
npm install
npm start
npm run build
npm run smoke
```

## Entrega PAP

Os ficheiros finais para entregar estao em `entrega-pap/`.

O ficheiro principal de codigo-fonte e:

```text
entrega-pap/produto-final/BoardSports-codigo-fonte.zip
```

O SQL da base de dados esta em:

```text
entrega-pap/base-dados/BoardSports-base-dados-migrations.sql
```

Antes da entrega, preencher:

```text
entrega-pap/ACESSOS-SERVICOS-EXTERNOS.txt
```

## Website publicado

```text
https://riftboardsports.netlify.app
```
