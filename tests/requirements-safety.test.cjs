"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "frontend", "js", "app.js"), "utf8");

test("Share Bill reuses an existing sale (lastReceipt) and never calls checkout/create_sale", () => {
  const shareBillIdx = app.indexOf("case 'share-bill':");
  assert.ok(shareBillIdx >= 0, "share-bill handler present");
  const branch = app.slice(shareBillIdx, shareBillIdx + 400);
  assert.ok(branch.includes("shareBillFile("), "share-bill invokes shareBillFile");
  assert.ok(!branch.includes("checkout("), "share-bill does not call checkout");
  assert.ok(!branch.includes("create_sale"), "share-bill does not call create_sale");
  assert.ok(branch.includes("lastReceipt"), "share-bill prefers lastReceipt");
});

test("Complete Sale has a frontend double-submit guard", () => {
  assert.ok(app.includes("let checkoutBusy=false"), "checkoutBusy guard declared");
  assert.ok(app.includes("if(checkoutBusy){return;}"), "checkoutBusy early return present");
  assert.ok(app.includes("checkoutBusy=true"), "checkoutBusy set during RPC");
  assert.ok(app.includes("checkoutBusy=false"), "checkoutBusy reset in finally");
  assert.ok(app.includes("disabled=true"), "checkout button disabled during RPC");
  assert.ok(app.includes("disabled=false"), "checkout button restored after RPC");
});

test("Post-sale WhatsApp offer uses lastReceipt and requires user action", () => {
  assert.ok(app.includes("data-action=\"share-bill\""), "share-bill action offered after sale");
  assert.ok(app.includes("Send via WhatsApp"), "WhatsApp offer label present");
  assert.ok(app.includes("Not now"), "decline option present");
});

test("Custom/Other category with user-entered name is supported", () => {
  assert.ok(app.includes("'Custom/Other'"), "Custom/Other category registered");
  assert.ok(app.includes("customCategory"), "custom category input field present");
  assert.ok(app.includes("Enter a custom category name."), "custom category validation present");
  assert.ok(app.includes("edit?field('Size / fit'"), "Size/Fit shown only on edit, not add");
});

test("Receipt modal shows subtotal, discount (incl Rs. 0), paid and remaining", () => {
  assert.ok(app.includes("saleTotals(s)"), "saleTotals helper present");
  assert.ok(app.includes("money(t.subtotal)"), "receipt shows subtotal");
  assert.ok(app.includes("money(t.discount)"), "receipt shows discount (Rs. 0 included)");
  assert.ok(app.includes("money(t.paid)"), "receipt shows paid amount");
  assert.ok(app.includes("money(t.remaining)"), "receipt shows remaining balance");
});

test("PDF shows the same financial details (subtotal, discount, paid, remaining)", () => {
  assert.ok(app.includes("const t=saleTotals(sale);"), "PDF uses saleTotals");
  assert.ok(app.includes("'Discount: Rs '+t.discount"), "PDF shows discount");
  assert.ok(app.includes("'Paid: Rs '+t.paid"), "PDF shows paid amount");
  assert.ok(app.includes("'Remaining: Rs '+t.remaining"), "PDF shows remaining balance");
});

test("PDF sharing checks share support before navigator.share; no unconditional download", () => {
  const sbIdx = app.indexOf("async function shareBillFile");
  assert.ok(sbIdx >= 0, "shareBillFile present");
  const body = app.slice(sbIdx, app.indexOf("}\n", sbIdx + 1) + 2);
  assert.ok(body.includes("navigator.canShare({files:[file]}"), "share support checked");
  assert.ok(body.includes("navigator.share({files:[file]"), "native share sheet used when supported");
  // downloadReceiptPdf is a separate explicit action, not inside shareBillFile flow
  assert.ok(app.includes("function downloadReceiptPdf"), "downloadReceiptPdf exists as explicit option");
});

