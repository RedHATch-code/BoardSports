# Manual do Utilizador - BoardSports

## 1. Identificacao

**Projeto:** BoardSports  
**Tipo:** Website / aplicacao web  
**URL online:** https://riftboardsports.netlify.app  

O BoardSports e uma plataforma web para a comunidade de desportos de prancha. Permite consultar spots, publicar videos, gerir perfil, submeter XP, consultar rankings e usar uma area de moderacao.

## 2. Requisitos

Para utilizar a versao online:

- Navegador moderno, como Google Chrome, Microsoft Edge ou Firefox.
- Ligacao a Internet.

Para executar localmente:

- Node.js instalado.
- Navegador moderno.
- Projeto Supabase configurado.
- Ficheiro `frontend/env.js` com as variaveis publicas do Supabase, ou variaveis definidas no ambiente.

## 3. Instalacao local

1. Extrair o ficheiro `BoardSports-codigo-fonte.zip`.
2. Abrir a pasta do projeto.
3. Instalar dependencias:

```bash
npm install
```

4. Criar/configurar o ficheiro `frontend/env.js`, usando `frontend/env.example.js` como base.
5. Iniciar o servidor local:

```bash
npm start
```

6. Abrir no navegador:

```text
http://localhost:8000
```

## 4. Build e testes

Para gerar a versao final do website:

```bash
npm run build
```

Este comando cria a pasta `dist/`.

Para validar as paginas principais:

```bash
npm run smoke
```

O smoke test confirma se as paginas principais existem e se contem elementos esperados.

## 5. Criar conta

1. Abrir a pagina `register.html`.
2. Preencher nome, email e palavra-passe.
3. Confirmar a palavra-passe.
4. Submeter o registo.
5. Confirmar o email, se a verificacao estiver ativa no Supabase.

## 6. Fazer login

1. Abrir `login.html`.
2. Inserir email e palavra-passe.
3. Clicar em entrar.

Depois do login, o utilizador pode aceder ao perfil, mapa, publicacoes, videos, XP e notificacoes.

## 7. Recuperar palavra-passe

1. Abrir `login.html`.
2. Escolher a opcao de recuperacao de palavra-passe.
3. Inserir o email da conta.
4. Abrir o link recebido por email.
5. Definir a nova palavra-passe em `reset-password.html`.

## 8. Usar o mapa

1. Abrir `mapa.html`.
2. Consultar os spots no mapa.
3. Usar filtros por modalidade, categoria, pais ou criador.
4. Clicar num spot para ver mais informacoes.
5. Abrir a pagina de detalhe do spot quando necessario.

## 9. Criar spot

1. Fazer login.
2. Abrir `mapa.html`.
3. Escolher a opcao para criar novo spot.
4. Preencher os dados pedidos, como nome, descricao, modalidade, categoria, dificuldade e coordenadas.
5. Guardar.

Dependendo das regras de moderacao, o spot pode ficar pendente de aprovacao.

## 10. Publicar video

1. Abrir um spot.
2. Escolher a opcao de publicar video.
3. Inserir o link do video.
4. Adicionar descricao ou legenda.
5. Submeter.

## 11. Submeter XP

1. Abrir um spot.
2. Escolher a opcao de submissao XP.
3. Indicar a prova ou link associado.
4. Enviar para validacao.

O XP deve ser atribuido depois da validacao por um administrador.

## 12. Perfil

Na pagina `perfil.html`, o utilizador pode consultar:

- Dados do perfil.
- Foto/avatar.
- Publicacoes.
- Seguidores.
- Mensagens.
- Resumo de XP.

Na pagina `configuracao.html`, o utilizador pode editar dados do perfil e alterar configuracoes.

## 13. Videos

Na pagina `videos.html`, o utilizador pode:

- Consultar videos da comunidade.
- Pesquisar videos.
- Filtrar por modalidade.
- Distinguir formatos curtos e longos.

## 14. Leaderboard

Na pagina `leaderboard.html`, o utilizador pode consultar rankings de XP e comparar o progresso com outros riders.

## 15. Moderacao

A pagina `moderacao.html` e destinada a administradores.

Nesta area e possivel:

- Aprovar ou rejeitar spots pendentes.
- Validar submissoes XP.
- Rever denuncias.
- Gerir conteudos reportados.

Para testar esta area e necessario usar uma conta com permissao de administrador.

## 16. Suporte

Email de suporte:

```text
riftsuport.tm@gmail.com
```

## 17. Observacoes finais

Algumas funcionalidades dependem da configuracao correta do Supabase, especialmente autenticacao, base de dados, envio de emails e storage. Para avaliacao completa, deve ser disponibilizado acesso de visualizacao ao projeto Supabase e, se necessario, uma conta de teste com privilegios de administrador.
