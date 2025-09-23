import type { AssetPackConfig } from "@assetpack/core";
import { AssetPack } from "@assetpack/core";
import { pixiPipes } from "@assetpack/core/pixi";
import { ffmpeg } from "@assetpack/core/ffmpeg";
import type { Plugin, ResolvedConfig } from "vite";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { dirname, resolve } from "path";

export function mainAssetpackPlugin(projectRoot: string): Plugin {
  let mode: ResolvedConfig["command"];
  let gameAp: AssetPack | undefined;
  let uiAp: AssetPack | undefined;
  let PUBLICDIR: string = "";

  // Manifest paths
  const gameManifestPath = `${projectRoot}/manifest/game.json`;
  const uiManifestPath = `${projectRoot}/manifest/ui.json`;
  const mergedManifestPath = `${projectRoot}/public/assets/manifest.json`;

  // Ensure directories exist
  const setupDirectories = () => {
    [gameManifestPath, uiManifestPath, mergedManifestPath].forEach((path) => {
      const dir = dirname(path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`[AssetPack] Directory created: ${dir}`);
      }
    });
  };

  // Game AssetPack Config
  const gameConfig = (publicDir: string): AssetPackConfig => ({
    entry: `${projectRoot}/raw-assets`,
    output:
      process.platform === "win32"
        ? `${publicDir}/assets/`
        : `.${publicDir}/assets/`,
    pipes: [
      ...pixiPipes({
        cacheBust: false,
        manifest: {
          output: gameManifestPath,
          trimExtensions: true,
          createShortcuts: true,
        },
      }),
      ffmpeg({
        inputs: [".mp3", ".ogg", ".wav"],
        outputs: [
          {
            formats: [".mp3"],
            recompress: false,
            options: {
              audioBitrate: 96,
              audioChannels: 1,
              audioFrequency: 48000,
            },
          },
          {
            formats: [".ogg"],
            recompress: false,
            options: {
              audioBitrate: 32,
              audioChannels: 1,
              audioFrequency: 22050,
            },
          },
        ],
      }),
    ],
  });

  // UI AssetPack Config
  const uiConfig = (publicDir: string): AssetPackConfig => ({
    entry: "../../../game-ui/slot/raw-assets",
    output:
      process.platform === "win32"
        ? `${publicDir}/assets/`
        : `.${publicDir}/assets/`,
    pipes: [
      ...pixiPipes({
        // compression: {
          // png: false, // Hiç bir format, yoksa kafasına göre baska alias path'i ekleme yapabilir 
          // webp: false,
        // },
        cacheBust: false,
        manifest: {
          output: uiManifestPath,
          trimExtensions: true,
          createShortcuts: true,
        },
      }),
    ],
  });

  // Merge manifests function
  const mergeManifests = async () => {
    try {
      const gameManifest = existsSync(gameManifestPath)
        ? JSON.parse(readFileSync(gameManifestPath, "utf8")) // require('fs') yerine readFileSync kullan
        : { bundles: [] };

      const uiManifest = existsSync(uiManifestPath)
        ? JSON.parse(readFileSync(uiManifestPath, "utf8")) // require('fs') yerine readFileSync kullan
        : { bundles: [] };

      const merged: Record<string, any> = {};

      // Merge game bundles
      for (const bundle of gameManifest.bundles || []) {
        merged[bundle.name] = { ...bundle, assets: [...(bundle.assets || [])] };
      }

      // Merge UI bundles
      for (const bundle of uiManifest.bundles || []) {
        if (merged[bundle.name]) {
          merged[bundle.name].assets.push(...(bundle.assets || []));
        } else {
          merged[bundle.name] = {
            ...bundle,
            assets: [...(bundle.assets || [])],
          };
        }
      }

      const mergedManifest = { bundles: Object.values(merged) };
      writeFileSync(
        mergedManifestPath,
        JSON.stringify(mergedManifest, null, 2)
      );

      console.log(
        `[AssetPack] ✅ Merged manifest created with ${
          Object.keys(merged).length
        } bundles`
      );
    } catch (error) {
      console.error("[AssetPack] ❌ Merge failed:", error);
      // Fallback empty manifest
      writeFileSync(
        mergedManifestPath,
        JSON.stringify({ bundles: [] }, null, 2)
      );
    }
  };

  return {
    name: "sequential-assetpack",

    configResolved(resolvedConfig) {
      mode = resolvedConfig.command;
      if (!resolvedConfig.publicDir) return;
      PUBLICDIR = resolvedConfig.publicDir.replace(process.cwd(), "");
      setupDirectories();
    },

    buildStart: async () => {
      // const publicDir = process.cwd().replace(process.cwd(), "") || "/public";

      console.log("[AssetPack] 🔄 Starting sequential asset processing...");

      try {
        if (mode === "serve") {
          // Development mode - watch both
          if (!gameAp && !uiAp) {
            console.log("[AssetPack] 🎮 Starting game assets watch...");

            // TODO -> Sıralamayı değiştirme
            gameAp = new AssetPack(gameConfig(PUBLICDIR));
            uiAp = new AssetPack(uiConfig(PUBLICDIR));
            await gameAp.watch();
            await uiAp.watch();
            await mergeManifests();
          }
        } else {
          // Build mode - sequential execution

          // 1. Process game assets first
          let gm = new AssetPack(gameConfig(PUBLICDIR));
          let ui = new AssetPack(uiConfig(PUBLICDIR));

          await gm.run();
          await ui.run();
          await mergeManifests();
        }
      } catch (error) {
        console.error("[AssetPack] ❌ Sequential processing failed:", error);
        throw error; // Stop build on failure
      }
    },

    buildEnd: async () => {
      // Development mode merge (with delay for file writes)
      if (mode === "serve") {
        await mergeManifests();
      }

      // Cleanup watch instances
      if (gameAp) {
        await gameAp.stop();
        gameAp = undefined;
      }

      if (uiAp) {
        await uiAp.stop();
        uiAp = undefined;
      }
    },

    closeBundle: async () => {
      // Final merge for production
      if (mode === "build") {
        await mergeManifests();
      }
    },
  };
}
