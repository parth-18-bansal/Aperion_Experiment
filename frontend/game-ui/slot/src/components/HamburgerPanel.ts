import { gsap } from "gsap";
import { Assets, Container, Graphics, isMobile, Sprite, TextStyle } from "pixi.js";
import { BaseButton } from "./BaseButton";
import { Engine } from "game-engine";
import { isPortrait } from "game-engine/src/utils/isPortrait";
export class HamburgerPanel extends Container {
  private background: Graphics;
  private blurOverlay: Graphics;
  private bottomPointer: Graphics;
  private closeButton: BaseButton;
  private title: InstanceType<typeof Engine.LocalizedText>;
  private cheatsLabel: InstanceType<typeof Engine.LocalizedText>;
  private homeLabel: InstanceType<typeof Engine.LocalizedText>;
  private historyLabel: InstanceType<typeof Engine.LocalizedText>;
  public cheatsButton: BaseButton;
  public homeButton: BaseButton;
  public historyButton: BaseButton;
  public musicToggle: Container;
  public sfxToggle: Container;
  public quickSwitch: Container;
  public turboSwitch: Container;

  // Divider'ları saklamak için
  private dividers: Graphics[] = [];

  // Switch'leri saklamak için responsive positioning
  private switchContainers: {
    container: Container;
    labelText: InstanceType<typeof Engine.LocalizedText>;
    key: "fastSpin" | "turboSpin" | "music" | "sfx";
    originalY: number;
  }[] = [];

  public switchStates: Record<
    "fastSpin" | "turboSpin" | "music" | "sfx",
    boolean
  > = {
      fastSpin: false,
      turboSpin: false,
      music: true,
      sfx: true,
    };

  // Compact removal state (shrink from top when cheats removed)
  private cheatsCompactRemoved = false;
  private readonly CHEATS_BLOCK_REMOVE = 50; // distance between first two dividers (80-130)
  private removedCheatsHeight = 0; // active height removed from top
  private turboCompactRemoved = false; // turbo switch hidden state
  private readonly TURBO_BLOCK_REMOVE = 60; // distance between quick (270) and turbo (330)
  private readonly ORIGINAL_BG_HEIGHT = 519;
  private readonly ORIGINAL_BG_WIDTH = 306;
  private readonly ORIGINAL_HEADER_Y_DESKTOP = 42;
  private readonly ORIGINAL_HEADER_Y_LANDSCAPE = 32;

  // UIStates için callback'ler
  public onQuickSwitchChanged?: () => void;
  public onTurboSwitchChanged?: () => void;
  public onMusicSwitchChanged?: () => void;
  public onSfxSwitchChanged?: () => void;

