import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: "app",
  resolve: {
    alias: { "/src": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "site-assets",
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
