import { Engine } from "game-engine";
import { GameMode, ReelEvent } from "slot-game-engine/src";
import { GameSpeedMode } from "slot-game-ui";

export class SoundManager {
  private game!: any;
  private scatterCount: number = 0;
  private winCount: number = 0;
  private scatterFound: boolean[] = [false, false, false, false, false];

  constructor() {
    this.game = Engine.getEngine();
    this.initializeSound();
    // play sound on cascade and reel stop
    this.playCascadeSound();
    this.playReelStopSound();
    this.playGeneralAmbMusic();
    this.playUIButtonSound();
  }

  public initializeSound(): void {
    const bgmAliases = [
      'sounds/music/Anubis_FreeSpinMusic.wav',
      'sounds/music/GoldenEgypt_BaseSpinMusic.wav',
      'sounds/music/big_win_loop.wav',
      'sounds/music/mega_win_loop.wav',
      'sounds/music/sensational_win_loop.wav',
      'sounds/music/silence.mp3',
      'sounds/fx/GoldenEgypt_BonusIntro_Loop.wav',
    ];
    const sfxAliases = [
      'sounds/music/big_win_end.wav',
      'sounds/music/mega_win_end.wav',
      'sounds/music/sensational_win_end.wav',
      'sounds/fx/AnubisDream_AnubisAnim_Fire.wav',
      'sounds/fx/AnubisDream_AnubisAnim_Lightning.wav',
      'sounds/fx/AnubisDream_AnubisAnim_StaffHit.wav',
      'sounds/fx/AnubisDream_AnubisAnim_StaffUp.wav',
      'sounds/fx/AnubisDream_BigWild.wav',
      'sounds/fx/AnubisDream_BigWildHaHa.wav',
      'sounds/fx/AnubisDream_BonusGame_Outro.wav',
      'sounds/fx/AnubisDream_BonusWindowClose.wav',
      'sounds/fx/AnubisDream_Cascade.wav',
      'sounds/fx/AnubisDream_Click.wav',
      'sounds/fx/AnubisDream_CongratsWindowOpen.wav',
      'sounds/fx/AnubisDream_FreeSpinScatter_Movement.wav',
      'sounds/fx/AnubisDream_FreeSpinWindowClose.wav',
      'sounds/fx/AnubisDream_FreeSpinWindowOpen.wav',
      'sounds/fx/AnubisDream_GeneralAmb.wav',
      'sounds/fx/AnubisDream_Multiplier.wav',
      'sounds/fx/AnubisDream_Multiplier_Adrenaline.wav',
      'sounds/fx/AnubisDream_Multiplier_Fake.mp3',
      'sounds/fx/AnubisDream_ReelSpin_Loop.wav',
      'sounds/fx/AnubisDream_ReelStop.wav',
      'sounds/fx/AnubisDream_Scatter1.wav',
      'sounds/fx/AnubisDream_Scatter2.wav',
      'sounds/fx/AnubisDream_Scatter3.wav',
      'sounds/fx/AnubisDream_SymbolAnim_A.wav',
      'sounds/fx/AnubisDream_SymbolAnim_J.wav',
      'sounds/fx/AnubisDream_SymbolAnim_Q.wav',
      'sounds/fx/AnubisDream_SymbolAnim_Sword.wav',
      'sounds/fx/AnubisDream_SymbolAnimation_Cross.wav',
      'sounds/fx/AnubisDream_SymbolAnimation_Jar.wav',
      'sounds/fx/AnubisDream_SymbolAnimation_Sheet.wav',
      'sounds/fx/AnubisDream_SymbolAnimation_Sword.wav',
      'sounds/fx/AnubisDream_SymbolExplode01.wav',
      'sounds/fx/AnubisDream_SymbolExplode02.wav',
      'sounds/fx/AnubisDream_SymbolExplode03.wav',
      'sounds/fx/AnubisDream_SymbolExplode04.wav',
      'sounds/fx/AnubisDream_SymbolExplode05.wav',
      'sounds/fx/AnubisDream_SymbolExplode06.wav',
      'sounds/fx/AnubisDream_SymbolExplode07.wav',
      'sounds/fx/AnubisDream_SymbolExplode08.wav',
      'sounds/fx/AnubisDream_SymbolExplode09.wav',
      'sounds/fx/AnubisDream_SymbolMatchV1.wav',
      'sounds/fx/AnubisDream_SymbolMatchV2.wav',
      'sounds/fx/AnubisDream_SymbolMatchV3.wav',
      'sounds/fx/AnubisDream_SymbolMatchV4.wav',
      'sounds/fx/AnubisDream_SymbolMatchV5.wav',
      'sounds/fx/AnubisDream_UIClick.wav',
      'sounds/fx/AnubisDream_UIHover.wav',
      'sounds/fx/FGScatter_BellSound.wav',
    ];

    bgmAliases.forEach(alias => {
      this.game.audio.soundBus.registerSoundFromAssets(alias, 'bgm');
    });

    sfxAliases.forEach(alias => {
      this.game.audio.soundBus.registerSoundFromAssets(alias, 'sfx');
    });

    // sound bus handle settings
    this.game.audio.soundBus.handleSoundSettings();

    // this.settings();
  }

