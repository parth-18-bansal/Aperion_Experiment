// src/audio-howler/SoundBus.ts (TEMİZLENMİŞ VE NİHAİ VERSİYON)

import { Howl, Howler } from 'howler';
import { Assets, isMobile } from 'pixi.js';
import { ISoundBus, SoundType, PlayOptions } from './ISoundBus';

export class SoundBus implements ISoundBus {
    private _bgmSounds: { [alias: string]: Howl } = {};
    private _sfxSounds: { [alias: string]: Howl } = {};

    private _isBgmMuted: boolean = false;
    private _isSfxMuted: boolean = false;

    private _activePlaybackIds  : Map<Howl, Set<number>> = new Map();
    private _isAudioUnlocked    : boolean = false;
    private _audioContextState  : AudioContextState = 'suspended';

    async RunServices(): Promise<void> {
        return Promise.resolve();
    }

    public registerSoundFromAssets(alias: string, type: SoundType): void {
        const soundAsset = Assets.get(alias);
        if (!soundAsset || !(soundAsset instanceof Howl)) {
            console.error(`[SoundBus] ❌ Asset with alias '${alias}' not found.`);
            return;
        }

        const collection = type === 'bgm' ? this._bgmSounds : this._sfxSounds;
        collection[alias] = soundAsset;
    }

    public PlayBGM(alias: string, type: SoundType, options: PlayOptions = {}): number | undefined {
        const { loop = false, volume = 1} = options;
        const sound = this._getSound(alias, type);

        if (sound) {
            const soundId = sound.play();
            
            if (!this._activePlaybackIds.has(sound)) {
                if (type === 'bgm') {
                    this._activePlaybackIds.set(sound, new Set());
                }
            }            

            sound.loop(loop, soundId);
            sound.volume(this._isBgmMuted ? 0 : volume, soundId);

            return soundId;
        }
        return undefined;
    }

    public StopBGM(alias: string, type: SoundType): void {
        const sound = this._getSound(alias, type);
        if (sound) {
            sound.stop();
        }
    }

    public PlaySFX(alias: string, type: SoundType, options: PlayOptions = {}): number | undefined {
        const { loop = false, volume = 1} = options;
        const sound = this._getSound(alias, type);

        if (sound) {
            const soundId = sound.play();
            
            if (!this._activePlaybackIds.has(sound)) {
                if (type === 'bgm') {
                    this._activePlaybackIds.set(sound, new Set());
                }
            }            

            sound.loop(loop, soundId);
            sound.volume(this._isSfxMuted ? 0 : volume, soundId);

            return soundId;
        }
        return undefined;
    }

    public StopSFX(alias: string, type: SoundType): void {
        const sound = this._getSound(alias, type);
        if (sound) {
            sound.stop();
        }
    }

    public pauseAll(): void {
        this._activePlaybackIds.forEach((idSet, sound) => {
            if ((sound as any)._isPersistent) {
                idSet.forEach(id => sound.pause(id));
            }
        });
    }

    public resumeAll(): void {
        this._activePlaybackIds.forEach((idSet, sound) => {
            if ((sound as any)._isPersistent) {
                idSet.forEach(id => {
                    if (!sound.playing(id)) {
                        sound.play(id);
                    }
                });
            }
        });
    }


    public muteBgm      = () =>    {  this._isBgmMuted  = true;    this._updateAllBgmVolumes(); };
    public unmuteBgm    = () =>    {  this._isBgmMuted  = false;   this._updateAllBgmVolumes(); };

