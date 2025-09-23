import { Assets, Circle, ColorMatrixFilter, Container, isMobile, Sprite, Texture } from "pixi.js";
import { BaseButton } from "./BaseButton";
import { UI } from "../..";

export class InfoButton extends BaseButton {
  private buttonView = new Container();
  private icon: Sprite;

  // Static flag to prevent reloading assets if already loaded
  private static assetsLoaded = false;
  private static cssVars = "";
  private static preloadPromise: Promise<void> | null = null;
  private ensurePreparedPromise: Promise<void> | null = null;
  private lastMinBetCents?: number;
  private lastMaxBetCents?: number;
  private lastBetAmountCents?: number;
  public infoPanel: HTMLElement | null = null;
  constructor() {
    super();
    const textureName = "info_icon_new.png";
    let texture: Texture | undefined;
    try {
      texture = Assets.get<Texture>(textureName);
    } catch {
      texture = undefined;
    }
    if (!texture) {
      this.icon = new Sprite(Texture.WHITE);
      this.icon.tint = 0x00ff00;
    } else {
      this.icon = new Sprite(texture);
    }
    this.icon.anchor.set(0.5);
    this.buttonView.addChild(this.icon);
    this.view = this.buttonView;
    this.enabled = true;

    // Kick off one-time preload on first instantiation
    if (!InfoButton.assetsLoaded && !InfoButton.preloadPromise) {
      InfoButton.preloadPromise = InfoButton.startPreload();
    }

    // Build the panel in the background once
    this.ensurePreparedPromise = this.preparePanelInBackground();
  }

