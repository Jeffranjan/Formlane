import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  // Bundle all @repo/* workspace packages into the output so Render
  // doesn't need to resolve them from node_modules at runtime.
  noExternal: [/@repo\/.*/],
  // @node-rs/argon2 ships per-platform native .node binaries that esbuild
  // can't statically resolve. Keep it external so Node resolves the right
  // binary at runtime from node_modules.
  external: ["@node-rs/argon2"],
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
