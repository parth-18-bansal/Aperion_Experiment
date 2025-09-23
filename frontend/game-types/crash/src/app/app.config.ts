import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
// import { provideRouter } from '@angular/router';
// import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

import {provideTranslateService, provideTranslateLoader} from "@ngx-translate/core";
import {provideTranslateHttpLoader} from "@ngx-translate/http-loader";
import { environment } from '../environments/environment';
import { registerLocaleData } from '@angular/common';
import localeTr from '@angular/common/locales/tr';
import localeEn from '@angular/common/locales/en';

registerLocaleData(localeTr, 'tr');
registerLocaleData(localeEn, 'en');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // provideRouter(routes),
    provideHttpClient(), // Add this line
    
    { provide: 'environment', useValue: environment },
    {
      provide: LOCALE_ID,
      useValue: navigator.language.split('-')[0] || 'en'
    },

    // ngx-translate provider'larını buraya ekleyin
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json'
      }),
    })
  ],
};
