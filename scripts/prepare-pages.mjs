import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const html = await readFile(join(root, "dist/index.html"), "utf8");
if (!html.includes("./site-assets/") || html.includes("/src/main.js")) {
  throw new Error("Expected a production build with relative asset URLs");
}
// This directory contains only generated Vite output, never source files.
await rm(join(root, "site-assets"), { recursive: true, force: true });
await mkdir(join(root, "site-assets"), { recursive: true });
await cp(join(root, "dist/site-assets"), join(root, "site-assets"), {
  recursive: true,
});
await writeFile(join(root, "index.html"), html);
await writeFile(join(root, ".nojekyll"), "");
console.log("GitHub Pages ready: index.html, site-assets/, .nojekyll");