  // Use Container for custom toggles
  private switchButtons: Record<
    "fastSpin" | "turboSpin" | "music" | "sfx",
    Container
  > = {
      fastSpin: undefined!,
      turboSpin: undefined!,
      music: undefined!,
      sfx: undefined!,
    };
  constructor(width = 306, _height = 519) {
    super();
    this.eventMode = "static";
    this.x = 0;
    this.y = -360;
    this.scale.set(0.7);

    this.background = new Graphics();
    this.background.fill({ color: 0x000000, alpha: 0.8 });
    this.background.roundRect(25, 0, width, _height, 35);
    this.background.fill();

    this.blurOverlay = new Graphics();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(25, 0, width, _height, 35);
    this.blurOverlay.fill();

    this.addChild(this.background);
    this.addChild(this.blurOverlay);

    // Bottom inverted triangle (black), centered at panel bottom
    this.bottomPointer = new Graphics();
    const triW = 27; // 18 * 1.5
    const triH = 15; // 12 * 1.5
    this.bottomPointer.fill({ color: 0x000000, alpha: 1 });
    this.bottomPointer.moveTo(0, 0);
    this.bottomPointer.lineTo(triW, 0);
    this.bottomPointer.lineTo(triW / 2, triH);
    this.bottomPointer.lineTo(0, 0);
    this.bottomPointer.fill();
    this.bottomPointer.x = 50;
    this.bottomPointer.y = _height;
    this.addChild(this.bottomPointer);

    this.title = new Engine.LocalizedText(
      "ui.settings-panel.header",
      {},
      new TextStyle({
        fontFamily: "HeadingNowText",
        fontWeight: "900",
        fill: "#fd9700",
        fontSize: 18,
        align: "left",
      })
    );
    this.title.x = 54;
    this.title.y = 32;
    this.title.resolution = 2; // Yüksek çözünürlük için

    this.addChild(this.title);

    this.closeButton = new BaseButton(new Sprite(Assets.get("xmark_thin.png")));
    this.closeButton.view.x = width - 44;
    this.closeButton.view.y = 32; // Padding top
    this.closeButton.view.width = 16;
    this.closeButton.view.height = 16;
    this.closeButton.onPress.connect(() => this.emit("close"));
    this.addChild(this.closeButton.view);

    this.dividers.push(this.addDivider(80, width - 64, 50));
    this.cheatsLabel = new Engine.LocalizedText(
      "ui.settings-panel.cheats",
      {},
      new TextStyle({
        fontFamily: "HeadingNowText",
        fontWeight: "900",
        fill: "#fff",
        fontSize: 18,
        align: "right",
      })
    );
    this.cheatsLabel.x = 242;
    this.cheatsLabel.y = 95;
    this.cheatsLabel.anchor.set(1, 0);
    this.cheatsLabel.resolution = 2; // Yüksek çözünürlük için
    this.cheatsButton = new BaseButton(this.cheatsLabel);
    this.addChild(this.cheatsButton.view);
    this.dividers.push(this.addDivider(130, width - 64, 50));

    this.homeButton = new BaseButton(new Sprite(Assets.get("house-solid.png")));
    this.homeButton.view.x = width - 44;
    this.homeButton.view.y = 140;
    this.homeButton.view.width = 32;
    this.homeButton.view.height = 32;
    this.addChild(this.homeButton.view);
    this.homeLabel = new Engine.LocalizedText(
      "ui.settings-panel.home-button",
      {},
      new TextStyle({
        fontFamily: "HeadingNowText",
        fontWeight: "900",
        fill: "#fff",
        fontSize: 18,
        align: "right",
      })
    );
    this.homeLabel.x = this.homeButton.view.x - 20; // 20px padding
    this.homeLabel.y = 150;
    this.homeLabel.anchor.set(1, 0); // Dikey ortalama
    this.homeLabel.resolution = 2; // Yüksek çözünürlük için
    this.addChild(this.homeLabel);
    // Make Home label clickable; forward to home button
    this.homeLabel.eventMode = "static";
    this.homeLabel.cursor = "pointer";
    this.homeLabel.on("pointertap", () => {
      this.homeButton.onPress.emit();
    });
    this.dividers.push(this.addDivider(190, width - 64, 50));

    // History button
    this.historyButton = new BaseButton(
      new Sprite(Assets.get("history.png"))
    );
    this.historyButton.view.x = width - 45;
    this.historyButton.view.y = 202;
    this.historyButton.view.width = 32;
    this.historyButton.view.height = 32;
    this.historyButton.view.alpha = 0.8;
    this.addChild(this.historyButton.view);
    this.historyLabel = new Engine.LocalizedText(
      "ui.settings-panel.bet-history",
      {},
      new TextStyle({
        fontFamily: "HeadingNowText",
        fontWeight: "900",
        fill: "#fff",
        fontSize: 18,
        align: "right",
      })
    );
    this.historyLabel.x = this.historyButton.view.x - 20;
    this.historyLabel.y = 210;
    this.historyLabel.resolution = 2;
    this.historyLabel.anchor.set(1, 0); // Dikey ortalama
    this.addChild(this.historyLabel);
    // Make History label clickable; forward to history button
    this.historyLabel.eventMode = "static";
    this.historyLabel.cursor = "pointer";
    this.historyLabel.on("pointertap", () => {
      this.historyButton.onPress.emit();
    });
    // Çizgi: Bahis geçmişi altı
    this.dividers.push(this.addDivider(250, width - 64, 50));

    this.musicToggle = new Container();
    this.musicToggle.label = "musicToggle";
    this.sfxToggle = new Container();
    this.sfxToggle.label = "sfxToggle";
    this.quickSwitch = new Container();
    this.quickSwitch.label = "quickSwitch";
    this.turboSwitch = new Container();
    this.turboSwitch.label = "turboSwitch"; // Switches - daha düzenli aralıklarla
    this.createSwitch(
      "ui.settings-panel.quick-spin",
      "fastSpin",
      270,
      this.quickSwitch
    );
    this.createSwitch(
      "ui.settings-panel.turbo-spin",
      "turboSpin",
      330,
      this.turboSwitch
    );
    this.createSwitch(
      "ui.settings-panel.ambient-music",
      "music",
      390,
      this.musicToggle
    );
    this.createSwitch("ui.settings-panel.sound-fx", "sfx", 450, this.sfxToggle);
    this.updateSwitchIcons();
  }

