const fs = require('fs');
const content = fs.readFileSync('frontend/js/db_utils.js', 'utf8');

// Find all export statements
const exportRegex = /export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g;
let match;
const exports = {};

while ((match = exportRegex.exec(content)) !== null) {
  const name = match[1];
  if (!exports[name]) {
    exports[name] = [];
  }
  const lineNum = content.substring(0, match.index).split('\n').length;
  exports[name].push(lineNum);
}

// Find duplicates
Object.entries(exports).forEach(([name, lines]) => {
  if (lines.length > 1) {
    console.log(`DUPLICATE: ${name} on lines ${lines.join(', ')}`);
  } else if (name.includes('obterGaleria')) {
    console.log(`OK: ${name} on line ${lines[0]}`);
  }
});
