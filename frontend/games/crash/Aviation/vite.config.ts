import { defineConfig } from "vite";
import { resolve } from "path";
import { assetpackPlugin } from "../../../shared/scripts/single-asset-pack-vite-plugin";

// Cashleme için bu versiyınu değiştir Lütfen
// game.config.json'da değişiklik alıp, tekrardan build almayı unutma!
const version = "wlka1x1x5";

// https://vite.dev/config/
export default defineConfig({
  base: "",
  build: {
    lib: {
      // Kütüphanenin giriş noktası.
      // index.html yerine bu dosya kullanılır.
      entry: resolve(__dirname, "src/main.ts"),

      formats: ["iife"],

      // Kütüphanenizin global adı (UMD/IIFE formatları için)
      name: "App",

      // Çıktı dosyasının adı (uzantısız)
      fileName: "build.min." + version,
    },
  },
  plugins: [assetpackPlugin(__dirname)],
  server: {
    port: 8080,
    open: true,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
});