  private addDivider(y: number, width: number, x: number = 0) {
    const divider = new Graphics();
    divider.label = `divider_${y}`; // Divider'ları tanımlamak için label ekle
    divider.moveTo(x, y);
    divider.lineTo(x + width, y).stroke({ color: 0xffffff, alpha: 0.4 });
    this.addChild(divider);
    return divider; // Divider'ı döndür ki daha sonra güncelleyebilelim
  }
  private createSwitch(
    label: string,
    key: "fastSpin" | "turboSpin" | "music" | "sfx",
    y: number,
    toggleContainer: Container
  ) {
    // --- Sabitler ---
    const SWITCH_BG_WIDTH = 92;
    const SWITCH_BG_HEIGHT = 48;
    const SWITCH_SCALE = 0.8; // Switch boyutunu ölçeklendir
    const SWITCH_X = 201.5;
    const SWITCH_Y = y - 10;
    const ICON_SIZE = 16;
    const ICON_X_LEFT = 16;
    const ICON_X_RIGHT = 60;
    const ICON_Y = 16;
    const LABEL_X = 175 - 16;
    const LABEL_Y = y + 5;

    // --- Label ---
    const labelText = new Engine.LocalizedText(
      label,
      {},
      new TextStyle({
        fontFamily: "HeadingNowText",
        fontWeight: "900",
        fill: "#fff",
        fontSize: 16,
        align: "right",
      })
    );
    labelText.anchor = { x: 1, y: 0 } as any;
    labelText.x = LABEL_X;
    labelText.y = LABEL_Y;
    labelText.resolution = 2;
    this.addChild(labelText);

    // --- Switch Background (Base) ---
    let checkboxBg = new Sprite(Assets.get("switch_bg.png"));
    checkboxBg.width = SWITCH_BG_WIDTH;
    checkboxBg.height = SWITCH_BG_HEIGHT;
    checkboxBg.x = SWITCH_X;
    checkboxBg.y = SWITCH_Y;
    this.addChild(checkboxBg);

    // --- Switch Bars (Kapalı ve Açık) ---
    const isActive = this.switchStates[key];

    // Kapalı durumu (switch_close_bg.png)
    const switchBarClosed = new Sprite(Assets.get("switch_close_bg.png"));
    switchBarClosed.scale.set(SWITCH_SCALE); // Ölçeklendir
    switchBarClosed.x = SWITCH_X;
    switchBarClosed.y = SWITCH_Y + 4;
    switchBarClosed.alpha = isActive ? 0 : 1; // Kapalı ise görünür

    // Açık durumu (switch_open_bg.png)
    const switchBarOpen = new Sprite(Assets.get("switch_open_bg.png"));
    switchBarOpen.scale.set(SWITCH_SCALE); // Ölçeklendir
    switchBarOpen.x = SWITCH_X + 48;
    switchBarOpen.y = SWITCH_Y + 4;
    switchBarOpen.alpha = isActive ? 0 : 1; // Açık ise görünür

    // --- Icons ---
    const xIcon = new Sprite(Assets.get("style2xwhite.png"));
    xIcon.width = xIcon.height = ICON_SIZE;
    xIcon.x = SWITCH_X + ICON_X_LEFT;
    xIcon.y = SWITCH_Y + ICON_Y;

    const oIcon = new Sprite(
      Assets.get(isActive ? "style20white.png" : "style20dark.png")
    );
    oIcon.width = oIcon.height = ICON_SIZE;
    oIcon.x = SWITCH_X + ICON_X_RIGHT;
    oIcon.y = SWITCH_Y + ICON_Y;

    // --- Toggle Container ---
    if (!toggleContainer) toggleContainer = new Container();
    toggleContainer.removeChildren();
    toggleContainer.addChild(
      checkboxBg,
      switchBarClosed,
      switchBarOpen,
      xIcon,
      oIcon
    );
    toggleContainer.eventMode = "static";
    toggleContainer.cursor = "pointer";
    toggleContainer.interactive = true;

    // Switch bar referanslarını container'a ekle
    (toggleContainer as any).switchBarClosed = switchBarClosed;
    (toggleContainer as any).switchBarOpen = switchBarOpen;
    (toggleContainer as any).oIcon = oIcon;

    // --- Click Event ---
    toggleContainer.on("pointerdown", () => {
      this.switchStates[key] = !this.switchStates[key];
      this.animateSwitchBars(
        switchBarClosed,
        switchBarOpen,
        this.switchStates[key]
      );
      this.updateOIconTexture(oIcon, this.switchStates[key]);
      this.handleSwitchClick(key, this.switchStates[key]);
    });

    this.addChild(toggleContainer);
    (this.switchButtons as any)[key] = toggleContainer;

    // Switch tracking sistemine ekle
    this.switchContainers.push({
      container: toggleContainer,
      labelText: labelText,
      key: key,
      originalY: y
    });
  }

