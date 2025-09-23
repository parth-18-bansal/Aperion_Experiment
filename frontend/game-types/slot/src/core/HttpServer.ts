import { Engine, Logger } from "game-engine";
import {
  IProviderInfo,
  IServer,
  ProviderNames,
  ServerData,
  ServerOptions,
} from "../interfaces";
import { isMobile } from "pixi.js";
import { providers } from "../";

export class HttpServer implements IServer {
  // IServer arayüzünü implemente et
  url: string = "";
  sessionId: string = "";
  response: any = null;
  provider!: IProviderInfo; // Provider information
  domain: string = "";
  device!: "desktop" | "mobile" | "tablet"; // Default device type // Default device type
  readonly gameType: string = "slot"; // Default game type
  replayHistoryResponse: any = null; // Replay history data
  replayResponseIndex: number = 0; // Index for replay history data
  constructor(options?: ServerOptions) {
    if (!options) {
      options = {} as ServerOptions;
    }
    this.device = isMobile.tablet
      ? "tablet"
      : isMobile.any
      ? "mobile"
      : "desktop";
    this.injectProviderInfo(window.location.search);
    const url = (options.url || "")
      .replace("http://", "")
      .replace("https://", "");
    this.url = `${options.protocol || "https"}://${url}`.replace(
      "domainplaceholder.com",
      this.domain
    );
  }
  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.provider.token && this.provider.gameplayMode !== "replay") {
        this.getToken()
          .then((token) => {
            this.injectProviderInfo(token.LaunchURL);
            if (!this.provider.token) {
              throw new Error("Token not found in LaunchURL");
            }
            this.login()
              .then((res) => {
                Logger.log("Login successful with provided token");
                resolve(res);
              })
              .catch((error) => {
                Logger.error("Login failed with provided token:", error);
                reject(error);
              });
          })
          .catch((error) => {
            Logger.error("Error fetching token:", error);
          });
      } else if (this.provider.gameplayMode === "replay" && this.provider.historyDetailId !== "") {
        Logger.log("Using provided id:", this.provider.id);
        this.injectProviderInfo(window.location.search);
        this.replay()
          .then((res) => {
            Logger.log("Fetch history details successful with provided id");
            resolve(res);
          })
          .catch((error) => {
            Logger.error("Fetch history details failed with provided id:", error);
            reject(error);
          });
      } else {
        Logger.log("Using provided token:", this.provider.token);
        this.injectProviderInfo(window.location.search);
        this.login()
          .then((res) => {
            Logger.log("Login successful with provided token");
            resolve(res);
          })
          .catch((error) => {
            Logger.error("Login failed with provided token:", error);
            reject(error);
          });
      }
    });
  }
  private setDomain(url: string) {
    const params = new URLSearchParams(url);
    const tokend = params.get("tokend");
    this.domain = tokend
      ? window.atob(tokend)
      : window.location.origin.split(".").slice(-2).join(".");

    const game = Engine.getEngine();
    if (this.domain.includes("localhost") || (game && game.options?.debug)) {
      this.domain = "aperion.dev";
    }
    this.url = this.url.replace("domainplaceholder.com", this.domain);
  }
  private injectProviderInfo(url: string) {
    const params = new URLSearchParams(url);
    this.setDomain(url);
    let providerName: ProviderNames =
      (params.get("provider") as ProviderNames) || "everymatrix";
    if (!providerName) {
      Logger.warn(
        `Provider not specified in URL, using default "everymatrix".`
      );
      providerName = "everymatrix";
    }
    if (!providers[providerName]) {
      Logger.warn(
        `Provider "${providerName}" not found, using default "everymatrix".`
      );
      providerName = "everymatrix";
    }
    const provider = providers[providerName] || providers.everymatrix;
    if (provider) {
      this.provider = provider(url);
    } else {
      this.provider = {
        id: "test", // Unique identifier for the provider
        name: "test provider", // Display name of the provider
        gameId: "", // Unique identifier for the game instance
        lobbyUrl: "", // Optional URL to the provider's lobby
        logoUrl: "", // Optional URL to the provider's logo
        description: "This provider is a test provider", // Optional description of the provider
        currency: "USD", // Optional currency used by the provider
        gameplayMode: "fun", // Gameplay mode supported by the provider
        token: "",
        clientId: "9", // Optional client ID for the provider
      };
    }
    if (params.get("uiMode") === "replay") {
      //but if page have iframes, you may use: window.top.document.title
      document.title = "Replay: Golden Anubis - Aperion Gaming";
      this.provider.gameplayMode = "replay";
      // this.provider.historyDetailType = params.get("historyDetailType") || "base";
      // this.provider.historyDetailId = params.get("historyDetailId") || "";
      this.provider.historyDetailType = params.get("type") || "base";
      this.provider.historyDetailId = params.get("id") || "";
    } else {
      document.title = "Play: Golden Anubis - Aperion Gaming";
    }
  }
  private replay(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.replayDetails()
        .then((response) => {
          Logger.log("Replay history successful:", response);
          this.sessionId = response.sessionId || "";
          this.replayHistoryResponse = response.spins || null;
          this.response = response.spins[0] || null;
          resolve(response.spins[0]);
        })
        .catch((error) => {
          Logger.error("Replay history failed:", error);
          reject(error);
        });
    });
  }
  private login(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.auth()
        .then((response) => {
          Logger.log("Authentication successful:", response);
          this.sessionId = response.sessionId || "";
          this.response = response.init || null;
          resolve(response.init);
        })
        .catch((error) => {
          Logger.error("Authentication failed:", error);
          reject(error);
        });
    });
  }
  getToken(): Promise<{ LaunchURL: string }> {
    return new Promise((resolve, reject) => {
      fetch(
        // this link is for the new backend
        //`https://em-api.${this.domain}/api/${this.provider.id}/createLaunchURL`,
        `https://em-api.aperion.dev/createLaunchURL`,
        {
          headers: { "Content-type": "application/json" },
          method: "POST",
          body: JSON.stringify({
            GameId: this.provider.gameId || "",
            Currency: this.provider.currency || "USD",
            Balance: 100000,
            TesterToken: this.provider.testerToken,
          }),
        }
      )
        .then((response) => {
          if (!response.ok) {
            reject(new Error(`HTTP error! status: ${response.status}`));
          }
          resolve(response.json());
        })
        .catch((error) => {
          Logger.error("Fetch error:", error);
        });
    });
  }
  replayDetails(): Promise<{ sessionId: string; spins: any }> {
    const data: any = {
      token: this.provider.token, // Use the token from the provider
      siteId: this.provider.clientId, // Set site ID
      clientId: this.provider.clientId, // Set client ID
      currency: this.provider.currency || "USD", // Set currency, default to USD
      device: this.device, // Set device type
    };
    return new Promise((resolve, reject) => {
      fetch(
        // this link is for the new backend
        `${this.url}/${this.gameType}/${this.provider.gameId}/details/${this.provider.historyDetailType}/${this.provider.historyDetailId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: data ? JSON.stringify(data) : undefined,
        }
      )
        .then((response) => {
          if (!response.ok) {
            reject(new Error(`HTTP error! status: ${response.status}`));
          }
          resolve(response.json());
        })
        .catch((error) => {
          Logger.error("Fetch error:", error);
        });
    });
  }
  auth(): Promise<{ sessionId: string; init: any }> {
    const data: any = {
      token: this.provider.token, // Use the token from the provider
      siteId: this.provider.clientId, // Set site ID
      clientId: this.provider.clientId, // Set client ID
      currency: this.provider.currency || "USD", // Set currency, default to USD
      device: this.device, // Set device type
    };
    return new Promise((resolve, reject) => {
      fetch(
        // this link is for the new backend
        `${this.url}/common/auth/${this.gameType}/${this.provider.gameId}`,
        //`${this.url}/auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: data ? JSON.stringify(data) : undefined,
        }
      )
        .then((response) => {
          if (!response.ok) {
            reject(new Error(`HTTP error! status: ${response.status}`));
          }
          resolve(response.json());
        })
        .catch((error) => {
          Logger.error("Fetch error:", error);
        });
    });
  }
  request<T = any>({
    path,
    payload,
  }: {
    path: string;
    payload?: any;
  }): Promise<T> {
    // payload'ı IServer ile uyumlu hale getir (opsiyonel ve any)
    return new Promise((resolve, reject) => {
      // Eğer path "initialGameState" ise ve this.response doluysa, bunu döndür
      // Bu, init() çağrıldıktan sonra tekrar ağ isteği yapılmasını engeller.
      if (path === "initialGameState" && this.response !== null) {
        Logger.log(
          "Returning cached initial game state from HttpServer.response"
        );
        resolve(this.response as T);
        return;
      }
      // here we check for replay mode
      if (this.provider.gameplayMode === "replay") {
        this.replayResponseIndex >= this.replayHistoryResponse.length && (this.replayResponseIndex = 0); // reset index if exceeds length
        Logger.log(
          `Returning replay game state from HttpServer.replayHistoryResponse at index ${this.replayResponseIndex}`
        );
        this.response = this.replayHistoryResponse[this.replayResponseIndex] || null;
        this.replayResponseIndex++;
        this.response.replayRound = {
          isReplayModeCompleted: this.replayResponseIndex === this.replayHistoryResponse.length,
        }
        
        resolve(this.response as T);
        return;
      } else {
        this.replayResponseIndex = 0; // reset index if not in replay mode
        this.replayHistoryResponse = null; // clear replay history if not in replay mode
      }

      // Normal istek akışı
      fetch(
        `${this.url}/${this.gameType}/${this.provider.gameId}/${path}`,
        //this.url + "/" + path,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            sessionId: this.sessionId,
          },
          body: payload ? JSON.stringify(payload) : undefined, // payload varsa stringify et
        }
      )
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              reject(new Error(text?.trim()));
            });
          }
          // response.json() bir Promise döndürdüğü için, bunu doğru şekilde ele almalıyız.
          // Ayrıca, this.response'u sadece belirli durumlarda (örn: spin sonucu) güncellemek isteyebiliriz.
          // Şimdilik, her başarılı istekte this.response'u güncelleyelim, ancak bu oyun mantığına göre ayarlanabilir.
          return response.json().then((data) => {
            this.response = data; // Yanıtı sakla (opsiyonel, oyun mantığına bağlı)
            resolve(data as T);
          });
        })
        .catch((error) => {
          Logger.error("Fetch error in request:", error);
          reject(error);
        });
    });
  }
  destroy(): void {
    // Cleanup logic if needed
    Logger.log("HttpServer instance is being destroyed");
    this.url = "";
    this.sessionId = "";
    this.response = null;
    this.provider = {} as IProviderInfo;
    this.domain = "";
    this.device = "desktop";
  }
}

