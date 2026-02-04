#!/usr/bin/env node

/**
 * BoardSports Inc - Servidor Local de Desenvolvimento
 * Executa um servidor HTTP simples para testar o site localmente
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Se a URL termina com /, servir index.html
  if (pathname === '/' || pathname.endsWith('/')) {
    pathname = pathname === '/' ? '/index.html' : pathname + 'index.html';
  }

  // Caminho do arquivo
  let filePath = path.join(ROOT_DIR, pathname);

  // Prevenir directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Ler o arquivo
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Arquivo não encontrado, tentar index.html para rotas
        const indexPath = path.join(ROOT_DIR, 'index.html');
        fs.readFile(indexPath, (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
            res.end(indexData);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    // Definir Content-Type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Headers para evitar cache
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🏄 BoardSports Inc - Servidor de Desenvolvimento');
  console.log('='.repeat(60));
  console.log();
  console.log(`✓ Servidor iniciado em http://localhost:${PORT}`);
  console.log(`✓ Diretório: ${ROOT_DIR}`);
  console.log();
  console.log('URLs disponíveis:');
  console.log(`  • Login: http://localhost:${PORT}/index.html`);
  console.log(`  • Registo: http://localhost:${PORT}/register.html`);
  console.log(`  • Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log();
  console.log('Pressione Ctrl+C para parar o servidor');
  console.log('='.repeat(60));
  console.log();
});

server.on('error', (err) => {
  console.error('Erro no servidor:', err);
  process.exit(1);
});
