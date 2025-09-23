/* eslint-disable @typescript-eslint/no-unused-vars */
import { Engine } from "game-engine";
import { Slot } from "slot-game-engine";
import { gsap } from "gsap";
import { Container, Sprite, TextStyle, Texture } from "pixi.js";
import { GameSpeedMode } from "slot-game-ui";

export class TumbleWinContainer
  extends Container
  implements
    Engine.IRunnerVisual<Slot.CascadeRunnerData, Slot.CascadeRunnerOptions>
{
  private maxWinLabel!: InstanceType<typeof Engine.LocalizedText>;
  private tumbleWinLabel!: InstanceType<typeof Engine.LocalizedText>;
  private tumbleWinAmount!: InstanceType<typeof Engine.LocalizedText>;
  private winMultiplier!: InstanceType<typeof Engine.LocalizedText>;
  private tumbleWinBg!: Sprite;
  private currentTickupTween?: gsap.core.Tween;
  private startingAmount: number = 0;
  private endingAmount: number = 0;
  private tumbleWinAmountOriginalX = 0;

  constructor() {
    super();
    Engine.Utils.ApplyCommonProperties(this, {
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: { columns: 2, rows: 2, position: { x: 0, y: -0.68 } },
            },
          ],
        },
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1.3, x: 960, y: 165 },
              },
              mobile: {
                landscape: { scale: 1.5, x: 975, y: 112 },
                portrait: { scale: 1.5, x: 540, y: 375 },
              },
              tablet: {
                landscape: { scale: 1.5, x: 975, y: 112 },
                portrait: { scale: 2, x: 540, y: 240 },
              },
            },
          ],
        },
      ],
    });

    this.create();
  }

  initialize(): Promise<void> | void {}

  show(
    data: Slot.CascadeRunnerData,
    options?: Slot.CascadeRunnerOptions
  ): void {
    this.startingAmount = this.endingAmount;
    this.endingAmount = this.startingAmount + data.amount;
    const { context } = this.game.slot.actor.getSnapshot();

    let fadeDuration, tickupDuration;
    const isTurbo = (context.gameSpeed as GameSpeedMode) === "turbo";
    if (isTurbo) {
      fadeDuration = context.rules.delayShowWinMessageUITurbo;
      tickupDuration = context.rules.winTickupDurationTurbo;
    } else {
      fadeDuration = context.rules.delayShowWinMessageUI;
      tickupDuration = context.rules.winTickupDuration;
    }

    options?.symbolWinAmountLabelsAllowed &&
      this.emit("START_LABEL_ANIM", data, isTurbo);
    this.showStartTickup(
      this.startingAmount,
      this.endingAmount,
      tickupDuration,
      fadeDuration
    );
  }

  hide(): Promise<void> | void {}

  updateContent?(data: Slot.CascadeRunnerData): Promise<void> | void {}

  skip?(): Promise<void> | void {}

  finish?(result?: Engine.RunnerState | undefined): Promise<void> | void {}

  private async create() {
    const tumbleWinStyles = new TextStyle({
      fontFamily: ["DalekPinpointBold", "Arial", "sans-serif"],
      fontSize: 22,
      fill: "#edd245",
      align: "center",
      stroke: {
        color: "#000000",
        width: 3,
      },
    });

    this.tumbleWinBg = await this.game.make.sprite({
      texture: Texture.from("preload/tumble_win/tumbewin_bg.png"),
      position: { x: 0, y: 0 },
      scale: { x: 0.85, y: 0.7 },
      anchor: { x: 0.5, y: 0.5 },
    });

    this.tumbleWinLabel = new Engine.LocalizedText(
      "game.tumble_win_label",
      {},
      tumbleWinStyles
    );
    this.tumbleWinLabel.position.set(0, -41);
    this.tumbleWinLabel.anchor.set(0.5);
    this.tumbleWinLabel.resolution = 2;

    this.tumbleWinAmount = new Engine.LocalizedText(
      this.game.slot.currency.format(0),
      {},
      tumbleWinStyles.clone()
    );
    this.tumbleWinAmount.position.set(this.tumbleWinAmountOriginalX, 0);
    this.tumbleWinAmount.anchor.set(0.5);
    this.tumbleWinAmount.resolution = 2;

    this.maxWinLabel = new Engine.LocalizedText(
      "game.max_win_label",
      {},
      tumbleWinStyles.clone()
    );
    this.maxWinLabel.position.set(-75, 0);
    this.maxWinLabel.anchor.set(0.5);
    this.maxWinLabel.resolution = 2;
    this.maxWinLabel.visible = false;
    this.maxWinLabel.alpha = 0;

    this.winMultiplier = new Engine.LocalizedText("x 1", {}, tumbleWinStyles);
    this.winMultiplier.position.set(70, 0);
    this.winMultiplier.anchor.set(0.5);
    this.winMultiplier.visible = false;
    this.winMultiplier.resolution = 2;

    this.addChild(
      this.tumbleWinBg,
      this.tumbleWinLabel,
      this.maxWinLabel,
      this.tumbleWinAmount,
      this.winMultiplier
    );

    this.visible = false;
  }

  /**
   * Fades-in the Tumble container and starts the tick-up animation for the win amount for the specified duration
   *
   * @param startAmount - The initial amount to display before the tick-up animation starts.
   * @param endAmount - The final amount to display after the tick-up animation completes.
   * @param tickupDuration - (Optional) The duration of the tick-up animation in seconds. Default = 3
   * @param fadeDuration - (Optional) The duration of the fade-in animation in seconds. Default = 0.5
   * @returns A Promise that resolves when the tick-up animation has completed.
   */
  public showStartTickup(
    startAmount: number,
    endAmount: number,
    tickupDuration: number,
    fadeDuration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      this.toggleVisibility(true, fadeDuration, () => {
        this.startTickup(startAmount, endAmount, tickupDuration, resolve);
      });
    });
  }

  /**
   * Toggles the visibility of the Tumble Win container with a fade animation.
   *
   * @param visible - If `true`, the container will fade in and become visible; if `false`, it will fade out and become invisible.
   * @param duration - The duration of the fade animation in seconds.
   * @param onComplete - Optional callback function to be executed after the animation completes.
   */
  toggleVisibility(
    visible: boolean,
    duration: number = 0,
    onComplete?: () => void
  ): void {
    if (this.visible === visible) {
      if (onComplete) onComplete();
      return;
    }

    if (visible) {
      this.visible = true;
      this.alpha = 0;
      gsap.to(this, {
        alpha: 1,
        duration,
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });
    } else {
      this.emit("HIDE_LABEL_ANIM");
      gsap.to(this, {
        alpha: 0,
        duration,
        onComplete: () => {
          this.visible = false;
          if (onComplete) onComplete();
          this.destroy();
        },
      });
    }
  }

  /**
   * Animates a numeric value from a starting amount to an ending amount over a specified duration,
   * updating the displayed amount incrementally. If an existing animation is running, it will be stopped.
   *
   * @param startAmount - The initial value to start the animation from.
   * @param endAmount - The final value to animate to.
   * @param duration - The duration of the animation in seconds.
   * @param onComplete - Optional callback function to be called when the animation completes.
   */
  private startTickup(
    startAmount: number,
    endAmount: number,
    duration: number,
    onComplete?: () => void
  ): void {
    if (this.currentTickupTween) {
      this.currentTickupTween.kill();
      this.currentTickupTween = undefined;
    }
    const obj = { value: startAmount };
    this.currentTickupTween = gsap.to(obj, {
      value: endAmount,
      duration,
      onUpdate: () => {
        this.tumbleWinAmount.updateText(
          this.game.slot.currency.format(obj.value)
        );
      },
      onComplete: () => {
        this.tumbleWinAmount.updateText(
          this.game.slot.currency.format(endAmount)
        );
        if (onComplete) onComplete();
      },
    });
  }

  public forceStopTickup(): void {
    if (this.currentTickupTween) {
      this.currentTickupTween.kill();
      this.currentTickupTween = undefined;
      this.tumbleWinAmount.updateText(
        this.game.slot.currency.format(this.endingAmount)
      );
    }
  }

  public showFinalAmount(amount: number): void {
    this.endingAmount = amount;
    this.tumbleWinAmount.updateText(
      this.game.slot.currency.format(this.endingAmount)
    );
  }

  public async playTumbleMultiplierAnim(
    multiplier: number,
    finalAmount: number,
    isMaxWin?: boolean
  ): Promise<void> {
    await this.labelSlideAndMultiplier(multiplier);
    await this.exitAndZoom(finalAmount, isMaxWin);
  }

  private labelSlideAndMultiplier(multiplier: number): Promise<void> {
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });

      // Shifts tumble amount to left
      tl.to(this.tumbleWinAmount, {
        x: "+=-30",
        duration: 0.2,
        ease: "power2",
      });

      const extraSpace = multiplier.toString().length > 1 ? 20 : 10;

      // updated multiplier text and makes it visible
      tl.add(() => {
        this.winMultiplier.x =
          this.tumbleWinAmount.x +
          (this.tumbleWinAmount.width + this.winMultiplier.width) / 2 +
          extraSpace;
        this.winMultiplier.updateText(`x ${multiplier}`);
        this.winMultiplier.visible = true;
        this.winMultiplier.alpha = 1;
      });

      // zoom-in-out effect of the multiplier text
      tl.to(this.winMultiplier.scale, {
        x: "+=0.4",
        y: "+=0.4",
        duration: 0.2,
        ease: "power2",
        repeat: 1,
        yoyo: true,
      });
    });
  }

  private exitAndZoom(finalAmount: number, isMaxWin?: boolean): Promise<void> {
    return new Promise((resolve) => {
      const tl = gsap.timeline({ delay: 0.3, onComplete: resolve });

      // Shifts left the multiplier text along with opacity (alpha) going to 0
      tl.to(this.winMultiplier, {
        x: "-=50",
        alpha: 0,
        duration: 0.2,
        ease: "power2",
        onComplete: () => {
          this.winMultiplier.visible = false;
          this.winMultiplier.x += 50;
        },
      });

      let targetX = this.tumbleWinAmount.x + 30;

      // Makes the max win label visible with opacity (alpha) going to 1
      if (isMaxWin) {
        this.maxWinLabel.visible = true;
        tl.to(
          this.maxWinLabel,
          {
            alpha: 1,
            duration: 0.2,
            ease: "power2",
          },
          "<"
        );
        targetX =
          this.maxWinLabel.x +
          this.maxWinLabel.width / 2 +
          this.tumbleWinAmount.width / 2 +
          20;
      }

      // Shifts right the win amount text. It runs in parellel with the above animation
      tl.to(
        this.tumbleWinAmount,
        {
          x: targetX,
          duration: 0.3,
          ease: "power2",
        },
        "<"
      );

      if (isMaxWin) {
        // Updates the win amount text with the final amount
        tl.add(() => {
          Engine.Utils.fitTextToWidth(this.tumbleWinAmount, 120, 22);

          this.maxWinLabel.style.fontSize = this.tumbleWinAmount.style.fontSize;
          if (
            this.tumbleWinAmount.style.fontSize < 22 &&
            this.tumbleWinAmount.style.fontSize > 20
          ) {
            this.tumbleWinAmount.x -= 10;
          } else if (
            this.tumbleWinAmount.style.fontSize < 20 &&
            this.tumbleWinAmount.style.fontSize > 16
          ) {
            this.tumbleWinAmount.x -= 20;
          } else if (this.tumbleWinAmount.style.fontSize <= 16) {
            this.tumbleWinAmount.x -= 35;
          }
        });
      }

      // Updates the win amount text with the final amount
      tl.add(() => {
        this.endingAmount = finalAmount;
        this.tumbleWinAmount.updateText(
          this.game.slot.currency.format(finalAmount)
        );
      });

      // Prepare elements for zoom animation
      const zoomTargets = [this.tumbleWinAmount.scale];
      if (isMaxWin) {
        zoomTargets.push(this.maxWinLabel.scale);
      }

      // zoom-in-out effect of the win amount text
      tl.to(zoomTargets, {
        x: "+=0.75",
        y: "+=0.75",
        duration: 0.2,
        ease: "power2",
        repeat: 1,
        yoyo: true,
      });
    });
  }

  public destroy(): void {
    this.startingAmount = 0;
    this.endingAmount = 0;
    this.tumbleWinAmount.setVars({ amount: 0 });
    this.currentTickupTween?.kill();
    this.maxWinLabel.visible = false;
    this.maxWinLabel.alpha = 0;
    this.tumbleWinAmount.x = this.tumbleWinAmountOriginalX;
    this.tumbleWinAmount.style.fontSize = 22;
    this.maxWinLabel.style.fontSize = 22;
    gsap.killTweensOf(this.tumbleWinAmount);
    gsap.killTweensOf(this.tumbleWinAmount.scale);
    gsap.killTweensOf(this.winMultiplier);
    gsap.killTweensOf(this.winMultiplier.scale);
    gsap.killTweensOf(this.maxWinLabel.scale);
  }
}
