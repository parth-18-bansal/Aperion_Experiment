import {
  assignWithIgnore,
  Container,
  ContainerOptions,
  isMobile,
  Texture,
} from "pixi.js";
import { Logger } from "../logger";
import { Component } from "./Component";

export class ResizeComponent extends Component {
  constructor(
    public gameObject: Container,
    conf:
      | Record<
          "desktop" | "mobile" | "tablet",
          Record<"landscape" | "portrait", ContainerOptions>
        >
      | Record<"landscape" | "portrait", ContainerOptions>
  ) {
    super(gameObject, conf);
  }
  onResize(width: number, height: number) {
    const deviceType = isMobile.tablet
      ? "tablet"
      : isMobile.any
      ? "mobile"
      : "desktop";
    const orientation =
      this.gameObject.game.resizeOptions?.forceOrientation &&
      this.gameObject.game.resizeOptions?.forceOrientation !== "auto"
        ? this.gameObject.game.resizeOptions?.forceOrientation
        : width >= height
        ? "landscape"
        : "portrait";

    let options = this.conf[orientation] || {};
    if (this.conf[deviceType] && this.conf[deviceType][orientation]) {
      options = { ...options, ...this.conf[deviceType][orientation] };
    }

    if (options) {
      if (options.textures && Array.isArray(options.textures)) {
        options.textures.map((t: any) =>
          typeof t === "string" ? Texture.from(t) : t
        );
      }

      if (typeof options.texture === "string")
        options.texture = Texture.from(options.texture);

      assignWithIgnore(this.gameObject, options, {
        children: true,
        parent: true,
        effects: true,
        components: true,
      });
    }
  }
  onAdded(): void {
    Logger.log("ResizeComponent.onAdded");
    this.gameObject.game.renderer.on("resize", this.onResize, this);
    this.onResize(
      this.gameObject.game.renderer.width,
      this.gameObject.game.renderer.height
    );
  }
  onRemoved(): void {
    Logger.log("ResizeComponent.onRemoved");
    this.gameObject.game.renderer.off("resize", this.onResize, this);
  }
  destroy(): void {
    Logger.log("ResizeComponent.destroy");
    this.onRemoved();
  }
}
