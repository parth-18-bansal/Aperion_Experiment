import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Engine } from "game-engine";
import {
  Assets,
  Container,
  ContainerOptions,
  isMobile,
  Sprite,
  TextStyle,
} from "pixi.js";
import { Slot } from "slot-game-engine";

export class FreeSpinExtra extends Container {
  fsLabel!: Engine.LocalizedText<{}>;
  fsCounter!: Engine.LocalizedText<{}>;
  trail!: Spine;
  constructor(options?: ContainerOptions) {
    super(options);

    Engine.Utils.ApplyCommonProperties(this, {
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: {
                columns: 2,
                rows: 2,
                position: { x: -0.29, y: 0.12 },
              },
            },
          ],
        },
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1, x: 145, y: 115 },
              },
              mobile: {
                landscape: { scale: 1, x: 85, y: 70 },
                portrait: { scale: 1.3, x: 385, y: 1275 },
              },
              tablet: {
                landscape: { scale: 1, x: 85, y: 70 },
                portrait: { scale: 1.5, x: 350, y: 1400 },
              },
            },
          ],
        },
      ],
    });
    this.label = "FreeSpinCounter";

    const texturePack = Assets.get("textures");
    // create background
    const background = new Sprite({
      texture: texturePack.textures["fs-counter-back.png"],
    });
    this.addChild(background);

    // create label
    this.fsLabel = new Engine.LocalizedText(
      "game.freespins_left",
      {},
      new TextStyle({
        fontFamily: "adonais",
        fontSize: 28,
        align: "center",
        fill: "#edd245",
        wordWrap: true,
        wordWrapWidth: 200,
        stroke: {
          color: "#000000",
          width: 3,
        },
        dropShadow: {
          color: "#081200",
          distance: 2.1,
          angle: Math.PI / 2,
        },
      })
    );
    this.fsLabel.anchor.set(0.5);
    this.fsLabel.position.set(128, 95);
    this.fsLabel.scale.set(1.33);

    // create counter
    this.fsCounter = new Engine.LocalizedText(
      "0",
      {},
      new TextStyle({
        fontFamily: "DalekPinpointBold",
        fontSize: 35,
        align: "center",
        fill: "#edd245",
        stroke: {
          color: "#000000",
          width: 3,
        },
        dropShadow: {
          color: "#081200",
          distance: 2.1,
          angle: Math.PI / 2,
        },
      })
    );
    this.fsCounter.anchor.set(0.5);
    this.fsCounter.position.set(128, 165);
    this.fsCounter.scale.set(1.15);

    this.addChild(this.fsLabel, this.fsCounter);

    this.trail = this.game.make.spine(
      {
        skeleton: "scatter_trail.json",
        atlas: "scatter_trail.atlas",
        skin: "default",
        scale: 0.75,
        darkTint: false,
      },
      this
    );
    this.trail.position.set(725, 725);
    this.trail.state.setAnimation(0, "frame", false);
    this.trail.scale.set(1, 1);
  }

  updateFreeSpinLeftText(value: number) {
    this.fsLabel.setKey(value > 1 ? "game.freespins_left" : "game.freespin_left");
  }

  playShineEffect() {
    this.trail.state.setAnimation(0, "frame", false);
    this.fsCounter.text = parseInt(this.fsCounter.text) + 1;
    this.updateFreeSpinLeftText(parseInt(this.fsCounter.text));
    this.emit("FS_COUNT_INCREMENTED");
  }

  hide(): void {
    this.visible = false;
  }

  show(value: number): void {
    this.visible = true;
    this.fsCounter.updateText(value.toString());
  }

  playExtraSpinAnimation(machine: Slot.Machine, value: number): Promise<void> {
    return new Promise((resolve) => {
      const differance = [0, -0.5, 1, 2];
      const promsises: Promise<void>[] = [];
      let delay = 0;

      machine.reels.forEach((r, rIndex) => {
        r.displaySymbols.forEach((s, sIndex) => {
          if (s.id == "9") {
            this.game.audio.soundBus.PlaySFX(
              "sounds/fx/AnubisDream_FreeSpinScatter_Movement.wav",
              'sfx',
              {}
            );
            // Create
            promsises.push(
              new Promise((resolve) => {
                setTimeout(() => {
                  s.playAnim("scatter-win");

                  setTimeout(() => {
                    const trailAnim = this.game.make.spine({
                      skeleton: "scatter_trail.json",
                      atlas: "scatter_trail.atlas",
                      skin: "default",
                      scale: -1,
                      zIndex: 99,
                    });

                    const isPortrait =
                      this.game.renderer.height > this.game.renderer.width;

                    if (!isPortrait || !isMobile.any) {
                      trailAnim.angle =
                        sIndex == 0
                          ? 0
                          : 10 * sIndex - rIndex * differance[sIndex];
                      trailAnim.scale.set(0.2 + rIndex * 0.2 + sIndex * 0.1, 1);
                    } else {
                      const direction = rIndex > 2 ? -1 : 1;
                      const angle =
                        rIndex < 3 ? 65 + rIndex * 10 : 65 + rIndex * 10 + 180;

                      trailAnim.scale.set((1 - sIndex * 0.1) * direction);
                      trailAnim.angle =
                        rIndex != 2 ? angle + sIndex * 5 * -direction : angle;
                    }
                    console.log(
                      `Trail angle: ${trailAnim.angle}, scale: ${trailAnim.scale.x},${trailAnim.scale.y}`
                    );
                    s.addChild(trailAnim);
                    trailAnim.state.setAnimation(0, "trail", false);
                    setTimeout(() => {
                      this.playShineEffect();
                    }, 800);
                    trailAnim.state.addListener({
                      complete: () => {
                        resolve();
                        trailAnim.destroy();
                      },
                    });
                  }, 350);
                }, delay);
                delay += 500;
              })
            );
          }
        });
      });
      Promise.all(promsises).then(() => {
        resolve();
      });
    });
  }
}
