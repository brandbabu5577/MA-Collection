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
const run = spawnSync(process.execPath, ["--check", jsPath], { encoding: "utf8" });
if (run.status !== 0) { process.stderr.write(run.stderr || run.stdout); process.exit(run.status || 1); }
const checks = [
  ["Root HTML links external stylesheet", index.includes('href="./frontend/css/styles.css"')],
  ["Root HTML loads external app.js", index.includes('src="./frontend/js/app.js"')],
  ["No embedded CSS or JS in structured index", !index.includes("<style>") && !index.includes("<script>\n")],
  ["CSS source present", css.length > 10000 && css.includes(".pos-layout")],
  ["App source present", app.length > 50000 && app.includes("function setupCustomSelects(root)")],
  ["Current-bill price editor present", app.includes("save-cart-price") && app.includes("edit-cart-price")],
  ["Receipt PDF/share logic present", app.includes("createReceiptPdf") && app.includes("shareBillFile")],
  ["Khata ledger logic present", app.includes("khataLedger") && app.includes("record-khata-payment")],
  ["Backend limitation remains explicit", app.includes("does not connect to a backend, database, authentication provider, or payment service")]
];
let failed = false;
for (const [label, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log("JavaScript syntax and source package checks passed.");
