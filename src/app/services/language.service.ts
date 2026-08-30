import { Injectable, signal, computed } from '@angular/core';
import { AppLang, TRANSLATIONS } from '../i18n/translations';

const STORAGE_KEY = 'among-bugs-lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<AppLang>(this.readInitial());

  readonly acceptLanguage = computed(() => this.lang());

  setLang(lang: AppLang): void {
    this.lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  toggle(): void {
    this.setLang(this.lang() === 'es-MX' ? 'en' : 'es-MX');
  }

  t(key: string, ...args: Array<string | number>): string {
    const dict = TRANSLATIONS[this.lang()] || TRANSLATIONS['es-MX'];
    let text = dict[key] ?? TRANSLATIONS['es-MX'][key] ?? key;
    args.forEach((arg, i) => {
      text = text.replace(`{${i}}`, String(arg));
    });
    return text;
  }

  private readInitial(): AppLang {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es-MX') {
      return saved;
    }
    const browser = navigator.language?.toLowerCase() || 'es';
    return browser.startsWith('en') ? 'en' : 'es-MX';
  }
}
