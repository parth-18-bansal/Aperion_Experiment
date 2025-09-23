import { ManagerOptions, SocketOptions }  from 'socket.io-client';
import { PageLoadingService }             from '../services/page-loader.service';
import { SocketService }                  from '../services/socket.service';
import { SocketFactory }                  from '../services/socket-factory';
import { AssetLoaderService }             from '../services/asset-loader.service';
import { CrashApiService }                from '../services/crash-api.service';
import { ImagePreloadService }            from '../services/image-preload.service';

//#region ANGULAR LOGIC FEATURES
export interface CrashGameContext {
  screen              : 'initialize' | 'loading' | 'game' | 'maintenance' | 'connectionError' | undefined;
  connectionError?    : { title: string; description: string };
  stageCreated?       : boolean;
  socketService       : SocketService | null;
  game                : ICrashGame | null;
  gameConf            : CrashGameConfig;
  uiConf              : CrashGameUIConfig;
  providerInfo        : IProviderInfo;
  socketFactory       : SocketFactory;
  assetLoader         : AssetLoaderService;
  pageLoadingService  : PageLoadingService;
  apiService          : CrashApiService;
  imageService        : ImagePreloadService;
  // EDLERON API  data slots
  playerHistoryData   : PlayerHistoryData;
  betDetailsData      : BetDetailsData | null;
  roundDetailsData    : RoundDetailsData | null;
  generalRoundData    : GeneralRoundData;
  bestCashedData      : BestCashed;
  bestWinsData        : BestWins;
  bestResultData      : BestResult;
  apiLoadingHandle    : boolean;
  apiErrorHandle      : string | null;
  // EDLERON API  data slots
  error               : string | null; // Error message
  popup               : {
    type                  : string;
    data                  : any;
  } | null; // Popup data
  chatMessages        : ChatMessage[];
  chatErrorReason     : string | null; // Chat error reason
  chatUnlocked        : boolean; // Flag to track if chat has been unlocked once
  player              : PlayerProfile | null; // Player profile information
  betSettings         : BetSettings | null; // Bet settings information
  roundHistory        : RoundDetails[];
  boomers             : Boomer[]; // List of boomer players
  cashoutStats        : CashoutStats; // Cashout statistics
  betPanels           : BetPanel[];
  notifications       : Notification[];
  phase               : string; // Current game phase
  multiplier          : number;
  countdown           : number;
  totalBetCount       : number;
  statsCount          : number; // Count of statistics
  jackpotAmounts      : JackpotAmounts;
  jackpotWinAmount    : number | null;
  clientSeed          : string | null;
  serverSeedHash      : {seed: string, hash: string} | null;
  manualClientSeed    : boolean;
  blinkJackpotMeter   : 'mini' | 'major' | 'minor' | 'grand' | null;
  // Visibility tracking properties
  socketConnected     : boolean
  isVisible           : boolean;
  lastVisibilityTime  : number;
  sortBoomers         : (boomers: Boomer[]) => Boomer[]; // Sorted list of boomers
  updatePanelState    : (
    c                     : CrashGameContext,
    order                 : string,
    betId                 : string | null,
    isActive              : boolean,
    fromCashout           ?: boolean
  ) => BetPanel[];
}
export interface CrashGameInput {
  gameConf            : CrashGameConfig;
  providerInfo        : IProviderInfo;
  uiConf              : CrashGameUIConfig;
  socketFactory       : SocketFactory;
  assetLoader         : AssetLoaderService;
  pageLoadingService  : PageLoadingService;
  apiService          : CrashApiService;
  imageService        : ImagePreloadService;
}
export interface CrashGameState {
  maintenance     : boolean;
  m               : number;            // multiplier
  ct              : number;            // countdown
  mt              : boolean;           // maintenance
  bc              : number;            // bet count
  cs              : GAME_SOCKET_STATE; // current state
  en              : boolean;           // ended
}
export interface ChatMessage {
  avatar          : number
  username        : string;
  message         : string;
  messageId       : string;
  time            : number;
}
export interface ChatError {
  data            : string;  
  reason          : string
}
export interface BetSettings {
  maxBet         : number;
  maxWin         : number;
  minBet         : number;
  maxMultiplier  : number;
}
export interface RoundDetails {
  betCount       : number;
  crash          : number;
  createdAt      : string;
  hash           : string;
  id             : string;
  sha            : string;
}
export interface PlayerProfile {
  balance           : number;
  currency          : string;
  device            : string;
  providerBetToken  : string;
  providerSiteId    : string;
  providerUserId    : string;
  providerUsername  : string;
  sessionId         : string;
  uniqUserId        : string;
  userId            : string;
  username          : string;
  avatar?           : string;
}
export interface Boomer {
  id                : string;
  username          : string;
  multiplier        : number;
  winAmount         : number;
  amount            : number;
  avatar            : number;
}     
export interface CashoutStats {
  cashoutCount   : number;
  cashoutAmount  : number;
}

