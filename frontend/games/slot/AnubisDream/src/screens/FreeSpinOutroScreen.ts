import { Spine } from "@esotericsoftware/spine-pixi-v8";
import {
  Container,
  Graphics,
  isMobile,
  Sprite,
  TextStyle,
  Texture,
} from "pixi.js";
import { Engine } from "game-engine";
import { Slot } from "slot-game-engine";
import { gsap } from "gsap";
import { isPortrait } from "game-engine/src/utils";

export class FreeSpinOutroScreen
  extends Container
  implements
  Engine.IRunnerVisual<
    Slot.FreeSpinOutroRunnerData,
    Slot.FreeSpinOutroRunnerOptions
  > {
  private bgOverlay!: Graphics;
  private fsOutroSpine!: Spine;
  stormSpine!: Spine;
  private headerText!: Sprite;
  private youWonText!: Sprite;
  private freeSpinText!: Sprite;
  private gameClickLayer: Graphics;
  private totalWinAmount!: Engine.LocalizedBitmapText;
  private totalFreeSpinCount!: Engine.LocalizedBitmapText;
  private pressAnywhereLabel!: InstanceType<typeof Engine.LocalizedText>;
  private onInteraction: (type: string, data: any) => void = () => { };

  public constructor(gameClickLayer: Graphics) {
    super(); // Centered position
    this.gameClickLayer = gameClickLayer;
    Engine.Utils.ApplyCommonProperties(this, {
      visible: false,
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 0.9, x: 960, y: 510 },
              },
              mobile: {
                landscape: { scale: 1, x: 970, y: 540 },
                portrait: { scale: 0.62, x: 540, y: 1170 },
              },
              tablet: {
                landscape: { scale: 1, x: 970, y: 540 },
                portrait: { scale: 1, x: 540, y: 1170 },
              },
            },
          ],
        },
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: { columns: 2, rows: 2, position: { x: 0, y: 0 } },
            },
          ],
        },
      ],
    });
    this.create();
  }

  private async create() {
    this.bgOverlay = new Graphics();
    this.bgOverlay
      .roundRect(
        0,
        0,
        this.game.renderer.screen.width + 2000,
        this.game.renderer.screen.height + 2000,
        0
      )
      .fill({ color: 0x000000, alpha: 0.7 }); // #000c = rgba(0,0,0,0.8);
    this.bgOverlay.pivot.set(
      this.bgOverlay.width / 2,
      this.bgOverlay.height / 2
    );

    this.fsOutroSpine = this.game.make.spine({
      atlas: "main/free_spin_intro/no_text/congratulation.atlas",
      skeleton: "main/free_spin_intro/no_text/congratulation.json",
      x: 0,
      y: 0,
    });

    this.stormSpine = this.game.make.spine({
      atlas: "transition.atlas",
      skeleton: "transition.json",
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1.5 },
              },
              mobile: {
                landscape: { scale: 1.5 },
                portrait: { scale: 4 },
              },
              tablet: {
                landscape: { scale: 1.5 },
                portrait: { scale: 4 },
              },
            },
          ],
        },
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              landscape: { columns: 2, rows: 2, position: { x: -1, y: -1 } },
              portrait: { columns: 2, rows: 2, position: { x: -1, y: -0.9 } },
            },
          ],
        },
      ],
    });

    this.headerText = Sprite.from("texts-en-EN.webp");
    this.headerText.texture = Texture.from("texts/cong");
    this.headerText.anchor.set(0.5);
    this.headerText.position.set(0, -270);
    this.headerText.visible = false;

    this.youWonText = Sprite.from("texts-en-EN.webp");
    this.youWonText.texture = Texture.from("texts/won");
    this.youWonText.anchor.set(0.5);
    this.youWonText.visible = false;
    Engine.Utils.ApplyCommonProperties(this.youWonText, {
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              desktop: {
                landscape: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -1.16 },
                },
              },
              mobile: {
                landscape: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -1.16 },
                }, //TODO: Needs adjustment for Mob Landscape
                portrait: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -1.05 },
                },
              },
              tablet: {
                landscape: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -1.16 },
                },
                portrait: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -1.05 },
                },
              },
            },
          ],
        },
      ],
    });

    this.freeSpinText = Sprite.from("texts-en-EN.webp");
    this.freeSpinText.texture = Texture.from("texts/freespins");
    this.freeSpinText.anchor.set(0.5);
    this.freeSpinText.position.set(60, 205);
    this.freeSpinText.visible = false;

    this.totalWinAmount = new Engine.LocalizedBitmapText(
      "0",
      {},
      new TextStyle({
        fontFamily: "big-win-font",
        fontSize: 85,
        fill: "#ffffff",
      })
    );
    this.totalWinAmount.anchor.set(0.5, 0.5);
    this.totalWinAmount.position.set(0, 46);
    this.totalWinAmount.resolution = 2;
    this.totalWinAmount.visible = false;

    this.totalFreeSpinCount = new Engine.LocalizedBitmapText(
      "0",
      {},
      new TextStyle({
        fontFamily: "cong-font",
        fontSize: isMobile.any ? 50 : 45,
        fill: "#ffffff",
        letterSpacing: -30,
      })
    );
    this.totalFreeSpinCount.anchor.set(0.5, 0.5);
    this.totalFreeSpinCount.position.set(-180, 195);
    this.totalFreeSpinCount.visible = false;

    this.pressAnywhereLabel = new Engine.LocalizedText(
      "game.press_anywhere_to_continue",
      {},
      new TextStyle({
        fontFamily: "DIN Offc Pro",
        fontWeight: "900",
        fill: "#fff",
        fontSize: 26,
        align: "center",
      })
    );
    this.pressAnywhereLabel.anchor.set(0.5, 0.5);
    this.pressAnywhereLabel.position.set(0, 308);
    this.pressAnywhereLabel.visible = false;

    this.addChild(
      this.bgOverlay,
      this.fsOutroSpine,
      this.headerText,
      this.youWonText,
      this.totalWinAmount,
      this.totalFreeSpinCount,
      this.freeSpinText,
      this.pressAnywhereLabel,
      this.stormSpine
    );
  }

  initialize(
    config?: Slot.FreeSpinOutroRunnerOptions | undefined,
    onInteraction?: (type: string, data: any) => void
  ) {
    console.log("Free Spin Outro Popup initialized with config:", config);
    this.onInteraction = onInteraction || (() => { });
  }

  /** To show Free Spin Outro popup */
  show(data: Slot.FreeSpinOutroRunnerData): Promise<void> {
    return new Promise<void>((resolve) => {
      console.log("Free Spin Outro Popup data:", data);
      if (isMobile.any) {
        this.game.slot.ui.setVisibility("infoTextArea", !isPortrait());
        this.game.slot.ui.setVisibility("spinArea", false);
      }
      gsap.to(this.bgOverlay, {
        alpha: 0.7,
        duration: 0.35,
        ease: "linear.none",
        onStart: () => {
          this.bgOverlay.alpha = 0;
          this.bgOverlay.visible = true;
        },
      });
      //set total free spin and total win
      this.totalFreeSpinCount.updateText(`${data.totalFreeSpin}`);
      this.totalWinAmount.updateText(
        this.game.slot.currency.format(data.totalWin)
      );
      Engine.Utils.fitTextToWidth(this.totalWinAmount, 510, 85);

      this.fsOutroSpine.state.clearListeners();
      this.fsOutroSpine.state.setAnimation(0, "start", false);
      this.fsOutroSpine.state.addListener({
        complete: (): void => {
          this.fsOutroSpine.state.setAnimation(0, "loop", false);
        },
      });
      this.fsOutroSpine.visible = true;
      this.bgOverlay.visible = true;
      this.visible = true;

      setTimeout(() => {
        this.playHeaderAnimation(resolve);
      }, 400);
      this.game.audio.soundBus.StopBGM("sounds/music/Anubis_FreeSpinMusic.wav", 'bgm');
      this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_BonusGame_Outro.wav", 'sfx', {});
      this.game.audio.soundBus.PlaySFX(
        "sounds/fx/AnubisDream_CongratsWindowOpen.wav",
        'sfx',
        {}
      );
    });
  }

  /** To play text animation */
  protected playHeaderAnimation(resolve: any): void {
    this.headerText.scale.set(0.1);
    gsap.to(this.headerText.scale, {
      x: "+=1",
      y: "+=1",
      duration: 0.3,
      ease: "back.out",
      onStart: () => {
        this.headerText.visible = true;
      },
      onComplete: () => {
        this.playTextAnimation(resolve);
      },
    });
  }

  /** To play text animation */
  protected playTextAnimation(resolve: any): void {
    gsap.to(
      [
        this.totalFreeSpinCount,
        this.totalWinAmount,
        this.freeSpinText,
        this.youWonText,
      ],
      {
        alpha: 1,
        duration: 0.35,
        ease: "linear.none",
        onStart: () => {
          this.totalFreeSpinCount.alpha = 0;
          this.totalWinAmount.alpha = 0;
          this.freeSpinText.alpha = 0;
          this.youWonText.alpha = 0;
          this.totalFreeSpinCount.visible = true;
          this.totalWinAmount.visible = true;
          this.freeSpinText.visible = true;
          this.youWonText.visible = true;
        },
        onComplete: () => {
          this.playAnywhereLabelAnimation(resolve);
        },
      }
    );
  }

  /** To play text animation */
  protected playAnywhereLabelAnimation(resolve: any): void {
    gsap.to(this.pressAnywhereLabel.scale, {
      x: "+=0.2",
      y: "+=0.2",
      duration: 0.25,
      delay: 0.25,
      ease: "linear.none",
      onStart: () => {
        this.pressAnywhereLabel.visible = true;
        const pointerFunc = (): void => {
          document.removeEventListener("pointerup", pointerFunc);
          resolve();
          this.game.audio.soundBus.PlaySFX(
            "sounds/fx/AnubisDream_BonusWindowClose.wav",
            'sfx',
            {}
          );
        };
        this.gameClickLayer.once("pointerup", pointerFunc);
      },
      onComplete: () => {
        //this.onPressAnywhere();
      },
    });
  }
  public resize() {
    if (this.visible) {
      if (isMobile.any) {
        this.game.slot.ui.setVisibility("infoTextArea", !isPortrait());
      }
    }
  }

  /** To hide Free Spin Outro popup */
  hide(): void {
    //this.visible = false;
  }

  /** To play Storm animation */
  public async playStormAnimaion(): Promise<void> {
    new Promise<void>((resolve) => {
      this.stormSpine.state.setAnimation(0, "transition", false);
      this.stormSpine.state.addListener({
        complete: (): void => {
          this.stormSpine.state.clearListeners();
          this.visible = false;
          resolve();
        },
      });
      this.stormSpine.state.addListener({
        event: (_, event): void => {
          if (event.data.name === "full_screen") {
            this.emit("START_ASSET_TRANSITIONS");
            this.bgOverlay.visible = false;
            this.totalFreeSpinCount.visible = false;
            this.pressAnywhereLabel.visible = false;
            this.fsOutroSpine.state.clearListeners();
            this.fsOutroSpine.state.setEmptyAnimation(0);
            this.fsOutroSpine.visible = false;
            this.totalWinAmount.visible = false;
            this.freeSpinText.visible = false;
            this.youWonText.visible = false;
            this.headerText.visible = false;
            setTimeout(() => {
              this.game.slot.ui.setVisibility("infoTextArea", true);
              this.game.slot.ui.setVisibility("spinArea", true);
            }, 100);
          }
        },
      });
    });
  }
}
