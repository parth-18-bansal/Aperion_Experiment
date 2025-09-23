import { Assets, Container, Sprite, Texture } from "pixi.js";
import { BaseButton } from "./BaseButton";

/**
 * Mobile sound (music) toggle button.
 * Adds on/off state handling and exposes an onToggle callback.
 */
export class MobileSoundButton extends BaseButton {
  private static readonly ICON_RATIO = 0.6; // icon size relative to button square

  private buttonView = new Container();
  private sprite: Sprite;
  private textureOn: Texture;
  private textureOff: Texture;
  private _musicOn = true;
  private _currentSize = 0;

  /** Optional external callback fired after state changes */
  public onToggle?: (on: boolean) => void;

  constructor(initialOn: boolean = true) {
    super();

    // Load textures (fallback to 'on' texture if 'off' missing)
    this.textureOn = Assets.get<Texture>("mobile_music_on.png");
    let offTexture: Texture | undefined;
    try {
      offTexture = Assets.get<Texture>("mobile_music_off.png");
    } catch (_) {
      offTexture = this.textureOn; // graceful fallback
    }
    this.textureOff = offTexture;

    this._musicOn = initialOn;
    this.sprite = new Sprite(this._musicOn ? this.textureOn : this.textureOff);
    this.sprite.anchor.set(0.5);
    this.buttonView.addChild(this.sprite);

    // BaseButton uses `view` for interactive object
    this.view = this.buttonView;
    this.enabled = true;

    // Ensure interactive for pixi v6 / v7
    // (If BaseButton already sets interaction this is harmless)
    // @ts-ignore - compatibility between pixi versions
    this.buttonView.interactive = true;
    // @ts-ignore
    if ((this.buttonView as any).eventMode !== undefined) {
      (this.buttonView as any).eventMode = "static";
      (this.buttonView as any).cursor = "pointer";
    }

    this.buttonView.on("pointertap", () => this.toggle());
  }

  /** Toggle current state */
  public toggle() {
    this.setState(!this._musicOn);
  }

  /**
   * Explicitly set state.
   * @param on desired on/off
   * @param silent if true, does NOT fire onToggle callback (used for external visual sync)
   */
  public setState(on: boolean, silent: boolean = false) {
    if (this._musicOn === on) return;
    this._musicOn = on;
    this.sprite.texture = this._musicOn ? this.textureOn : this.textureOff;
    if (this._currentSize > 0) this.applySizing(this._currentSize);
    if (!silent) this.onToggle?.(this._musicOn);
  }

  public isOn() {
    return this._musicOn;
  }

  /** Resize the square button and scale/position inner icon */
  public resize(size: number) {
    this._currentSize = size;
    this.applySizing(size);
  }

  private applySizing(size: number) {
    const iconSize = size * MobileSoundButton.ICON_RATIO;
    this.sprite.width = iconSize;
    this.sprite.height = iconSize;
    this.sprite.position.set(size / 2, size / 2);
    // Logical bounding box / hit area
    this.buttonView.width = size;
    this.buttonView.height = size;
  }
}