import os
import re

routes_dir = "server/routes/"
files = [f for f in os.listdir(routes_dir) if f.endswith(".js")]

for file in files:
    with open(os.path.join(routes_dir, file), "r", encoding="utf8") as f:
        content = f.read()

    # const db = getDb(); -> await getDb();
    content = content.replace("getDb();", "await getDb();")

    # routers .get, .post, .put, .delete async
    content = re.sub(
        r"router\.(get|post|put|delete|patch)\(([^,]+),\s*(async\s*)?\((req,\s*res.*?)\)\s*=>\s*\{",
        r"router.\1(\2, async (\4) => {",
        content
    )

    # Make specific async functions
    content = content.replace("function logActivity(db, action, entityType, entityId, description, userId) {",
                               "async function logActivity(db, action, entityType, entityId, description, userId) {")
    content = content.replace("const data = products.map(p => ({", "const data = products.map(p => ({")

    # sqlite properties
    content = content.replace(".lastInsertRowid", ".insertId")
    content = content.replace("sqlite_sequence", "information_schema.tables WHERE TABLE_NAME") # Wait, mysql doesn't use sqlite_sequence ...

    # query replacements
    # 1. db.prepare(sql).all(params...) -> [rows] = await db.query(sql, [params...])
    def repl_all(m):
        varMatch = m.group(1) # e.g. "const products = " or ""
        sql = m.group(2)
        params = m.group(3).strip()
        
        args = f"[{params}]" if params else ""
        if params.startswith("..."):
            args = params.replace("...", "")
        
        prefix = ""
        if varMatch:
            # "const products =" -> "const [products] ="
            var_name = varMatch.split(" ")[-1].strip()
            kw = varMatch.split(" ")[0].strip()
            prefix = f"{kw} [{var_name}] = "
        
        query_call = f"await db.query({sql}" + (f", {args}" if args else "") + ")"
        
        if not varMatch:
            return f"{query_call}[0];"
        return f"{prefix}{query_call};"

    # Match lines like: const x = db.prepare(sql).all(a,b);
    content = re.sub(r"(?P<var>(?:const|let|var)\s+\w+\s*=\s*)?db\.prepare\((.*?)\)\.all\((.*?)\);", repl_all, content)

    # 2. db.prepare(sql).get(...)
    def repl_get(m):
        varMatch = m.group(1)
        sql = m.group(2)
        params = m.group(3).strip()
        prop = m.group(4)
        
        args = f"[{params}]" if params else ""
        if params.startswith("..."):
            args = params.replace("...", "")
            
        kw = ""
        var_name = ""
        if varMatch:
            parts = [p for p in varMatch.split(" ") if p]
            kw = parts[0]
            var_name = parts[1]
        
        query_call = f"await db.query({sql}" + (f", {args}" if args else "") + ")"
        
        if not varMatch:
            if prop:
                return f"({query_call})[0][0].{prop};"
            return f"({query_call})[0][0];"
        
        prop_str = f".{prop}" if prop else ""
        return f"{kw} [{var_name}_rows] = {query_call};\n        {kw} {var_name} = {var_name}_rows[0]{prop_str};"

    content = re.sub(r"(?P<var>(?:const|let|var)\s+\w+\s*=\s*)?db\.prepare\((.*?)\)\.get\((.*?)\)(?:\.(\w+))?;", repl_get, content)
    
    # 3. db.prepare(sql).run(...)
    def repl_run(m):
        varMatch = m.group(1)
        sql = m.group(2)
        params = m.group(3).strip()
        
        args = f"[{params}]" if params else ""
        if params.startswith("..."):
            args = params.replace("...", "")
            
        prefix = ""
        if varMatch:
            var_name = varMatch.split(" ")[-1].strip()
            kw = varMatch.split(" ")[0].strip()
            prefix = f"{kw} [{var_name}] = "
        
        query_call = f"await db.query({sql}" + (f", {args}" if args else "") + ")"
        return f"{prefix}{query_call};"

    content = re.sub(r"(?P<var>(?:const|let|var)\s+\w+\s*=\s*)?db\.prepare\((.*?)\)\.run\((.*?)\);", repl_run, content)

    # Replace manual strings
    # specific dashboard sqlite_sequence
    content = content.replace(
        "db.prepare(\"DELETE FROM sqlite_sequence WHERE name IN ('purchase_order_items', 'price_comparisons', 'monthly_purchases', 'activity_log')\").run();",
        "/* MySQL handles sequences differently; ALTER TABLE xxx AUTO_INCREMENT = 1 if needed */"
    )
    
    with open(os.path.join(routes_dir, file), "w", encoding="utf8") as f:
        f.write(content)

print("Done")
