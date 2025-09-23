import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { CrashGameAssets } from '../crash/interfaces';

@Injectable({
  providedIn: 'root',
})
export class AssetLoaderService {
  private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    // Renderer2, DOM manipülasyonu için Angular'ın sunduğu güvenli bir yöntemdir.
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Loads all CSS and JS assets defined in the game configuration.
   * @param config The game configuration object which should contain an 'assets' property.
   * @returns A promise that resolves when all assets are loaded.
   */
  public loadGameAssets(config: CrashGameAssets): Promise<void[]> {
    const assetPromises: Promise<void>[] = [];

    config.styles?.forEach((url) => {
      assetPromises.push(this.loadStyle(url));
    });
    config.scripts?.forEach((url) => {
      assetPromises.push(this.loadScript(url));
    });

    return Promise.all(assetPromises);
  }

  private loadStyle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const linkElement: HTMLLinkElement = this.renderer.createElement('link');
      this.renderer.setAttribute(linkElement, 'rel', 'stylesheet');
      this.renderer.setAttribute(linkElement, 'type', 'text/css');
      this.renderer.setAttribute(linkElement, 'href', url);
      linkElement.onload = () => resolve();
      linkElement.onerror = (error) => reject(error);
      this.renderer.appendChild(document.head, linkElement);
    });
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptElement: HTMLScriptElement =
        this.renderer.createElement('script');
      this.renderer.setAttribute(scriptElement, 'type', 'text/javascript');
      this.renderer.setAttribute(scriptElement, 'src', url);
      scriptElement.onload = () => resolve();
      scriptElement.onerror = (error) => reject(error);
      this.renderer.appendChild(document.body, scriptElement);
    });
  }
}
