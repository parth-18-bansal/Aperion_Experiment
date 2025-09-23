/* eslint-disable @typescript-eslint/no-unused-vars */
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import {
  Assets,
  Container,
  ContainerOptions,
  Graphics,
  RoundedRectangle,
  Sprite,
  Text,
  TextStyle,
} from "pixi.js";
import { Button } from "@pixi/ui";
import { gsap } from "gsap";
import { Slot } from "slot-game-engine";
import { Engine } from "game-engine";

export class BuyFeatureConfirmation implements Slot.IBuyFeatureConfirmation {
  // Container properties
  public container: Container;

  // Private properties for internal management
  private spine!: Spine;
  private confirmButton!: Button;
  private cancelButton!: Button;
  private freeSpinCountLabel!: Text;
  private priceText!: Text;
  private currentFeatureId: string = "";
  private isAnimating: boolean = false;
  private mainTween: gsap.core.Tween | null = null;
  private innerContainer!: Container;
  private headerSprite!: Sprite;

  // Event callback setters
  public onConfirmed?: (featureId: string) => void;
  public onCancelled?: () => void;

  public constructor(options?: ContainerOptions) {
    this.container = new Container(options);
    this.container.label = "BuyFeatureConfirmation";
    Engine.Utils.ApplyCommonProperties(this.container, {
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: {
                columns: 2,
                rows: 2,
                position: { x: -1.17, y: -0.2 },
              },
            },
          ],
        },
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 0.9, x: 375, y: 240 },
              },
              mobile: {
                landscape: { scale: 1, x: 335, y: 255 },
                portrait: { scale: 1, x: -91, y: 936 },
              },
              tablet: {
                landscape: { scale: 1, x: 335, y: 255 },
                portrait: { scale: 1, x: -91, y: 936 },
              },
            },
          ],
        },
      ],
    });
    this.container.pivot.set(
      this.container.width / 2,
      this.container.height / 2
    );
    this.initializeContent();
  }

  // IBuyFeatureConfirmation interface methods
  public setEnabled(
    enabled: boolean | { cancel?: boolean; confirm?: boolean }
  ): void {
    const confirmEnabled =
      typeof enabled === "boolean"
        ? enabled
        : typeof enabled.confirm === "boolean"
          ? enabled.confirm
          : this.confirmButton.enabled;
    const cancelEnabled =
      typeof enabled === "boolean"
        ? enabled
        : typeof enabled.cancel === "boolean"
          ? enabled.cancel
          : this.cancelButton.enabled;

    if (this.confirmButton) {
      this.confirmButton.enabled = confirmEnabled;
      this.confirmButton.view.alpha = confirmEnabled ? 1 : 0.5;
    }
    if (this.cancelButton) {
      this.cancelButton.enabled = cancelEnabled;
      this.cancelButton.view.alpha = cancelEnabled ? 1 : 0.5;
    }
  }

  public setVisible(visible: boolean): void {
    this.container.visible = visible;
    if (visible) {
      this.showBuyFeaturePopup();
    } else {
      this.hideBuyFeaturePopup();
    }
  }

  public showConfirmation(featureId: string, _betAmount: number): void {
    this.currentFeatureId = featureId;

    // Show the popup
    this.setVisible(true);
  }

  public updatePrice(price: string): void {
    if (this.priceText) {
      this.priceText.text = price;
      Engine.Utils.fitTextToWidth(this.priceText, 500, 100);
    }
  }

  public close(): void {
    this.setVisible(false);
    this.resetState();
  }

  // Private methods for internal functionality
  private initializeContent(): void {
    // Create background overlay
    const bgOverlay = new Graphics();
    bgOverlay.rect(
      0,
      0,
      this.container.game.renderer.screen.width + 4000,
      this.container.game.renderer.screen.height + 2000
    ); // Fixed size instead of dynamic
    bgOverlay.fill({ color: 0x000000, alpha: 0.7 });

    bgOverlay.pivot.set(bgOverlay.width / 2, bgOverlay.height / 2);
    bgOverlay.interactive = true;
    bgOverlay.eventMode = "static";
    bgOverlay.on("pointerdown", () => {
      if (!this.isAnimating) {
        this.handleCancel();
      }
    });
    this.container.addChild(bgOverlay);

    this.innerContainer = new Container();
    this.innerContainer.pivot.set(640, 360);
    this.innerContainer.position.set(640, 360);
    this.container.addChild(this.innerContainer);

    // Initialize spine animation
    this.spine = this.container.game.make.spine({
      atlas: "buy_free_spin.atlas",
      skeleton: "buy_free_spin.json",
      x: 640,
      y: 360,
    });
    this.innerContainer.addChild(this.spine);

    // Creating graphics to not clickable are on spine
    const frontUnClickableArea = new Graphics();
    frontUnClickableArea.beginFill(0x000000, 0);
    frontUnClickableArea.drawRect(this.spine.x, this.spine.y, this.spine.width / 2, this.spine.height / 2);
    frontUnClickableArea.endFill();
    frontUnClickableArea.pivot.set(frontUnClickableArea.width / 2, frontUnClickableArea.height / 2);
    frontUnClickableArea.interactive = true;
    this.innerContainer.addChild(frontUnClickableArea);



    // Initialize UI elements
    this.createUIElements();
    this.setupEventListeners();

    // Initially hide
    this.container.visible = false;
  }

  private createUIElements(): void {
    // Background sprite
    this.headerSprite = Sprite.from("buy_popup.png");
    this.headerSprite.anchor.set(0.5);
    this.headerSprite.position.set(640, 0); // Center of screen
    this.innerContainer.addChild(this.headerSprite);

    // Feature name text
    this.freeSpinCountLabel = new Text({
      anchor: 0.5,
      x: 640,
      y: 235, // Above center
      text: "10 FREE SPINS",
      style: new TextStyle({
        fontFamily: ["adonais", "Arial", "sans-serif"],
        fill: "#f91362",
        align: "center",
        fontSize: 80,
        stroke: {
          color: "#000000",
          width: 3,
        },
        dropShadow: {
          alpha: 1,
          angle: Math.PI / 4,
          blur: 2,
          color: "#081200",
          distance: 1,
        },
      }),
    });
    this.innerContainer.addChild(this.freeSpinCountLabel);

    // Price text
    this.priceText = new Text({
      anchor: 0.5,
      x: 640,
      y: 360,
      text: "",
      style: new TextStyle({
        fontFamily: ["adonais", "Arial", "sans-serif"],
        fill: "#f91362",
        align: "center",
        fontSize: 100,
        letterSpacing: 2,
        stroke: {
          color: "#000000",
          width: 3,
        },
        dropShadow: {
          alpha: 1,
          angle: Math.PI / 4,
          blur: 2,
          color: "#081200",
          distance: 1,
        },
      }),
    });
    this.innerContainer.addChild(this.priceText);

    // Cancel button
    this.cancelButton = new Button(new Sprite(Assets.get("cancel.png")));
    this.cancelButton.view.hitArea = new RoundedRectangle(15, 5, 250, 126, 20);
    this.cancelButton.view.pivot.set(
      this.cancelButton.view.width / 2,
      this.cancelButton.view.height / 2
    );
    this.cancelButton.view.x = this.cancelButton.view.width / 2 + 335;
    this.cancelButton.view.y = this.cancelButton.view.height / 2 + 420;
    this.innerContainer.addChild(this.cancelButton.view);

    // Confirm button
    this.confirmButton = new Button(new Sprite(Assets.get("confirm.png")));
    this.confirmButton.view.hitArea = new RoundedRectangle(15, 5, 250, 125, 20);
    this.confirmButton.view.pivot.set(
      this.confirmButton.view.width / 2,
      this.confirmButton.view.height / 2
    );
    this.confirmButton.view.x = this.confirmButton.view.width / 2 + 640;
    this.confirmButton.view.y = this.confirmButton.view.height / 2 + 420;
    this.innerContainer.addChild(this.confirmButton.view);
  }

  private setupEventListeners(): void {
    this.confirmButton.onPress.connect(() => {
      this.handleConfirm();
    });

    this.cancelButton.onPress.connect(() => {
      this.handleCancel();
    });
  }

  private showBuyFeaturePopup(): void {
    this.isAnimating = true;
    this.setEnabled(false);

    // Show spine entry animation
    this.spine.state.clearListeners();
    this.spine.state.setAnimation(0, "entry", false);

    this.spine.state.addListener({
      complete: (): void => {
        this.spine.state.clearListeners();
        this.spine.state.setAnimation(0, "loop", true);
        this.startLoopAnimation();
        this.setEnabled(true);
        this.isAnimating = false;
      },
    });
    this.startTextZoomAnimation();
    this.container.game.audio.soundBus.PlaySFX(
      "sounds/fx/AnubisDream_FreeSpinWindowOpen.wav",
      'sfx',
      { volume: 1 }
    );
  }

  private hideBuyFeaturePopup(): void {
    this.stopAllAnimations();
    this.spine.state.clearListeners();
    this.spine.state.setEmptyAnimation(0);
  }

  private startTextZoomAnimation(): void {
    // Zoom in out animation
    this.spine.scale.set(0.25);
    this.headerSprite.scale.set(1);
    this.headerSprite.alpha = 0;
    this.freeSpinCountLabel.scale.set(1);
    this.freeSpinCountLabel.alpha = 0;
    this.priceText.scale.set(1);
    this.priceText.alpha = 0;
    this.cancelButton.view.scale.set(0.8);
    this.cancelButton.view.alpha = 0;
    this.confirmButton.view.scale.set(0.8);
    this.confirmButton.view.alpha = 0;

    const tl = gsap.timeline({ ease: "power2.out" });
    tl.to(this.spine.scale, {
      x: 1,
      y: 1,
      duration: 0.5,
      ease: "back.out",
    });
    tl.to(
      this.headerSprite.scale,
      {
        x: "+=0.2",
        y: "+=0.2",
        duration: 0.25,
        repeat: 1,
        yoyo: true,
      },
      "-=0.35"
    );
    tl.to(
      this.headerSprite,
      {
        alpha: 1,
        duration: 0.3,
      },
      "<"
    );
    tl.to(
      [this.freeSpinCountLabel.scale, this.priceText.scale],
      {
        x: "+=0.2",
        y: "+=0.2",
        duration: 0.25,
        repeat: 1,
        yoyo: true,
      },
      "-=0.2"
    );
    tl.to(
      [this.freeSpinCountLabel, this.priceText],
      {
        alpha: 1,
        duration: 0.3,
      },
      "<"
    );
    tl.to(
      this.cancelButton.view.scale,
      {
        x: "+=0.2",
        y: "+=0.2",
        duration: 0.2,
        repeat: 1,
        yoyo: true,
        onStart: () => {
          this.cancelButton.view.alpha = 1;
        },
      },
      "-=0.2"
    );
    tl.to(
      this.confirmButton.view.scale,
      {
        x: "+=0.2",
        y: "+=0.2",
        duration: 0.2,
        repeat: 1,
        yoyo: true,
        onStart: () => {
          this.confirmButton.view.alpha = 1;
        },
      },
      "-=0.15"
    );
  }

  private startLoopAnimation(): void {
    // Simple breathing animation for the main container
    this.innerContainer.scale.set(1);
    this.mainTween = gsap.to(this.innerContainer.scale, {
      x: 1.03,
      y: 1.03,
      duration: 0.9,
      delay: 0.3,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  private stopAllAnimations(): void {
    if (this.mainTween) {
      this.mainTween.kill();
      this.mainTween = null;
    }
    // Reset scale
    this.innerContainer.scale.set(1);
    this.innerContainer.alpha = 1;
    this.innerContainer.y = 194;
  }

  private playPopupHideAnimation(direction: "up" | "down"): void {
    const yOffset = direction === "up" ? -400 : 1200;

    this.mainTween = gsap.to(this.innerContainer, {
      y: yOffset,
      alpha: 0,
      duration: 0.5,
      ease: "linear.none",
      onComplete: () => {
        this.innerContainer.y = 194;
        this.innerContainer.alpha = 1;
        //this.innerContainer.visible = false;
      },
    });
  }

  private handleConfirm(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.setEnabled(false);

    // Play exit animation
    this.spine.state.clearListeners();
    this.spine.state.setAnimation(0, "exit", false);
    this.stopAllAnimations();

    this.playPopupHideAnimation("up");
    this.container.game.audio.soundBus.PlaySFX(
      "sounds/fx/AnubisDream_FreeSpinWindowClose.wav",
      'sfx',
      { volume: 1 }
    );
    // Trigger callback after animation delay
    setTimeout(() => {
      this.onConfirmed?.(this.currentFeatureId);
      this.resetState();
    }, 500);
  }

  private handleCancel(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.setEnabled(false);

    this.spine.state.clearListeners();
    this.stopAllAnimations();

    this.playPopupHideAnimation("down");
    this.container.game.audio.soundBus.PlaySFX(
      "sounds/fx/AnubisDream_FreeSpinWindowClose.wav",
      'sfx',
      { volume: 1 }
    );
    // Trigger callback after animation delay
    setTimeout(() => {
      this.onCancelled?.();
      this.resetState();
    }, 500);
  }

  private resetState(): void {
    this.isAnimating = false;
    this.currentFeatureId = "";
    this.setEnabled(true);
  }

  public destroy(): void {
    this.stopAllAnimations();
    this.spine?.destroy();
    this.container?.destroy();
  }
}
