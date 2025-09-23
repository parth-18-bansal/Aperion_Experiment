import { getConfig }                                                                                              from "./config";
import { Engine }                                                                                                 from "game-engine";
import { isPortrait }                                                                                             from "game-engine/src/utils/isPortrait";
import { CrashGameConfig, ICrashGame, IProviderInfo, GAME_SOCKET_STATE}                                           from "crash-game-engine";
import { Assets, TilingSprite, Sprite, Text, Texture, MeshRope, Point, Graphics, Container, TextStyle, isMobile}  from "pixi.js";
import { Spine }                                                                                                  from "@esotericsoftware/spine-pixi-v8";
import { gsap }                                                                                                   from "gsap";
import { calculateDimensionsBackground, calculateDimensionsObject, calculateBounds }                                from "./ManagerCalculated";
import { PathManager }                                                                                            from "./ManagerPath";
import { CloudManager }                                                                                           from "./ManagerClouds";



export class CrashGame implements ICrashGame {
    app!               : Engine.BaseGame;
    bgOne!             : TilingSprite;
    bgMoon!            : Sprite;
    cloudManager!      : CloudManager;
    meshContainer!     : Container;
    character!         : Spine;
    flewPopup!         : Sprite;
    flewTitle!         : InstanceType<typeof Engine.LocalizedText>;
    flewResult!        : Text;

    winFirstSpine!          : Spine;
    winFirstTitle!          : InstanceType<typeof Engine.LocalizedText>;
    winFirstAmount!         : Text;
    winFirstMultiplier!     : Text;

    winSecondSpine!          : Spine;
    winSecondTitle!          : InstanceType<typeof Engine.LocalizedText>;
    winSecondAmount!         : Text;
    winSecondMultiplier!     : Text;

    multiplierText!    : Text;
    countText!         : InstanceType<typeof Engine.LocalizedText>;

    jackpotSpine!      : Spine;
    jackpotTitle!      : InstanceType<typeof Engine.LocalizedText>;
    jackpotAmount!     : Text;
    jackpotMultiplier! : Text;

    pathManager!       : PathManager;
    rope!              : MeshRope;
    ropeMask!          : Graphics;
    areaFill!          : Graphics;
    
    
    // Character state management
    private gameState           : GAME_SOCKET_STATE  = GAME_SOCKET_STATE.NONE;
    private initDefaultFlag     : boolean            = true;
    private initRopeFlag        : 'init' | 'flow' | 'resize' = 'init';
    private initPosFlag         : 'init' | 'flow' | 'resize' = 'init';
    private initSpineFlag       : 'init' | 'flow' | 'resize' = 'init';
    private orientationFlag     : 'landscape' | 'portrait' | 'none' = 'none';
    private animationFlag       : 'closed' | 'opened' = 'opened';

    private characterSpeed      : number = 2;
    private characterCur        : Point = new Point(0, 0);
    private characterTar        : Point = new Point(0, 0);
    private distributingPoint   : Point = new Point(1600, -400);

    private winCloseFirstTimer  : any  = null;
    private winCloseSecondTimer : any  = null;

    private glideEnabled        : boolean = false;
    private glideAmplitudeX     : number  = 30;                 // x salınımı
    private glideAmplitudeY     : number  = 80;                // y salınımı
    private glideFrequency      : number  = 0.8;                // salınım hızı
    private glideTime           : number  = 0;                  // zaman sayacı
    private glideEnd            : Point   = new Point(0, 0);    // akıcı uç noktayı tutar (lerp)
    private glideCenterEnd      : Point | null = null;          // salınımın merkez noktası

    private UI_STATUS_VOLUME    : number = 0.25;
    private FLY_STATUS_VOLUME   : number = 1;
    private WIN_STATUS_VOLUME   : number = 0.75;
    private WIN_STATUS_STATE    : 'first' | 'second' | 'none' = 'none';
    private PROVIDER_CURRENCY   : string = '$';

    boot(config: CrashGameConfig, provider: IProviderInfo): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                void config;
                void provider;
                const conf = getConfig();
                conf.language = navigator.language.split('-')[0] || 'en';
                Engine.CreateGame(conf).then(async (game: any) => {
                    // await Assets.load("preload/company-logo.png");
                    this.app = game;
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async createLoadStage(cb: (progress: number) => void): Promise<void> {
        return new Promise((resolve) => {
            /*
            let barWidth = 1000;  

            const logo = new Sprite({
                texture: Texture.from("preload/company-logo.png"),
                scale: {x: 0.65, y: 0.65},
                position: {x: this.app.screen.width / 2, y: this.app.screen.height / 2},
                anchor: 0.5
            });

            const banners = new Graphics({
                x: 200,
                y: 300,
            });
            banners.roundRect(0, 0, barWidth / 2, 18, 10);
            banners.fill(0xffffff);
            banners.stroke({ width: 0, color: 0xffffff });
            banners.position = new Point(this.app.screen.width / 2 - barWidth / 4, this.app.screen.height / 2 + 200);

            const graphics = new Graphics({
                x: 200,
                y: 300,
            });
            graphics.roundRect(0, 0, barWidth, 18, 10);
            graphics.fill(0xf52a2a);
            graphics.stroke({ width: 0, color: 0xffffff });
            graphics.position = new Point(this.app.screen.width / 2 - barWidth / 4, this.app.screen.height / 2 + 200);

            if (isMobile.any) {
                logo.scale.set(1, 1);
                logo.position.set(this.app.screen.width / 2, this.app.screen.height / 2);

                barWidth = 1000;

                banners.position.x = this.app.screen.width / 2 - barWidth / 4;
                banners.position.y = this.app.screen.height / 2 + 200;
                banners.width = barWidth / 2;
                banners.height = 18;

                graphics.position.x = this.app.screen.width / 2 - barWidth / 4;
                graphics.position.y = this.app.screen.height / 2 + 200;
                // graphics.width = barWidth;
                graphics.height = 18;
            }
            else {
                logo.scale.set(0.65, 0.65);
                logo.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 50);

                barWidth = 400;
                banners.position.x = this.app.screen.width / 2 - barWidth / 4;
                banners.position.y = this.app.screen.height / 2 + 50;
                banners.width = barWidth / 2;
                banners.height = 6;

                graphics.position.x = this.app.screen.width / 2 - barWidth / 4;
                graphics.position.y = this.app.screen.height / 2 + 50;
                // graphics.width = barWidth;
                graphics.height = 6;
            }

            this.app.stage.addChild(logo);
            this.app.stage.addChild(banners);
            this.app.stage.addChild(graphics);

            gsap.to(logo, { angle: 5, duration: 1 });
            */

            Assets.loadBundle(["main", "sounds"], (progress) => {
                cb(progress);
                // graphics.width = barWidth * progress * 1.75;
                }).then(() => {      
                    setTimeout(() => {  
                        // this.app.stage.removeChild(graphics);
                        // this.app.stage.removeChild(banners);
                        // this.app.stage.removeChild(logo);
                        resolve();
                }, 500);
            });
        });
    }

    async createGameState(initialState: GAME_SOCKET_STATE, currency: string): Promise<void> {
        this.gameState          = initialState;
        this.PROVIDER_CURRENCY  =   currency === 'USD' ? '$' : 
                                    currency === 'EUR' ? '€' :
                                    currency === 'GBP' ? '£' :
                                    currency === 'TRY' ? '₺' : 
                                    currency === 'DMO' ? 'DMO ' : '$';

        // console.log(">> GAME STATE: ", this.gameState);
    }

    async createBackground(): Promise<void> {
        this.bgOne = new TilingSprite({
            texture: Texture.from("landscape.png"),
            // width: this.calculateDimensionsBackground().x,
            // height: this.calculateDimensionsBackground().y,
            scale: {x: 1, y: 1},
            position: {x: this.app.screen.width / 2, y: this.app.screen.height / 2},
            anchor: 0.5
        });

        this.bgMoon = new Sprite({
            texture: Texture.from("moon.png"),
            // width: this.calculateDimensionsBackground().x,
            // height: this.calculateDimensionsBackground().y,
            scale: {x: 1, y: 1},
            position: {x: this.app.screen.width / 2 + 250, y: 150},
            anchor: 0.5
        });

        // Cloud Manager oluştur ve initialize et
        this.cloudManager = new CloudManager();
            this.cloudManager.initialize(
            this.app.screen.width, 
            this.app.screen.height, 
            calculateDimensionsBackground().x
        );
    }

    async createCharacter(): Promise<void> {
        this.character = Spine.from({
            skeleton    : "main/spine/fighter/fighter.json",
            atlas       : "main/spine/fighter/fighter.atlas",
            scale       : 0.245,
        });
        this.character.state.data.defaultMix = 0.2;
        this.character.pivot.x = -1 * (this.character.width / 2 - 20);
        this.character.pivot.y = 10;
    }
    
    async createFirstWinSpine(): Promise<void> {
        this.winFirstSpine = Spine.from({
            skeleton    : "main/spine/popups/jackpot_win_popup.json",
            atlas       : "main/spine/popups/jackpot_win_popup.atlas",
            scale       : 1,
        });

        this.winFirstTitle = new Engine.LocalizedText('game.default-win', {}, {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 30,
                fontWeight: "900",
                fill: "#ffffff",
            },
        );

        this.winFirstAmount = new Text({
            text: `${this.PROVIDER_CURRENCY}150`,
            anchor:   {x: 0.5,  y: 0.5},
            position: {x: 0,   y: -20}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 60,
                fontWeight: "900",
                fill: "#0eeb05",
            },
        });
        this.winFirstMultiplier = new Text({
            text: "5.95x",
            anchor:   {x: 0.5,  y: 0.5},
            position: {x: 0,   y: 30}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 30,
                fontWeight: "900",
                fill: "#ffffff",
            },
        });
        
        this.winFirstSpine.skeleton.setSkinByName("default");
        this.winFirstSpine.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 200);
        this.winFirstSpine.state.setAnimation(0, 'idle', true);
        this.winFirstSpine.visible = false;