export interface JackpotAmounts {
  mini  : number;
  minor : number
  major : number
  grand : number
  last  :{
    mini  : {
      distributedAt : string | null;
      winAmount     : number | null;
    };
    minor :  {
      distributedAt : string | null;
      winAmount     : number | null;
    };
    major :  {
      distributedAt : string | null;
      winAmount     : number | null;
    };
    grand :  {
      distributedAt : string | null;
      winAmount     : number | null;
    };
  }
}
export interface Notification {
  id?         : string; // Benzersiz kimlik
  type        : 'error' | 'warning' | 'info' | 'win' | 'success';
  message     : string;
  duration    : number; // saniye cinsinden
}
export enum NOTIFY_CODES {
  InsufficientFunds   = 'InsufficientFunds',
  DISCONNECT          = 'DISCONNECT',
  ALREADY_LOGGED      = 'ALREADY_LOGGED',
  TokenNotFound       = 'TokenNotFound',
  UnknownError        = 'UnknownError',
  API_ERROR           = 'API_ERROR',
  BALANCE             = 'BALANCE',
  CASHOUT             = 'CASHOUT',
  EXPIRED             = 'EXPIRED',
  CANCEL              = 'CANCEL',
  BET                 = 'BET',
  AVATAR_UPDATED      = 'AvatarUpdated',
  CLIENT_SEED_UPDATED = 'ClientSeedUpdated',
  JACKPOT_WIN         = 'JackpotWin',
}
//#endregion

//#region ARCHITECT FEATURES
export interface SocketConfig {
  info?             : string;
  wsUrl             : string;
  httpUrl           : string;
  opts?             : Partial<ManagerOptions & SocketOptions>;
}
export interface CrashGameAssets {
  styles?           : string[];
  scripts?          : string[];
}
export interface CrashGameConfig {
  server_local?         : SocketConfig;
  server_dev?           : SocketConfig;
  server_stage?         : SocketConfig;
  server_demo?          : SocketConfig;
  server_prod?          : SocketConfig;
  assets?               : CrashGameAssets;
}
export interface ICrashGame {
  app                                                                                   : any; // PIXI.Application or similar
  boot(config: CrashGameConfig, provider : IProviderInfo)                               : Promise<void>;
  createLoadStage(cb: (progress: number) => void)                                       : Promise<void>;
  createGameStage()                                                                     : Promise<void>;
  createGameState(initState: GAME_SOCKET_STATE | string, currency: string | undefined)  : Promise<void>;
  bgmToggleSetVolume(volume: number)                                                    : Promise<void>;
  sfxToggleSetVolume(volume: number)                                                    : Promise<void>;
  animToggleSetVisible(visible: boolean)                                                : Promise<void>;
  handleUiClick(soundOverride: string | null)                                           : Promise<void>;
  showBetting(countdown: number)                                                        : void;
  showWaiting(multiplier: number)                                                       : void;
  showPlaying(multiplier: number)                                                       : void;
  showResult(multiplier: number, countdown: number)                                     : void;
  showDistributing(multiplier: number, countdown: number)                               : void;
  showWin(parameters: any)                                                              : void;   
  showJackpot(parameters: any)                                                          : void;   
  setVersionText(version: string, environment: any)                                     : void;
  playOtherJackpotSound(type: string | null)                                            : void;
}                 
export enum GAME_SOCKET_STATE {
  NONE            = "NONE",
  BETTING         = "BETTING",
  WAITING         = "WAITING",
  PLAYING         = "PLAYING",
  DISTRIBUTING    = "DISTRIBUTING",
}
//#endregion

//#region PROVIDER FEATURES
export interface IProviderInfo {
  id            : string;                             // Unique identifier for the provider
  name          : string;                             // Display name of the provider
  gameId        : string;                             // Unique identifier for the game instance
  description?  : string;                             // Optional description of the provider
  currency?     : string;                             // Optional currency used by the provider
  token?        : string;
  mode?         : 'prod' | 'stage' | 'dev' | 'local'; // Optional mode for the provider
  freePlay      : boolean;
  clientId?     : string;                             // Optional client ID for the provider
  language      : string;                   
  lobbyUrl?     : string;                             // Optional URL to the provider's lobby
  cashierUrl?   : string;                             // Optional URL to the provider's cashier
  logoUrl?      : string;                             // Optional URL to the provider's logo
  mobile?       : boolean;                            // Optional flag indicating if the provider is for mobile
  domain?       : string;                             // Optional domain for the provider
}                   
export type ProviderNames = 'everymatrix';
export type ProviderList = { [K in ProviderNames]?: (url: string) => IProviderInfo; };
//#endregion