  // update switch state and Icons
  public updateSwitchStates(key: string): void {
    switch (key) {
      case "quick":
        this.switchStates["fastSpin"] = true;
        this.switchStates["turboSpin"] = false;
        break;
      case "turbo":
        this.switchStates["fastSpin"] = false;
        this.switchStates["turboSpin"] = true;
        break;
      case "normal":
        this.switchStates["fastSpin"] = false;
        this.switchStates["turboSpin"] = false;
        break;
      case "music":
        break;
      case "sfx":
        break;

      default:
        break;
    }
    this.updateSwitchIcons();
  }

  /** Hide cheats with compact mode: shrink panel from top, shift header & close downward, keep HOME static */
  public hideCheatsCompact(): void {
    if (this.cheatsCompactRemoved) return;
    this.cheatsCompactRemoved = true;
    this.removedCheatsHeight = this.CHEATS_BLOCK_REMOVE;
    // Hide cheats visuals & first two dividers
    this.cheatsLabel.visible = false;
    this.cheatsButton.view.visible = false;
    if (this.dividers[0]) this.dividers[0].visible = false;
    // Shift header & close (desktop/landscape only). HOME stays same.
    const landscape = isMobile.any && !isPortrait();
    if (!isMobile.any) {
      this.title.y = this.ORIGINAL_HEADER_Y_DESKTOP + this.removedCheatsHeight;
      this.closeButton.view.y = this.title.y;
    } else if (landscape) {
      this.title.y = this.ORIGINAL_HEADER_Y_LANDSCAPE + this.removedCheatsHeight;
      this.closeButton.view.y = this.title.y;
    }
    this.redrawBackgroundDesktopLandscape();
  }

  /** Restore cheats section to original state */
  public showCheatsCompact(): void {
    if (!this.cheatsCompactRemoved) return;
    this.cheatsCompactRemoved = false;
    this.removedCheatsHeight = 0;
    // Show visuals
    this.cheatsLabel.visible = true;
    this.cheatsButton.view.visible = true;
    if (this.dividers[0]) this.dividers[0].visible = true;
    // Restore header positions
    const landscape = isMobile.any && !isPortrait();
    if (!isMobile.any) {
      this.title.y = this.ORIGINAL_HEADER_Y_DESKTOP;
      this.closeButton.view.y = this.title.y;
    } else if (landscape) {
      this.title.y = this.ORIGINAL_HEADER_Y_LANDSCAPE;
      this.closeButton.view.y = this.title.y;
    }
    this.redrawBackgroundDesktopLandscape();
  }

  /** Hide turbo switch and compact lower area (pull music & sfx up, reduce bottom height) */
  public hideTurboCompact(): void {
    if (this.turboCompactRemoved) return;
    const turboEntry = this.switchContainers.find(sc => sc.key === "turboSpin");
    if (!turboEntry) return;
    this.turboCompactRemoved = true;
    // Hide turbo visuals
    turboEntry.container.visible = false;
    turboEntry.labelText.visible = false;
    this.updateSwitches(isMobile.any && isPortrait());
    this.redrawBackgroundDesktopLandscape();
  }

