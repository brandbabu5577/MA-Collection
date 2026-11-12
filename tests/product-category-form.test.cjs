"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "frontend", "js", "app.js"), "utf8");

function loadProductForm(categories) {
  const start = app.indexOf("function productForm(p={}){");
  const end = app.indexOf("function customerForm(c={}){", start);
  assert.ok(start >= 0 && end > start, "productForm source must be present");
  const source = app.slice(start, end);
  const factory = new Function(
    "categories",
    "showModal",
    "field",
    "selectField",
    "e",
    "generateSku",
    source + "\nreturn productForm;"
  );

  let captured = null;
  const showModal = (title, subtitle, body, opts) => {
    captured = { title, subtitle, body, opts };
  };
  const field = (label, name, value = "", type = "text", required = false, placeholder = "") =>
    `<input name="${name}" type="${type}" value="${String(value ?? "")}" ${required ? "required" : ""} placeholder="${placeholder}">`;
  const selectField = (label, name, options, current) =>
    `<select name="${name}">${options
      .map((value) => `<option ${value === current ? "selected" : ""}>${String(value)}</option>`)
      .join("")}</select>`;

  const productForm = factory(
    categories,
    showModal,
    field,
    selectField,
    (value) => String(value ?? ""),
    () => "MA-TEST"
  );

  return { productForm, captured: () => captured };
}

test("Add Product renders Unstitched and Custom/Other when the store has no categories", () => {
  const { productForm, captured } = loadProductForm([]);
  productForm();
  const html = captured().body;
  assert.match(html, /<select name="category">/, "category select is rendered");
  assert.match(html, /<option selected>Unstitched<\/option>/, "Unstitched is selected when no category exists");
  assert.match(html, /<option >Custom\/Other<\/option>/, "Custom/Other is still available");
  assert.match(html, /id="customCategoryGroup" style="display:none/, "custom category input stays hidden until selected");
});

test("Edit Product in an empty store preserves its current category", () => {
  const { productForm, captured } = loadProductForm([]);
  productForm({ id: "product-1", category: "Accessories" });
  const html = captured().body;
  assert.match(html, /<option selected>Accessories<\/option>/, "current category remains selected");
  assert.match(html, /<option >Custom\/Other<\/option>/, "Custom/Other remains available");
});

test("Add Product lists store categories and still offers Custom/Other", () => {
  const { productForm, captured } = loadProductForm([{ name: "Unstitched" }, { name: "Accessories" }]);
  productForm();
  const html = captured().body;
  assert.match(html, /<option selected>Unstitched<\/option>/, "first store category is selected");
  assert.match(html, /<option >Accessories<\/option>/, "other store categories are listed");
  assert.match(html, /<option >Custom\/Other<\/option>/, "Custom/Other is available");
  assert.match(html, /id="customCategoryGroup" style="display:none/, "custom category input stays hidden until selected");
});

test("Edit Product keeps the product's current category selected", () => {
  const { productForm, captured } = loadProductForm([{ name: "Unstitched" }]);
  productForm({ id: "product-1", category: "Accessories" });
  const html = captured().body;
  assert.match(html, /<option selected>Accessories<\/option>/, "current category remains selected");
  assert.match(html, /id="customCategoryGroup" style="display:none/, "custom category input stays hidden");
});