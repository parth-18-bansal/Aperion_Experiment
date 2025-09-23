import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Engine } from "game-engine";
import { Container } from "pixi.js";
import { gsap } from "gsap";
import { Logger } from "game-engine/src/logger";
import { Slot } from "slot-game-engine";

export class AnubisCharacter extends Container {
  private anubisOnScreen!: Spine;
  private anubisCharacters = new Map<Slot.GameMode, Spine>();

  private normalspinAnubis!: Spine;
  private freespinAnubis!: Spine;

  constructor(mode: Slot.GameMode = "spin") {
    super();
    Engine.Utils.ApplyCommonProperties(this, {
      //scale: 0.66,
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: { position: { x: 0.66, y: 0.75 } },
            },
          ],
        },
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 0.85, x: 1620, y: 930 },
              },
              mobile: {
                landscape: { scale: 1, x: 1720, y: 1015 },
                portrait: { scale: 1, x: 896, y: 2047 },
              },
              tablet: {
                landscape: { scale: 1, x: 1720, y: 1015 },
                portrait: { scale: 1.2, x: 940, y: 2225 },
              },
            },
          ],
        },
      ],
    });
    this.create(mode);
  }

  private async create(mode: Slot.GameMode) {
    this.normalspinAnubis = await this.game.make.spine({
      skeleton: "main/anubis/Golden_Egypt_Anubis.json",
      atlas: "main/anubis/Golden_Egypt_Anubis.atlas",
      skin: "default",
      scale: 0.55,
      autoUpdate: false, // Disable auto-updating initially
    });
    this.freespinAnubis = await this.game.make.spine({
      skeleton: "main/anubis-freespin/Golden_Egypt_Anubis_freespin.json",
      atlas: "main/anubis-freespin/Golden_Egypt_Anubis_freespin.atlas",
      skin: "default",
      scale: 0.55,
      y: -30,
      x: 15,
      autoUpdate: false, // Disable auto-updating initially
    });
    this.anubisCharacters.set("spin", this.normalspinAnubis);
    this.anubisCharacters.set("freespin", this.freespinAnubis);

    this.setAnubisCharacter(mode);
  }

  /**
   * Sets the Anubis character based on the provided mode.
   *
   * This method hides and removes the current Anubis character, if present,
   * then retrieves and displays the new Anubis character corresponding to the given mode.
   *
   * @param mode - Can be either "spin" or "freespin".
   */
  public async setAnubisCharacter(
    mode: Slot.GameMode,
    transitionTime: number = 0.5
  ) {
    if (this.anubisOnScreen === this.anubisCharacters.get(mode)) {
      return;
    }

    if (this.anubisOnScreen) {
      await gsap.to(this.anubisOnScreen, {
        alpha: 0,
        duration: transitionTime,
        onComplete: () => {
          this.anubisOnScreen.state.clearTracks();
          this.anubisOnScreen.autoUpdate = false; // Stop auto-updating the spine
          this.removeChild(this.anubisOnScreen);
        },
      });
    }

    this.anubisOnScreen = this.anubisCharacters.get(mode)!;
    this.anubisOnScreen.autoUpdate = true; // Enable auto-updating the spine
    this.anubisOnScreen.alpha = 0;
    this.anubisOnScreen.visible = true;
    this.addChild(this.anubisOnScreen);

    this.playAnubisIdleLoop();
    await gsap.to(this.anubisOnScreen, {
      alpha: 1,
      duration: transitionTime,
    });
  }

  public async playAnubisAnimation(
    animationName: string,
    isTurbo: boolean = false
  ) {
    if (isTurbo) return;

    if (this.anubisOnScreen && animationName) {
      const currentAnimation =
        this.anubisOnScreen.state.getCurrent(0)?.animation;
      const requestedAnimation =
        this.anubisOnScreen.skeleton.data.findAnimation(animationName);

      if (!requestedAnimation) {
        Logger.error(
          `Animation "${animationName}" not found in Anubis character animations.`
        );
        return;
      }

      if (requestedAnimation !== currentAnimation) {
        this.anubisOnScreen.state.setAnimation(0, animationName, false);
        this.anubisOnScreen.state.addListener({
          complete: () => {
            this.playAnubisIdleLoop();
            this.anubisOnScreen.state.clearListeners();
          },
        });

        // Play the lightning and staff hit sound effect when the win trigger is hit
        if (animationName === "Symbol_animation_action") {
          this.game.audio.soundBus.PlaySFX(
            "sounds/fx/AnubisDream_AnubisAnim_StaffHit.wav",
            'sfx',
            { speed: isTurbo ? 1.5 : 1 }
          );
          this.game.audio.soundBus.PlaySFX(
            "sounds/fx/AnubisDream_AnubisAnim_Lightning.wav",
            'sfx',
            { speed: isTurbo ? 1.5 : 1 }
          );
        } else if (animationName === "Symbol_animation_action_v1") {
          this.game.audio.soundBus.PlaySFX(
            "sounds/fx/AnubisDream_AnubisAnim_StaffHit.wav",
            'sfx',
            { speed: isTurbo ? 1.5 : 1 }
          );
        } else if (animationName === "Symbol_animation_action_v2") {
          this.game.audio.soundBus.PlaySFX(
            "sounds/fx/AnubisDream_AnubisAnim_StaffUp.wav",
            'sfx',
            { speed: isTurbo ? 1.5 : 1 }
          );
        }
      }
    }
  }

  public playAnubisIdleLoop(): void {
    this.anubisOnScreen?.state.setAnimation(0, "Symbol_animation", true);
  }

  /** Resize the screen, fired whenever window size changes */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(_width: number, _height: number) {}
}
