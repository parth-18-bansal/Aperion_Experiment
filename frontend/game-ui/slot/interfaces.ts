export interface SlotUIOptions {
    /** The width of the slot UI */
    width: number;
    /** The height of the slot UI */
    height: number;
    /** Device type */
    deviceType: 'desktop' | 'mobile';
    /** Top Header Options */
    topHeader?: TopHeaderOptions;
}

export interface TopHeaderOptions {
    /** The width of the top header */
    width: number;
    /** The height of the top header */
    height: number;
    /** The font size for the clock text */
    clockFontSize?: number;
    /** The font size for the company text */
    companyFontSize?: number;
    /** Padding from the top */
    topPadding?: number;
}


export interface AutoPlayButtonOptions {
    onToggle?: (active: boolean) => void;
    initialActive?: boolean;
}

// Autoplay ayarları için interface
interface AutoplaySettings {
    count: number; // Otomatik spin sayısı
    winLimit: number | null; // Kazanma limiti (null limitsiz demek)
    lossLimit: number | null; // Kayıp limiti (null limitsiz demek)
    stopOnFeature: boolean; // Feature tetiklendiğinde durdurulsun mu? (Şimdilik kullanılmayacak ama opsiyonel)
}