    public muteSfx      = () =>    {  this._isSfxMuted  = true;    this._updateAllSfxVolumes(); };
    public unmuteSfx    = () =>    {  this._isSfxMuted  = false;   this._updateAllSfxVolumes(); };

    
    public handleSoundSettings(): void {
        // LOGGER
        /*
        log("🔊 Audio Context unlocked via user interaction");
        error("❌ Audio Context resume failed: ");
        log("🔊 Audio Context was already ready");
        log("🔵 FOCUS >> ", Howler.ctx?.state || 'no context');
        log("🔴 BLUR >> ", Howler.ctx?.state || 'no context');
        log("🌙 VISIBILITY HIDDEN (iOS) >> ", Howler.ctx?.state || 'no context');
        log("🌙 VISIBILITY HIDDEN (Desktop) >> ", Howler.ctx.state);
        log("☀️ VISIBILITY VISIBLE (iOS) >> ", Howler.ctx.state);
        log("☀️ VISIBILITY VISIBLE (iOS - already ready) >> ", Howler.ctx?.state);
        log("⏸️ iOS PAUSE >> ", Howler.ctx?.state);
        */
        // END LOGGER


        // Howler.ctx'in mevcut ve onstatechange'i desteklediğinden emin olun
        if (Howler.ctx && typeof Howler.ctx.onstatechange !== 'undefined') {
            // onstatechange olayına bir fonksiyon atayın
            Howler.ctx.onstatechange = () => {
                // log("AudioContext durumu değişti:", Howler.ctx.state);
                this._audioContextState = Howler.ctx.state;
                const event = new CustomEvent('audio-context-state-changed', { detail: { state: this._audioContextState } });
                window.dispatchEvent(event);
            };
        }

        
        const unlockAudio = () => {
            if (this._isAudioUnlocked) return;
            if (Howler.ctx && (Howler.ctx.state === 'suspended' || Howler.ctx.state === 'interrupted')) {
                setTimeout(() => { 
                    Howler.ctx.resume().then(() => {
                        Howler.mute(false);
                        this._isAudioUnlocked = true;
                        // this._updateAllVolumes();
                }).catch(e => console.error("Audio Context resume failed: ", e));
                }, 50);
            } else {
                Howler.mute(false);
                this._isAudioUnlocked = true;
            }
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };

        document.addEventListener('touchstart', unlockAudio, { once: true });
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });

        if (!isMobile.any) {
            // Uncomment to mute audio when switching focus to any another window on screen
            /* window.addEventListener('blur', () => {
                setTimeout(() => { Howler.mute(true); }, 50);
            });*/
            window.addEventListener('focus', () => {
                setTimeout(() => { Howler.mute(false); /* log(">> 📄 FOCUS << ", Howler.ctx.state); */ }, 50);
            });
        } else {
            window.addEventListener('pageshow', (event) => {
                if (event.persisted) {
                    /*
                    if (Howler.ctx.state === 'suspended' || Howler.ctx.state === 'interrupted') {
                        setTimeout(() => { Howler.ctx.resume().then(() => { log("☀️ PAGE SHOW ", Howler.ctx.state); Howler.mute(false) }).catch(e => console.error("Audio Context resume failed: ", e)); }, 25);
                    } else {
                        TODO -> log("☀️ PAGE SHOW (already ready) ", Howler.ctx.state);
                    }
                    */

                    // setTimeout(() => { Howler.mute(false); }, 50);

                    Howler.mute(false);
                }
            });
        }

        // Blur | Fokus'tan önce, çalışması gerektiği için settimeout koyuldu. 
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'hidden') {
                // setTimeout(() => { Howler.ctx.suspend().then(() => { log(">> VISIBILITY HIDDEN << ", Howler.ctx.state); }).catch(e => console.error("Audio Context suspend failed: ", e)); }, 25);

             Howler.mute(true)
            } 
            
            if (document.visibilityState === 'visible') {
                /*
                if (Howler.ctx.state === 'suspended' || Howler.ctx.state === 'interrupted') {
                    setTimeout(() => { Howler.ctx.resume().then(() => { log(">> VISIBILITY VISIBLE << ", Howler.ctx.state); Howler.mute(false) }).catch(e => console.error("Audio Context resume failed: ", e)); }, 25);
                } 
                else {
                    TODO -> log(">> VISIBILITY VISIBLE (already ready) << ", Howler.ctx.state);
                }
                */

               // setTimeout(() => { Howler.mute(false); }, 25);

               if (isMobile) {
                    this._isAudioUnlocked = false;
                    document.addEventListener('touchstart', unlockAudio, { once: true });
                    document.addEventListener('click', unlockAudio, { once: true });
                    document.addEventListener('keydown', unlockAudio, { once: true });
               } else {
                    Howler.mute(false);
               }
            }
        });


        // log("📄 PAGE SHOW >> ", Howler.ctx.state);
    }
    

    public destroy(): void {
        Object.values(this._bgmSounds).forEach(sound => sound.unload());
        Object.values(this._sfxSounds).forEach(sound => sound.unload());
        this._bgmSounds = {};
        this._sfxSounds = {};
        this._activePlaybackIds.clear();

        const event = new CustomEvent('audio-context-state-changed', { detail: { state: "destroyed" } });
        window.dispatchEvent(event);
    }
    
    private _getSound = (alias: string, type: SoundType): Howl | undefined => type === 'bgm' ? this._bgmSounds[alias] : this._sfxSounds[alias];
    
    /*
    private _updateAllVolumes(): void {
        this._updateAllBgmVolumes();
        this._updateAllSfxVolumes();
    }
    */
    
    private _updateAllBgmVolumes(): void {
        const finalBgmVolume = this._isBgmMuted ? 0 : 1;
        for (const alias in this._bgmSounds) {
            this._bgmSounds[alias].volume(finalBgmVolume);
        }
    }
    
    private _updateAllSfxVolumes(): void {
        const finalSfxVolume = this._isSfxMuted ? 0 : 1;
        for (const alias in this._sfxSounds) {
            this._sfxSounds[alias].volume(finalSfxVolume);
        }
    }
}