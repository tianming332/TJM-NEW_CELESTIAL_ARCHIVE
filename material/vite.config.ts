import { defineConfig } from "vite";
import { wgslVitePlugin } from "@vgpu/wgsl/loader-vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [wgslVitePlugin({ minify: true })],
  build: {
    target: "es2022",
    outDir: "js",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["es"],
      fileName: () => "material-vgpu.js",
    },
  },
});
