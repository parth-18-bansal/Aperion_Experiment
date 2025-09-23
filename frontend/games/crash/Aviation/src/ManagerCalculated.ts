import { Engine } from "game-engine";
import { Point } from "pixi.js";

  
  export function calculateDimensionsBackground(): Point {
    const engine = Engine.getEngine();
    const Wr = engine.screen.width;    // 1600
    const Hr = engine.screen.height;   // 900

    const cw = engine.view.clientWidth;   // CSS’te görünen genişlik (px)
    const ch = engine.view.clientHeight;  // CSS’te görünen yükseklik (px)

    // Canvas’ın ekrana orantılı ölçek katsayısı:
    const s = Math.min(cw / Wr, ch / Hr);

    // Ekranda görünen canvas boyutu:
    const dispW = Wr * s;
    const dispH = Hr * s;

    // CSS (ekran) tarafındaki siyah bantlar:
    const bandX_css = (cw - dispW) / 2;
    const bandY_css = (ch - dispH) / 2;

    // Render koordinatına çevir (işine yarayan asıl değerler bunlar):
    const bandX = bandX_css / s; // soldaki band = safeLeft
    const bandY = bandY_css / s; // üstteki band = safeTop

    const calW = engine.screen.width + (bandX * 2);
    const calH = engine.screen.height + (bandY * 2);

    return new Point(calW, calH);
  }

  export function calculateDimensionsObject(): Point {
    const Wr = Engine.getEngine().screen.width;    // 1600
    const Hr = Engine.getEngine().screen.height;   // 900

    const cw = Engine.getEngine().view.clientWidth;   // CSS’te görünen genişlik (px)
    const ch = Engine.getEngine().view.clientHeight;  // CSS’te görünen yükseklik (px)

    // Canvas’ın ekrana orantılı ölçek katsayısı:
    const s = Math.min(cw / Wr, ch / Hr);

    // Ekranda görünen canvas boyutu:
    const dispW = Wr * s;
    const dispH = Hr * s;

    // CSS (ekran) tarafındaki siyah bantlar:
    const bandX_css = (cw - dispW) / 2;
    const bandY_css = (ch - dispH) / 2;

    // Render koordinatına çevir (işine yarayan asıl değerler bunlar):
    const bandX = bandX_css / s; // soldaki band = safeLeft
    const bandY = bandY_css / s; // üstteki band = safeTop

    return new Point(bandX, bandY);
  }

  export function calculateBounds(padding : Point) {
    const engine = Engine.getEngine();
    const Wr = engine.screen.width;    // 1600
    // const Hr = engine.screen.height;   // 900

    const pad   = calculateDimensionsObject(); // bandX, bandY
    const minX  = pad.x;
    const maxX  = (Wr - padding.x) + (pad.x / 2);
    const minY  = 0 + padding.y / 2;
    const maxY  = ((calculateDimensionsBackground().y - pad.y - padding.y) / 2);

    return { minX, maxX, minY, maxY };
  }