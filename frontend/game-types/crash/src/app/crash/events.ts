import {
  ChatMessage,
  RoundDetails,
  BetPanel,
  NOTIFY_CODES,
  Boomer,
  Notification,
  ORDER_VALUES,
  PlayerHistoryData,
  GeneralRoundData,
  BestCashed,
  BestWins,
  BestResult,
  BetDetailsData,
  JackpotAmounts
} from './interfaces';

// GAME LOGIC EVENTS
export type CrashGameEvent =
  | { type: 'FETCH_INIT_DATA'; data: any }
  | { type: 'GAME_READY' }
  | { type: 'CANVAS_READY' }
  | { type: 'GO_TO_MAINTENANCE' }
  | { type: 'GO_TO_CONNECTION_ERROR'; title: string; description: string }
  | { type: 'RESET' }
  | { type: 'SEND_CHAT_MESSAGE'; message: string }
  | { type: 'CHAT_ERROR'; reason: string, data: string }
  | { type: 'NEW_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'NEW_ROUND_INFO'; round: RoundDetails }
  | { type: 'NOTIFICATIONS'; notification: { code: NOTIFY_CODES; data: any } }
  | { type: 'BOOMER_UPDATE'; boomers: Boomer[] }
  | {
      type        : 'UPDATE_PHASE';
      phase       : string;
      multiplier? : number;
      countdown?  : number;
    }
  | { type: 'ADD_NOTIFICATION'; notification: Notification }
  | { type: 'REMOVE_NOTIFICATION'; id: string }
  | { type: 'ADD_BET_PANEL' }
  | { type: 'REMOVE_BET_PANEL'; panel: BetPanel }
  | { type: 'UPDATE_BET_PANEL'; index: number; betPanel: BetPanel, fieldType?: string }
  | {
      type: 'PLACE_BET';
      betPanel: BetPanel;
    }
  | {
      type: 'DECREMENT_AUTO_BET';
      order: (typeof ORDER_VALUES)[number];
      betPanel: BetPanel;
    }
  | {
      type: 'INCREASE_AUTO_BET';
      panelIndex: number;
      increaseRoundsBy: number;
    }
  | {
      type: 'CANCEL_BET';
      betPanel: BetPanel;
    }
  | {
      type: 'CASHOUT_BET';
      betPanel: BetPanel;
    }
  | {
      type: 'START_BLINK_JP_METER';
      jackpotType: 'mini' | 'major' | 'minor' | 'grand' | null;
    }
  | {
      type: 'STOP_BLINK_JP_METER';
    }
  // EDLERON API : Player History
  | { type: 'FETCH_PLAYER_HISTORY'; limit?: number; offset?: number }
  | { type: 'PLAYER_HISTORY_SUCCESS'; data: PlayerHistoryData }
  | { type: 'PLAYER_HISTORY_FAILURE'; error: string }
  // EDLERON API : Player Bet Details
  | { type: 'FETCH_BET_DETAILS'; betId: string }
  | { type: 'BET_DETAILS_SUCCESS'; data: BetDetailsData }
  | { type: 'BET_DETAILS_FAILURE'; error: string }
  // API : ROUND Details
  | { type: 'FETCH_ROUND_DETAILS'; roundId: string }
  | { type: 'ROUND_DETAILS_SUCCESS'; data: any }
  | { type: 'ROUND_DETAILS_FAILURE'; error: string }
  // EDLERON API : General Round
  | { type: 'FETCH_GENERAL_ROUND'; }
  | { type: 'GENERAL_ROUND_SUCCESS'; data: GeneralRoundData }
  | { type: 'GENERAL_ROUND_FAILURE'; error: string }
  // EDLERON API : Best > Cached
  | { type: 'FETCH_BEST_CASHED'; periodVal: string }
  | { type: 'BEST_CASHED_SUCCESS'; data: BestCashed }
  | { type: 'BEST_CASHED_FAILURE'; error: string }
  // EDLERON API : Best > Wins
  | { type: 'FETCH_BEST_WINS'; periodVal: string }
  | { type: 'BEST_WINS_SUCCESS'; data: BestWins }
  | { type: 'BEST_WINS_FAILURE'; error: string }
  // EDLERON API : Best > Result
  | { type: 'FETCH_BEST_RESULT'; periodVal: string }
  | { type: 'BEST_RESULT_SUCCESS'; data: BestResult }
  | { type: 'BEST_RESULT_FAILURE'; error: string }
  | {
    type            : 'CASHOUT_STATS';
    cashoutCount?   : number;
    cashoutAmount?  : number;
    }
  | { type: 'SET_TOTAL_BET_COUNT'; totalBetCount: number | undefined }
  | { type: 'HANDLE_UI_CLICK'; meta: { originalEvent?: Event } }
  | { type: 'SEND_AVATAR_UPDATE'; avatar: number }
  | { type: 'JACKPOT_UPDATE_RECEIVED'; jackpotAmounts: JackpotAmounts }
  | { type: 'NEW_CLIENT_SEED_HASH'; clientSeed: any }
  | { type: 'NEW_SERVER_SEED_HASH'; serverSeedHash: {seed: string, hash: string} }
  | { type: 'SEND_NEW_CLIENT_SEED'; newClientSeed: string }
  | { type: 'SET_MANUAL_CLIENT_SEED'; isManual: boolean }
  | { type: 'TOGGLE_BGM'; volume: number }
  | { type: 'TOGGLE_SFX'; volume: number }
  | { type: 'TOGGLE_ANIM'; visible: boolean }
  | { type: 'SET_SOCKET_STATUS'; connected: boolean }
  | { type: 'VISIBILITY_CHANGE' }
  | { type: 'UPDATE_VISIBILITY_TIME'; timestamp: number }

// SOCKET EVENTS
export enum SocketEvent {
  // socket.io built in events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_FAILED = 'reconnect_failed',

  // manuel events
  SESSION_EXPIRED = 'session_expired',
  BOOMER_UPDATE = 'boomer_update',
  CHAT_MESSAGE = 'chat_message',
  CHAT_ERROR = 'chat_error',
  MAINTENANCE = 'maintenance',
  ROUND_INFO = 'round_info',
  MESSAGES = 'messages',
  BALANCE = 'balance',
  DISCONNECT_DUPLICATE = 'disconnect_duplicate',
  CASHOUT = 'cashout',
  CANCEL = 'cancel',
  NOTIFY = 'notify',
  STATE = 'state',
  INIT = 'init',
  NEW = 'new',
  BET = 'bet',
  AVATAR_UPDATE = 'avatar_change',
  JACKPOT_UPDATE = 'jackpot_update',
  JACKPOT_WIN = 'jackpot_win',
  // NEW_CLIENT_SEED_HASH = 'new_client_seed_hash',
  NEW_CLIENT_SEED = 'client_seed',
  NEW_SERVER_SEED_HASH = 'new_server_seed_hash',

  // Custom events
  CASHOUT_STATS = 'cashout_stats'
}