//#region ANGULAR BUSINESS FEATURES
export interface CrashGameUIConfig {
  gamePath                  : string; // Path of games
  maxBetPanels?             : number; // Number of bet panels to show in the UI
  minAutoCashoutMultiplier? : number;
  initialBetValue           : number;
  betValueArray             : number[];
  betValueIncrements?       : number[]; // values by which to Increase bets
  autoBetCountOptions       : number[], // Auto bet round counts to be displayed in the UI
  autoBetCountIncrements?   : number[]; // values by which to Increase autoplay bets
  hasJackpotFeature         : boolean;
  messageWaitingTimeInSec   : number; // waiting time in seconds to send next message
  chatCharLimit             : number; // character limit for chat messages
  errorMessages?            : {
    maintenance?              : { title: string; description: string };
    connectionFailed?         : { title: string; description: string };
  };
}
export const ORDER_VALUES = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
] as const;
export interface BetPanel {
  autoBet               : boolean; // Whether auto bet is enabled
  totalAutoBetCount     : number; // total autobet rounds selected
  remainingAutoBetCount : number; // remaining autobet rounds
  autoCashout           : number; // Auto cashout multiplier
  betAmount             : number; // Bet amount
  autoCashoutEnabled    : boolean; // Whether auto cashout is enabled
  isActive              : boolean; // Whether the bet panel is active
  order                 : (typeof ORDER_VALUES)[number]; // Order of the bet panel
  userId                : string; // User ID of the player
  vendorBonusId         : string; // Vendor bonus ID
  betId                 : string | null;
  busy                  : boolean; // Whether the bet panel is busy processing a bet (server response pending)
  preBet                ?: boolean;
}
//#endregion

//#region API FEATURES
// EDLERON API
// ------ // 
export interface PlayerHistoryData {
  // from API example
  status?: boolean;
  bets: PlayerHistoryBetSchema[];
  total: number;
  more?: boolean;
  pagination?: {
    limit: number;
    offset: number;
    page: number;
  };
} 
export interface BetDetailsData {
  status?: boolean;
  bet: BetDetailsSchema;
} 
export interface RoundDetailsData {
  status?: boolean;
  round: RoundDetailsSchema;
} 
export interface PlayerHistoryBetSchema{
  betId: string;
  amount: {
    bet : number;
    win: number;
  };
  winAmount: number;
  multiplier: number;
  roundId: string;
  createdAt: string;
}
export interface BetDetailsSchema{
  currency: string;
  betId: string;
  roundEndDate: string;
  roundResult: string;
  amount: {
    bet : number;
    win: number;
  };
  multiplier: number;
  roundId: string;
  createdAt: string;
}
export interface RoundDetailsSchema{
  betCount: number;
  combinedHash: string;
  gameId: string;
  id: string;
  createdAt?: string;
  crash?: string;
  serverSeed: string;
  clientSeeds: { username: string; seed: string }[];
}
// ------ // 
// ------ // 
export interface GeneralRoundData {
  // from API example
  status?: boolean;
  rounds: GeneralRoundSchema[];
  charts?: any;
}
export interface GeneralRoundSchema {
  id: string;
  crash: number;
  clientSeeds?: { username: string; seed: string }[];
  createdAt: string;
  // optional other fields if backend may include them
  betCount?: number;
  hash?: string;
  sha?: string;
}
// ------ // 
export interface BestCashed {
  status?: boolean;
  total?: number;
  data?: BestCashedSchema[];
}
export interface BestCashedSchema {
  id?: number,
  date?: string,
  amount?: number,
  roundId?: string,
  winAmount?: number,
  multiplier?: number,
  username?: string,
}
// ------ // 
export interface BestWins {
  status?: boolean;
  total?: number;
  data?: BestWinsSchema[];
}
export interface BestWinsSchema {
  id: number,
  date: string,
  amount: number,
  roundIds: string,
  roundMultiplier: number,
  winAmount: number,
  multiplier: number,
  username: string
}
// ------ // 
export interface BestResult {
  status?: boolean;
  total?: number;
  data?: BestResultSchema[];
}
export interface BestResultSchema {
  id: number;
  multiplier: number;
  date: string;
}
//#endregion