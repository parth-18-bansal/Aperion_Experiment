import {
  SpineOptions as PixiSpineOptions,
  SpineFromOptions,
} from "@esotericsoftware/spine-pixi-v8";
import { SpriteOptions } from "pixi.js";
export interface SpineOptions
  extends SpineFromOptions,
    Omit<PixiSpineOptions, "scale" | "skeletonData"> {
  skin?: string;
  cover?: SpriteOptions;
}