test("Post-sale WhatsApp offer appears after every successful sale with phone, independent of receipt setting", () => {
  // checkout() should show share offer when lastReceipt.phone exists, regardless of show_receipt_after_checkout
  const checkoutIdx = app.indexOf("async function checkout");
  const checkoutBody = app.slice(checkoutIdx, app.indexOf("\n}function formSubmitDelegation", checkoutIdx));
  assert.ok(checkoutBody.includes("if(storeSettings.show_receipt_after_checkout) openReceipt(lastReceipt);"), "receipt opening gated by setting");
  assert.ok(checkoutBody.includes("if(lastReceipt.phone){showModal('Share invoice'"), "share offer shown when phone exists");
  assert.ok(checkoutBody.includes("Send via WhatsApp"), "WhatsApp offer label present");
  assert.ok(checkoutBody.includes("Not now"), "decline option present");
});

test("Historical sales row has Share Bill action with data-id", () => {
  assert.ok(app.includes("data-action=\"share-bill\" data-id=\"${s.id}\""), "salesRow has share-bill button with data-id");
});

test("Share Bill handler reuses existing sale from findById (historical) without checkout/create_sale", () => {
  const shareBillIdx = app.indexOf("case 'share-bill':");
  const branch = app.slice(shareBillIdx, shareBillIdx + 400);
  assert.ok(branch.includes("shareBillFile(s)"), "share-bill invokes shareBillFile");
  assert.ok(branch.includes("findById(sales,id)"), "share-bill supports historical sales via findById");
  assert.ok(!branch.includes("checkout("), "share-bill does not call checkout");
  assert.ok(!branch.includes("create_sale"), "share-bill does not call create_sale");
});

test("saleTotals calculates paid/remaining from actual payment allocations without double-counting", () => {
  assert.ok(app.includes("salePaymentPaid"), "saleTotals uses sale_payments");
  assert.ok(app.includes("allocationPaid"), "saleTotals uses payment_allocations");
  assert.ok(app.includes("filter(p=>p.method!=='khata')"), "khata method excluded from sale_payments (charge record, not payment)");
  assert.ok(app.includes("salePaymentPaid+allocationPaid"), "paid combines sale payments and allocation payments");
  assert.ok(app.includes("allocationsMap"), "loadSalesFromDatabase loads payment_allocations");
  assert.ok(app.includes("allocations:allocationsMap.get(r.id)"), "sales records include allocations");
});

test("saleTotals handles zero discount, full payment, and partial payment scenarios", () => {
  assert.ok(app.includes("Math.max(0,Number(s.total)-paid)"), "remaining calculated as total minus paid");
  assert.ok(app.includes("Math.max(0,subtotal-Number(s.total))"), "discount calculated correctly including zero");
});

test("Migration file exists for Khata payment allocation", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  assert.ok(fs.existsSync(path.join(root, "supabase", "migrations", "20261029000017_khata_payment_allocation.sql")), "Migration file exists");
});

test("Migration adds unallocated_amount and request_hash to customer_payments", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261029000017_khata_payment_allocation.sql"), "utf8");
  assert.ok(sql.includes("unallocated_amount"), "unallocated_amount column added");
  assert.ok(sql.includes("request_hash"), "request_hash column added");
  assert.ok(sql.includes("check (unallocated_amount >= 0)"), "unallocated_amount constraint present");
});

test("Migration creates payment_allocations table", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261029000017_khata_payment_allocation.sql"), "utf8");
  assert.ok(sql.includes("create table if not exists public.payment_allocations"), "payment_allocations table created");
  assert.ok(sql.includes("foreign key (store_id, payment_id) references public.customer_payments"), "FK to customer_payments");
  assert.ok(sql.includes("references public.sales"), "FK to sales");
  assert.ok(sql.includes("enable row level security"), "RLS enabled on payment_allocations");
});

test("Migration creates payment_allocation_idempotency table", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261029000017_khata_payment_allocation.sql"), "utf8");
  assert.ok(sql.includes("create table if not exists public.payment_allocation_idempotency"), "Idempotency table created");
  assert.ok(sql.includes("unique (store_id, idempotency_key)"), "Unique idempotency key constraint");
});

