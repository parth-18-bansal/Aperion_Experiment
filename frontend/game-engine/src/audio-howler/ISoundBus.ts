// src/audio-howler/ISoundBus.ts (TEMİZLENMİŞ VERSİYON)

export type SoundType = 'bgm' | 'sfx';

export interface PlayOptions {
    loop?: boolean;
    volume?: number;
    rate?: number;
}

export interface ISoundBus {
    registerSoundFromAssets(alias: string, type: SoundType): void;
    RunServices(): Promise<void>;
    PlayBGM(alias: string, type: SoundType, options?: PlayOptions): number | undefined;
    StopBGM(alias: string, type: SoundType): void;
    PlaySFX(alias: string, type: SoundType, options?: PlayOptions): number | undefined;
    StopSFX(alias: string, type: SoundType): void;

    pauseAll(): void;
    resumeAll(): void;
    
    // BGM Controls
    muteBgm(): void;
    unmuteBgm(): void;

    // SFX Controls
    muteSfx(): void;
    unmuteSfx(): void;

    handleSoundSettings(): void;
    destroy(): void;
}