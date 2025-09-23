import { Spine } from "@esotericsoftware/spine-pixi-v8";
import {
  AnimatedSprite,
  AnimatedSpriteOptions,
  BitmapText,
  Container,
  ContainerOptions,
  Graphics,
  GraphicsOptions,
  IRenderLayer,
  NineSliceSprite,
  NineSliceSpriteOptions,
  ParticleContainer,
  ParticleContainerOptions,
  RenderLayer,
  RenderLayerOptions,
  Sprite,
  SpriteOptions,
  Text,
  TextOptions,
  Texture,
  TilingSprite,
  TilingSpriteOptions,
} from "pixi.js";
import { ApplyCommonProperties } from "../utils";
import { SpineOptions } from "./interfaces";

/**
 * GameObject builder class that provides factory methods for creating game objects.
 * This class provides factory methods for creating various PIXI.js game objects
 * and attaching common properties and components.
 */
export class GameObjectBuilder {
  /**
   * Creates a new GameObjectBuilder.
   */
  constructor() {}

  /**
   * Creates a container object.
   * @param config Container configuration.
   * @param parent Optional parent container.
   * @returns The created container.
   */
  public container(
    config: ContainerOptions = {},
    parent?: Container
  ): Container {
    return ApplyCommonProperties(
      new Container({ ...config, components: undefined }),
      config,
      parent
    );
  }

  /**
   * Creates a graphics object.
   * @param config Graphics configuration.
   * @param parent Optional parent container.
   * @returns The created graphics.
   */
  public graphics(config: GraphicsOptions = {}, parent?: Container): Graphics {
    const graphics = new Graphics({ ...config, components: undefined });

    ApplyCommonProperties(graphics, config, parent);

    if (config.points) {
      graphics.poly(config.points);
    }

    if (config.style) {
      graphics.fill(config.style);
    }

    return graphics;
  }

  /**
   * Creates a render layer object.
   * @param config RenderLayer configuration.
   * @param parent Optional parent container.
   * @returns The created render layer.
   */
  public layer(
    config: RenderLayerOptions = {},
    parent?: Container
  ): IRenderLayer {
    const layer = new RenderLayer(config);
    if (parent) {
      parent.addChild(layer);
    }
    return layer;
  }

  /**
   * Creates a particle container object.
   * @param config ParticleContainer configuration.
   * @param parent Optional parent container.
   * @returns The created particle container.
   */
  public particleContainer(
    config: ParticleContainerOptions = {},
    parent?: Container
  ): ParticleContainer {
    return ApplyCommonProperties(
      new ParticleContainer({ ...config, components: undefined }),
      config,
      parent
    );
  }

  /**
   * Creates an animated sprite object.
   * @param config AnimatedSprite configuration.
   * @param parent Optional parent container.
   * @returns The created animated sprite.
   */
  public animatedSprite(
    config: AnimatedSpriteOptions,
    parent?: Container
  ): AnimatedSprite {
    if (!Array.isArray(config.textures)) {
      config.textures = [Texture.EMPTY];
    }
    config.textures.map((t) => (typeof t === "string" ? Texture.from(t) : t));

    const sprite = new AnimatedSprite({ ...config, components: undefined });
    return ApplyCommonProperties(sprite, config, parent);
  }

  /**
   * Creates a NineSliceSprite object.
   * @param config NineSliceSprite configuration.
   * @param parent Optional parent container.
   * @returns The created NineSliceSprite.
   */
  public nineSliceSprite(
    config: NineSliceSpriteOptions,
    parent?: Container
  ): NineSliceSprite {
    if (typeof config.texture === "string")
      config.texture = Texture.from(config.texture);

    return ApplyCommonProperties(
      new NineSliceSprite({ ...config, components: undefined }),
      config,
      parent
    );
  }

  /**
   * Creates a TilingSprite object.
   * @param config TilingSprite configuration.
   * @param parent Optional parent container.
   * @returns The created TilingSprite.
   */
  public tilingSprite(
    config: TilingSpriteOptions,
    parent?: Container
  ): TilingSprite {
    if (typeof config.texture === "string")
      config.texture = Texture.from(config.texture);

    return ApplyCommonProperties(
      new TilingSprite({ ...config, components: undefined }),
      config,
      parent
    );
  }

  /**
   * Creates a sprite object.
   * @param config Sprite configuration.
   * @param parent Optional parent container.
   * @returns The created sprite.
   */
  public sprite(
    config: Omit<SpriteOptions, "texture"> & { texture: string | Texture },
    parent?: Container
  ): Sprite {
    const texture = config.texture;
    if (typeof config.texture === "string")
      config.texture = Texture.from(config.texture);

    return ApplyCommonProperties(
      new Sprite({
        ...config,
        texture: texture as Texture,
        components: undefined,
      }),
      config,
      parent
    );
  }

  public spine(config: SpineOptions, parent?: Container): Spine {
    const spine = Spine.from(config);
    if (config.skin) {
      spine.skeleton.setSkinByName(config.skin);
    }

    return ApplyCommonProperties(spine, config, parent, {
      skeleton: true,
      atlas: true,
    });
  }

  /**
   * Creates a text object.
   * @param config Text configuration.
   * @param parent Optional parent container.
   * @returns The created text.
   */
  public text(config: TextOptions, parent?: Container): Text {
    return ApplyCommonProperties(
      new Text({ ...config, components: undefined }),
      config,
      parent
    );
  }

  public bitmapText(config: TextOptions, parent?: Container): BitmapText {
    return ApplyCommonProperties(
      new BitmapText({ ...config, components: undefined }),
      config,
      parent
    );
  }
  public fromJSON(
    json: string | { [key: string]: ContainerOptions },
    parent?: Container
  ) {
    if (typeof json === "string") {
      json = JSON.parse(json) as { [key: string]: ContainerOptions };
    }
    for (const key in json) {
      if (Object.prototype.hasOwnProperty.call(json, key)) {
        const gOpts: ContainerOptions = json[key];
        gOpts.label = gOpts.label || key;
        gOpts.type = gOpts.type || "container";
        if (
          typeof gOpts.type === "string" &&
          gOpts.type in this &&
          typeof this[gOpts.type as keyof GameObjectBuilder] === "function"
        ) {
          const obj = (
            this[gOpts.type as keyof GameObjectBuilder] as <T>(
              config: ContainerOptions,
              parent?: Container
            ) => T
          ).call(this, gOpts, parent);

          if (
            typeof gOpts.children === "object" &&
            !Array.isArray(gOpts.children)
          ) {
            this.fromJSON(gOpts.children, obj as Container);
          }
        }
      }
    }
  }
}
