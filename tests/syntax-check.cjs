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
for (const f of [jsPath, path.join(root, "frontend", "js", "auth.js"), path.join(root, "server.js")]) {
  const run = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (run.status !== 0) { process.stderr.write(run.stderr || run.stdout); process.exit(run.status || 1); }
}
const authSrc = fs.readFileSync(path.join(root, "frontend", "js", "auth.js"), "utf8");
const clientSrc = fs.readFileSync(path.join(root, "frontend", "js", "supabase-client.js"), "utf8");
const checks = [
  ["Root HTML links external stylesheet", index.includes('href="./frontend/css/styles.css"')],
  ["Root HTML loads external app.js", index.includes('src="./frontend/js/app.js"')],
  ["No embedded CSS or JS in structured index", !index.includes("<style>") && !index.includes("<script>\n")],
  ["CSS source present", css.length > 10000 && css.includes(".pos-layout")],
  ["App source present", app.length > 50000 && app.includes("function setupCustomSelects(root)")],
  ["Current-bill price editor present", app.includes("save-cart-price") && app.includes("edit-cart-price")],
  ["Receipt PDF/share logic present", app.includes("createReceiptPdf") && app.includes("shareBillFile")],
  ["Khata ledger logic present", app.includes("khataLedger") && app.includes("record-khata-payment")],
  ["Checkout goes through create_sale RPC", app.includes("rpc('create_sale'")],
  ["Khata payment goes through record_khata_payment RPC", app.includes("rpc('record_khata_payment'")],
  ["Stock adjustment goes through adjust_stock RPC", app.includes("rpc('adjust_stock'")],
  ["Product costs read from products_costs view (no missing RPC)", app.includes("from('products_costs')") && !app.includes("get_product_costs")],
  ["No localStorage writes once a store is connected", app.includes("persistState=function(){if(dbCtx())return;")]
  ,["auth.js has no mis-encoded characters", !/\u00e2\u20ac|\u00c3/.test(authSrc)]
  ,["Placeholder Supabase config is detected", clientSrc.includes("isPlaceholderConfig")]
  ,["No service-role key in frontend", !/service_role|sb_secret_/.test(app + authSrc + clientSrc)]
];
let failed = false;
for (const [label, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log("JavaScript syntax and source package checks passed.");
