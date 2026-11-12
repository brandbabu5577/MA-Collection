"use strict";

/**
 * build.cjs - Prepares clean production distribution directory for Cloudflare Pages
 * Copies only public web assets to dist/, avoiding internal files, sql, backups, or tests.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

console.log("Preparing Cloudflare Pages distribution bundle in dist/...");

// Clean existing dist
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}

// Target directories
const dirs = [
  dist,
  path.join(dist, "frontend"),
  path.join(dist, "frontend", "css"),
  path.join(dist, "frontend", "js"),
  path.join(dist, "frontend", "assets")
];

for (const dir of dirs) {
  fs.mkdirSync(dir, { recursive: true });
}

// Files to copy: [sourceRel, destRel]
const filesToCopy = [
  ["index.html", "index.html"],
  ["_headers", "_headers"],
  ["_redirects", "_redirects"],
  ["frontend/css/styles.css", "frontend/css/styles.css"],
  ["frontend/js/app.js", "frontend/js/app.js"],
  ["frontend/js/auth.js", "frontend/js/auth.js"],
  ["frontend/js/employee-invitations.js", "frontend/js/employee-invitations.js"],
  ["frontend/js/supabase-client.js", "frontend/js/supabase-client.js"],
  ["frontend/js/supabase-config.js", "frontend/js/supabase-config.js"],
  ["frontend/assets/ma-collection-logo.png", "frontend/assets/ma-collection-logo.png"]
];

let totalBytes = 0;
for (const [srcRel, destRel] of filesToCopy) {
  const src = path.join(root, srcRel);
  const dest = path.join(dist, destRel);

  if (!fs.existsSync(src)) {
    console.error(`ERROR: Missing required file: ${srcRel}`);
    process.exit(1);
  }

  fs.copyFileSync(src, dest);
  const size = fs.statSync(dest).size;
  totalBytes += size;
  console.log(`  ✓ ${destRel} (${(size / 1024).toFixed(1)} KB)`);
}

console.log(`\nBuild completed successfully!`);
console.log(`Total bundle size: ${(totalBytes / 1024).toFixed(1)} KB`);
console.log(`Output directory ready for Cloudflare Pages: dist/`);
