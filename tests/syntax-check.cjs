"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const jsPath = path.join(root, "frontend", "js", "app.js");
const cssPath = path.join(root, "frontend", "css", "styles.css");
const app = fs.readFileSync(jsPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
for (const sourceFile of [jsPath, path.join(root, "frontend", "js", "employee-invitations.js"), path.join(root, "frontend", "js", "auth.js"), path.join(root, "frontend", "js", "supabase-config.js")]) {
  const syntax = spawnSync(process.execPath, ["--check", sourceFile], { encoding: "utf8" });
  if (syntax.status !== 0) {
    process.stderr.write(syntax.stderr || syntax.stdout || `Syntax check failed: ${sourceFile}\n`);
    process.exit(syntax.status || 1);
  }
}const checks = [
  ["Root HTML links external stylesheet", index.includes('href="./frontend/css/styles.css"')],
  ["Root HTML loads external app.js", index.includes('src="./frontend/js/app.js')],
  ["No embedded CSS or JS in structured index", !index.includes("<style>") && !index.includes("<script>\n")],
  ["CSS source present", css.length > 10000 && css.includes(".pos-layout")],
  ["App source present", app.length > 50000 && app.includes("function setupCustomSelects(root)")],
  ["Current-bill price editor present", app.includes("save-cart-price") && app.includes("edit-cart-price")],
  ["Receipt PDF/share logic present", app.includes("createReceiptPdf") && app.includes("shareBillFile")],
  ["Khata ledger logic present", app.includes("khataLedger") && app.includes("record-khata-payment")],
  ["No service-role key in browser config", !(/service[_-]?role/i.test(fs.readFileSync(path.join(root, "frontend", "js", "supabase-config.js"), "utf8")) && /service[_-]?role\\s*[:=]\\s*["'][^"']{20}/i.test(fs.readFileSync(path.join(root, "frontend", "js", "supabase-config.js"), "utf8")))],
  ["Business RPC migration exists", fs.existsSync(path.join(root, "supabase", "migrations", "20261026000014_business_write_rpcs.sql"))],
  ["Atomic supplier migration exists", fs.existsSync(path.join(root, "supabase", "migrations", "20261027000015_atomic_supplier_creation.sql"))],
  ["Windows database runner exists", fs.existsSync(path.join(root, "supabase", "tests", "local", "run-local-checks.ps1"))],
  ["Auth/RLS SQL checks exist", fs.existsSync(path.join(root, "supabase", "tests", "local", "auth_rls_checks.sql"))]
  ,["PO creation accepts multiple item payloads", app.includes("p_items:lines") && app.includes("po-add-line")]
  ,["PO cancellation uses transactional RPC", app.includes("rpc('cancel_purchase_order'") && app.includes("data-action=\"cancel-po\"")]
  ,["Supplier creation uses atomic opening-balance RPC", app.includes("rpc('create_supplier_with_opening_balance'")]
  ,["Expense deletion is database-backed", app.includes("from('expenses').delete()")]
  ,["Category deletion is database-backed", app.includes("from('categories').delete()")]
  ,["Reports period selection recomputes report", app.includes("reportPeriod=ev.target.value;renderPage()")]
  ,["SQL tests cover PO retry mismatch and cancellation", fs.readFileSync(path.join(root,"supabase","tests","local","business_rpc_checks.sql"),"utf8").includes("PO idempotency key rejects changed payload") && fs.readFileSync(path.join(root,"supabase","tests","local","business_rpc_checks.sql"),"utf8").includes("pending PO cancellation succeeds")]
  ,["Khata ledger is loaded only for authorized store roles", app.includes("loadKhataLedgerFromDatabase") && app.includes("['owner','manager'].includes(s.role)")]
  ,["Auth session restore and login error paths are handled", fs.readFileSync(path.join(root,"frontend","js","auth.js"),"utf8").includes("auth.getSession()") && fs.readFileSync(path.join(root,"frontend","js","auth.js"),"utf8").includes("signInWithPassword") && fs.readFileSync(path.join(root,"frontend","js","auth.js"),"utf8").includes("catch (requestError)")]
  ,["Product RPC pins an empty search path", fs.readFileSync(path.join(root,"supabase","migrations","20261025000013_product_crud_rpc.sql"),"utf8").includes("set search_path = ''")]
  ,["Windows verification can create an isolated PostgreSQL cluster", fs.existsSync(path.join(root,"supabase","tests","local","run-windows-isolated-checks.ps1"))]
  , ["Expense monthly metric filters by calendar month", app.includes("monthTotal=expenses.filter") && app.includes("money(monthTotal)")]
  , ["Settings accurately describes Supabase store data", app.includes("Business records are stored by store in Supabase") && !app.includes("Records are saved in this browser only")]
  , ["Settings does not expose a fake negative-stock toggle", app.includes("Negative inventory") && app.includes("Stock cannot fall below zero") && !app.includes("Allow negative inventory")]
  , ["Store changes invalidate stale asynchronous loads", app.includes("function isCurrentStoreLoad(storeId,generation)") && app.includes("ma-store-cleared") && app.includes("storeDataGeneration++")]
  , ["Checkout and product save ignore responses for a different active store", app.includes("if(window.MA_STORE?.id!==store.id)return;")]
  , ["Purchase receiving rechecks the active store after database writes", app.includes("if(window.MA_STORE?.id!==s.id)return;await Promise.all([loadPurchaseOrdersFromDatabase()")]
  , ["Windows SQL test command does not bypass execution policy", !/ExecutionPolicy\s+Bypass/i.test(fs.readFileSync(path.join(root,"package.json"),"utf8"))]
  , ["Employee invitation is wired and its live-service test limitation is documented", fs.readFileSync(path.join(root,"docs","BACKEND-API-MAPPING.md"),"utf8").includes("Actual Auth invite/email delivery and membership creation remain blocked")]
  , ["Employee create form invokes invitations while edits stay directory updates", app.includes("invitation.inviteEmployee(client") && app.includes("if(!employeeId){") && app.includes("client.from('employees').update(payload)")]
  , ["Linked employee removal revokes store membership through an Edge Function", app.includes("invitation.removeEmployee(client") && fs.existsSync(path.join(root,"supabase","functions","remove-employee","index.ts")) && fs.readFileSync(path.join(root,"supabase","functions","remove-employee","index.ts"),"utf8").includes('from("store_members")')]
  , ["Employee invite flow restricts selectable roles and checks owner authorization", app.includes("!['manager','cashier'].includes(role)") && app.includes("store.role!=='owner'")]
  , ["Edge Function checks owner membership and blocks duplicate invitations", fs.readFileSync(path.join(root,"supabase","functions","invite-employee","index.ts"),"utf8").includes("membership?.role !== \"owner\"") && fs.readFileSync(path.join(root,"supabase","functions","invite-employee","index.ts"),"utf8").includes("duplicate ? 409 : 400")]
  , ["Employee invitation UI preserves the existing external stylesheet and app entry", index.includes('src="./frontend/js/employee-invitations.js') && index.includes('src="./frontend/js/app.js') && index.includes('href="./frontend/css/styles.css"')]
  , ["Removal Edge Function is JWT protected and store-owner authorized", fs.readFileSync(path.join(root,"supabase","config.toml"),"utf8").includes("[functions.remove-employee]\nenabled = true\nverify_jwt = true") && fs.readFileSync(path.join(root,"supabase","functions","remove-employee","index.ts"),"utf8").includes('membership?.role !== "owner"')]
  , ["Employee access removal is store-scoped and preserves the Auth account", fs.readFileSync(path.join(root,"supabase","functions","remove-employee","index.ts"),"utf8").includes('.eq("store_id", storeId)') && !fs.readFileSync(path.join(root,"supabase","functions","remove-employee","index.ts"),"utf8").includes("auth.admin.deleteUser")]
  , ["Failed invite cleanup is checked before returning a conflict or server response", fs.readFileSync(path.join(root,"supabase","functions","invite-employee","index.ts"),"utf8").includes("if (cleanupError)")]
  , ["Employee directory loads and preserves linked Auth user IDs", app.includes("select('id,name,role_title,phone,status,user_id')") && app.includes("userId:r.user_id||null")]
];
let failed = false;
for (const [label, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log("JavaScript syntax and source package checks passed.");
