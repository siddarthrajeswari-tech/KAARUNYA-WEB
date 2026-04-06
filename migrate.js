const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'server', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. const db = getDb(); -> const db = await getDb();
    code = code.replace(/const db = getDb\(\);/g, 'const db = await getDb();');

    // Make route handlers async
    code = code.replace(/router\.(get|post|put|delete|patch)\(([^,]+),\s*(async\s*)?\((req,\s*res.*?)\)\s*=>\s*\{/g, (match, method, route, isAsync, args) => {
        if (isAsync) return match;
        return `router.${method}(${route}, async (${args}) => {`;
    });

    // Make function logActivity async
    code = code.replace(/function logActivity\((.*?)\)\s*\{/g, 'async function logActivity($1) {');

    // SQLite `.lastInsertRowid` -> `.insertId`
    code = code.replace(/\.lastInsertRowid/g, '.insertId');

    // Replace db.prepare(...).all(...)
    // e.g. const alerts = db.prepare(sql).all(...params); -> const [alerts] = await db.query(sql, [...params]);
    // This is tricky for regex if LHS is `const x = ` or `return `
    code = code.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*db\.prepare\((.*?)\)\.all\((.*?)\);/gs, (match, varName, sql, params) => {
        const p = params.trim() ? `[${params}]` : '';
        return `const [${varName.trim()}] = await db.query(${sql}${p ? ', ' + p : ''});`;
    });
    
    // without var
    code = code.replace(/db\.prepare\((.*?)\)\.all\((.*?)\)(;?)/gs, (match, sql, params, semi) => {
        const p = params.trim() ? `[${params}]` : '';
        return `(await db.query(${sql}${p ? ', ' + p : ''}))[0]${semi}`;
    });

    // Replace db.prepare(...).get(...)
    code = code.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*db\.prepare\((.*?)\)\.get\((.*?)\)(?:\.([a-zA-Z0-9_]+))?;/gs, (match, varName, sql, params, property) => {
        const p = params.trim() ? `[${params}]` : '';
        let res = `const [${varName.trim()}_rows] = await db.query(${sql}${p ? ', ' + p : ''});\n        const ${varName.trim()} = ${varName.trim()}_rows[0]${property ? '.' + property : ''};`;
        return res;
    });

    // without var (if any)
    code = code.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)(?:\.([a-zA-Z0-9_]+))?(;?)/gs, (match, sql, params, property, semi) => {
         const p = params.trim() ? `[${params}]` : '';
         return `(await db.query(${sql}${p ? ', ' + p : ''}))[0][0]${property ? '.' + property : ''}${semi}`;
    });

    // Replace db.prepare(...).run(...)
    code = code.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*db\.prepare\((.*?)\)\.run\((.*?)\);/gs, (match, varName, sql, params) => {
        const p = params.trim() ? `[${params}]` : '';
        return `const [${varName.trim()}] = await db.query(${sql}${p ? ', ' + p : ''});`;
    });

    // direct run
    code = code.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)(;?)/gs, (match, sql, params, semi) => {
        const p = params.trim() ? `[${params}]` : '';
        return `await db.query(${sql}${p ? ', ' + p : ''})${semi}`;
    });

    // Handle TRANSACTIONS
    // from: db.transaction(() => { ... })();
    // to: const conn = await db.getConnection(); await conn.beginTransaction(); try { ... await conn.commit(); } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
    // This is hard to do with pure regex. But let's see how many transactions there are.

    fs.writeFileSync(filePath, code);
});
console.log('Migration step 1 complete');