  public playGeneralAmbMusic(): void {
    this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_GeneralAmb.wav", 'sfx', {
      volume: 1,
      loop: true,
    });
  }

  public playBaseGameMusic(): void {
    this.game.audio.soundBus.StopSFX("sounds/fx/AnubisDream_BonusGame_Outro.wav", 'sfx');
    this.game.audio.soundBus.StopBGM("sounds/music/Anubis_FreeSpinMusic.wav", 'bgm');
    this.game.audio.soundBus.StopBGM("sounds/music/GoldenEgypt_BaseSpinMusic.wav", 'bgm');
    this.game.audio.soundBus.PlayBGM("sounds/music/GoldenEgypt_BaseSpinMusic.wav", 'bgm', {
      volume: 0.75,
      loop: true,
    });
  }

  public playFreeSpinMusic(): void {
    this.game.audio.soundBus.StopBGM("sounds/music/GoldenEgypt_BaseSpinMusic.wav", 'bgm');
    this.game.audio.soundBus.StopBGM("sounds/fx/GoldenEgypt_BonusIntro_Loop.wav", 'bgm');
    this.game.audio.soundBus.StopBGM("sounds/music/Anubis_FreeSpinMusic.wav", 'bgm');
    this.game.audio.soundBus.PlayBGM("sounds/music/Anubis_FreeSpinMusic.wav", 'bgm', {
      volume: 1,
      loop: true,
    });
  }

  protected playCascadeSound(): void {
    this.game.slot.machine.reels.forEach((reel: any) => {
      reel.events.on(
        ReelEvent.REEL_CASCADE_START,
        (reelData: any, extract: number[], insert: string[]) => {
          this.scatterFound[reel.reelIndex] = false; // Reset scatter found at the start of cascade
          insert.forEach((symbol: any) => {
            if (symbol === "9" || symbol === 9) {
              this.scatterFound[reel.reelIndex] = true;
            }
          });
        },
        this
      );
      reel.events.on(
        ReelEvent.REEL_CASCADE_COMPLETE,
        () => {
          if (reel.reelIndex === 0) {
            const gameSpeed = this.game.registry.get('gameSpeed') as GameSpeedMode;
            const isTurbo: boolean = (gameSpeed && gameSpeed === "turbo" || gameSpeed === "quick") || false;
            this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_Cascade.wav", 'sfx', {
              volume: 1,
              speed: isTurbo ? 1.5 : 1,
            });
          }
          // Play scatter landing sound if scatter was found in this reel
          if (this.scatterFound[reel.reelIndex]) {
            this.playScatterLandingSound();
          }
          if (reel.reelIndex === 4) {
            this.scatterFound = [false, false, false, false, false]; // Reset after all reels processed
          }
        },
        this
      );
    });
  }

  protected playReelStopSound(): void {
    this.game.slot.machine.reels.forEach((reel: any) => {
      reel.events.on(
        ReelEvent.REEL_STOP_START,
        () => {
          setTimeout(() => {
          this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_ReelStop.wav", 'sfx', {});
          }, (this.game.slot.machine.reelStopDelay * 1000) || 500);
        },
        this
      );
      reel.events.on(
        ReelEvent.REEL_STOP_COMPLETE,
        () => {
          // Check for scatter symbols and play sound
          reel.displaySymbols.forEach((sym: any) => {
            if (sym.id === "9" || sym.id === 9) {
              this.scatterCount++;
              this.scatterCount > 3 && (this.scatterCount = 3);
              this.playScatterLandingSound();
            }
          });
        },
        this
      );
    });
  }

  protected playScatterLandingSound(): void {
    setTimeout(() => {
      this.game.audio.soundBus.PlaySFX(
        "sounds/fx/AnubisDream_Scatter" + (this.scatterCount || 1) + ".wav",
        'sfx',
        {}
      );
      this.scatterCount === 3 && (this.scatterCount = 0); // Reset scatter count on spin button press
    }, 50);
  }

  protected playSpinButtonSound(): void {
    this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_UIClick.wav", 'sfx', {});
  }
  protected playGenericButtonSound(): void {
    this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_Click.wav", 'sfx', {});
  }

  protected playUIButtonSound(): void {
    this.game.slot.ui.footer.hamburgerButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.hamburgerPanel.closeButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.infoButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.hamburgerPanel.on("playButtonSound", () => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.betArea.on("playButtonSound", () => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.spinArea
      .getAutoPlayButton()
      .onPress.connect(() => {
        this.playGenericButtonSound();
      });
    this.game.slot.ui.footer.spinArea.getGameSpeed().onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.spinArea.getSpinButton().onPress.connect(() => {
      this.playSpinButtonSound();
    });
    this.game.slot.ui.footer.spinArea.betControl.upButton.onPress.connect(
      () => {
        this.playGenericButtonSound();
      }
    );
    this.game.slot.ui.footer.spinArea.betControl.downButton.onPress.connect(
      () => {
        this.playGenericButtonSound();
      }
    );
    this.game.slot.ui.footer.betPanel.closeButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.betPanel.betLevelIncButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.betPanel.betLevelDecButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.betPanel.coinIncButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.betPanel.coinDecButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.betPanel.totalIncButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.betPanel.totalDecButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.autoPlayPanel.quickSwitch.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.autoPlayPanel.turboSwitch.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.autoPlayPanel.skipSwitch.onPress.connect(() => {
      this.playGenericButtonSound();
    });
    this.game.slot.ui.footer.autoPlayPanel.startButton.onPress.connect(() => {
      this.playSpinButtonSound();
    });
    this.game.slot.ui.footer.autoPlayPanel.closeButton.onPress.connect(() => {
      this.playGenericButtonSound();
    });
  }

  public playSymbolSound(data: any): void {
    const { context } = this.game.slot.actor.getSnapshot();
    const gameMode = context.gameMode as GameMode;

    const gameSpeed = this.game.registry.get('gameSpeed') as GameSpeedMode;
    const isTurbo: boolean = (gameSpeed && gameSpeed === "turbo") || false;

    this.winCount = this.winCount > 8 ? 1 : this.winCount + 1;

    if (!isTurbo) {
      setTimeout(() => {
        this.game.audio.soundBus.PlaySFX(
          "sounds/fx/AnubisDream_SymbolMatchV" +
            ((this.winCount % 5) + 1) +
            ".wav",
          'sfx',
          { volume: 1, delay: 0.15, speed: isTurbo ? 1.3 : 1 }
        );
      }, 150);
    }
    // Play symbol sound based on symbol ID
    switch (data.symbols[0]) {
      case 1:
        this.game.audio.soundBus.PlaySFX(
          "sounds/fx/AnubisDream_SymbolAnimation_Cross.wav",
          'sfx',
          { speed: isTurbo ? 1.5 : 1 }
        );
        break;
      case 2:
        this.game.audio.soundBus.PlaySFX(
          "sounds/fx/AnubisDream_SymbolAnimation_Jar.wav",
          'sfx',
          { speed: isTurbo ? 1.5 : 1 }
        );
        break;
      case 3:
        this.game.audio.soundBus.PlaySFX(
          "sounds/fx/AnubisDream_SymbolAnimation_Sheet.wav",
          'sfx',
          { speed: isTurbo ? 1.5 : 1 }
        );
        break;
      case 4:
        this.game.audio.soundBus.PlaySFX(
          "sounds/fx/AnubisDream_SymbolAnimation_Sword.wav",
          'sfx',
          { speed: isTurbo ? 1.5 : 1 }
        );
        break;
      case 5:
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_SymbolAnim_A.wav", 'sfx', {
          speed: isTurbo ? 1.5 : 1,
        });
        break;
      case 6:
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_SymbolAnim_A.wav", 'sfx', {
          speed: isTurbo ? 1.5 : 1,
        });
        break;
      case 7:
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_SymbolAnim_J.wav", 'sfx', {
          speed: isTurbo ? 1.5 : 1,
        });
        break;
      case 8:
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_SymbolAnim_Q.wav", 'sfx', {
          speed: isTurbo ? 1.5 : 1,
        });
        break;
      case 11:
      case 12:
      case 13:
      case 14:
      case 15:
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_BigWild.wav", 'sfx', {
          speed: isTurbo ? 1.5 : 1,
        });
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_BigWildHaHa.wav", 'sfx', {
          speed: isTurbo ? 1.5 : 1,
        });
        break;
      default:
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_SymbolMatch_V1.wav", 'sfx', {
          speed: isTurbo ? 1.5 : 1,
        });
        break;
    }
    // This is to ensure the sound plays after the symbol animation
    setTimeout(
      () => {
        this.game.audio.soundBus.PlaySFX(
          "sounds/fx/AnubisDream_SymbolExplode0" + this.winCount + ".wav",
          'sfx',
          { delay: isTurbo ? 0 : 1.1, speed: isTurbo ? 1.5 : 1 }
        );
      },
      isTurbo ? 0 : 1100
    );
    // Play big wild sound if any big wild symbols are present
    let bigWildReelId = [];
    data.winnerSymbols.forEach((winSymbol: any) => {
      winSymbol[1].forEach((symbolDetail: any) => {
        if (symbolDetail[2] === 10) {
          bigWildReelId.push(symbolDetail[0]);
        }
      });
    });
    if (gameMode === "freespin" && bigWildReelId.length >= 4) {
      this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_BigWild.wav", {
        speed: isTurbo ? 1.5 : 1,
      });
      this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_BigWildHaHa.wav", 'sfx', {
        speed: isTurbo ? 1.5 : 1,
      });
    }
  }

  public playBigWinSound(winType: any, isTurbo: boolean): void {
    const bigWinSoundId =
      winType === "BIG"
        ? "sounds/music/big_win_loop.wav"
        : winType === "MEGA"
        ? "sounds/music/mega_win_loop.wav"
        : "sounds/music/sensational_win_loop.wav";
    const bigWinSoundEndId =
      winType === "BIG"
        ? "sounds/music/big_win_end.wav"
        : winType === "MEGA"
        ? "sounds/music/mega_win_end.wav"
        : "sounds/music/sensational_win_end.wav";
    if (!isTurbo) {
      this.game.audio.soundBus.StopBGM("sounds/music/GoldenEgypt_BaseSpinMusic.wav", 'bgm'); // Stop the current music
      this.game.audio.soundBus.StopBGM("sounds/music/Anubis_FreeSpinMusic.wav", 'bgm'); // Stop the current music
      this.game.audio.soundBus.PlayBGM(bigWinSoundId, 'bgm', { volume: 1, loop: true });
    } else {
      this.game.audio.soundBus.PlaySFX(bigWinSoundEndId, 'sfx', { volume: 1 });
    }
  }
  public playBigWinEndSound(winType: any): void {
    const { context } = this.game.slot.actor.getSnapshot();
    const gameMode = context.gameMode as GameMode;
    const gameSpeed = this.game.registry.get('gameSpeed') as GameSpeedMode;
    const isTurbo: boolean = (gameSpeed && gameSpeed === "turbo") || false;
    // Stop the current music
    this.game.audio.soundBus.StopBGM("sounds/music/big_win_loop.wav", 'bgm');
    this.game.audio.soundBus.StopBGM("sounds/music/mega_win_loop.wav", 'bgm');
    this.game.audio.soundBus.StopBGM("sounds/music/sensational_win_loop.wav", 'bgm');
    //this.game.audio.soundBus.PlayBGM("sounds/music/silence.mp3", 'bgm', {loop: false});
    const bigWinSoundEndId =
      winType === "BIG"
        ? "sounds/music/big_win_end.wav"
        : winType === "MEGA"
        ? "sounds/music/mega_win_end.wav"
        : "sounds/music/sensational_win_end.wav";
    const timeOutDelay =
      winType === "BIG"
        ? 2500
        : winType === "MEGA"
        ? 2500
        : 4000;

    !isTurbo && this.game.audio.soundBus.PlaySFX(bigWinSoundEndId, 'sfx', { volume: 1 });

    setTimeout(() => {
      if (context.gameMode === "freespin" && context.nextAction === "spin") return;
      // Resume the appropriate music based on game mode
      if (gameMode === "spin") {
        this.playBaseGameMusic();
      } else {
        this.playFreeSpinMusic();
      }
    }, isTurbo ? timeOutDelay - 1000 : timeOutDelay);
  }
}
