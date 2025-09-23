import { Engine } from "game-engine";
import {
  Container,
  Graphics,
  /*AnimatedSprite,*/ Texture,
  Assets,
} from "pixi.js";
import { Emitter, EmitterConfigV3 } from "@barvynkoa/particle-emitter"; //
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Slot } from "slot-game-engine";
import { gsap } from "gsap";
import { GameSpeedMode } from "slot-game-ui";

export class BigwinScreen
  extends Container
  implements
    Engine.IRunnerVisual<Slot.BigWinRunnerData, Slot.BigWinRunnerOptions>
{
  private background!: Graphics;
  private bigwinSpine!: Spine;
  private megawinSpine!: Spine;
  private sensationalwinSpine!: Spine;
  private displayObject!: Spine;
  // private titleText!: Text;
  private amountText!: Engine.LocalizedBitmapText;
  private emitterFalling!: Emitter;
  private emitterRising!: Emitter;
  private coinLayer!: Container;
  private handleSkip: boolean = false;
  private handleResolve?: () => void; // Show Promise'inin resolve fonksiyonu
  private currentCounterTween?: gsap.core.Tween;
  // private coinAnimatedSprite!: AnimatedSprite;

  private processedAnims: { [key: string]: string } = {
    start: "start",
    loop: "loop",
    end: "end",
  };
  private winData!: Slot.BigWinRunnerData;

  private onInteraction: (type: string, data: any) => void = () => {};

  constructor() {
    super(); // Centered position
    Engine.Utils.ApplyCommonProperties(this, {
      visible: false,
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
                portrait: { scale: 1.5 },
              },
              tablet: {
                landscape: { scale: 1.5 },
                portrait: { scale: 1.5 },
              },
            },
          ],
        },
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              desktop: {
                landscape: {
                  position: { x: -1, y: -1 },
                },
              },
              mobile: {
                landscape: {
                  position: { x: -1, y: -1 },
                },
                portrait: {
                  position: { x: -1.77, y: -0.6 },
                },
              },
              tablet: {
                landscape: {
                  position: { x: -1, y: -1 },
                },
                portrait: {
                  position: { x: -1.77, y: -0.6 },
                },
              },
            },
          ],
        },
      ],
    });

    // Background
    this.background = new Graphics();
    this.background.label = "BigwinHighligt";
    this.background.rect(
      0,
      0,
      this.game.screen.width + 2000,
      this.game.screen.height + 2000
    );
    this.background.fill({ color: 0x000000, alpha: 0.7 });
    this.background.pivot.set(
      this.background.width / 2,
      this.background.height / 2
    );
    this.addChild(this.background);

    // Particle Container
    this.particleInit();

    // SPINE
    this.bigwinSpine = this.game.make.spine({
      skeleton: "bigwin.json",
      atlas: "bigwin.atlas",
      skin: "default",
    });
    this.bigwinSpine.position.set(640, 360);
    this.bigwinSpine.visible = false;
    this.addChild(this.bigwinSpine);

    this.megawinSpine = this.game.make.spine({
      skeleton: "megawin.json",
      atlas: "megawin.atlas",
      skin: "default",
    });
    this.megawinSpine.position.set(640, 360);
    this.megawinSpine.visible = false;
    this.addChild(this.megawinSpine);

    this.sensationalwinSpine = this.game.make.spine({
      skeleton: "sensational.json",
      atlas: "sensational.atlas",
      skin: "default",
    });
    this.sensationalwinSpine.position.set(640, 360);
    this.sensationalwinSpine.visible = false;
    this.addChild(this.sensationalwinSpine);

    // Amount
    this.amountText = new Engine.LocalizedBitmapText(
      "",
      {},
      {
        fontFamily: "big-win-font", // XML dosyasındaki font name
        fontSize: 70, // BitmapText'te fill yerine tint kullanılır
        align: "center",
      }
    );
    this.amountText.resolution = 2;
    this.amountText.anchor.set(0.5);
    this.amountText.position.set(640, 350);
    this.addChild(this.amountText);

    // Click to skip
    this.eventMode = "static";
    this.cursor = "pointer";
  }

  private particleInit(): void {
    // Coin Animated Sprite
    // this.coinContainer = Engine.getEngine().make.particleContainer();
    // this.addChild(this.coinContainer);

    const coinTextures: Texture[] = [];
    for (let i = 1; i <= 15; i++) {
      const paddedNumber = i.toString().padStart(4, "0");
      coinTextures.push(Assets.get(`coin-${paddedNumber}.png`));
    }

    /*
    this.coinAnimatedSprite = Engine.getEngine().make.animatedSprite({
      textures: coinTextures,
      animationSpeed: 0.5,
      loop: true,
      autoPlay: true,
    });
    this.coinAnimatedSprite.anchor.set(0.5);
    this.coinAnimatedSprite.position.set(640, 200);
    this.coinAnimatedSprite.scale.set(0.5);
    this.coinAnimatedSprite.gotoAndPlay(0);
    this.addChild(this.coinAnimatedSprite);
    */

    this.coinLayer = this.game.make.container();
    this.addChild(this.coinLayer);

    const configFalling: EmitterConfigV3 = {
      lifetime: { min: 2, max: 4 }, // lifespan 3000ms
      frequency: 0.01,
      emitterLifetime: -1,
      maxParticles: 75,
      autoUpdate: true,
      pos: { x: 0, y: 0 }, // Ortalanmış
      behaviors: [
        {
          type: "noRotation", // (eski dokümanda 'rotationStatic' de olur)
          config: { value: true },
        },
        {
          type: "animatedSingle",
          config: {
            anim: {
              textures: coinTextures, // <- kare dizisi
              framerate: 15, // FPS
              loop: true,
            },
          },
        },
        {
          type: "alpha",
          config: {
            alpha: {
              list: [
                { value: 0.75, time: 0 },
                { value: 1, time: 1 },
              ],
            },
          },
        },
        {
          type: "scale",
          config: {
            scale: {
              list: [
                { value: 0.5, time: 0 },
                { value: 1, time: 2 },
              ],
              isStepped: false,
            },
          },
        },
        {
          type: "rotationStatic",
          config: {
            min: 90,
            max: 90,
          },
        },
        {
          type: "rotation",
          config: {
            accel: 90,
            minSpeed: 0,
            maxSpeed: 100,
            minStart: 0,
            maxStart: 0,
          },
        },
        /*
          {                                                                 
            type: 'rotationSpeed',
            order: 20,
            config: { min: -6, max: 6 },    // kendi ekseninde spin
          },
          */
        {
          type: "moveSpeed",
          config: {
            speed: {
              list: [
                { value: 250, time: 0 }, // Daha düşük başlangıç hızı
                { value: 1000, time: 1 }, // Son hız
              ],
            },
          },
        },
        /*
          {
            type: 'acceleration',
            config: {
              accel: { x: 0, y: 0 }, // Sadece Y ekseni gravity
              minStart: 0,
              maxStart: 0,
            },
          },
          */
        {
          type: "spawnShape",
          config: {
            type: "rect",
            data: {
              x: 0,
              y: -150,
              w: 1280, // 2120 - (-200)
              h: 5, // -200 - (-300)
            },
          },
        },
      ],
    };

    const configRising: EmitterConfigV3 = {
      lifetime: { min: 1, max: 2 }, // lifespan 3000ms
      frequency: 0.01,
      emitterLifetime: -1,
      maxParticles: 50,
      autoUpdate: false,
      pos: { x: 0, y: 0 }, // Ortalanmış
      behaviors: [
        {
          type: "noRotation", // (eski dokümanda 'rotationStatic' de olur)
          config: { value: true },
        },
        {
          type: "animatedSingle",
          config: {
            anim: {
              textures: coinTextures, // <- kare dizisi
              framerate: 15, // FPS
              loop: true,
            },
          },
        },
        {
          type: "alpha",
          config: {
            alpha: {
              list: [
                { value: 0, time: 0 },
                { value: 1, time: 1 },
                { value: 0, time: 2 },
              ],
            },
          },
        },
        {
          type: "scale",
          config: {
            scale: {
              list: [
                { value: 0.5, time: 0 },
                { value: 0.75, time: 1 },
              ],
              isStepped: false,
            },
          },
        },
        {
          type: "rotationStatic",
          config: {
            min: 270,
            max: 270,
          },
        },
        {
          type: "rotation",
          config: {
            accel: 270,
            minSpeed: 0,
            maxSpeed: 50,
            minStart: 0,
            maxStart: 0,
          },
        },
        /*
          {                                                                 
            type: 'rotationSpeed',
            order: 20,
            config: { min: -6, max: 6 },    // kendi ekseninde spin
          },
          */
        {
          type: "moveSpeed",
          config: {
            speed: {
              list: [
                { value: 125, time: 0 }, // Daha düşük başlangıç hızı
                { value: 500, time: 1 }, // Son hız
              ],
            },
          },
        },
        /*
          {
            type: 'acceleration',
            config: {
              accel: { x: 0, y: 0 }, // Sadece Y ekseni gravity
              minStart: 0,
              maxStart: 0,
            },
          },
          */
        {
          type: "spawnShape",
          config: {
            type: "rect",
            data: {
              x: 0,
              y: 900,
              w: 1280, // 2120 - (-200)
              h: 5, // -200 - (-300)
            },
          },
        },
      ],
    };

    this.emitterFalling = new Emitter(this.coinLayer, configFalling);
    this.emitterFalling.autoUpdate = false;

    this.emitterRising = new Emitter(this.coinLayer, configRising);
    // this.emitterRising.autoUpdate = true;
  }

  private setResolve(): void {
    if (this.handleResolve) {
      this.handleResolve();
      this.handleResolve = undefined;
    }
  }

  initialize(
    config?: Slot.BigWinRunnerOptions,
    onInteraction?: (type: string, data: any) => void
  ) {
    this.onInteraction = onInteraction || (() => {});
  }

  show(data: Slot.BigWinRunnerData): Promise<void> {
    this.onInteraction("show", data);
    this.winData = data;
    this.once("pointerdown", () => {
      this.skip();
    });
    return new Promise<void>((resolve) => {
      this.handleResolve = resolve;
      const gameSpeed = this.game.registry.get("gameSpeed") as GameSpeedMode;
      const isTurbo: boolean = (gameSpeed && gameSpeed === "turbo") || false;
      this.emit("BIG_WIN_INITIATED", data, isTurbo);

      switch (data.winType) {
        case "BIG":
          this.displayObject = this.bigwinSpine;
          break;
        case "MEGA":
          this.displayObject = this.megawinSpine;
          break;
        case "SENSATIONAL":
          this.displayObject = this.sensationalwinSpine;
          break;
      }
      this.handleSkip = true;
      this.displayObject.visible = true;
      this.displayObject.scale = 0.67;
      this.visible = true;

      this.coinLayer.alpha = 1;
      this.amountText.alpha = 1;

      // this.updateContent(data);
      this.emitterFalling.autoUpdate = true;
      this.emitterFalling.emit = true;

      setTimeout(() => {
        this.emitterRising.emit = true;
        this.emitterRising.autoUpdate = true;
      }, 1500);

      this.displayObject.state.setAnimation(
        0,
        this.processedAnims.start,
        false
      );
      this.displayObject.state.addListener({
        complete: (): void => {
          this.displayObject.state.setAnimation(
            0,
            this.processedAnims.loop,
            true
          );
          this.displayObject.state.clearListeners();
        },
      });

      const amount = data.amount;
      const counter = { value: 0, final: amount };
      this.currentCounterTween = gsap.fromTo(
        counter,
        { value: counter.value },
        {
          value: counter.final,
          duration: data.duration ?? 10,
          onUpdate: () => {
            this.amountText.updateText(
              this.game.slot.currency.format(counter.value)
            );
            Engine.Utils.fitTextToWidth(this.amountText, 330, 70);
          },
          onComplete: () => {
            this.setResolve();
          },
        }
      );
    });
  }

  async hide() {
    if (this.currentCounterTween) {
      this.currentCounterTween.kill();
      this.currentCounterTween = undefined;
    }
    // after counting is done, wait 0.5sec to hide the big win animation
    await Engine.Utils.WaitFor(0.5);

    this.emit("BIG_WIN_END", this.winData);

    if (this.displayObject && this.displayObject.state) {
      this.emitterFalling.autoUpdate = false;
      this.emitterFalling.emit = false;
      this.emitterFalling.playOnceAndDestroy();
      this.emitterRising.emit = false;
      this.emitterRising.autoUpdate = false;
      this.emitterRising.playOnceAndDestroy();
      gsap.fromTo(this.coinLayer, { alpha: 1 }, { alpha: 0, duration: 0.5 });
      gsap.fromTo(this.amountText, { alpha: 1 }, { alpha: 0, duration: 0.5 });
      this.displayObject.state.clearListeners();
      this.displayObject.state.setAnimation(0, this.processedAnims.end, false);
      this.displayObject.state.addListener({
        complete: (): void => {
          this.handleSkip = false;
          this.visible = false;
          this.displayObject.visible = false;
          this.displayObject.state.clearListeners();
        },
      });
    }
  }

  destroy(): void {
    this.removeFromParent();
    super.destroy();
  }

  async skip(): Promise<void> {
    if (!this.handleSkip) return;

    if (this.currentCounterTween) {
      this.currentCounterTween.kill();
      this.currentCounterTween = undefined;
    }

    this.setResolve();
    this.hide();
    this.onInteraction("skip", {});
  }
  finish(result?: Engine.RunnerState | undefined): Promise<void> | void {
    //this.hide();
    return Promise.resolve();
  }
  updateContent(data: Slot.BigWinRunnerData): void {
    this.amountText.updateText(this.game.slot.currency.format(data.amount));
    Engine.Utils.fitTextToWidth(this.amountText, 330, 70);
  }

  public onResize(width: number, height: number, _orientation: string): void {
    void _orientation; // Unused parameter

    const centerX = width / 2;
    const centerY = height / 2;

    /* this.amountText.position.set(centerX, centerY);
    this.bigwinSpine.position.set(centerX, centerY);
    this.megawinSpine.position.set(centerX, centerY);
    this.sensationalwinSpine.position.set(centerX, centerY); */
  }
}
