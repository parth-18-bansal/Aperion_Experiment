// src/audio-howler/AudioPlugin.ts (SON VE UYUMLU VERSİYON)

import { Howl } from 'howler';
import { ExtensionType, path, extensions } from "pixi.js";
import type { Application, ExtensionMetadata } from "pixi.js";
import { SoundBus } from "./SoundBus";

// Howler Parser, ses varlıklarını PIXI.Assets'in anlayacağı şekilde işler.
// Bu plugin'in kendi içinde tanımlanması, modülün kendi kendine yeterli olmasını sağlar.
const HowlerParser = {
    extension: {
        type: ExtensionType.LoadParser,
        priority: 0,
    },

    test(url: string): boolean {
        const ext = path.extname(url).slice(1);
        return ['mp3', 'ogg', 'wav', 'm4a', 'webm'].includes(ext);
    },

    async load(url: string): Promise<Howl> {
        return new Promise((resolve, reject) => {
            const sound = new Howl({
                src: [url],
                html5: false,
                // iOS'taki "pool exhausted" hatasını önlemek için havuz boyutunu artırıyoruz.
                pool: 30, 
                onload: () => resolve(sound),
                onloaderror: (err) => reject(new Error(`[HowlerParser] Load error for ${url}: ${err}`)),
            });
        });
    }
};

/**
 * Howler.js tabanlı ses fonksiyonlarını PixiJS Application nesnesine ekleyen plugin.
 * Bu yapı sayesinde oyunun herhangi bir yerinden `app.audio` üzerinden ses kontrollerine erişilebilir.
 */
export class CreationAudioPlugin {
    public static extension: ExtensionMetadata = ExtensionType.Application;

    public static async init(): Promise<void> {
        // Plugin başlatılır başlatılmaz, kendi parser'ını PIXI'nin eklenti sistemine kaydeder.
        extensions.add(HowlerParser);
        
        const app = this as unknown as Application;
        const soundBus = new SoundBus();
        
        // SoundBus'ın kendi ayarlarını (tarayıcı olay dinleyicileri vb.) yapmasını sağlar.
        // soundBus.Settings();
        await soundBus.RunServices();

        // Application nesnesine (`app`) `audio` adında temiz bir arayüz ekliyoruz.
        app.audio = {
            // Gelişmiş kontrol veya debug için SoundBus'ın kendisine doğrudan erişim
            soundBus, 

            // BGM Kanalı Kontrolleri
            muteBgm: () => soundBus.muteBgm(),
            unmuteBgm: () => soundBus.unmuteBgm(),

            // SFX Kanalı Kontrolleri
            muteSfx: () => soundBus.muteSfx(),
            unmuteSfx: () => soundBus.unmuteSfx(),

            // Toplu Duraklatma ve Devam Ettirme
            pauseAll: () => soundBus.pauseAll(),
            resumeAll: () => soundBus.resumeAll(),
        };
    }

    public static destroy(): void {
        const app = this as unknown as Application;
        if (app.audio?.soundBus) {
            app.audio.soundBus.destroy();
        }
        app.audio = null as unknown as Application["audio"];
    }
}