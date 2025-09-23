import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      outDir: path.resolve(__dirname, "dist/types"),
      copyDtsFiles: true,
      staticImport: true,
      rollupTypes: true,
    }),
  ],
  server: {
    port: 8080,
    open: true,
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "index.ts"),
      name: "AperionSlotUi",
      fileName: (format) => `slot-game-ui.${format}.js`,
    },
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
});
