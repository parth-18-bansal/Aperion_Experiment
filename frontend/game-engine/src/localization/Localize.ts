export class Localize {

  private translations: Record<string, string | number> = {};
  private currentLang: string = "";

  /**
   * Initialize the localization system with the default language and translations object.
   *
   * @param {string} lang - The default language to be used. Example "en"
   * @param translation - The new translation object to be added.
 */
  async init(lang: string, translation: any) {
    this.translations = translation;
    this.currentLang = lang;
  }

  /**
   * Translate a key using the current language's translations.
   *
   * @param {string} key - The key to be translated. Example "game.winMessage"
   * @param vars - The variables to be replaced in the translation string. Example { player: "Ankur", amount: "20" }.
   * Not required if the translation string does not contain any variables.
   * @returns {string} - The translated string with variables replaced.
 */
  t(key: string, vars: Record<string, string | number> = {}): string {
    const keys = key.split(".");

    let result: any = this.translations;

    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) return key;
    }

    if (typeof result === "string") {
      return result.replace(
        /{{(.*?)}}/g,
        (_, varName) => `${vars[varName] ?? ""}`
      );
    }

    return key;
  }

  /**
 * Adds a new translation by merging it with the existing translations.
 *
 * @param translation - The new translation object to be added.
 */
  addTranslation(translation: any) {
    this.translations = {
      ...this.translations,
      ...translation,
    };
  }

  // If we need to change language in runtime
  // async setLang(lang: string, translation: any) {
  //   await this.init(lang, translation);
  // }

  getCurrentLang(): string {
    return this.currentLang;
  }
}
