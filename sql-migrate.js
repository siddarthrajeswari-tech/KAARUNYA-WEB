const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'server', 'routes');
const files = fs.readdirSync(routesDir);

for (const file of files) {
  if (!file.endsWith('.js')) continue;
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Convert handlers to async
  content = content.replace(/router\.(get|post|put|delete|patch)\((['`"][^'`"]+['`"]),\s*\((req,\s*res)\)\s*=>\s*\{/g, "router.$1($2, async (req, res) => {");
  
  // Convert getDb
  content = content.replace(/const db = getDb\(\);/g, "const db = await getDb();");

  // .all()
  content = content.replace(/db\.prepare\(([^)]+)\)\.all\(([^)]+)\)/g, "(await db.query($1, [$2]))[0]");
  content = content.replace(/db\.prepare\(([^)]+)\)\.all\(\)/g, "(await db.query($1))[0]");

  // .get()
  content = content.replace(/db\.prepare\(([^)]+)\)\.get\(([^)]+)\)/g, "(await db.query($1, [$2]))[0][0]");
  content = content.replace(/db\.prepare\(([^)]+)\)\.get\(\)/g, "(await db.query($1))[0][0]");

  // .run()
  content = content.replace(/db\.prepare\(([^)]+)\)\.run\(([^)]+)\)/g, "(await db.execute($1, [$2]))");
  content = content.replace(/db\.prepare\(([^)]+)\)\.run\(\)/g, "(await db.execute($1))");

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Routes converted to async MySQL.');