        this.winFirstTitle.anchor.set(0.5, 0.5);
        this.winFirstTitle.position.set(0, -70);

        this.winFirstTitle.resolution = 2;
        this.winFirstMultiplier.resolution = 2;
        this.winFirstAmount.resolution = 2;
    }

    async createSecondWinSpine(): Promise<void> { 
        this.winSecondSpine = Spine.from({
            skeleton    : "main/spine/popups/jackpot_win_popup.json",
            atlas       : "main/spine/popups/jackpot_win_popup.atlas",
            scale       : 1,
        });

        this.winSecondTitle = new Engine.LocalizedText('game.default-win', {}, {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 30,
                fontWeight: "900",
                fill: "#ffffff",
            },
        );

        this.winSecondAmount = new Text({
            text: `${this.PROVIDER_CURRENCY}150`,
            anchor:   {x: 0.5,  y: 0.5},
            position: {x: 0,   y: -20}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 60,
                fontWeight: "900",
                fill: "#0eeb05",
            },
        });

        this.winSecondMultiplier = new Text({
            text: "5.95x",
            anchor:   {x: 0.5,  y: 0.5},
            position: {x: 0,   y: 30}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 30,
                fontWeight: "900",
                fill: "#ffffff",
            },
        });

        this.winSecondSpine.skeleton.setSkinByName("default");
        this.winSecondSpine.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 200);
        this.winSecondSpine.state.setAnimation(0, 'idle', true);
        this.winSecondSpine.visible = false;

        this.winSecondTitle.anchor.set(0.5, 0.5);
        this.winSecondTitle.position.set(0, -70);

        this.winSecondTitle.resolution = 2;
        this.winSecondMultiplier.resolution = 2;
        this.winSecondAmount.resolution = 2;
    }

    async createFlewPopup(): Promise<void> {
        this.flewPopup = new Sprite({
            texture: Texture.from("statusbg.png"),
            scale: {x: 1, y: 1},
            position: {x: 0, y: 0},
            anchor: 0.5,
            visible: false
        });


        this.flewTitle = new Engine.LocalizedText('game.flew-off', {}, {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 50,
                fontWeight: "600",
                fill: "#ffffff",
            },
        );
        
        this.flewResult = new Text({
            text: "5.05x",
            anchor: {x: 0.5,  y: 0},
            position: {x: 0,  y: 50}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 140,
                fontWeight: "900",
                fill: "#ff0000",
            },
        });

        this.flewPopup.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 125);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.flewTitle.anchor.set(0.5, 0),
        this.flewTitle.position.set(0, -25),
        this.flewTitle.resolution = 2;
        this.flewResult.resolution  = 2;
    }

    async createJackpotSpine(): Promise<void> { 
        this.jackpotSpine = Spine.from({
            skeleton    : "main/spine/popups/jackpot_win_popup.json",
            atlas       : "main/spine/popups/jackpot_win_popup.atlas",
            scale       : 1,
        });

        this.jackpotTitle = new Engine.LocalizedText('game.default-win', {}, {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 30,
                fontWeight: "900",
                fill: "#ffffff",
            },
        );

        this.jackpotAmount = new Text({
            text: `${this.PROVIDER_CURRENCY}150`,
            anchor:   {x: 0.5,  y: 0.5},
            position: {x: 0,   y: -20}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 60,
                fontWeight: "900",
                fill: "#0eeb05",
            },
        });
        this.jackpotMultiplier = new Text({
            text: "5.95x",
            anchor:   {x: 0.5,  y: 0.5},
            position: {x: 0,   y: 30}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 30,
                fontWeight: "900",
                fill: "#ffffff",
            },
        });

        this.jackpotSpine.skeleton.setSkinByName("default");
        this.jackpotSpine.position.set(this.app.screen.width / 2, this.app.screen.height / 2 + 250);
        this.jackpotSpine.state.setAnimation(0, 'idle', true);
        this.jackpotSpine.visible = false;

        this.jackpotTitle.anchor.set(0.5, 0.5);
        this.jackpotTitle.position.set(0, -70);
        this.jackpotTitle.resolution = 2;

        this.jackpotMultiplier.resolution = 2;

        this.jackpotAmount.resolution = 2;
    }

    async createGameText(): Promise<void> {
        this.multiplierText = new Text({
            text: "1.00x",
            anchor: {x: 0.5,  y: 0.5},
            position: {x: 0, y: 0}, 
            style: {
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 150,
                fontWeight: "900",
                fill: "#ffffff",
            },
        });
        this.countText = new Engine.LocalizedText('game.next-round',{time:0}, new TextStyle({
                fontFamily: ["MontserratBold", "Arial", "sans-serif"],
                fontSize: 80,
                fontWeight: "900",
                fill: "#ff0000",
            }),
        );

        this.multiplierText.resolution = 2;
        this.multiplierText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);

        this.countText.anchor.set(0.5, 0.5);
        this.countText.position.set(0, 0);
        this.countText.resolution = 2;
        this.countText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    }

    async createGameStage(): Promise<void> {
        this.app.renderer.on("resize", this.resize.bind(this));
        this.app.stage.alpha = 0;

        window.addEventListener('orientation-resize', (event) => {
            const customEvent = event as CustomEvent;
            this.orientationFlag = customEvent.detail.state ? 'landscape' : 'portrait';

            if (isMobile.apple.tablet) {
                this.bgmToggleSetVolume(1);
                this.sfxToggleSetVolume(1);
            } else if (isMobile.android.tablet) {
                this.bgmToggleSetVolume(1);
                this.sfxToggleSetVolume(1);
            } else if (isMobile.any) {
                if (this.orientationFlag === 'landscape') {
                    this.bgmToggleSetVolume(0);
                    this.sfxToggleSetVolume(0);
                } else {
                    this.bgmToggleSetVolume(1);
                    this.sfxToggleSetVolume(1);
                }
            }  else { // Masaüstü için
                this.bgmToggleSetVolume(1);
                this.sfxToggleSetVolume(1);
            }
        });

        await this.createBackground();
        await this.createCharacter();
        await this.createFirstWinSpine();
        await this.createSecondWinSpine();
        await this.createFlewPopup();
        await this.createJackpotSpine();
        await this.createGameText();

        this.pathManager = new PathManager({
            segments: 64,
            initialIndex: 6
        });
    
        this.meshContainer = new Container();
        this.app.stage.addChild(
            this.bgOne,
            this.bgMoon,
            this.cloudManager,
            this.meshContainer,
            this.character,
            this.flewPopup,
            this.multiplierText,
            this.countText,
            this.winFirstSpine,
            this.winSecondSpine,
            this.jackpotSpine,
        );

        this.winFirstSpine.addChild(this.winFirstTitle, this.winFirstAmount, this.winFirstMultiplier);
        this.winSecondSpine.addChild(this.winSecondTitle, this.winSecondAmount, this.winSecondMultiplier);
        this.jackpotSpine.addChild(this.jackpotTitle, this.jackpotAmount, this.jackpotMultiplier);
        this.flewPopup.addChild(this.flewTitle, this.flewResult);

        this.app.ticker.add((delta) => {
            if (this.initDefaultFlag === true) return;    
            // if (isMobile.any && this.orientationFlag === 'landscape') return;
            if (this.animationFlag === 'closed') return;

            this.cloudManager.updateClouds(delta.deltaTime);
            this.updateCharacterMovement(delta.deltaTime);
        });

        const bgmAliases = ['bgm-main', 'bgm-ambiance'];
        const sfxAliases = ['sfx-auto-cashout-toggle', 'sfx-autoplay-resume', 'sfx-autoplay-start-stop', 
                            'sfx-bet-dec', 'sfx-bet-inc', 'sfx-click', 
                            'sfx-round-start', 'sfx-start-beep', 'sfx-round-end', 
                            'sfx-flying-process',  'sfx-flying-crash',
                            'sfx-himself-grand', 'sfx-himself-major', 'sfx-himself-mega', 'sfx-himself-mini',
                            'sfx-other-grand', 'sfx-other-major', 'sfx-other-mega', 'sfx-other-mini',
                            'sfx-win-default'];

        // TODO -> sfx-autoplay-resume, sfx-flying-start, sfx-win-grand, sfx-win-jackpots

        bgmAliases.forEach(alias => {
            this.app.audio.soundBus.registerSoundFromAssets(alias, 'bgm');
        });

        sfxAliases.forEach(alias => {
            this.app.audio.soundBus.registerSoundFromAssets(alias, 'sfx');
        });

        // sound bus handle settings
        this.app.audio.soundBus.handleSoundSettings();

        this.soundSettings();
    }

    public soundSettings(): void {
        if (isMobile.apple.tablet || isMobile.android.tablet) {
            const unlockAudio = () => {
                this.app.audio.soundBus.PlayBGM('bgm-main',         'bgm', { loop : true, volume: 1  }); 
                // this.app.audio.soundBus.PlayBGM('bgm-ambiance',  'bgm', { loop : true, volume: 0.75 });

                // Etkinlik dinleyicilerini bir kez çalıştıktan sonra kaldır.
                document.removeEventListener('touchstart', unlockAudio);
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            }

            document.addEventListener('touchstart', unlockAudio, { once: true });
            document.addEventListener('click', unlockAudio,      { once: true });
            document.addEventListener('keydown', unlockAudio,    { once: true });
        }
        else if (isMobile.any) {
            const unlockAudio = () => {
                // console.log(">> Orientation: sound checks ", this.orientationFlag);

                if (this.orientationFlag === 'landscape') return;

                this.app.audio.soundBus.PlayBGM('bgm-main',         'bgm', { loop : true, volume: 1  }); 
                // this.app.audio.soundBus.PlayBGM('bgm-ambiance',  'bgm', { loop : true, volume: 0.75 });

                // Etkinlik dinleyicilerini bir kez çalıştıktan sonra kaldır.
                document.removeEventListener('touchstart', unlockAudio);
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            }

            document.addEventListener('touchstart', unlockAudio, { once: false });
            document.addEventListener('click', unlockAudio,      { once: false });
            document.addEventListener('keydown', unlockAudio,    { once: false });
        }
        else 
        {
            this.app.audio.soundBus.PlayBGM('bgm-main',      'bgm', { loop : true, volume: 1  }); 
            // this.app.audio.soundBus.PlayBGM('bgm-ambiance',  'bgm', { loop : true, volume: 0.75 });
        }       

        window.addEventListener('audio-context-state-changed', (event) => {
            void event;
            // const customEvent = event as CustomEvent;
            // console.log("%c>> Audio Context State: %c" + customEvent.detail.state, "color: #ff6b35; font-weight: bold;", "color: #4ecdc4; font-weight: bold;");
        });     
    }

    async bgmToggleSetVolume(volume: number): Promise<void> {
        const value = volume === 1 ? true : false;
        if (value) {
            this.app.audio.soundBus.unmuteBgm();
        } else {
            this.app.audio.soundBus.muteBgm();
        }
    }

    async sfxToggleSetVolume(volume: number): Promise<void> {
        const value = volume === 1 ? true : false;
        if (value) {
            this.UI_STATUS_VOLUME   = 0.5;
            this.FLY_STATUS_VOLUME  = 1;
            this.WIN_STATUS_VOLUME  = 0.75;
            this.app.audio.soundBus.unmuteSfx();
        } else {
            this.UI_STATUS_VOLUME   = 0;
            this.FLY_STATUS_VOLUME  = 0;
            this.WIN_STATUS_VOLUME  = 0;
            this.app.audio.soundBus.muteSfx();
        }
    }

    async animToggleSetVisible(visible: boolean): Promise<void> {
        // this.app.stage.alpha = visible ? 1 : 0;
        this.animationFlag = visible ? 'opened' : 'closed';
        this.cloudManager.setAllLayersVisibility(visible);
        this.bgOne.visible             = visible;
        this.bgMoon.visible            = visible;
        this.character.visible         = visible;
        this.meshContainer.visible     = visible;
        this.rope.visible              = visible;
        this.areaFill.visible          = visible;
    }

    async handleUiClick(soundOverride: string | null): Promise<void> {
        if (soundOverride) {
        switch (soundOverride) {
            case 'betInc':
            this.app.audio.soundBus.PlaySFX('sfx-bet-inc', "sfx", { loop: false, volume: this.UI_STATUS_VOLUME });
            break;
            case 'betDec':
            this.app.audio.soundBus.PlaySFX('sfx-bet-dec', "sfx", { loop: false, volume: this.UI_STATUS_VOLUME });
            break;
            case 'autoCashToggle':
            this.app.audio.soundBus.PlaySFX('sfx-auto-cashout-toggle', "sfx", { loop: false, volume: this.UI_STATUS_VOLUME });
            break;
            case 'autoPlayStartStop':
            this.app.audio.soundBus.PlaySFX('sfx-autoplay-start-stop', "sfx", { loop: false, volume: this.UI_STATUS_VOLUME });
            break;
            case 'autoPlayResume':
            // TODO
            this.app.audio.soundBus.PlaySFX('sfx-autoplay-resume', "sfx", { loop: false, volume: this.UI_STATUS_VOLUME });
            break;
            default:
            this.app.audio.soundBus.PlaySFX('sfx-click', "sfx", { loop: false, volume: this.UI_STATUS_VOLUME });
            break;
        }
        } else {
        this.app.audio.soundBus.PlaySFX('sfx-click', "sfx", { loop: false, volume: this.UI_STATUS_VOLUME });
        }
    }

    createPath(): void {
        const pathPoint0 = new Point(-1 * (calculateDimensionsObject().x + 100),                                            this.app.screen.height + 20);
        const pathPoint1 = new Point(this.app.screen.width / 2,                                                             this.app.screen.height - 200);
        const pathPoint2 = new Point((this.app.screen.width - this.character.width) + (calculateDimensionsObject().x / 2),  this.app.screen.height / 2 - 100);
        this.pathManager.updateControlPoints(pathPoint0, pathPoint1, pathPoint2);
        this.pathManager.createPath();
    }

    createRope(value: number): void {
        // Eski rope'u kaldır
        if (this.rope && this.meshContainer.children.includes(this.rope)) {
            this.meshContainer.removeChild(this.rope);
        }

        // Eski mask'ı kaldır
        if (this.ropeMask && this.meshContainer.children.includes(this.ropeMask)) {
            this.meshContainer.removeChild(this.ropeMask);
        }

        const pathPoint = this.pathManager.getPathPoint();
        const texture   = Texture.from("trail.png");

        // MeshRope oluştur
        this.rope = new MeshRope({
            texture,
            points: pathPoint,
            textureScale : 1
        });

        if (typeof (this.rope as any).autoUpdate !== "undefined") (this.rope as any).autoUpdate = true;

        // Mask oluştur - başlangıçta görünmez
        this.ropeMask = new Graphics();
        this.updateRopeMask(value);
        
        // Rope'a mask uygula
        this.rope.mask = this.ropeMask;
        this.meshContainer.addChild(this.rope);
    }

    createArea(value: number): void { 
        // Eski alan doldurma objesini kaldır
        if (this.areaFill && this.meshContainer.children.includes(this.areaFill)) {
            this.meshContainer.removeChild(this.areaFill);
        }

        this.areaFill = new Graphics();
        this.areaFill.alpha = 0.75; // yarı saydam görünüm
        this.updateAreaMask(value);
        this.meshContainer.addChild(this.areaFill);
    }

    updateAreaMask(progressRatio: number): void {
        if (!this.areaFill) return;
        this.areaFill.clear();

        const h = this.app.screen.height + calculateDimensionsObject().y; // Alt sınır
        const pts = this.pathManager.getPathPoint();
        const n = pts.length;
        const p = Math.max(0, Math.min(1, progressRatio));

        if (p <= 0) return;

        const exact = p * (n - 1);
        const idx = Math.floor(exact);
        const t = exact - idx;

        // Üst sınırı çizecek path
        const start = pts[0];
        this.areaFill.moveTo(start.x, start.y);

        for (let i = 1; i <= idx && i < n; i++) {
            this.areaFill.lineTo(pts[i].x, pts[i].y);
        }

        let topX: number;
        let topY: number;

        if (idx < n - 1 && t > 0) {
            const a = pts[idx];
            const b = pts[idx + 1];
            topX = a.x + (b.x - a.x) * t;
            topY = a.y + (b.y - a.y) * t;
            this.areaFill.lineTo(topX, topY);
            } else {
            topX = pts[idx].x;
            topY = pts[idx].y;
        }

        // Alt kenarlara inip çokgeni kapat
        this.areaFill.lineTo(topX, h);
        this.areaFill.lineTo(start.x, h);
        this.areaFill.lineTo(start.x, start.y);

        // Doldur
        this.areaFill.fill({ color: 0x564e0d, alpha: 0.75 });
    }

    updateRopeMask(progressRatio: number): void {
        if (!this.ropeMask) return;

        this.ropeMask.clear();

        // Toplam path uzunluğunu hesapla
        const totalPoints = this.pathManager.getPathLength();
        const exactProgress = progressRatio * (totalPoints - 1);
        const currentIndex = Math.floor(exactProgress);
        const segmentProgress = exactProgress - currentIndex;

        if (currentIndex < 0) return;

        // Path'i çiz
        this.ropeMask.moveTo(this.pathManager.getPathPointIndex(0).x, this.pathManager.getPathPointIndex(0).y);

        // Tam geçilen noktaları çiz
        for (let i = 1; i <= currentIndex && i < totalPoints; i++) {
            this.ropeMask.lineTo(this.pathManager.getPathPointIndex(i).x, this.pathManager.getPathPointIndex(i).y);
        }
        
        // Mevcut segment'te interpolasyon yap (smooth geçiş)
        if (currentIndex < totalPoints - 1 && segmentProgress > 0) {
            const currentPoint = this.pathManager.getPathPointIndex(currentIndex);
            const nextPoint = this.pathManager.getPathPointIndex(currentIndex + 1);

            const interpolatedX = currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress;
            const interpolatedY = currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress;
            
            this.ropeMask.lineTo(interpolatedX, interpolatedY);
        }
        
        // Kalın bir çizgi ile mask oluştur
        this.ropeMask.stroke({ width: 150, color: 0xffffff, cap: 'round', join: 'round' });
    }

    updateCharacterMovement(deltaTime: number): void {    
        switch (this.gameState) {
        case GAME_SOCKET_STATE.NONE:
        case GAME_SOCKET_STATE.BETTING:
        case GAME_SOCKET_STATE.WAITING:
            break;
        case GAME_SOCKET_STATE.PLAYING:
            if (this.glideEnabled) {
                this.followGlide();
            }
            if (this.pathManager.getIsFollowingPath()) {
                this.followPath(deltaTime * 0.125);
            }
            break;
        case GAME_SOCKET_STATE.DISTRIBUTING:
            this.followTarget(deltaTime * 0.125);
            break;
        }
    }

    followTarget(deltaTime: number): void {
        const diffX = this.characterTar.x - this.characterCur.x;
        const diffY = this.characterTar.y - this.characterCur.y;
        
        // Eğer hedefe yeterince yakınsa hareketi durdur
        if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1) {
        // Yumuşak interpolasyon ile hedefe doğru hareket
        const lerpFactor = 0.05 * deltaTime * this.characterSpeed;
        this.characterCur.x += diffX * lerpFactor;
        this.characterCur.y += diffY * lerpFactor;
        
        // Karakterin pozisyonunu güncelle
        this.character.position.set(this.characterCur.x, this.characterCur.y);
        }
    }

    followPath(deltaTime: number): void {
        // Path'da ilerleme hızı (isteğe göre ayarlayabilirsiniz)
        const completed = this.pathManager.updateProgress(deltaTime, this.characterSpeed);
        
        // Maskeleri güncellemek gerekir.
        this.updateRopeMask(this.pathManager.getPathProgress());
        this.updateAreaMask(this.pathManager.getPathProgress() + 0.025);

        if (completed) {
            this.rope.mask = null;

            this.glideTime = 0;
            this.glideEnabled = true;
            const end = this.pathManager.getFlyingEndPosition();
            this.glideCenterEnd = new Point(end.x, end.y);
            this.glideEnd.copyFrom(end);
            
            this.updateRopeMask(1);
            this.updateAreaMask(1);
            return;
        }

        const currentPos = this.pathManager.calculatePathPosition(this.pathManager.getPathProgress());
        this.characterCur.copyFrom(currentPos);
        this.character.position.set(this.characterCur.x, this.characterCur.y);
    }

    followGlide() {
        this.glideTime += 0.016;
        if (!this.glideEnabled) return;

        if (this.glideCenterEnd) {
            const { minX, maxX, minY, maxY } = calculateBounds(new Point(this.character.width, this.character.height));

            // p2 (end) hedefini sinüsle dolaştır ve clamp et
            const phase = this.glideTime * this.glideFrequency;
            const rawX  = this.glideCenterEnd.x + Math.cos(phase)       * this.glideAmplitudeX;
            const rawY  = this.glideCenterEnd.y + Math.sin(phase * 1.2) * this.glideAmplitudeY;
            const targetX = Math.max(minX, Math.min(maxX, rawX));
            const targetY = Math.max(minY, Math.min(maxY, rawY));

            // end’i yumuşak takip et
            const endLerp = 0.15;
            this.glideEnd.x += (targetX - this.glideEnd.x) * endLerp;
            this.glideEnd.y += (targetY - this.glideEnd.y) * endLerp;

            // p1’i, p0→p2 doğrusu üzerine ve tercihen orta noktaya yumuşat:
            // Burada maskeler,
            // Rope ve alan doldurma için güncellenmesi gerekir.
            // Çünkü glide sırasında path üzerinde ilerlemiyor.
            // Bu sebeple, updateRopeMask yerine, updatePathInPlace kullanıyoruz.
            // ama, area alanın'da güncellenmesi için updateAreaMask çağrısı yapıyoruz.
            this.pathManager.updatePathInPlace(this.glideEnd);
            this.updateAreaMask(this.pathManager.getPathProgress() + 0.025);

            this.character.position.set(this.glideEnd.x, this.glideEnd.y);
            return;
        }
    }

    showBetting(countdown: number) {
        if (this.gameState === GAME_SOCKET_STATE.NONE) return;
        const rawCountDown        = Math.round(countdown / 1000);
        this.multiplierText.text  = "";
        this.countText.setVars({time: rawCountDown.toString()});
        if(this.gameState !== GAME_SOCKET_STATE.BETTING) this.setState(GAME_SOCKET_STATE.BETTING);
    }

    showWaiting(multiplier: number) {
        if (this.gameState === GAME_SOCKET_STATE.NONE) return;
        void multiplier;
        this.multiplierText.text  = "";
        this.countText.text       = "";
        if(this.gameState !== GAME_SOCKET_STATE.WAITING) this.setState(GAME_SOCKET_STATE.WAITING);
    }

    showPlaying(multiplier: number) {
        if (this.gameState === GAME_SOCKET_STATE.NONE) return;
        this.multiplierText.text  = `${multiplier.toFixed(2)}x`;
        this.countText.text       = "";
        if (multiplier > 1.0 && 
                this.gameState !== GAME_SOCKET_STATE.PLAYING) this.setState(GAME_SOCKET_STATE.PLAYING);
    }

    showResult(multiplier: number, countdown: number) {
        if (this.gameState === GAME_SOCKET_STATE.NONE) return;
        void countdown;
        void multiplier;
        this.multiplierText.text  = "";
        this.countText.text       = "";
        this.flewResult.text      = `${multiplier.toFixed(2)}x`;
    }

    showDistributing(multiplier: number, countdown: number) {
        if (this.gameState === GAME_SOCKET_STATE.NONE) return;
        void countdown;
        void multiplier;
        this.multiplierText.text  = "";
        this.countText.text       = "";
        this.flewResult.text      = `${multiplier.toFixed(2)}x`;
        if (this.gameState !== GAME_SOCKET_STATE.DISTRIBUTING) this.setState(GAME_SOCKET_STATE.DISTRIBUTING);
    }

    showWin(parameters: any) {       
        this.WIN_STATUS_STATE =  this.WIN_STATUS_STATE === 'none' ? 'first' : 
                                 this.WIN_STATUS_STATE === 'first' ? 'second' : 'none';


      

      

        if (this.WIN_STATUS_STATE === 'first') {
            this.winFirstAmount.text       = `${this.PROVIDER_CURRENCY}` +  parameters.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            this.winFirstMultiplier.text   = `${parameters.multiplier.toFixed(2)}x`;
            this.firstWinShow();
        }
        
        if (this.WIN_STATUS_STATE === 'second') {
            this.winSecondAmount.text       = `${this.PROVIDER_CURRENCY}` +  parameters.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            this.winSecondMultiplier.text   = `${parameters.multiplier.toFixed(2)}x`;
            this.secondWinShow();
        }
    }


    firstWinShow(){
        const totalShowWinDuration  = 3000;

        if (this.winCloseFirstTimer) {
            clearTimeout(this.winCloseFirstTimer);
            this.winCloseFirstTimer = null;
        }

        this.winFirstTitle.setKey('game.default-win');
        this.winFirstTitle.style.fill = "#ffffff";
        this.winFirstAmount.style.fill = "#0eeb05";
        this.winFirstSpine.skeleton.setSkinByName("default");
        this.app.audio.soundBus.PlaySFX('sfx-win-default', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });

        const winTitlePosStartY       = this.winFirstTitle.position.y;
        const winMultiplierPosStartY  = this.winFirstMultiplier.position.y;

        this.winFirstSpine.visible         = true;
        this.winFirstSpine.alpha           = 0;

        this.winFirstTitle.alpha           = 0;
        this.winFirstAmount.alpha          = 0;
        this.winFirstMultiplier.alpha      = 0;

        this.winFirstSpine.skeleton.setSlotsToSetupPose();
        this.winFirstSpine.state.setAnimation(0, 'start', false);
        this.winFirstSpine.state.addAnimation(0, 'idle', true);

        gsap.to(this.winFirstSpine, { alpha: 1, duration: 0.1, 
            onStart: () => {
            this.winFirstTitle.position.y      = winTitlePosStartY - 15;
            this.winFirstMultiplier.position.y = winMultiplierPosStartY + 15;
            
            gsap.to(this.winFirstTitle,      { y: winTitlePosStartY, duration: 0.2 });
            gsap.to(this.winFirstMultiplier, { y: winMultiplierPosStartY, duration: 0.2 });

            gsap.to([this.winFirstTitle, this.winFirstAmount, this.winFirstMultiplier], { alpha: 1, duration: 0.2, });
            }
        });

        this.winCloseFirstTimer = setTimeout(() => {
            this.winFirstSpine.state.setAnimation(0, 'end', false);
            gsap.to([this.winFirstTitle, this.winFirstAmount, this.winFirstMultiplier], { alpha: 0, duration: 0.15, 
                onComplete: () => {
                    this.winFirstSpine.visible = false;
                }
            });
        }, totalShowWinDuration);
    }

    secondWinShow(){
        const totalShowWinDuration  = 3000;
        const firstSpineTarX        = (this.app.screen.width / 2) + 300;
        const secondSpineTarX       = this.winFirstSpine.visible === false ? (this.app.screen.width / 2) : (this.app.screen.width / 2 - 300);

        gsap.to(this.winFirstSpine.position, { x: firstSpineTarX, duration: 0.25 });

        if (this.winCloseSecondTimer) {
            clearTimeout(this.winCloseSecondTimer);
            this.winCloseSecondTimer = null;
        }

        this.winSecondTitle.setKey('game.default-win');
        this.winSecondTitle.style.fill = "#ffffff";
        this.winSecondAmount.style.fill = "#0eeb05";
        this.winSecondSpine.skeleton.setSkinByName("default");
        this.app.audio.soundBus.PlaySFX('sfx-win-default', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });

        const winTitlePosStartY       = this.winSecondTitle.position.y;
        const winMultiplierPosStartY  = this.winSecondMultiplier.position.y;

        this.winSecondSpine.visible         = true;
        this.winSecondSpine.alpha           = 0;
        this.winSecondSpine.position.x      = secondSpineTarX;

        this.winSecondTitle.alpha           = 0;
        this.winSecondAmount.alpha          = 0;
        this.winSecondMultiplier.alpha      = 0;

        this.winSecondSpine.skeleton.setSlotsToSetupPose();
        this.winSecondSpine.state.setAnimation(0, 'start', false);
        this.winSecondSpine.state.addAnimation(0, 'idle', true);

        gsap.to(this.winSecondSpine, { alpha: 1, duration: 0.1, 
            onStart: () => {
            this.winSecondTitle.position.y      = winTitlePosStartY - 15;
            this.winSecondMultiplier.position.y = winMultiplierPosStartY + 15;

            gsap.to(this.winSecondTitle,      { y: winTitlePosStartY, duration: 0.2 });
            gsap.to(this.winSecondMultiplier, { y: winMultiplierPosStartY, duration: 0.2 });

            gsap.to([this.winSecondTitle, this.winSecondAmount, this.winSecondMultiplier], { alpha: 1, duration: 0.2, });
            }
        });

        this.winCloseSecondTimer = setTimeout(() => {
            this.winSecondSpine.state.setAnimation(0, 'end', false);
            gsap.to([this.winSecondTitle, this.winSecondAmount, this.winSecondMultiplier], { alpha: 0, duration: 0.15, 
            onComplete: () => {
                this.winSecondSpine.visible = false;
            }
            });
        }, totalShowWinDuration);
    }

    showJackpot(parameters: any) {
        void parameters;
        this.jackpotAmount.text       = `${this.PROVIDER_CURRENCY}` + parameters.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.jackpotMultiplier.text   = `${parameters.multiplier.toFixed(2)}x`;

        if(parameters?.type === 'mini' || parameters?.type === 'minor' || parameters?.type === 'major' || parameters?.type === 'grand'){
            // As minor is representd as mega in spine animation skin 
            this.showLose("close");
            switch (parameters.type) {
                case 'grand':
                    this.jackpotTitle.setKey('game.grand-win');
                    this.jackpotTitle.style.fill = "#b40000";
                    this.jackpotAmount.style.fill = "#b40000";
                    this.jackpotSpine.skeleton.setSkinByName("grand");
                    this.app.audio.soundBus.PlaySFX('sfx-himself-grand', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
                break;
                case 'major':
                    this.jackpotTitle.setKey('game.major-win');
                    this.jackpotTitle.style.fill = "#9800a7";
                    this.jackpotAmount.style.fill = "#9800a7";
                    this.jackpotSpine.skeleton.setSkinByName("major");
                    this.app.audio.soundBus.PlaySFX('sfx-himself-major', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
                break;
                case 'minor':
                    // Eğer mini gelmiş ise, renk'ten dolayı, skin mini olur.
                    this.jackpotTitle.setKey('game.minor-win');
                    this.jackpotTitle.style.fill = "#ce6200";
                    this.jackpotAmount.style.fill = "#ce6200";
                    this.jackpotSpine.skeleton.setSkinByName("mini");
                    this.app.audio.soundBus.PlaySFX('sfx-himself-mega', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
                break;
                case 'mini':
                    // Eğer mini gelmiş ise, renk'ten dolayı, skin mega olur.
                    this.jackpotTitle.setKey('game.mini-win');
                    this.jackpotTitle.style.fill = "#56a507";
                    this.jackpotAmount.style.fill = "#56a507";
                    this.jackpotSpine.skeleton.setSkinByName("mega");
                    this.app.audio.soundBus.PlaySFX('sfx-himself-mini', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
                break;
            }
        } 


        const jackpotTitlePosStartY       = this.jackpotTitle.position.y;
        const jackpotMultiplierPosStartY  = this.jackpotMultiplier.position.y;

        this.jackpotSpine.visible         = true;
        this.jackpotSpine.alpha           = 0;

        this.jackpotTitle.alpha           = 0;
        this.jackpotAmount.alpha          = 0;
        this.jackpotMultiplier.alpha      = 0;

        this.jackpotSpine.skeleton.setSlotsToSetupPose();
        this.jackpotSpine.state.setAnimation(0, 'start', false);
        this.jackpotSpine.state.addAnimation(0, 'idle', true);

        gsap.to(this.jackpotSpine, { alpha: 1, duration: 0.1, 
            onStart: () => {
            this.jackpotTitle.position.y      = jackpotTitlePosStartY - 15;
            this.jackpotMultiplier.position.y = jackpotMultiplierPosStartY + 15;

            gsap.to(this.jackpotTitle,      { y: jackpotTitlePosStartY, duration: 0.2 });
            gsap.to(this.jackpotMultiplier, { y: jackpotMultiplierPosStartY, duration: 0.2 });

            gsap.to([this.jackpotTitle, this.jackpotAmount, this.jackpotMultiplier], { alpha: 1, duration: 0.2, });
            }
        });
    }

    playOtherJackpotSound(type: string | null): void {
        if(!type) return;
        if(type === null) return;
        switch (type) {
        case 'grand':
            this.app.audio.soundBus.PlaySFX('sfx-other-grand', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
            break;
        case 'major':
            this.app.audio.soundBus.PlaySFX('sfx-other-major', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
            break;
        case 'minor':
            this.app.audio.soundBus.PlaySFX('sfx-other-mega', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
            break;
        case 'mini':
            this.app.audio.soundBus.PlaySFX('sfx-other-mini', "sfx", { loop: false, volume: this.WIN_STATUS_VOLUME });
            break;
        }
    }

    showLose(value: "open" | "close") {
        if (value === "open") {
            this.flewPopup.visible = true;
        } else {
            this.flewPopup.visible = false;
        }
    }



    handleGameFlowSound(): void {
        switch(this.gameState){
            case GAME_SOCKET_STATE.BETTING:
                // this.app.audio.soundBus.PlaySFX('sfx-round-start', "sfx", { loop: false, volume: this.FLY_STATUS_VOLUME });
                break;
            case GAME_SOCKET_STATE.WAITING:

                // TEST JACKPOT
                
                /*
                setTimeout(() => {
                    this.showJackpot({amount: 100101.36, multiplier: 2.95, type: 'major' });
                }, 1000);
                
                setTimeout(() => {
                    this.showWin({amount: 1002211.36, multiplier: 2.95, type: 'default' });
                }, 3000);

                setTimeout(() => {
                    this.showWin({amount: 223101.36, multiplier: 2.95, type: 'default' });
                }, 8000);       
                */         
                

                this.app.audio.soundBus.PlaySFX('sfx-start-beep', "sfx", { loop: false, volume: this.FLY_STATUS_VOLUME });
                break;
            case GAME_SOCKET_STATE.PLAYING:
                // this.app.audio.soundBus.PlaySFX('sfx-flying-process', "sfx", { loop: false, volume: this.FLY_STATUS_VOLUME });
                break;
            case GAME_SOCKET_STATE.DISTRIBUTING:
                this.app.audio.soundBus.PlaySFX('sfx-flying-process', "sfx", { loop: false, volume: this.FLY_STATUS_VOLUME });
                // this.app.audio.soundBus.PlaySFX('sfx-round-end', "sfx", { loop: false, volume: this.FLY_STATUS_VOLUME });
                break;
        }
    }

    handleGameFlowRope(): void {       
        switch(this.gameState){
            case GAME_SOCKET_STATE.BETTING:
            case GAME_SOCKET_STATE.WAITING:
                this.rope.mask = this.ropeMask
                this.pathManager.setPathProgress(0);
                this.updateRopeMask(this.pathManager.getPathProgress());
                this.updateAreaMask(this.pathManager.getPathProgress());
                break;
            case GAME_SOCKET_STATE.PLAYING:
                if (this.initRopeFlag === 'init') {
                    this.rope.mask = null;
                    this.updateRopeMask(this.pathManager.getPathProgress());
                    this.updateAreaMask(this.pathManager.getPathProgress() + 0.025);
                }

                if (this.initRopeFlag === 'resize') {
                    if (this.glideEnabled) {
                        this.rope.mask = null;
                        this.updateRopeMask(this.pathManager.getPathProgress());
                        this.updateAreaMask(this.pathManager.getPathProgress() + 0.025);
                    }
                }
                break;
            case GAME_SOCKET_STATE.DISTRIBUTING:
                this.rope.mask = this.ropeMask;
                this.pathManager.setPathProgress(0);
                this.updateRopeMask(this.pathManager.getPathProgress());
                this.updateAreaMask(this.pathManager.getPathProgress());
                break;
        }
    }

    handleGameFlowSpine(): void {
        switch(this.gameState){
            case GAME_SOCKET_STATE.BETTING:
            case GAME_SOCKET_STATE.WAITING:
                this.character.state.setAnimation(0, 'engine_start_loop', true);
                break;
            case GAME_SOCKET_STATE.PLAYING:
                if (this.initSpineFlag === 'init') {
                    this.character.state.addAnimation(0, 'fly_hovering_loop', true);
                }
                if (this.initSpineFlag === 'flow') {
                    this.character.state.setAnimation(0, 'engine_start', false);
                    this.character.state.addAnimation(0, 'fly_hovering_loop', true);
                }
                if (this.initSpineFlag === 'resize') {
                     this.character.state.setAnimation(0, 'fly_hovering_loop', true);
                }
                break;
            case GAME_SOCKET_STATE.DISTRIBUTING:
                this.character.state.setAnimation(0, 'fly_off', true);
                break;
        }
    }

    handleGameFlowSpeed(): void {
        switch(this.gameState){
            case GAME_SOCKET_STATE.BETTING:
            case GAME_SOCKET_STATE.WAITING:
                this.characterSpeed = 0;
                this.cloudManager.setBaseSpeed(2);
                break;
            case GAME_SOCKET_STATE.PLAYING:
                this.characterSpeed = 4;
                this.cloudManager.setBaseSpeed(5);
                break;
            case GAME_SOCKET_STATE.DISTRIBUTING:
                this.characterSpeed = 6;
                this.cloudManager.setBaseSpeed(7);
                break;
        }
    }

    handleGameFlowText(): void {
        switch(this.gameState){
            case GAME_SOCKET_STATE.BETTING:
            case GAME_SOCKET_STATE.WAITING:
                this.winFirstSpine.visible = false;
                this.winSecondSpine.visible = false;
                this.jackpotSpine.visible = false;
                this.WIN_STATUS_STATE = 'none';
                this.winFirstSpine.position.x = (this.app.screen.width / 2);
                this.winSecondSpine.position.x = (this.app.screen.width / 2);
                this.showLose("close");
                if (this.winCloseFirstTimer) {
                    clearTimeout(this.winCloseFirstTimer);
                    this.winCloseFirstTimer = null;
                }

                if (this.winCloseSecondTimer) {
                    clearTimeout(this.winCloseSecondTimer);
                    this.winCloseSecondTimer = null;
                }
                break;
            case GAME_SOCKET_STATE.PLAYING:
                this.showLose("close");
                break;
            case GAME_SOCKET_STATE.DISTRIBUTING:
                this.showLose("open");
                // this.winFirstSpine.visible = false;
                // this.winSecondSpine.visible = false;
                // this.winFirstSpine.position.x = (this.app.screen.width / 2);
                // this.winSecondSpine.position.x = (this.app.screen.width / 2);               
                /*
                if (this.winCloseFirstTimer) {
                    clearTimeout(this.winCloseFirstTimer);
                    this.winCloseFirstTimer = null;
                }

                if (this.winCloseSecondTimer) {
                    clearTimeout(this.winCloseSecondTimer);
                    this.winCloseSecondTimer = null;
                }
                */
                break;
        }
    }

    handleGameFlowPosition(): void {
        switch (this.gameState) {
            case GAME_SOCKET_STATE.BETTING:
            case GAME_SOCKET_STATE.WAITING:
                this.glideEnabled = false;
                this.characterCur = this.readySetPos();        
                break;
            case GAME_SOCKET_STATE.PLAYING:
                if (this.initPosFlag === 'init') {
                    this.pathManager.runPathStart(this.pathManager.runPathEndIndex())

                    this.helperGameFlowPonit();

                    const finalEnd = this.flyingFinishedPos();

                    this.characterCur.copyFrom(finalEnd);
                    this.characterTar.copyFrom(finalEnd);                      

                    this.glideEnabled = true;
                    this.glideTime    = 0;
                } 

                if (this.initPosFlag === 'flow') {      
                    // normal default start durumu, sadece current pozisyonu alıyoruz. | pathPoint'ları güncelle
                    this.helperGameFlowPonit();
                    this.pathManager.runPathStart(this.pathManager.runPathStartIndex());
                    this.characterCur = this.flyingStartedPos();
                }

                if (this.initPosFlag === 'resize') {
                    // Progrese bak, ve point noktalarını güncelle
                    this.helperGameFlowPonit();              
                    const progress = this.pathManager.getCurrentPathIndex();
                    this.characterCur = this.pathManager.calculatePathPosition(progress);
                }
                break;
            case GAME_SOCKET_STATE.DISTRIBUTING:
                this.glideEnabled   = false;
                if (this.initPosFlag === 'init') {
                    const end         = this.flyingFinishedPos();
                    this.characterCur.copyFrom(end);
                    this.characterTar = this.distributingPos();
                } 

                if (this.initPosFlag === 'flow') {
                    this.characterCur = new Point(this.character.position.x, this.character.position.y);
                    this.characterTar = this.distributingPos();
                }
                
                if (this.initPosFlag === 'resize') {
                    this.characterCur = new Point(this.character.position.x, this.character.position.y);
                    this.characterTar = this.distributingPos();
                }
                break;
        }

        
        this.character.position.set(this.characterCur.x, this.characterCur.y);
    }

    helperGameFlowPonit(): void {
        const pathPoint0    = new Point(-1 * (calculateDimensionsObject().x + 100), this.app.screen.height + 20);
        const pathPoint1    = new Point(this.app.screen.width / 2,                   this.app.screen.height - 200);
        this.glideCenterEnd = new Point((this.app.screen.width - this.character.width) + (calculateDimensionsObject().x / 2),  this.app.screen.height / 2 - 100);
        this.glideEnd       = new Point((this.app.screen.width - this.character.width) + (calculateDimensionsObject().x / 2),  this.app.screen.height / 2 - 100);

        this.pathManager.updateControlPoints(pathPoint0, pathPoint1, this.glideEnd);   

        // TODO DEL const pathPoint2 = new Point((this.app.screen.width - this.character.width) + calculateDimensionsObject().x,  this.app.screen.height / 2 - 100);
        // const { minX, maxX, minY, maxY } = calculateBounds();
        // this.glideEnd.x = Math.max(minX, Math.min(maxX, this.glideCenterEnd.x));
        // this.glideEnd.y = Math.max(minY, Math.min(maxY, this.glideCenterEnd.y));
        // log(">> App ||", this.app.screen.width, this.app.screen.height);
        // log(">> background ||", calculateDimensionsBackground());
        // log(">> object ||", calculateDimensionsObject());
        // log(">> bounds ||", calculateBounds(new Point(this.character.width, this.character.height)));
        // log(this.pathManager.getPathPoint());
        // log("---------------------------------");
        // -> session hatası geldiğinde | sesler çalmaya devam ediyor fixle
        // -> yan monitöre aldığında, sesler gitmemesi lazım. | Murat & Mustafa eski anubis kodları
    }

    setState(state: GAME_SOCKET_STATE): void {
        this.gameState = state;

        this.handleGameFlowSound();
        this.handleGameFlowSpine();
        this.handleGameFlowText();
        this.handleGameFlowSpeed();
        this.handleGameFlowPosition();
        this.handleGameFlowRope();

        // console.log(">> STATE || ", this.gameState);
    }


    // TODO delete
    public setVersionText(version: string, environment: any) {
        let evo = "";
        if (environment.local)          evo += "[LOCAL] ";
        if (environment.dev)            evo += "[DEV] ";
        if (environment.stage)          evo += "[STAGING] ";
        if (environment.prod)           evo += "[PRODUCTION] ";
        
        console.log("%c>> APERION version || %c" + version + " || " +  evo,  "color: #ff6b35; font-weight: bold;", "color: #4ecdc4; font-weight: bold;");
    }

    readySetPos(): Point {    
        return this.pathManager.getReadyPosition();
    }

    flyingFinishedPos(): Point {
        return this.pathManager.getFlyingEndPosition();
    }

    flyingStartedPos(): Point {  
        return this.pathManager.getReadyPosition();
    }

    distributingPos(): Point {
        const end =  this.pathManager.getFlyingEndPosition();
        const planeX = end.x + this.distributingPoint.x;
        const planeY = end.y + this.distributingPoint.y;
        return new Point(planeX, planeY);
    }

    public resize(): void {
        // console.log(">> RESIZE || ", this.gameState);

        // if (this.gameState === GAME_SOCKET_STATE.NONE) return;
        // if (isMobile.any && this.orientationFlag === 'landscape' && !isMobile.apple.tablet) return;

        const currentOrientation = isPortrait() ? "portrait" : "landscape";
        this.bgOne.texture       = Texture.from(currentOrientation + ".png");
        this.bgOne.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        this.bgOne.width         = calculateDimensionsBackground().x;
        this.bgOne.height        = calculateDimensionsBackground().y;

        this.bgMoon.position.set(this.app.screen.width / 2 + 250, 150);

        this.cloudManager.resize(
            this.app.screen.width, 
            this.app.screen.height, 
            calculateDimensionsBackground().x
        ); 

        this.multiplierText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        this.countText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        this.flewPopup.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 125);

        if (this.WIN_STATUS_STATE === 'first') {
            this.winFirstSpine.position.set(this.app.screen.width / 2,  this.app.screen.height / 2 - 200);    
        } else if (this.WIN_STATUS_STATE === 'second') {
            this.winFirstSpine.position.set(this.app.screen.width / 2 + 300,  this.app.screen.height / 2 - 200);    
            this.winSecondSpine.position.set(this.app.screen.width / 2 - 300, this.app.screen.height / 2 - 200);   
        } else {
            this.winFirstSpine.position.set(this.app.screen.width / 2,  this.app.screen.height / 2 - 200);    
            this.winSecondSpine.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 200);   
        }
       
        this.jackpotSpine.position.set(this.app.screen.width / 2, this.app.screen.height / 2 + 250);

        this.createPath();
        this.createRope(0);
        this.createArea(0);

        // Initial'de flag true olduğu için, init'e alıyoruz. !
        if (this.initDefaultFlag) {
            this.initPosFlag     = 'init';
            this.initRopeFlag    = 'init';
            this.initSpineFlag   = 'init';
        }

        // Initial'de flag true olduğu için, ilk resize'de çalışmayacak !
        if(!this.initDefaultFlag) {
            this.initPosFlag     = 'resize';
            this.initRopeFlag    = 'resize';
            this.initSpineFlag   = 'resize';
        }

        this.handleGameFlowSpine();
        this.handleGameFlowText();
        this.handleGameFlowSpeed();
        this.handleGameFlowPosition();
        this.handleGameFlowRope();

        this.initPosFlag     = 'flow';
        this.initRopeFlag    = 'flow';
        this.initSpineFlag   = 'flow';
        this.initDefaultFlag = false;
        gsap.to(this.app.stage, { alpha: 1, duration: 1, });
    }
}