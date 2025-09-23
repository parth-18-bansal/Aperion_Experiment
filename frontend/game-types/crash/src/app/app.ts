import { Component, inject, signal, OnInit, OnDestroy, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CrashGameContext,
  CrashGameConfig,
  IProviderInfo,
  ProviderNames,
  CrashGameUIConfig,
} from './crash/interfaces';
import { SplashComponent } from './screens/splash-screen/splash.component';
import { LoadingComponent } from './screens/loading-screen/loading.component';
import { GameComponent } from './screens/game-screen/game.component';
import { MaintenanceComponent } from './screens/maintenance-screen/maintenance.component';
import { ConnectionErrorComponent } from './screens/connection-error-screen/connection-error.component';
import { SocketFactory } from './services/socket-factory';
import { providers } from './providers';
import { AssetLoaderService } from './services/asset-loader.service';
import { HttpClient } from '@angular/common/http';
import { Logger } from './utils/Logger';
import { StateMachineService } from './services/state-machine.service';
import { ImagePreloadService } from './services/image-preload.service';
import {
    TranslateService,
    TranslatePipe,
    TranslateDirective
} from "@ngx-translate/core";
import { environment } from '../environments/environment';
import { CrashApiService } from './services/crash-api.service';
import { OrientationWarningComponent } from './components/orientation-warning/orientation-warning.component';
import { PageLoadingService } from './services/page-loader.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    SplashComponent,
    LoadingComponent,
    GameComponent,
    MaintenanceComponent,
    ConnectionErrorComponent,
    OrientationWarningComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private provider!           : IProviderInfo;
  private translate           = inject(TranslateService);
  readonly context            = signal<CrashGameContext | null>(null);
  private uiConfig!           : CrashGameUIConfig;
  private gameConfig!         : CrashGameConfig;

  constructor(
    private socketFactory       : SocketFactory,
    private http                : HttpClient,
    private assetLoader         : AssetLoaderService,
    private pageLoadingService  : PageLoadingService,
    private stateMachine        : StateMachineService,
    private apiService          : CrashApiService,
    private imageService        : ImagePreloadService
  ) {
      this.translate.addLangs(['tr', 'en']);
      this.translate.setFallbackLang('tr');
      const browserLang = this.translate.getBrowserLang();
      this.translate.use(browserLang || 'tr');
  }

  // Development  > Localhost, CDN
  // Stage        > Client (jojobet, freeToPlay)
  // Production   > Client (jojobet, betsson, ...)

  // prod | stage | dev | local

  async ngOnInit() {
    if (isDevMode()) Logger.enable();
    else Logger.disable();

    Logger.warn(environment, isDevMode());

    // Oyun ilk önce setup provider'ını ayarlar.
    this.setupProviderInfo();
    this.disableZoomAndContextMenu();

    if (!this.provider.token) {
      if (environment.local || environment.dev || environment.demo) { // TODO
        await this.getTestToken();
        Logger.warn('Provider token is missing. Trying to fetch a test token from EM...');
        Logger.log('Provider info:', this.provider);
      } else {
        console.warn('Provider token is missing. In production, pass the token via launcher URL.');
      }
    }

    await this.getUIConfig();
    await this.getGameConfig();

    this.stateMachine.createActor({
      input: {
        gameConf            : this.gameConfig,
        providerInfo        : this.provider,
        uiConf              : this.uiConfig,
        socketFactory       : this.socketFactory,
        assetLoader         : this.assetLoader,
        pageLoadingService  : this.pageLoadingService,
        apiService          : this.apiService,
        imageService        : this.imageService,
      },
    });
    this.stateMachine.state$.subscribe((state) => {
      this.context.set(state.context);
      //Logger.log('State changed:', state.value, state.context);
    });
  }

  private getTestToken(): Promise<{ LaunchURL: string }> {
    return new Promise((resolve, reject) => {
      this.http
        .post(
          'https://em-api.aperion.dev/createLaunchURL',
          {
            GameId: this.provider.gameId || '',
            Currency: environment.demo ? 'DMO' : this.provider.currency || 'USD',
            Balance: 100000,
          },
          {
            headers: { 'Content-type': 'application/json' },
          }
        )
        .subscribe({
          next: (config) => {
            Logger.log('Test token received:', config);
            this.setupProviderInfo((config as { LaunchURL: string }).LaunchURL);
            resolve(config as { LaunchURL: string });
          },
          error: (error) => {
            reject(error);
          },
        });
    });
  }

  getUIConfig(): Promise<CrashGameUIConfig> {
    return new Promise((resolve, reject) => {
      this.http
        .get<CrashGameUIConfig>(`./ui-config${isDevMode() ? '-local' : '-deploy'}.json`)
        .subscribe({
          next: (config) => {
            this.uiConfig = JSON.parse(
              JSON.stringify(config).replace(
                'domainplaceholder.com',
                this.provider.domain || 'aperion.dev'
              )
            );
            resolve(config);
          },
          error: (error) => {
            reject(error);
          },
        });
    });
  }

  getGameConfig(): Promise<CrashGameConfig> {
    return new Promise((resolve, reject) => {
      this.http
        .get<CrashGameConfig>(

          /*
          `${this.uiConfig.gamePath}/${this.provider.gameId}/${
            isDevMode() ? 'public' : 'dist'
          }/game-config.json`

          ${this.provider.gameId} -> Kaldırıldı
          public -> kaldırıldı
          */

          `${this.uiConfig.gamePath}/${
            isDevMode() ? '' : 'dist'
          }/game-config.json`
        )
        .subscribe({
          next: (config) => {
            this.gameConfig = JSON.parse(
              JSON.stringify(config).replace(
                'domainplaceholder.com',
                this.provider.domain || 'aperion.dev'
              )
            );
            if (this.gameConfig.assets) {
              this.gameConfig.assets.styles =
                this.gameConfig.assets.styles?.map((style) => {
                  /*
                  return style.includes('http') || style.includes('https')
                    ? style
                    : `${this.uiConfig.gamePath}/${this.provider.gameId}/${style}`;

                    this.provider.gameId -> Kaldırıldı
                    isDevMode() ? '' : 'dist'    -> Eklendi
                  */

                    return style.includes('http') || style.includes('https')
                    ? style
                    : `${this.uiConfig.gamePath}/${
                      isDevMode() ? '' : 'dist'
                    }/${style}`;
                });

              this.gameConfig.assets.scripts =
                this.gameConfig.assets.scripts?.map((script) => {
                  /*
                  return script.includes('http') || script.includes('https')
                    ? script
                    : `${this.uiConfig.gamePath}/${this.provider.gameId}/${script}`;

                    this.provider.gameId         -> Kaldırıldı
                    isDevMode() ? '' : 'dist'    -> Eklendi
                  */


                  return script.includes('http') || script.includes('https')
                   ? script
                   : `${this.uiConfig.gamePath}/${
                    isDevMode() ? '' : 'dist'
                  }/${script}`;
                });
            }
            resolve(config);
          },
          error: (error) => {
            reject(error);
          },
        });
    });
  }

  private setupProviderInfo(url = window.location.search) {

    // parametreleri setliyoruz, URL kısmına yazılan parametreler.
    const params = this.toSearchParams(url);
    let domain = 'aperion.dev';

    // Eğer development moda değil isem, tokend parametre değerini arıyoruz. (bunu domain değiştiği için yaptık.)
    if (!isDevMode()) {
      const tokend = params.get('tokend');
      try {
        domain = tokend // TODO: Implement token decoding
          ? window.atob(tokend)
          : window.location.hostname.split('.').slice(-2).join('.');
      } catch {
        domain = window.location.hostname.split('.').slice(-2).join('.');
      }
    }

    // Eğer ekstra farklı bir provider parametresi var ise bunuda arıyoruz | default olarak everymatrix gelicek.
    let providerName = (params.get('provider') as ProviderNames) || 'everymatrix';
    if (!providers[providerName]) { providerName = 'everymatrix'; }
    const provider = providers[providerName];
    if (provider) {
      // clientId = 1990 is for Jojobet. In development we show us as jojobet client for jackpot testing
      // this.provider = isDevMode() ? { ...provider(url), domain, clientId:'1990' } : { ...provider(url), domain }
      this.provider = { ...provider(url), domain }
    } else {
      this.provider = {
        id          : 'test',
        name        : 'test provider',
        gameId      : '',
        description : 'This provider is a test provider',
        currency    : 'USD',
        mode        : 'local',
        freePlay    : true,
        token       : '',
        clientId    : '9', // Optional client ID for the provider
        language    : navigator.language.split('-')[0] || 'en',
        lobbyUrl    : '',
        cashierUrl  : '',
        logoUrl     : '',
        mobile      : false,
        domain,
      };
    }
  }

  // URL veya query string'i güvenli parse eden yardımcı
  private toSearchParams(input: string): URLSearchParams {
    try {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        return new URL(input).searchParams;
      }
      if (!input || input.startsWith('?') || input.includes('=')) {
        return new URLSearchParams(input || window.location.search);
      }
      return new URL(input, window.location.origin).searchParams;
    } catch {
      return new URLSearchParams();
    }
  }

  ngOnDestroy() {
    // StateMachineService kendi kendini imha edecektir.
  }

  private disableZoomAndContextMenu() {
    window.addEventListener('dragstart', (e) => {
      e.preventDefault()
    })

    document.addEventListener('dblclick', function (e) {
      e.preventDefault();
    }, { passive: false });
 
    // Prevent pinch zoom
    document.addEventListener('touchstart', (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });

    // Prevent double-tap zoom
    // let lastTouchEnd = 0;
    // document.addEventListener('touchend', (event: TouchEvent) => {
    //   const now = Date.now();
    //   if (now - lastTouchEnd <= 300) {
    //     event.preventDefault();
    //   }
    //   lastTouchEnd = now;
    // }, { passive: false });

    // Prevent double-finger gestures (pinch) on gesturestart
    document.addEventListener('gesturestart', (event: Event) => {
      event.preventDefault();
    });

    // Disable right-click / context menu
    document.addEventListener('contextmenu', (event: Event) => {
      event.preventDefault();
    });

    document.addEventListener('selectstart', (event: Event) => {
      event.preventDefault();
    });
  }

}