test("Migration defines record_customer_payment_and_allocate RPC", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261029000017_khata_payment_allocation.sql"), "utf8");
  assert.ok(sql.includes("create or replace function public.record_customer_payment_and_allocate"), "RPC defined");
  assert.ok(sql.includes("p_allocations"), "Allocations parameter accepted");
  assert.ok(sql.includes("jsonb default '[]'::jsonb"), "Allocations default empty array");
  assert.ok(sql.includes("pg_advisory_xact_lock"), "Advisory lock for concurrency safety");
  assert.ok(sql.includes("for update"), "Row-level locking on sales");
  assert.ok(sql.includes("allocation exceeds sale outstanding balance"), "Over-allocation prevention");
  assert.ok(sql.includes("duplicate sale_id in allocation request"), "Duplicate sale_id rejection");
});

test("Migration defines allocate_unallocated_payment RPC", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261029000017_khata_payment_allocation.sql"), "utf8");
  assert.ok(sql.includes("create or replace function public.allocate_unallocated_payment"), "RPC defined");
  assert.ok(sql.includes("unallocated_amount"), "Unallocated amount referenced");
  assert.ok(sql.includes("payment_allocation_idempotency"), "Idempotency table used");
  assert.ok(sql.includes("allocations exceed payment unallocated amount"), "Unallocated limit enforcement");
});

test("Frontend integrates record_customer_payment_and_allocate RPC", () => {
  assert.ok(app.includes("record_customer_payment_and_allocate"), "Frontend calls new payment RPC");
  assert.ok(app.includes("p_allocations:'[]'"), "Frontend passes allocations parameter");
});

test("Frontend integrates allocate_unallocated_payment RPC", () => {
  assert.ok(app.includes("allocate_unallocated_payment"), "Frontend calls allocation RPC");
  assert.ok(app.includes("allocate-unallocated"), "Frontend has allocate-unallocated action");
  assert.ok(app.includes("allocateUnallocatedForm"), "Frontend has allocation form function");
});

test("Frontend loads payment_allocations in loadSalesFromDatabase", () => {
  assert.ok(app.includes("from('payment_allocations')"), "Frontend queries payment_allocations table");
  assert.ok(app.includes("allocationsMap"), "Frontend builds allocations map");
});

test("Historical payments keep unallocated_amount = 0 (backward compatible)", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.resolve(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261029000017_khata_payment_allocation.sql"), "utf8");
  assert.ok(sql.includes("default 0"), "unallocated_amount defaults to 0 for existing rows");
  assert.ok(!sql.includes("UPDATE public.customer_payments SET unallocated_amount"), "No mass update of existing rows");
});

test("Product form preserves Unstitched for an empty store and still offers Custom/Other", () => {
  assert.ok(app.includes("const categoryOptions=categories.map(c=>c.name)"), "Category options are derived from loaded categories");
  assert.ok(app.includes("if(!categoryOptions.length)categoryOptions.push('Unstitched')"), "Unstitched is the fallback for a store with no categories");
  assert.ok(app.includes("if(!categoryOptions.includes('Custom/Other'))categoryOptions.push('Custom/Other')"), "Custom/Other is always appended");
  assert.ok(app.includes("const selectedCategory=p.category||categories[0]?.name||categoryOptions[0]||'Unstitched'"), "Form falls back to Unstitched when no category exists");
  assert.ok(app.includes("display:${customCategoryVisible?'block':'none'}"), "Custom category input is visible immediately when selected");
});

test("Category loads replace the in-memory list even when the store has none", () => {
  assert.ok(app.includes("categories.splice(0,categories.length,...dbCategories.map"), "DB categories replace the in-memory list");
  assert.ok(!app.includes("if(dbCategories.length||categories.length)"), "Empty DB result is not allowed to leave stale categories");
});

test("Saving a product reloads categories with database IDs", () => {
  const saveBranch = app.slice(app.indexOf("const {data,error}=await client.rpc('save_product'"), app.indexOf("} else if(form.dataset.form==='customer')"));
  assert.ok(saveBranch.includes("await loadProductsFromDatabase();"), "Product save refreshes DB-backed categories and products");
  assert.ok(!saveBranch.includes("categories.push({name:p.category,description:'',count:0})"), "Client no longer invents a category without a database ID");
});