  // Currency format using engine if available
  private currencyFormat(n: number): string {
    const gameAny = (this as any).game;
    const formatter = gameAny?.slot?.currency?.format as undefined | ((v: number) => string);
    if (formatter) return formatter(n);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Helpers to get the content root (where sections live)
  private getInfoContentRoot(): HTMLElement | null {
    const panel = document.getElementById('info-panel');
    if (!panel) return null;
    return (panel.querySelector('[data-info-content]') as HTMLElement) || panel;
  }

  // Public API – mirrors your main.ts helpers
  public updateCredits(): void {
    const root = this.getInfoContentRoot();
    if (!root) return;
    root.querySelectorAll('section [data-credits]').forEach((node) => {
      const el = node as HTMLElement;
      const raw = el.getAttribute('data-credits') || '100';
      const value = parseFloat(raw);
      el.textContent = this.currencyFormat(value);
    });
  }

  public updateMinBet(minBetCents: number): void {
    this.lastMinBetCents = minBetCents;
    const root = this.getInfoContentRoot();
    if (!root) return;
    const value = (minBetCents ?? 0) / 100;
    root.querySelectorAll('section [data-min-bet]').forEach((node) => {
      (node as HTMLElement).textContent = this.currencyFormat(value);
    });
  }

  public updateMaxBet(maxBetCents: number): void {
    this.lastMaxBetCents = maxBetCents;
    const root = this.getInfoContentRoot();
    if (!root) return;
    const value = (maxBetCents ?? 0) / 100;
    root.querySelectorAll('section [data-max-bet]').forEach((node) => {
      (node as HTMLElement).textContent = this.currencyFormat(value);
    });
  }

  public updateMultipliers(betAmountCents: number): void {
    this.lastBetAmountCents = betAmountCents;
    const root = this.getInfoContentRoot();
    if (!root) return;
    const bet = (betAmountCents ?? 0) / 100;
    root.querySelectorAll('section [data-multiplier]').forEach((node) => {
      const el = node as HTMLElement;
      const raw = el.getAttribute('data-multiplier') || '1';
      const mult = parseFloat(raw);
      el.textContent = this.currencyFormat(mult * bet);
    });
  }

  private static startPreload(): Promise<void> {
    const manifestUrl = "info-pages/assets.json";
    return fetch(manifestUrl)
      .then((res) => res.json())
      .then((manifest) => {
        let cssVars = "";
        if (manifest.images && Array.isArray(manifest.images)) {
          manifest.images.forEach((img: { name: string; data: string }) => {
            cssVars += `--game-${img.name}: url('${img.data}');\n`;
          });
          const promises = manifest.images.map(
            (img: { name: string; data: string }) =>
              new Promise((resolve) => {
                const image = new window.Image();
                image.onload = () => resolve(true);
                image.onerror = () => resolve(false);
                image.src = img.data;
              })
          );
          return Promise.all(promises).then(() => cssVars);
        }
        return "";
      })
      .then((cssVars) => {
        InfoButton.cssVars = cssVars;
        InfoButton.assetsLoaded = true;
      })
      .catch(() => {
        // Swallow errors; we’ll still attempt to open panel without preloaded assets
        InfoButton.assetsLoaded = false;
      });
  }

  override press() {
    const panelId = "info-panel";
    this.infoPanel = document.getElementById(panelId);
    if (!this.infoPanel) {
      const newPanel = document.createElement("div");
      newPanel.id = panelId;
      newPanel.classList.add(
        "info-modal-root",
        "info-modal-root-inside",
        "modal-root"
      );
      document.body.appendChild(newPanel);
      this.infoPanel = newPanel;
    }
    // Wait for background preparation, then just toggle visibility
    (this.ensurePreparedPromise ?? Promise.resolve()).then(() => {
      const p = document.getElementById(panelId);
      if (!p) return;
      p.style.display = p.style.display === "block" ? "none" : "block";
    });
  }

  private preparePanelInBackground(): Promise<void> {
    const cssURL = "info-pages/info.css";
    const paginationUrl = "info-pages/pagination.html";
    // Determine HTML URL based on device type
    let htmlUrl = "info-pages/desktop/en.html";
    if (isMobile.phone) htmlUrl = "info-pages/mobile/en.html";
    else if (isMobile.tablet) htmlUrl = "info-pages/tablet/en.html";

    const panelId = "info-panel";
    this.infoPanel = document.getElementById(panelId);
    if (!this.infoPanel) {
      const newPanel = document.createElement("div");
      newPanel.id = panelId;
      newPanel.classList.add("info-modal-root", "info-modal-root-inside", "modal-root");
      newPanel.style.display = "none";
      document.body.appendChild(newPanel);
      this.infoPanel = newPanel;
    } else {
      this.infoPanel.style.display = "none";
    }

    const waitPreload = InfoButton.assetsLoaded
      ? Promise.resolve()
      : (InfoButton.preloadPromise ?? Promise.resolve());

    return waitPreload
      .then(() => {
        if (!this.infoPanel) return;
        // Ensure CSS link
        if (!this.infoPanel.querySelector("link[data-info-css]")) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = cssURL;
          link.setAttribute("data-info-css", "1");
          this.infoPanel.prepend(link);
        }
        // Inject CSS variables (scoped)
        if (InfoButton.cssVars) {
          let styleTag = this.infoPanel.querySelector("style[data-info-icons]");
          if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.setAttribute("data-info-icons", "1");
            this.infoPanel.prepend(styleTag);
          }
          styleTag.textContent = `#${panelId} {${InfoButton.cssVars}}`;
        }
      })
      .then(() => fetch(htmlUrl))
      .then((res) => res?.text?.())
      .then((html) => {
        if (!this.infoPanel) return;
        // Keep style/link nodes, then ensure a sticky close button and a content host
        const styleTag = this.infoPanel.querySelector("style[data-info-icons]");
        const linkTag = this.infoPanel.querySelector("link[data-info-css]");
        this.infoPanel.innerHTML = "";
        if (linkTag) this.infoPanel.appendChild(linkTag);
        if (styleTag) this.infoPanel.appendChild(styleTag);
        // Close button (kept as a persistent node with listener)
        let closeBtn = this.infoPanel.querySelector('#close-info-panel') as HTMLButtonElement | null;
        if (!closeBtn) {
          closeBtn = document.createElement('button');
          closeBtn.id = 'close-info-panel';
          // Fixed to viewport so it stays tappable above mobile scroll content
          closeBtn.style.position = 'fixed';
          closeBtn.style.top = '20px';
          closeBtn.style.right = '20px';
          closeBtn.style.zIndex = '1001';
          closeBtn.style.fontSize = '2rem';
          closeBtn.style.padding = '0.5em 1em';
          closeBtn.style.cursor = 'pointer';
          closeBtn.style.pointerEvents = 'auto';
          closeBtn.style.touchAction = 'manipulation';
          closeBtn.textContent = '×';
          closeBtn.addEventListener('click', this.closeHandler.bind(this));
          closeBtn.addEventListener('pointerup', this.closeHandler.bind(this));
          closeBtn.addEventListener('touchend', this.closeHandler.bind(this), { passive: true } as any);
        }
        this.infoPanel.appendChild(closeBtn);
        // Dedicated content host
        let contentHost = this.infoPanel.querySelector('[data-info-content]') as HTMLElement | null;
        if (!contentHost) {
          contentHost = document.createElement('div');
          contentHost.setAttribute('data-info-content', '1');
          this.infoPanel.appendChild(contentHost);
        }
        contentHost.innerHTML = '';
        if (isMobile.phone) {
          this.setupMobileScrollableContent(contentHost, html);
        } else {
          contentHost.innerHTML = html;
          this.setupPaginationContent(this.infoPanel, paginationUrl);
        }
        // Apply any pending dynamic values
        this.updateCredits();
        if (this.lastMinBetCents !== undefined) this.updateMinBet(this.lastMinBetCents);
        if (this.lastMaxBetCents !== undefined) this.updateMaxBet(this.lastMaxBetCents);
        if (this.lastBetAmountCents !== undefined) this.updateMultipliers(this.lastBetAmountCents);
        // Ensure close button sits on top in DOM order
        this.infoPanel.appendChild(closeBtn);
      })
      .catch(() => {
        if (this.infoPanel) this.infoPanel.innerHTML = "";
      });
  }

  public closeHandler() {
    if (this.infoPanel?.style.display === 'block') {
      // TODO Finding better way to notify UI to show spin area again
      this.view.parent.parent.parent.setVisibility("spinArea", true);
      this.infoPanel!.style.display = 'none'
    }
  }


  private setupMobileScrollableContent(infoPanel: HTMLElement, html: string) {
    // Create scrollable container for mobile
    const scrollContainer = document.createElement("div");
    scrollContainer.style.cssText = `
      height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 60px 20px 100px 20px;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    `;
    scrollContainer.classList.add(
      "scroll-container"
    );

    // Parse HTML and extract all sections
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const sections = tempDiv.querySelectorAll(".section-area");

    // Remove hidden class from all sections and add them to scroll container
    sections.forEach((section, index) => {
      section.classList.remove("hidden");

      // Add spacing between sections
      if (index > 0) {
        const spacer = document.createElement("div");
        spacer.style.height = "40px";
        scrollContainer.appendChild(spacer);
      }

      scrollContainer.appendChild(section);
    });

    // If no sections found, add all content
    if (sections.length === 0) {
      scrollContainer.innerHTML = html;
    }

    // Add extra bottom padding element to ensure last content is visible
    const bottomPadding = document.createElement("div");
    bottomPadding.style.height = "60px";
    scrollContainer.appendChild(bottomPadding);

    infoPanel.appendChild(scrollContainer);
  }

  private setupPaginationContent(infoPanel: HTMLElement, paginationUrl: string) {
    // Desktop and tablet pagination logic
    fetch(paginationUrl)
      .then((res) => res.text())
      .then((paginationHtml) => {
        infoPanel.insertAdjacentHTML("beforeend", paginationHtml);
        if (!infoPanel.querySelector("script[data-pagination]")) {
          const script = document.createElement("script");
          script.setAttribute("data-pagination", "1");
          script.textContent = `\n(function() {\n  const sections = Array.from(document.querySelectorAll('.section-area'));\n  let currentPage = sections.findIndex(sec => !sec.classList.contains('hidden'));\n  if (currentPage === -1) currentPage = 0;\n  function showPage(idx) {\n    sections.forEach((sec, i) => sec.classList.toggle('hidden', i !== idx));\n    // Dot update\n    const dots = document.querySelectorAll('.pagination-dot');\n    dots.forEach((dot, i) => dot.style.opacity = (i === idx ? '1' : '0.3'));\n    // Arrow style (keep enabled)\n    const prev = document.getElementById('info-prev');\n    const next = document.getElementById('info-next');\n    if (prev) prev.style.opacity = '1';\n    if (next) next.style.opacity = '1';\n  }\n  // Dot list\n  const dotList = document.getElementById('info-dot-list');\n  if (dotList) {\n    dotList.innerHTML = '';\n    for (let i = 0; i < sections.length; i++) {\n      const dot = document.createElement('div');\n      dot.className = 'pagination-dot';\n      dot.style.width = '12px';\n      dot.style.height = '12px';\n      dot.style.borderRadius = '50%';\n      dot.style.background = '#fff';\n      dot.style.opacity = (i === currentPage ? '1' : '0.3');\n      dot.style.cursor = 'pointer';\n      dot.onclick = () => { currentPage = i; showPage(currentPage); };\n      dotList.appendChild(dot);\n    }\n  }\n  // Arrow events (circular)\n  const prev = document.getElementById('info-prev');\n  const next = document.getElementById('info-next');\n  if (prev) prev.onclick = () => { if (!sections.length) return; currentPage = (currentPage - 1 + sections.length) % sections.length; showPage(currentPage); };\n  if (next) next.onclick = () => { if (!sections.length) return; currentPage = (currentPage + 1) % sections.length; showPage(currentPage); };\n  showPage(currentPage);\n})();\n`;
          infoPanel.appendChild(script);
        }
      });
  }

  override out() {
    if (this.buttonView) {
      this.buttonView.filters = [];
    }
  }

  override hover() {
    if (!this.buttonView) return;
    const cm = new ColorMatrixFilter();
    // Subtle brightness/contrast bump to get a clean shine like your sample
    cm.brightness(1.18, false);
    cm.resolution = 2;
    this.buttonView.filters = [cm];
  }

  public resize(desiredWidth: number, desiredHeight: number) {
    this.icon.width = desiredWidth;
    this.icon.height = desiredHeight;
    this.icon.x = desiredWidth / 2;
    this.icon.y = desiredHeight / 2;
    this.buttonView.width = desiredWidth;
    this.buttonView.height = desiredHeight;

    const radius = Math.min(desiredWidth, desiredHeight) / 2.6;
    const cx = desiredWidth / 2;
    const cy = desiredHeight / 2;
    const hit = new Circle(cx, cy, radius);
    this.buttonView.hitArea = hit;
    if (this.view) this.view.hitArea = hit;
  }
}
