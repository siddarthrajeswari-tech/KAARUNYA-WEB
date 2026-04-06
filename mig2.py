import os
import re

routes_dir = "server/routes/"
files = [f for f in os.listdir(routes_dir) if f.endswith(".js")]

for file in files:
    with open(os.path.join(routes_dir, file), "r", encoding="utf8") as f:
        content = f.read()

    # 1. const db = getDb(); -> const db = await getDb();
    content = re.sub(r"const db = getDb\(\);", r"const db = await getDb();", content)

    # 2. Add async to router callbacks
    content = re.sub(
        r"router\.(get|post|put|delete|patch)\(([^,]+),\s*(async\s*)?\((req,\s*res.*?)\)\s*=>\s*\{",
        r"router.\1(\2, async (\4) => {",
        content
    )

    # 3. fix logActivity signature
    content = content.replace("function logActivity(db, action, entityType, entityId, description, userId) {",
                               "async function logActivity(db, action, entityType, entityId, description, userId) {")
    
    # 4. sqlite .lastInsertRowid -> .insertId
    content = content.replace(".lastInsertRowid", ".insertId")
    
    # 5. Queries:
    # A) db.prepare(...).all(...)
    def repl_all(m):
        assign, var_name, sql, params = m.groups()
        params = params.strip()
        args = f"[{params}]" if params else ""
        if params.startswith("..."):
            args = params.replace("...", "")
        
        ret = f"await db.query({sql}" + (f", {args}" if args else "") + ")"
        
        if not assign:
            return f"({ret})[0];"
            
        kw = assign.replace(var_name, "").replace("=", "").strip()
        kw = kw + " " if kw else ""
        return f"{kw}[{var_name}] = {ret};"
        
    content = re.sub(r"((?:(?:const|let|var)\s+)?(\w+)\s*=\s*)?db\.prepare\((.*?)\)\.all\((.*?)\);", repl_all, content, flags=re.DOTALL)

    # B) db.prepare(...).get(...)
    def repl_get(m):
        assign, var_name, sql, params, prop = m.groups()
        params = params.strip()
        args = f"[{params}]" if params else ""
        if params.startswith("..."):
            args = params.replace("...", "")
            
        ret = f"await db.query({sql}" + (f", {args}" if args else "") + ")"
        
        if not assign:
            return f"({ret})[0][0]" + (f".{prop}" if prop else "") + ";"
            
        kw = assign.replace(var_name, "").replace("=", "").strip()
        kw = kw + " " if kw else ""
        prop_suffix = f".{prop}" if prop else ""
        return f"{kw}[{var_name}_rows] = {ret};\n        {kw}{var_name} = {var_name}_rows[0]{prop_suffix};"
        
    content = re.sub(r"((?:(?:const|let|var)\s+)?(\w+)\s*=\s*)?db\.prepare\((.*?)\)\.get\((.*?)\)(?:\.(\w+))?;", repl_get, content, flags=re.DOTALL)
    
    # C) db.prepare(...).run(...)
    def repl_run(m):
        assign, var_name, sql, params = m.groups()
        params = params.strip()
        args = f"[{params}]" if params else ""
        if params.startswith("..."):
            args = params.replace("...", "")
            
        ret = f"await db.query({sql}" + (f", {args}" if args else "") + ")"
        
        if not assign:
            return f"{ret};"
            
        kw = assign.replace(var_name, "").replace("=", "").strip()
        kw = kw + " " if kw else ""
        return f"{kw}[{var_name}] = {ret};"
        
    content = re.sub(r"((?:(?:const|let|var)\s+)?(\w+)\s*=\s*)?db\.prepare\((.*?)\)\.run\((.*?)\);", repl_run, content, flags=re.DOTALL)



    # Note: sqlite_sequence handling shouldn't cause errors but not strictly required.
    
    with open(os.path.join(routes_dir, file), "w", encoding="utf8") as f:
        f.write(content)

print("Done mig2")
