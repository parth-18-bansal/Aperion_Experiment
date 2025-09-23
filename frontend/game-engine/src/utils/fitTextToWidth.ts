import { Engine } from "index";
import { BitmapText, Text } from "pixi.js";

// Sets the font size of a text object to fit within a specified width
export function fitTextToWidth(
    textObject: Engine.LocalizedText<{}> | Engine.LocalizedBitmapText | Text | BitmapText,
    maxWidth: number,
    maxFontSize: number = 34): void 
  {
      textObject.style.fontSize = maxFontSize;
      let currentWidth = textObject.width;
      let newFontSize = (maxWidth / currentWidth) * maxFontSize;
      textObject.style.fontSize = Math.min(newFontSize, maxFontSize);
  }
