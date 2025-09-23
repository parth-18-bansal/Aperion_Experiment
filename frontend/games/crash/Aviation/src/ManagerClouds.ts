import { Engine }                             from "game-engine";
import { Container, TilingSprite, Texture }   from "pixi.js";
import { calculateDimensionsObject }          from "./ManagerCalculated";

export interface CloudLayer {
  texture: string;
  speedOffset: number;
  position: { x: number; y: number };
  scale?: { x: number; y: number };
  visible?: boolean;
  name?: string;
}

export class CloudManager extends Container {
  app!                    : Engine.BaseGame;
  private baseSpeed       : number = 0;
  private cloudLayers     : TilingSprite[] = [];
  private speedOffsets    : number[] = [];
  private screenWidth     : number = 0;
  private screenHeight    : number = 0;
  private backgroundWidth : number = 0;

  constructor() {
    super();
    this.name = "CloudManager";
    this.app = Engine.getEngine();
  }

  initialize(screenWidth: number, screenHeight: number, backgroundWidth: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.backgroundWidth = backgroundWidth;
    this.createDefaultCloudLayers();
  }

  private createDefaultCloudLayers(): void {
    const layers: CloudLayer[] = [
      {
        texture: "layer-clouds-0.png",
        speedOffset: 3,
        position: { x: this.screenWidth / 2, y: 100 },
        scale: { x: 1, y: 1 },
        name: "Clouds 0"
      },
      {
        texture: "layer-clouds-1.png", 
        speedOffset: 4,
        position: { x: this.screenWidth / 2, y: this.screenHeight / 2 - 150 },
        scale: { x: 1, y: 1 },
        name: "Clouds 1"
      },
      {
        texture: "layer-clouds-2.png",
        speedOffset: 5,
        position: { x: this.screenWidth / 2, y: this.screenHeight / 2 },
        scale: { x: 1, y: 1 },
        name: "Clouds 2"
      },
      {
        texture: "layer-clouds-3.png",
        speedOffset: 6,
        position: { x: this.screenWidth / 2, y: this.screenHeight / 2 + 150 },
        scale: { x: 1, y: 1 },
        name: "Clouds 3"
      },
      {
        texture: "layer-clouds-4.png",
        speedOffset: 7,
        position: { x: this.screenWidth / 2, y: 0 },
        scale: { x: 1, y: 1 },
        name: "Clouds 4"
      },
      {
        texture: "layer-mountain.png",
        speedOffset: 2,
        position: { x: this.screenWidth / 2, y: this.screenHeight - 80 },
        scale: { x: 1, y: 1 },
        name: "Mountain"
      },
    ];

    this.createCloudLayers(layers);
  }

  private createCloudLayers(layers: CloudLayer[]): void {
    // Önceki katmanları temizle
    this.removeChildren();
    this.cloudLayers = [];
    this.speedOffsets = [];

    layers.forEach((layerConfig, index) => {
      const cloudLayer = new TilingSprite({
        texture: Texture.from(layerConfig.texture),
        scale: layerConfig.scale || { x: 1, y: 1 },
        position: layerConfig.position,
        anchor: 0.5
      });

      // Boyutları ayarla
      cloudLayer.width = this.backgroundWidth;
      cloudLayer.scale.y = layerConfig.scale?.y || 1;

      // Görünürlüğü ayarla
      if (layerConfig.visible !== undefined) {
        cloudLayer.visible = layerConfig.visible;
      }

      cloudLayer.name = layerConfig.name || `CloudLayer${index}`;
      
      this.cloudLayers.push(cloudLayer);
      this.speedOffsets.push(layerConfig.speedOffset);
      this.addChild(cloudLayer);
    });
  }

  setBaseSpeed(speed: number): void {
    this.baseSpeed = speed;
  }

  updateClouds(deltaTime: number): void {
    this.cloudLayers.forEach((layer, index) => {
      const totalSpeed = this.baseSpeed + this.speedOffsets[index];
      layer.tilePosition.x -= totalSpeed * deltaTime;
    });
  }

  setLayerVisibility(index: number, visible: boolean): void {
    if (this.cloudLayers[index]) {
      this.cloudLayers[index].visible = visible;
    }
  }

  setAllLayersVisibility(visible: boolean): void {
    this.cloudLayers.forEach(layer => {
      layer.visible = visible;
    });
  }

  resize(screenWidth: number, screenHeight: number, backgroundWidth: number): void {
    this.screenWidth      = screenWidth;
    this.screenHeight     = screenHeight;
    this.backgroundWidth  = backgroundWidth;

    // Pozisyonları güncelle
    if (this.cloudLayers.length >= 5) {
      this.cloudLayers[0].position.set(screenWidth / 2, 100);
      this.cloudLayers[1].position.set(screenWidth / 2, screenHeight / 2 - 200);
      this.cloudLayers[2].position.set(screenWidth / 2, screenHeight / 2);
      this.cloudLayers[3].position.set(screenWidth / 2, screenHeight / 2 + 200);
      this.cloudLayers[4].position.set(screenWidth / 2, 25);
      this.cloudLayers[5].position.set(screenWidth / 2, (((this.app.screen.height + calculateDimensionsObject().y) - this.cloudLayers[5].height / 2) + 25));
    }

    // Boyutları güncelle
    this.cloudLayers.forEach(layer => {
      layer.width = backgroundWidth;
    });
  }

  getLayer(index: number): TilingSprite | null {
    return this.cloudLayers[index] || null;
  }

  getLayerCount(): number {
    return this.cloudLayers.length;
  }
}