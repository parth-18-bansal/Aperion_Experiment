/**
 * Oyun canvas'ının ekrana optimal şekilde sığdırılması için resize hesaplama fonksiyonu
 *
 * Amaç:
 * - Aspect ratio'yu koruyarak ekrana maksimum boyutta yayılma
 * - Minimum boyut kısıtlamalarına uyma
 * - Canvas'ı ekranın tam ortasında konumlandırma
 * - Siyah bantları minimize etme
 *
 * @param availWidth - Mevcut ekran genişliği (px)
 * @param availHeight - Mevcut ekran yüksekliği (px)
 * @param gameWidth - Oyunun tasarım genişliği (px)
 * @param gameHeight - Oyunun tasarım yüksekliği (px)
 * @param minWidth - Canvas için minimum genişlik (px)
 * @param minHeight - Canvas için minimum yükseklik (px)
 * @returns Hesaplanan pozisyon, boyut ve scale değerleri
 *
 * Örnek kullanım:
 * ```
 * // 1920x1080 oyun, 1366x768 ekran, min 800x600
 * const result = resize(1366, 768, 1920, 1080, 800, 600);
 * // result: { x: 0, y: 0, width: 1366, height: 768, scale: 0.711 }
 * ```
 */
export function resize(
  availWidth: number,
  availHeight: number,
  gameWidth: number,
  gameHeight: number,
  minWidth: number,
  minHeight: number,
  align: number | { x?: number; y?: number } = 0.5,
  scaleMode: "contain" | "cover" | "stretch" = "contain"
): ResizeResult {
  // Oyunun orijinal aspect ratio'su
  const gameAspectRatio = gameWidth / gameHeight;
  // Mevcut ekranın aspect ratio'su
  const screenAspectRatio = availWidth / availHeight;

  const alignX = typeof align === "number" ? align : align.x ?? 0.5;
  const alignY = typeof align === "number" ? align : align.y ?? 0.5;

  let width = 0;
  let height = 0;

  if (scaleMode === "stretch") {
    // Aspect ratio korunmaz, doğrudan tüm alanı kapla
    width = availWidth;
    height = availHeight;
  } else if (scaleMode === "cover") {
    // Siyah bantları kaldırmak için ekranı tamamen kapla (gerekirse kırp)
    const scale = Math.max(availWidth / gameWidth, availHeight / gameHeight);
    // Minimum boyutları da gözet
    const minScale = Math.max(minWidth / gameWidth, minHeight / gameHeight, 0);
    const finalScale = Math.max(scale, minScale);
    width = gameWidth * finalScale;
    height = gameHeight * finalScale;
    // cover modunda genişlik/ yükseklik ekrandan büyük olabilir; hizalama ile ortalanır (negatif marginlar oluşabilir)
  } else {
    // contain (mevcut davranış): ekran içine sığdır, aspect koru
    // Aspect ratio korumalı scaling hesaplama
    if (gameAspectRatio > screenAspectRatio) {
      // Oyun daha geniş - genişliği ekrana sığdır
      width = availWidth;
      height = width / gameAspectRatio;

      // Minimum yükseklik kontrolü
      if (height < minHeight) {
        height = minHeight;
        width = height * gameAspectRatio;
      }
    } else {
      // Oyun daha uzun veya eşit - yüksekliği ekrana sığdır
      height = availHeight;
      width = height * gameAspectRatio;

      // Minimum genişlik kontrolü
      if (width < minWidth) {
        width = minWidth;
        height = width / gameAspectRatio;
      }
    }

    // Eğer hesaplanan boyutlar ekranı aşıyorsa, tekrar scale et
    if (width > availWidth) {
      const scaleDown = availWidth / width;
      width = availWidth;
      height = height * scaleDown;
    }

    if (height > availHeight) {
      const scaleDown = availHeight / height;
      height = availHeight;
      width = width * scaleDown;
    }
  }

  // Canvas'ı ekranın ortasına konumlandır
  const x = Math.round((availWidth - width) * alignX);
  const y = Math.round((availHeight - height) * alignY);

  // Scale faktörünü hesapla (oyun içindeki elementler için)
  const scale =
    scaleMode === "stretch"
      ? Math.max(width / gameWidth, height / gameHeight)
      : scaleMode === "cover"
      ? Math.max(width / gameWidth, height / gameHeight)
      : Math.min(width / gameWidth, height / gameHeight);

  // Boyutları tam sayıya yuvarla (pixel perfect rendering için)
  width = Math.round(width);
  height = Math.round(height);

  return { x, y, scale, width, height };
}

/**
 * Resize fonksiyonunun döndürdüğü değerlerin türü
 */
export interface ResizeResult {
  /** Canvas'ın ekrandaki X pozisyonu (soldan mesafe) */
  x: number;
  /** Canvas'ın ekrandaki Y pozisyonu (üstten mesafe) */
  y: number;
  /** Oyun elementleri için scale faktörü */
  scale: number;
  /** Canvas'ın hesaplanan genişliği */
  width: number;
  /** Canvas'ın hesaplanan yüksekliği */
  height: number;
}
