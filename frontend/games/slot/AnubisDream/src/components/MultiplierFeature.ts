import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Engine } from "game-engine";
import {
  BitmapFont,
  BitmapText,
  Container,
  Graphics,
  isMobile,
  TextStyle,
} from "pixi.js";
import { gsap } from "gsap";
import { isPortrait } from "game-engine/src/utils";

export class MultiplierFeature extends Container {
  public static assetBundles = ["preload", "main"];
  private multipliers: number[] = [2, 3, 5, 10, 20, 50, 100];
  private multiplierReelContainer!: Container;
  private reelBgSpine!: Spine;
  private reelFrontSpine!: Spine;
  private reelBgSpine_ad!: Spine;
  private reelFrontSpine_ad!: Spine;
  private textItems: BitmapText[] = [];
  private visibleMultipliers: BitmapText[] = [];
  protected isBigMultiplier: boolean = false;
  private reelSpinTween: gsap.core.Tween | null = null;
  private readonly bigCount: number = 90;
  private readonly normalCount: number = 30;
  private isFake: boolean = false;
  private wonMultiplier: number = 10;

  public constructor() {
    super();
    Engine.Utils.ApplyCommonProperties(this, {
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: {
                columns: 2,
                rows: 2,
                position: { x: -0.68, y: 0.33 },
              },
            },
          ],
        },
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 0.9, x: 260, y: 600 },
              },
              mobile: {
                landscape: { scale: 1, x: 195, y: 640 },
                portrait: { scale: 1, x: 172, y: 1556 },
              },
              tablet: {
                landscape: { scale: 1, x: 195, y: 640 },
                portrait: { scale: 1.2, x: 110, y: 1680 },
              },
            },
          ],
        },
      ],
    });

    // Install a font for global use
    BitmapFont.install({
      name: "multiplierFont",
      style: {
        fontFamily: "multiplier-font",
        fontSize: 35,
      },
      resolution: 2, // Resolution is set here
    });
    BitmapFont.install({
      name: "multiplierBlurryFont",
      style: {
        fontFamily: "multiplier-blurry",
        fontSize: 35,
      },
      resolution: 2, // Resolution is set here
    });
    // Initialize the content of the Multiplier Feature
    this.create();
    this.visible = false;
  }

  protected async create() {
    this.multiplierReelContainer = new Container();
    this.multiplierReelContainer.label = "multiplierReelContainer";

    this.reelBgSpine = this.game.make.spine({
      atlas: "multiplier_reel.atlas",
      skeleton: "multiplier_reel.json",
      skin: "default",
      x: 0,
      y: 18,
    });
    this.reelFrontSpine = this.game.make.spine({
      atlas: "multiplier_reel.atlas",
      skeleton: "multiplier_reel.json",
      skin: "default",
      x: 0,
      y: 18,
    });
    this.reelBgSpine_ad = this.game.make.spine({
      atlas: "multiplier_reel.atlas",
      skeleton: "multiplier_reel.json",
      skin: "default",
      x: 0,
      y: 18,
    });
    this.reelFrontSpine_ad = this.game.make.spine({
      atlas: "multiplier_reel.atlas",
      skeleton: "multiplier_reel.json",
      skin: "default",
      x: 0,
      y: 18,
    });
    this.addChild(
      this.reelBgSpine,
      this.reelBgSpine_ad,
      this.multiplierReelContainer,
      this.reelFrontSpine,
      this.reelFrontSpine_ad
    );
    this.showHideMask(true);
    /* this.on(
      "START_MULTIPLIER_REEL_ANIMATION",
      this.onStartMultiplierSpin,
      this
    ); */
    // Create multiplier text objects
    await this.createMultiplierReelTape(false);
  }

  /** To create bitmap text objects and add into the multiplierReelContainer */
  private createMultiplierReelTape(isBig: boolean): Promise<void> {
    const startY: number = 280; // Starting Y coordinate
    const spacing: number = 150; // Space between multiplier texts
    return new Promise<void>((resolve) => {
      for (
        let i: number = 0;
        i < (isBig ? this.bigCount : this.normalCount);
        i++
      ) {
        const multiplierValue =
          this.multipliers[Math.floor(Math.random() * this.multipliers.length)];
        const multiplierText: Engine.LocalizedBitmapText =
          new Engine.LocalizedBitmapText(
            `${multiplierValue}X`,
            {},
            new TextStyle({
              fontFamily: "multiplier-font",
              fontSize: multiplierValue == 100 ? 38 : 45,
              fill: "#ffffff",
            })
          );
        multiplierText.position.set(0, startY - i * spacing);
        multiplierText.anchor.set(0.5, 0.5);
        if (i > 3 && i < (isBig ? this.bigCount - 3 : this.normalCount - 3)) {
          multiplierText.style.fontFamily = "multiplier-blurry";
        }
        this.textItems.push(multiplierText);
        if (i > (isBig ? this.bigCount - 4 : this.normalCount - 4))
          this.visibleMultipliers.push(multiplierText);
        this.multiplierReelContainer.addChild(multiplierText); // Add texts to multiplierReelContainer
      }
      resolve();
    });
  }

  /** Method to play spine animation and start reel spinning */
  onStartMultiplierSpin(multiplier: number = 1): void {
    let randomNumber = Math.floor(Math.random() * 100);
    this.isFake = randomNumber < 10;
    this.multiplierReelContainer.depthOfChildModified(); // Ensure the container is redrawn

    this.wonMultiplier = multiplier; // server response :: multiplier value
    this.isBigMultiplier =
      this.wonMultiplier > 15 && Math.floor(Math.random() * 100) > 10;

    this.reelFrontSpine_ad.state.setAnimation(0, "reel_active_v3", false);
    if (this.isFake && !this.isBigMultiplier && this.wonMultiplier < 15) {
      this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_Multiplier_Fake.mp3", 'sfx', {});
    } else {
      this.game.audio.soundBus.PlaySFX(
        this.isBigMultiplier
          ? "sounds/fx/AnubisDream_Multiplier_Adrenaline.wav"
          : "sounds/fx/AnubisDream_Multiplier.wav",
        'sfx',
        {}
      );
    }
    this.reelFrontSpine_ad.state.addListener({
      complete: (): void => {
        this.reelFrontSpine_ad.state.clearListeners();
        this.resetItems(false);
        this.createMultiplierReelTape(this.isBigMultiplier);

        this.startMultiplierSpinning(); // Start the multiplier spinning animation

        setTimeout(() => {
          if (this.isBigMultiplier) {
            this.reelBgSpine_ad.state.setAnimation(
              0,
              "bg_active_transition_back",
              false
            );
            this.reelFrontSpine_ad.state.setAnimation(
              0,
              "bg_active_transition_front",
              false
            );
            this.reelFrontSpine_ad.state.addListener({
              complete: (): void => {
                this.reelFrontSpine_ad.state.clearListeners();
                this.reelFrontSpine_ad.state.setAnimation(
                  0,
                  "bg_active_v2_front",
                  true
                );
                this.reelBgSpine_ad.state.setAnimation(
                  0,
                  "bg_active_v2_back",
                  true
                );
              },
            });
          } else {
            if (randomNumber < 10) {
              this.isFake = true;
              this.reelFrontSpine_ad.state.setAnimation(
                0,
                "bg_active_fake_front",
                false
              );
              this.reelBgSpine_ad.state.setAnimation(
                0,
                "bg_active_fake_back",
                false
              );
            }
          }
        }, 500);
      },
    });
  }

  /** Method to start multiplier spinning */
  protected async startMultiplierSpinning(): Promise<void> {
    this.removeTweenAnimation(); // Remove any existing animations
    await new Promise<void>((resolve) => {
      this.multiplierReelContainer.y = 0; // Reset position
      this.reelSpinTween = gsap.to(this.multiplierReelContainer, {
        y: this.isBigMultiplier ? 12900 : 3900,
        duration: this.isBigMultiplier ? 12.89 : 4,
        ease: "cubic.out",
        onStart: () => {
          this.textItems[
            this.isBigMultiplier ? this.bigCount - 2 : this.normalCount - 2
          ].text = this.wonMultiplier + "X";
          if (this.isBigMultiplier) {
            setTimeout(() => {
              this.reelSpinTween?.timeScale(2.47);
            }, 3000);
          }
        },
        onComplete: () => {
          this.playMultiplierWonAnimation();
          resolve();
        },
      });
    });
  }

  /** To play Multiplier Text fly animation */
  protected playMultiplierWonAnimation(): void {
    if (this.isBigMultiplier) {
      this.reelFrontSpine_ad.state.setAnimation(
        0,
        "bg_active_v2_front_end",
        false
      );
      this.reelBgSpine_ad.state.setAnimation(0, "bg_active_v2_back_end", false);
    }
    this.reelFrontSpine.state.setAnimation(0, "reel_active", false);
    this.reelFrontSpine.state.timeScale = 1.2;
    this.reelFrontSpine.state.addListener({
      complete: (event): void => {
        if (event?.animation?.name === "reel_active") {
          this.reelFrontSpine.state.clearListeners();
          this.reelFrontSpine.state.timeScale = 1;
          this.reelFrontSpine.state.setAnimation(0, "reel_idle", true);
          this.playTextFlyAnimation(
            this.textItems[
              this.isBigMultiplier ? this.bigCount - 2 : this.normalCount - 2
            ]
          );
        }
      },
    });
  }

  /** To play Multiplier Text fly animation */
  protected async playTextFlyAnimation(wonTextObj: BitmapText): Promise<void> {
    this.resetItems(true);
    this.showHideMask(false);
    this.addChildAt(this.multiplierReelContainer, this.children.length - 1); // Ensure the reel container is at above the front spine
    // this.multiplierReelSpine.state.setAnimation(0, "reel_idle", true);
    const tempMultiplierText: Engine.LocalizedBitmapText =
      new Engine.LocalizedBitmapText(
        wonTextObj.text,
        {},
        new TextStyle({
          fontFamily: "multiplier-font",
          fontSize: 45,
          fill: "#ffffff",
        })
      );
    tempMultiplierText.position.set(wonTextObj.x, wonTextObj.y);
    tempMultiplierText.anchor.set(0.5, 0.5);
    this.multiplierReelContainer.addChild(tempMultiplierText); // add this to reel container
    this.multiplierReelContainer.depthOfChildModified(); // Ensure the container is redrawn

    const targetX: number =
      wonTextObj.x + (isMobile.any && isPortrait() ? 400 : 890);
    const targetY: number =
      wonTextObj.y - (isMobile.any && isPortrait() ? 1020 : 490);

    await new Promise<void>((resolve) => {
      const flyTween = gsap.timeline();

      const totalDuration = 0.7; // x,y move duration
      const emitTime = totalDuration * 0.7; // 70% of the duration

      flyTween.to(tempMultiplierText, {
        x: targetX,
        y: targetY,
        duration: totalDuration,
        ease: "sine.in",
        delay: 0,
        onComplete: () => {
          this.addChildAt(this.multiplierReelContainer, 2); // Ensure the reel container is at below the front spine
          this.showHideMask(true);
          resolve();
        },
      });

      flyTween.call(
        () => {
          this.emit("START_TUMBLE_MULTIPLIER_ANIMATION");
        },
        undefined,
        emitTime
      );

      flyTween.to(
        tempMultiplierText,
        {
          width: tempMultiplierText.width * 1.6,
          height: tempMultiplierText.height * 1.6,
          duration: 0.2,
        },
        "-=0.7"
      );
      flyTween.to(
        tempMultiplierText,
        {
          width: 0,
          height: 0,
          alpha: 0,
          duration: 0.1,
          onComplete: () => {
            tempMultiplierText.destroy();
          },
        },
        "-=0.1"
      );
    });
  }

  /** To remove animation */
  protected removeTweenAnimation() {
    if (this.reelSpinTween && this.reelSpinTween.isActive()) {
      this.reelSpinTween.kill();
      this.reelSpinTween = null; // Clear tween reference.
    }
    this.reelFrontSpine_ad.state.clearListeners();
    this.reelBgSpine_ad.state.clearListeners();
    this.reelFrontSpine_ad.state.setEmptyAnimation(0);
    this.reelBgSpine_ad.state.setEmptyAnimation(0);
  }

  protected resetItems(lastThree: boolean) {
    this.textItems.forEach((item) => {
      if (lastThree) {
        if (this.visibleMultipliers.indexOf(item) == -1) {
          item.destroy(); // Destroy the Text object
        }
      } else {
        item.destroy();
      }
    });
    if (!lastThree) this.textItems = [];
  }

  /** Create a graphic object mask and apply it to multiplierReelContainer */
  protected showHideMask(value: boolean) {
    if (value) {
      const maskWidth: number = 200,
        maskHeight: number = 376;
      const reelMask: Graphics = new Graphics();
      reelMask.rect(0, 0, maskWidth, maskHeight);
      reelMask.fill(0xffffff);
      reelMask.label = "reelMaskGraphics";
      reelMask.pivot.set(maskWidth / 2, maskHeight / 2);
      this.multiplierReelContainer.mask = reelMask;
      this.addChild(reelMask);
    } else {
      this.multiplierReelContainer.mask = null;
      this.removeChild(this.getChildByLabel("reelMaskGraphics") as Graphics);
      this.getChildByLabel("reelMaskGraphics")?.destroy();
    }
  }

  /** To show Multiplier Panel */
  protected playIdleMultiplierAnimation(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.reelFrontSpine.state.clearListeners();
      this.reelBgSpine.state.setAnimation(0, "bg_idle", true);
      this.reelFrontSpine.state.setAnimation(0, "reel_idle", true);
      resolve();
    });
  }

  public updateWonMultiplierValue(wonMultiplier: number = 1): void {
    if (this.textItems.length < 3) return;
    this.textItems[2].text = wonMultiplier + "X";
  }

  public async show() {
    this.visible = true;
    await this.playIdleMultiplierAnimation();
  }

  public hide() {
    // this.multiplierReelSpine.state.clearTracks();
    this.visible = false;
    this.removeTweenAnimation();
  }

  public destroy(): void {
    this.removeFromParent();
    super.destroy();
  }
}