// ---> Server request/response adapter functions <---
export function HttpRequestAdapterFn(params: { path: string; payload?: any }): {
  path: string;
  payload?: any;
} {
  if (params.path === "freespin") {
    params.path = "bonus";
  }
  if (
    params.payload &&
    params.payload.isFreeRound === true &&
    params.payload.bonusId
  ) {
    params.payload.vendorBonusId = params.payload.bonusId || "";
  }
  if (params.payload) {
    delete params.payload.bonusId;
    delete params.payload.isFreeRound;
  }
  return {
    path: params.path,
    payload: { ...params.payload },
  };
}
export function HttpResponseAdapterFn(data: any): {
  nextGameState: ServerData | null;
  rawGameState: any;
} {
  const response = {
    nextGameState: data,
    rawGameState: data,
  };
  try {
    if (data.action) {
      if (data.action.current === "bonus") {
        data.action.current = "freespin";
      }
      if (data.action.next === "bonus") {
        data.action.next = "freespin";
      }
    }

    const adaptedData: ServerData = {
      currentAction: data.action.current,
      nextAction: data.action.next,
      prevCredits: data.balance.previous || 0,
      credits: data.balance.current || 0,
      betAmount: data.betValue || 1,
      betLine: data.betLine || 1,
      betLevels: data.betLevels || [],
      coinValues: data.coinValues || [],
      betWayValues: data.betWays || [data.betLine || 1],
      roundWinAmount: data.win.amount || 0,
      totalWinAmount: data.win.total || 0,
      freeSpins: data.freespin.remaining || 0,
      freeSpinExtra: data.freespin.extra || 0,
      freeSpinsUsed: data.freespin.total || 0,
      reels: [],
      finalReels: [],
      wins: [],
      bigWins: [],
      availableFreeRoundPackages: [],
      replayRoundPackage: null,
    };

    if (data.freespin) {
      if (data.freespin.remaining) {
        adaptedData.freeSpins = data.freespin.remaining;
      }
      if (data.freespin.extra) {
        adaptedData.freeSpinExtra = data.freespin.extra;
      }
      if (data.freespin.total) {
        adaptedData.freeSpinsUsed = data.freespin.total;
      }
    }
    if (data.coinValue) {
      adaptedData.coinValue = data.coinValue;
    }
    if (data.betLevel) {
      adaptedData.betLevel = data.betLevel;
    }
    if ((adaptedData.currentAction as string) === "bonus") {
      adaptedData.currentAction = "freespin";
    }
    if ((adaptedData.nextAction as string) === "bonus") {
      adaptedData.nextAction = "freespin";
    }
    if (data.win.type) {
      if (!adaptedData.bigWins) adaptedData.bigWins = [];

      adaptedData.bigWins.push({
        amount: data.win.amount,
        winType: data.win.type,
      });
    }

    if (data.replayRound) {
      adaptedData.replayRoundPackage = {
        isReplayModeCompleted: data.replayRound.isReplayModeCompleted || false,
      };
    }

    if (data.freeRound) {
      adaptedData.activeFreeRoundPackage = {
        id: data.freeRound.bonusId,
        name: data.freeRound.name || "Free Rounds",
        betValue: data.freeRound.betValue || 1,
        roundCount: data.freeRound.numberOfFreeRounds || 0,
        usedCount: data.freeRound.usedCount || 0,
        totalWin: data.freeRound.totalWin || 0,
        endDate: data.freeRound.freeRoundsEndDate || "",
        isBonus: data.freeRound.isBonus || false,
      };
    }

    if (data.freeRounds && data.freeRounds.length > 0) {
      adaptedData.availableFreeRoundPackages = data.freeRounds.map(
        (pkg: any) => ({
          id: pkg.bonusId,
          name: pkg.name || "Free Rounds",
          betValue: pkg.betValue || 1,
          roundCount: pkg.numberOfFreeRounds || 0,
          usedCount: pkg.usedCount || 0,
          totalWin: pkg.totalWin || 0,
          endDate: pkg.freeRoundsEndDate || "",
          isBonus: pkg.isBonus || false,
        })
      );
    }
    response.nextGameState = adaptedData;
  } catch (e) {
    Logger.error("Error in response adapter:", e);
  }

  return response;
}
