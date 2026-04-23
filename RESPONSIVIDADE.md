# Responsividade - BoardSports

## Estado atual

O frontend esta preparado para desktop, tablet e mobile com:

- `viewport` configurado nas paginas principais
- `responsive.css` para ajustes globais
- `responsive.js` para o comportamento do dock/menu em ecras pequenos
- layouts adaptativos nas areas de login, dashboard, mercado, perfil, empresa, mapa e moderacao

## Breakpoints usados

```css
@media (max-width: 1024px) { ... }
@media (max-width: 768px) { ... }
@media (max-width: 560px) { ... }
@media (max-width: 480px) { ... }
```

## Paginas atualizadas

- `index.html`
- `login.html`
- `register.html`
- `dashboard.html`
- `produtos.html`
- `modalidades.html`
- `perfil.html`
- `empresa.html`
- `moderacao.html`
- `mapa.html`
- `verify-email.html`

## Notas de manutencao

- Sempre incluir `css/responsive.css` nas novas paginas.
- Sempre incluir `js/responsive.js` para o comportamento do dock responsivo.
- Em formulários, usar `autocomplete` coerente para melhorar UX mobile.
- Em novos componentes, preferir grids fluidos e larguras baseadas em `min()` ou `clamp()`.

## Teste rapido

1. Arrancar o servidor local com `node run_server.js`.
2. Abrir `http://127.0.0.1:8000`.
3. Validar os breakpoints no DevTools.
4. Correr `node smoke_test.js` para uma verificacao estrutural minima.
