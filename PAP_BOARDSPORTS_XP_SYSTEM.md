# BoardSports XP System

O BoardSports XP System adiciona gamificacao ao projeto PAP com uma logica inspirada em jogos de skate como Tony Hawk. O utilizador ganha XP ao completar spots, validar manobras, criar combos, receber likes e desbloquear conquistas.

## Fontes de XP

| Acao | XP |
| --- | ---: |
| Spot facil validado | 50 |
| Spot medio validado | 120 |
| Spot dificil validado | 250 |
| Manobra facil validada | 25 |
| Manobra media validada | 75 |
| Manobra dificil validada | 150 |
| Combo validado | Soma das manobras vezes multiplicador |
| Submeter novo spot aprovado | 100 |
| Receber like numa publicacao | 2 |
| Publicacao destacada por admin | 300 |

## Niveis

| Nivel | Nome | XP necessario | Tipo |
| ---: | --- | ---: | --- |
| 1 | Rookie Rider | 0 | principiante |
| 2 | Street Starter | 250 | principiante |
| 3 | Local Shredder | 600 | principiante |
| 4 | Flow Rider | 1000 | intermedio |
| 5 | Trick Hunter | 1600 | intermedio |
| 6 | Spot Explorer | 2400 | intermedio |
| 7 | Combo Maker | 3500 | intermedio |
| 8 | Style Master | 5000 | pro |
| 9 | Pro Rider | 7500 | pro |
| 10 | BoardSports Legend | 10000 | pro |

## Combos

Um combo e composto por varias manobras em sequencia. O XP base e a soma do XP das manobras, depois aplica-se o multiplicador:

| Numero de manobras | Multiplicador |
| ---: | ---: |
| 2 | x1.2 |
| 3 | x1.5 |
| 4 | x2 |
| 5 ou mais | x3 |

Exemplo: Kickflip + Manual + Boardslide = 175 XP base. Como tem 3 manobras, aplica x1.5 e fica 262 XP.

## Validacao anti-batota

O XP nunca e atribuido automaticamente no momento da submissao. O fluxo e:

```text
Pendente -> Validada -> XP atribuido
Pendente -> Rejeitada -> 0 XP
```

Cada submissao guarda prova, spot, modalidade, manobra, data, latitude, longitude e distancia ao spot. Submissoes a mais de 100 metros do spot ficam marcadas como suspeitas no painel de moderacao.

Regras principais:

- A mesma manobra no mesmo spot so da XP uma vez por utilizador.
- O mesmo spot so pode ser completado uma vez por utilizador.
- Admins validam ou rejeitam provas antes do XP entrar.
- Rejeicoes guardam motivo.
- Denuncias permitem reportar submissões falsas.
- Likes dao pouco XP para nao dominar o ranking.

## Tabelas principais

- `profiles`: guarda `xp_total`, `nivel_xp` e `tipo_user`.
- `manobras`: manobras por modalidade, dificuldade e XP.
- `submissoes`: provas pendentes, validadas ou rejeitadas.
- `xp_logs`: historico de tudo o que atribui XP.
- `combos` e `combo_manobras`: sequencias de manobras.
- `badges` e `user_badges`: conquistas desbloqueadas.
- `denuncias`: reportes de provas suspeitas.

O SQL completo esta em `boardsports_xp_system.sql`.
