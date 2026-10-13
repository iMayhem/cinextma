// Assemble Cloudflare Pages output from a plain `next build`.
// Copies prerendered HTML + RSC payloads, Next static assets, and public/
// into pages-output/. Dynamic /api/* routes are served by /functions.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const OUT = path.join(ROOT, "pages-output");

function collectFiles(dir, out, rel = "") {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const s = path.join(dir, e.name);
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) {
      if (e.name === "api") continue; // dynamic routes -> Functions, not static
      collectFiles(s, out, r);
    } else if (e.name.endsWith(".html") || e.name.endsWith(".rsc")) {
      out.push([s, r]);
    }
  }
  return out;
}

fs.rmSync(OUT, { recursive: true, force: true });

// 1. Prerendered pages + RSC payloads (skip route-handler dirs like favicon.ico/)
const wanted = collectFiles(APP, []);
for (const [s, r] of wanted) {
  const d = path.join(OUT, r);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(s, d);
}

// 2. Ensure extensionless-friendly copies: about.html -> about/index.html
function mirrorIndex(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      mirrorIndex(p);
    } else if (e.name.endsWith(".html") && e.name !== "index.html") {
      const sub = path.join(dir, e.name.slice(0, -5), "index.html");
      if (!fs.existsSync(sub)) {
        fs.mkdirSync(path.dirname(sub), { recursive: true });
        fs.copyFileSync(p, sub);
      }
    }
  }
}
mirrorIndex(OUT);

// 3. Next static assets
function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyTree(path.join(ROOT, ".next", "static"), path.join(OUT, "_next", "static"));

// 4. Public files at root (files win over same-named leftovers)
copyTree(path.join(ROOT, "public"), OUT);

console.log("pages-output assembled at", OUT);
