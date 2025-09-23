import { defineConfig } from "vite";
import { mainAssetpackPlugin } from "../../../shared/scripts/asset-pack-vite-plugin";


// https://vite.dev/config/
export default defineConfig({
  base: "",
  plugins: [
    mainAssetpackPlugin(__dirname),
  ],
  server: {
    port: 8080,
    open: true,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
});
