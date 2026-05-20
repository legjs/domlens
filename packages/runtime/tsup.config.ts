import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  outExtension() {
    return { js: ".js" }
  },
  banner: {
    js: "#!/usr/bin/env node",
  },
})