test("Mobile bottom navigation puts Products before New sale", () => {
  const mobileStart = app.indexOf("$('#mobileBottom').innerHTML");
  const mobile = app.slice(mobileStart, mobileStart + 500);
  const expected = "[['dashboard','Home','dashboard'],['products','Products','package'],['billing','New sale','cart'],['sales','Sales','receipt'],['settings','More','menu']]";
  assert.ok(mobile.includes(expected), "Mobile navigation order is Home, Products, New sale, Sales, More");
  assert.ok(mobile.indexOf("['products','Products','package']") < mobile.indexOf("['billing','New sale','cart']"), "Products appears before New sale in mobile navigation");
});


test("Category deletion is blocked in the UI while products still reference it", () => {
  assert.ok(app.includes("if(products.some(p=>p.category===name))"), "Delete handler checks products by category name");
  assert.ok(app.includes("Move or edit products in this category before deleting it."), "User receives a safe category-deletion message");
});

test("Desktop navigation order is unchanged", () => {
  const desktopStart = app.indexOf("const navGroups = [");
  assert.ok(desktopStart >= 0, "desktop navigation source exists");
  const desktop = app.slice(desktopStart, desktopStart + 700);
  assert.ok(desktop.indexOf("['dashboard','Dashboard','dashboard']") < desktop.indexOf("['billing','New sale','cart']"), "Dashboard precedes New sale on desktop");
  assert.ok(desktop.indexOf("['billing','New sale','cart']") < desktop.indexOf("['sales','Sales history','receipt']"), "New sale precedes Sales history on desktop");
  assert.ok(desktop.indexOf("['sales','Sales history','receipt']") < desktop.indexOf("['products','Products','package']"), "Sales history precedes Products on desktop");
  assert.ok(desktop.includes("['reports','Reports & analytics','chart']"), "Desktop Reports item remains present");
});

test("Mobile navigation is a five-column responsive bottom bar", () => {
  const css = fs.readFileSync(path.join(root, "frontend", "css", "styles.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.includes("class=\"mobile-bottom\" id=\"mobileBottom\""), "Mobile nav container exists in the app shell");
  assert.ok(css.includes(".mobile-bottom { display:none; }"), "Mobile nav is hidden on desktop");
  assert.ok(css.includes(".mobile-bottom { display:grid; position:fixed; z-index:30; left:0; right:0; bottom:0;"), "Mobile nav becomes a fixed bottom bar at mobile widths");
  assert.ok(css.includes("grid-template-columns:repeat(5,minmax(0,1fr))"), "Mobile nav has five equal columns");
  assert.ok(css.includes("padding:7px 5px max(7px,env(safe-area-inset-bottom))"), "Mobile nav respects the device safe area");
});

test("Payment allocation loading uses only columns that exist in the database", () => {
  const allocationQuery = app.slice(app.indexOf("const allocationsMap=new Map()"), app.indexOf("const financial=new Map()"));
  assert.ok(allocationQuery.includes(".select('sale_id,amount,created_at')"), "Allocation query selects supported columns");
  assert.ok(!allocationQuery.includes("note"), "Allocation query does not request a non-existent note column");
});

test("Allocation form subtracts prior allocations and reloads sales after saving", () => {
  const formStart = app.indexOf("async function allocateUnallocatedForm(paymentId){");
  const formEnd = app.indexOf("function supplierForm(s={}){", formStart);
  const form = app.slice(formStart, formEnd);
  assert.ok(form.includes("const allocatedAlready=allocMap.get(s.id)||0"), "Allocation form uses prior allocation totals");
  assert.ok(form.includes("const remaining=Math.max(0,Number(s.total)-allocatedAlready)"), "Allocation form shows the actual remaining amount");
  assert.ok(app.includes("await Promise.all([loadCustomersFromDatabase(),loadSalesFromDatabase()]);closeModal();renderPage();toast('Funds allocated.');"), "Saving an allocation refreshes sale history");
});