  /** Show turbo switch restoring original spacing */
  public showTurboCompact(): void {
    if (!this.turboCompactRemoved) return;
    const turboEntry = this.switchContainers.find(sc => sc.key === "turboSpin");
    if (!turboEntry) return;
    this.turboCompactRemoved = false;
    turboEntry.container.visible = true;
    turboEntry.labelText.visible = true;
    this.updateSwitches(isMobile.any && isPortrait());
    this.redrawBackgroundDesktopLandscape();
  }

  /** Redraw background & blur overlay for desktop/landscape considering top shrink */
  private redrawBackgroundDesktopLandscape() {
    const portrait = isMobile.any && isPortrait();
    if (portrait) return; // portrait layout handled elsewhere
    const landscape = isMobile.any && !isPortrait();
    const startX = landscape ? 25 : 15;
    // Shift top downward by removedCheatsHeight and trim same amount off height (bottom stays put)
    const startY = this.removedCheatsHeight;
    const bottomReduction = this.turboCompactRemoved ? this.TURBO_BLOCK_REMOVE : 0;
    const height = this.ORIGINAL_BG_HEIGHT - this.removedCheatsHeight - bottomReduction;
    const width = this.ORIGINAL_BG_WIDTH;
    const radius = 35;
    this.background.clear();
    this.background.fill({ color: 0x000000, alpha: 0.8 });
    this.background.roundRect(startX, startY, width, height, radius);
    this.background.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(startX, startY, width, height, radius);
    this.blurOverlay.fill();
    // Bottom pointer: if only cheats removed keep original; if turbo removed shorten
    if (this.turboCompactRemoved) {
      this.bottomPointer.y = startY + height;
    } else {
      this.bottomPointer.y = this.ORIGINAL_BG_HEIGHT;
    }
  }
  // updateSwitchIcons is now only needed if you want to update all toggles from code
  private updateSwitchIcons() {
    (
      Object.keys(this.switchButtons) as Array<
        "fastSpin" | "turboSpin" | "music" | "sfx"
      >
    ).forEach((key) => {
      const toggleContainer = this.switchButtons[key];
      if (!toggleContainer) return;

      const switchBarClosed = (toggleContainer as any).switchBarClosed;
      const switchBarOpen = (toggleContainer as any).switchBarOpen;
      const oIcon = (toggleContainer as any).oIcon;
      const isActive = this.switchStates[key];

      if (switchBarClosed && switchBarOpen) {
        gsap.to(switchBarClosed, {
          alpha: isActive ? 0 : 1,
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.to(switchBarOpen, {
          alpha: isActive ? 1 : 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }

      if (oIcon) {
        this.updateOIconTexture(oIcon, isActive);
      }
    });
  }

  // Yeni alpha-based animasyon metodu
  private animateSwitchBars(
    switchBarClosed: Sprite,
    switchBarOpen: Sprite,
    isActive: boolean
  ) {
    const duration = 0.3;
    const ease = "power2.out";

    if (isActive) {
      // Açık duruma geç: Kapalı bar kaybol, Açık bar görün
      gsap.to(switchBarClosed, {
        alpha: 0,
        duration,
        ease,
      });
      gsap.to(switchBarOpen, {
        alpha: 1,
        duration,
        ease,
      });
    } else {
      // Kapalı duruma geç: Açık bar kaybol, Kapalı bar görün
      gsap.to(switchBarOpen, {
        alpha: 0,
        duration,
        ease,
      });
      gsap.to(switchBarClosed, {
        alpha: 1,
        duration,
        ease,
      });
    }
  }

  private handleSwitchClick(
    key: "fastSpin" | "turboSpin" | "music" | "sfx",
    isActive: boolean
  ) {
    // Fast/Turbo spin için mutual exclusive logic
    if (key === "fastSpin" && isActive) {
      this.switchStates.turboSpin = false;
      // Turbo switch bar'ını da güncelle
      this.updateOtherSwitchBars("turboSpin", false);
    } else if (key === "turboSpin" && isActive) {
      this.switchStates.fastSpin = false;
      // Fast switch bar'ını da güncelle
      this.updateOtherSwitchBars("fastSpin", false);
    }

    // State'i callback öncesi kaydet
    const stateBeforeCallback = this.switchStates[key];

    // UIStates callback'lerini çağır
    if (key === "fastSpin" && isActive && this.onQuickSwitchChanged) {
      this.onQuickSwitchChanged();
    } else if (key === "turboSpin" && isActive && this.onTurboSwitchChanged) {
      this.onTurboSwitchChanged();
    } else if (key === "music" && this.onMusicSwitchChanged) {
      this.onMusicSwitchChanged();
    } else if (key === "sfx" && this.onSfxSwitchChanged) {
      this.onSfxSwitchChanged();
    }

    // State'i callback sonrası kontrol et
    const stateAfterCallback = this.switchStates[key];

    // Eğer callback state'i değiştirdiyse switch bar'ı tekrar güncelle
    if (stateBeforeCallback !== stateAfterCallback) {
      const switchContainer = (this.switchButtons as any)[key];
      if (switchContainer) {
        const switchBarClosed = (switchContainer as any).switchBarClosed;
        const switchBarOpen = (switchContainer as any).switchBarOpen;
        const oIcon = (switchContainer as any).oIcon;

        // Alpha animasyonu ile güncelle
        if (switchBarClosed && switchBarOpen) {
          this.animateSwitchBars(
            switchBarClosed,
            switchBarOpen,
            stateAfterCallback
          );
        }

        if (oIcon) {
          this.updateOIconTexture(oIcon, stateAfterCallback);
        }
      }
    }
  }
  private updateOtherSwitchBars(
    key: "fastSpin" | "turboSpin",
    isActive: boolean
  ) {
    // Diğer switch'in bar'ını da güncelle
    const switchContainer = (this.switchButtons as any)[key];
    if (switchContainer) {
      const switchBarClosed = (switchContainer as any).switchBarClosed;
      const switchBarOpen = (switchContainer as any).switchBarOpen;
      const oIcon = (switchContainer as any).oIcon;

      // Alpha animasyonu ile güncelle
      if (switchBarClosed && switchBarOpen) {
        this.animateSwitchBars(switchBarClosed, switchBarOpen, isActive);
      }

      // O icon'unu da güncelle
      if (oIcon) {
        this.updateOIconTexture(oIcon, isActive);
      }
    }
  }

  // O icon tekstürünü state'e göre güncelle
  private updateOIconTexture(oIcon: Sprite, isActive: boolean) {
    if (isActive) {
      // Aktif durumda beyaz O
      oIcon.texture = Assets.get("style20white.png");
    } else {
      // Pasif durumda dark O
      oIcon.texture = Assets.get("style20dark.png");
    }
  }
  public resize(desiredWidth: number, desiredHeight: number) {
    if (isMobile.any && isPortrait()) {
      this.applyMobilePortraitLayout(desiredWidth, desiredHeight);
    } else if (isMobile.any && !isPortrait()) {
      this.applyMobileLandscapeLayout();
    } else {
      this.applyDesktopLayout();
    }
  }

  private applyMobilePortraitLayout(desiredWidth: number, desiredHeight: number) {
    this.bottomPointer.visible = false; // portrait'ta gösterme
    desiredWidth = isMobile.tablet ? (desiredWidth / 1.25) : (desiredWidth / 2.1);
    this.scale.set(2.1);
    this.background.clear();
    this.background.fill({ color: 0x000000, alpha: 0.8 });
    const removed = this.cheatsCompactRemoved ? this.removedCheatsHeight : 0;
    const bottomReduction = this.turboCompactRemoved ? this.TURBO_BLOCK_REMOVE : 0;
    // Shift top by removed and shrink height by total removed (cheats top + turbo bottom)
    const bgTop = -35 + removed;
    const baseHeight = (desiredHeight / 3.88);
    const bgHeight = baseHeight - removed - bottomReduction + 35;
    this.background.roundRect(-500, bgTop, desiredWidth + 1500, bgHeight, 0);
    this.background.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(-500, bgTop, desiredWidth + 1500, bgHeight, 0);
    this.blurOverlay.fill();

    let baseY = -desiredHeight / 2 - 100;
    if (this.turboCompactRemoved) {
      baseY += this.TURBO_BLOCK_REMOVE + 72; // move panel down when turbo removed
    }


    this.position.set(isMobile.tablet ? -345 : 0, baseY);
    this.title.anchor.set(0, 0);
    this.title.x = 35;
    this.title.y = 15 + removed; // push header down
    this.closeButton.view.x = desiredWidth - 65;
    this.closeButton.view.y = 15 + removed;
    this.updateDividers(desiredWidth - 70, 35);
    this.cheatsLabel.x = 35;
    this.cheatsLabel.anchor.set(0, 0);
    this.homeLabel.x = 35;
    this.homeLabel.anchor.set(0, 0);
    this.homeButton.view.x = this.homeLabel.width + 55;
    this.historyLabel.x = 35;
    this.historyLabel.anchor.set(0, 0);
    this.historyButton.view.x = this.historyLabel.width + 55;
    this.updateSwitches(true);

  }

  private applyMobileLandscapeLayout() {
    this.bottomPointer.visible = true; 
    this.scale.set(1.3);
    // Base position
    let baseY = -680;
    if (this.turboCompactRemoved) {
      // Shift panel downward by the removed turbo block to balance vertical placement
      baseY += this.TURBO_BLOCK_REMOVE;
    }
    this.position.set( isMobile.tablet ? 0 : -25, baseY);
    this.background.clear();
    this.background.fill({ color: 0x000000, alpha: 0.8 });
    // If compact cheats removed shift top and reduce internal height (keep bottom)
    const startY = this.cheatsCompactRemoved ? this.removedCheatsHeight : 0;
    const bottomReduction = this.turboCompactRemoved ? this.TURBO_BLOCK_REMOVE : 0;
    const height = 519 - (this.cheatsCompactRemoved ? this.removedCheatsHeight : 0) - bottomReduction;
    this.background.roundRect(10, startY, 306, height, 35);
    this.background.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(10, startY, 306, height, 35);
    // Adjust bottom pointer (shorten only if turbo hidden)
    if (this.turboCompactRemoved) {
      this.bottomPointer.y = startY + height;
    } else {
      this.bottomPointer.y = this.cheatsCompactRemoved ? height + startY : 519;
    }
    this.blurOverlay.fill();
    this.title.anchor.set(0, 0);
    this.title.x = 54;
    this.title.y = (this.cheatsCompactRemoved ? this.ORIGINAL_HEADER_Y_LANDSCAPE + this.removedCheatsHeight : 32);

    this.closeButton.view.x = 306 - 44;
    this.closeButton.view.y = this.title.y;
    this.updateDividers(306 - 64, 50);
    this.cheatsLabel.x = 242;
    this.cheatsLabel.anchor.set(1, 0);
    // Place buttons first, then labels relative to them (order fix for orientation switch)
    this.homeButton.view.x = 306 - 44;
    this.homeButton.view.y = 140; // ensure reset
    this.historyButton.view.x = 306 - 45;
    this.historyButton.view.y = 202; // ensure reset
    // Now labels
    this.homeLabel.anchor.set(1, 0);
    this.homeLabel.x = this.homeButton.view.x - 20;
    this.homeLabel.y = 150;
    this.historyLabel.anchor.set(1, 0);
    this.historyLabel.x = this.historyButton.view.x - 20;
    this.historyLabel.y = 210;
    this.updateSwitches(false);
  }

  private applyDesktopLayout() {
    this.scale.set(1.2);
    let baseY = -620;
    if (this.turboCompactRemoved) {
      baseY += this.TURBO_BLOCK_REMOVE; // move panel down when turbo removed
    }
    this.position.set(0, baseY);
    this.background.clear();
    this.background.fill({ color: 0x000000, alpha: 0.8 });
    const startY = this.cheatsCompactRemoved ? this.removedCheatsHeight : 0;
    const bottomReduction = this.turboCompactRemoved ? this.TURBO_BLOCK_REMOVE : 0;
    const height = 519 - (this.cheatsCompactRemoved ? this.removedCheatsHeight : 0) - bottomReduction;
    this.background.roundRect(15, startY, 306, height, 35);
    this.background.fill();
    this.blurOverlay.clear();
    this.blurOverlay.fill({ color: 0x000000, alpha: 0.1 });
    this.blurOverlay.roundRect(15, startY, 306, height, 35);
    if (this.turboCompactRemoved) {
      this.bottomPointer.y = startY + height;
    } else {
      this.bottomPointer.y = this.cheatsCompactRemoved ? startY + height : 519;
    }
    this.blurOverlay.fill();
    this.title.anchor.set(0, 0);
    this.title.x = 54;
    this.title.y = (this.cheatsCompactRemoved ? this.ORIGINAL_HEADER_Y_DESKTOP + this.removedCheatsHeight : 42);
    this.closeButton.view.x = 276;
    this.closeButton.view.y = this.title.y;
    this.updateDividers(306 - 64, 50);
    this.cheatsLabel.x = 242;
    this.cheatsLabel.anchor.set(1, 0);
    // Buttons first
    this.homeButton.view.x = 306 - 44;
    this.homeButton.view.y = 140;
    this.historyButton.view.x = 306 - 45;
    this.historyButton.view.y = 202;
    // Labels after buttons (anchor reset)
    this.homeLabel.anchor.set(1, 0);
    this.homeLabel.x = this.homeButton.view.x - 20;
    this.homeLabel.y = 150;
    this.historyLabel.anchor.set(1, 0);
    this.historyLabel.x = this.historyButton.view.x - 20;
    this.historyLabel.y = 210;
    this.updateSwitches(false);
  }

  private updateDividers(width: number, x: number) {
    // Divider Y pozisyonları - orijinal değerler
    const dividerYPositions = [80, 130, 190, 250];

    this.dividers.forEach((divider, index) => {
      if (divider && index < dividerYPositions.length) {
        divider.clear();
        const y = dividerYPositions[index];
        divider.moveTo(x, y);
        divider.lineTo(x + width, y).stroke({ color: 0xffffff, alpha: 0.6 });
      }
    });
  }

  private updateSwitches(isPortrait: boolean) {
    if (isPortrait) {
      // Portrait: sequence visible switches only
      const visible = this.switchContainers.filter(sc => !(this.turboCompactRemoved && sc.key === 'turboSpin'));
      visible.forEach((switchData, index) => {
        const TOP_PADDING = 285; // first label base (original first label ~275)
        const VERTICAL_SPACING = 70;
        const LEFT_PADDING = 35;
        switchData.labelText.x = LEFT_PADDING;
        switchData.labelText.y = TOP_PADDING + (index * VERTICAL_SPACING);
        switchData.labelText.anchor.set(0, 0);
        switchData.container.x = isMobile.tablet ? 465 : 125;
        switchData.container.scale.set(1.2);
        // Align container vertically with label using scale-aware formula
        const scale = switchData.container.scale.y;
        const originalLabelY = switchData.originalY + 5; // baseline
        const deltaLabel = switchData.labelText.y - originalLabelY; // shift applied to label
        // Original alignment gap: labelY = originalLabelY, background child at (originalY-10)
        // container.y formula keeps (container.y + (originalY-10)*scale) + 15*scale = labelY
        // Simplifies to container.y = (1 - scale)*originalLabelY + deltaLabel
        switchData.container.y = (1 - scale) * originalLabelY + deltaLabel;
      });
    } else {
      const turboEntry = this.switchContainers.find(sc => sc.key === 'turboSpin');
      this.switchContainers.forEach((switchData) => {
        if (this.turboCompactRemoved && switchData.key === 'turboSpin') return; // hidden
        const shiftUp = (this.turboCompactRemoved && turboEntry && switchData.originalY > turboEntry.originalY) ? this.TURBO_BLOCK_REMOVE : 0;
        switchData.labelText.x = 175 - 16;
        switchData.labelText.y = switchData.originalY + 5 - shiftUp;
        switchData.labelText.anchor.set(1, 0);
        switchData.labelText.scale.set(1);
        switchData.container.x = 0;
        switchData.container.scale.set(1);
        const scale = switchData.container.scale.y;
        const originalLabelY = switchData.originalY + 5;
        const deltaLabel = switchData.labelText.y - originalLabelY; // negative if moving up
        switchData.container.y = (1 - scale) * originalLabelY + deltaLabel; // scale-aware
      });
    }
  }

}
