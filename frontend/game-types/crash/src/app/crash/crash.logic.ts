import { assign, setup, fromPromise, StateFrom /*, or*/ } from 'xstate';
import {
  CrashGameContext,
  CrashGameInput,
  CrashGameState,
  RoundDetails,
  ChatMessage,
  BetPanel,
  ICrashGame,
  ORDER_VALUES,
  NOTIFY_CODES,
  Boomer,
  Notification,
  PlayerHistoryData, // EDLERON API
  GeneralRoundData,
  CashoutStats,
  BetDetailsData,
  JackpotAmounts,
  ChatError,
  CrashGameConfig
} from './interfaces';
import { CrashGameEvent, SocketEvent } from './events';
import { Logger } from '../utils/Logger';
import { isDevMode } from '@angular/core';
import { environment } from '../../environments/environment';
import { take, timestamp, timeout, catchError, of, first } from 'rxjs';

function resolveServerConfig(
  gameConf: CrashGameConfig,
  value?: any
) {
  // explicit switch to satisfy TypeScript and avoid indexing with dynamic keys

  if (value.local) {
    return gameConf.server_local;
  } else if (value.dev) {
    return gameConf.server_dev;
  } else if (value.stage) {
    return gameConf.server_stage;
  } else if (value.demo) { 
    return gameConf.server_demo;
  } else if (value.prod) {
    return gameConf.server_prod;
  }

  return gameConf.server_local;
}

export const crashLogic = setup({
  types: {
    context: {} as CrashGameContext,
    events: {} as CrashGameEvent,
    input: {} as CrashGameInput,
  },
  actions: {
    setSocketStatus: assign(({ event }) => {
      if (event.type !== 'SET_SOCKET_STATUS') return {};
      return { socketConnected: event.connected };
    }),
    onInitialize: assign(({ context, self }) => {
      const serverConf = resolveServerConfig(context.gameConf, environment);
      if (!serverConf) {
        Logger.error('Socket configuration is missing.');
        self.send({ type: 'GO_TO_MAINTENANCE' });
        return {};
      }

      // EDLERON API Configure API base URL from game config
      try {
        context.apiService.setBaseUrl(serverConf?.httpUrl);
      } catch (e) {
        console.error('API baseUrl configuration skipped:', e);
      }

      const socket = context.socketFactory.create({
        opts: {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 5000,
          reconnectionDelayMax: 5000,
          transports: ['websocket'],
          query: {
            device: navigator.userAgent,
            token: context.providerInfo.token,
            gameId: context.providerInfo.gameId,
            clientId: context.providerInfo.clientId,
            currency: context.providerInfo.currency,
          },
        },
        ...serverConf,
      });

      if (!socket) {
        console.error('Failed to create socket service.');
        self.send({ type: 'GO_TO_MAINTENANCE' });
        return {};
      }

      socket.onConnect().subscribe(() => {
        Logger.log('Socket connected');
      });

      socket.onMaintenance().subscribe(() => {
        self.send({
          type: 'GO_TO_CONNECTION_ERROR',
          title: 'maintenance.title',
          description: 'maintenance.desc'
        });
      })

      socket.onSessionExpired().subscribe(() => {
        self.send({
          type: 'GO_TO_CONNECTION_ERROR',
          title: 'session.title',
          description: 'session.desc'
        });
      })

      // INIT CEVABI 10 SANİYE İÇİNDE GELMEZSE HATA VER
      socket.onInit().pipe(
        first(),
        timeout(10000), // 10 saniye timeout
        catchError(err => {
          Logger.error('Socket initialization timeout or error:', err);
          self.send({
            type: 'GO_TO_CONNECTION_ERROR',
            title: 'connection-error.title',
            description: 'connection-error.init'
          });
          return of(null); // Boş observable döndür
        })
      ).subscribe((data) => {
        if (data) {
          Logger.log('Socket initialized', data);
          self.send({ type: 'FETCH_INIT_DATA', data });
          self.send({ type: 'SET_SOCKET_STATUS', connected: true });
        }
      });

      // Add visibility change event listener
      const handleVisibilityChange = () => {
        if (document.hidden) {
           const cloneTime = new Date().getTime();
           self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: cloneTime });
        } else {
          const latestContext = (self as any).getSnapshot?.().context || context;
          const lastTime      = latestContext.lastVisibilityTime;
          const currentTime   = new Date().getTime();
          const timeDiff      = currentTime - lastTime;  
          const threshold     = 10000; // 10 saniye eşik süresi

          if (timeDiff >= threshold) {
            self.send({ type: 'SET_SOCKET_STATUS', connected: false });

             self.send({
                type: 'GO_TO_CONNECTION_ERROR',
                title: 'connection-error.title',
                description: 'connection-error.desc'
            });
          } else {
              self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: new Date().getTime() });
          }
        }
      };

      const handleFocus = () => { 
        const latestContext = (self as any).getSnapshot?.().context || context;
          const lastTime      = latestContext.lastVisibilityTime;
          const currentTime   = new Date().getTime();
          const timeDiff      = currentTime - lastTime;  
          const threshold     = 10000; // 10 saniye eşik süresi

          if (timeDiff >= threshold) {
            self.send({ type: 'SET_SOCKET_STATUS', connected: false });

             self.send({
                type: 'GO_TO_CONNECTION_ERROR',
                title: 'connection-error.title',
                description: 'connection-error.desc'
            });
          } else {
              self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: new Date().getTime() });
          }
      }

      const handleBlur = () => { 
        const cloneTime = new Date().getTime();
        self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: cloneTime });
      }

      const handlePageShow = () => { 
         const latestContext = (self as any).getSnapshot?.().context || context;
          const lastTime      = latestContext.lastVisibilityTime;
          const currentTime   = new Date().getTime();
          const timeDiff      = currentTime - lastTime;  
          const threshold     = 10000; // 10 saniye eşik süresi

          if (timeDiff >= threshold) {
            self.send({ type: 'SET_SOCKET_STATUS', connected: false });

             self.send({
                type: 'GO_TO_CONNECTION_ERROR',
                title: 'connection-error.title',
                description: 'connection-error.desc'
            });
          } else {
              self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: new Date().getTime() });
          }
      }

      const handlePageHidden = () => { 
        const cloneTime = new Date().getTime();
        self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: cloneTime });
      }

      const onHidden = () => self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: new Date().getTime() });
      const onShown  = () => {
        const last = (self as any).getSnapshot?.().context?.lastVisibilityTime;
        const diff = new Date().getTime() - (last ?? 0);

        if (diff >= 180000) { 
          self.send({ type: 'SET_SOCKET_STATUS', connected: false });
          self.send({ type: 'GO_TO_CONNECTION_ERROR', title: 'connection-error.title', description: 'connection-error.desc' });
        } else {
          self.send({ type: 'UPDATE_VISIBILITY_TIME', timestamp: Date.now() });
        }
      };

      const onVisibilityChange = () => (document.hidden ? onHidden() : onShown());
      const onPageHide         = () => onHidden();
      const onPageShow         = (e: PageTransitionEvent) => onShown();
      const onBlur             = () => onHidden();
      const onFocus            = () => onShown();

      // const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      // if(!isIOS) document.addEventListener('visibilitychange', handleVisibilityChange);
      // if(isIOS) window.addEventListener('focus', handleFocus);
      // if(isIOS) window.addEventListener('blur', handleBlur);
      // if(isIOS) window.addEventListener('pageshow', handlePageShow);
      // if(isIOS) window.addEventListener('pagehide', handlePageHidden);

      // if(!isIOS) (context as any).visibilityChangeHandler = handleVisibilityChange;
      // if(isIOS) (context as any).focusHandler = handleFocus;
      // if(isIOS) (context as any).blurHandler = handleBlur;
      // if(isIOS) (context as any).pageShowHandler = handlePageShow;
      // if(isIOS) (context as any).pageHiddenHandler = handlePageHidden;

      document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
      window.addEventListener('pagehide', onPageHide, { passive: true });
      window.addEventListener('pageshow', onPageShow, { passive: true });
      window.addEventListener('blur', onBlur, { passive: true });
      window.addEventListener('focus', onFocus, { passive: true });

      return { socketService: socket };
    }),
    updateVisibilityTime: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_VISIBILITY_TIME') return {};
      
      // const oldTime = context.lastVisibilityTime;
      // const newTime = event.timestamp;
      // const timeDiff = newTime - oldTime;
      
      /*
      Logger.log("LastVisibilityTime updated", {
        timeDiffSeconds: Math.round(timeDiff / 1000)
      });
      */
      
      return { lastVisibilityTime: event.timestamp };
    }),
    fetchInitData: assign(({ context, event }) => {
      if (event.type !== 'FETCH_INIT_DATA') return {};
      const data = event.data;
      try {
        context.apiService.setSessionId(data.player?.sessionId);
      } catch (e) {
        console.error('API sessionId configuration skipped:', e);
      }

      const maxBetPanels = context.uiConf.maxBetPanels || 1;
      const defaultBetPanels: BetPanel[] = [];
      for (let i = 0; i < maxBetPanels; i++) {
        defaultBetPanels.push({
          betAmount: context.uiConf.initialBetValue || data.settings?.minBet || 1,
          autoBet: false,
          preBet: false,
          totalAutoBetCount: 0,
          remainingAutoBetCount: 0,
          autoCashoutEnabled: false,
          autoCashout: context.uiConf.minAutoCashoutMultiplier || 1.01,
          isActive: false,
          order: ORDER_VALUES[i],
          userId: data.player?.userId || '',
          vendorBonusId: '',
          betId: null,
          busy: false
        });
      }
      const initBoomers = data?.boomers?.map((boomer: any) => {
        return {
          id: boomer.id,
          amount: boomer.a ?? 0,
          avatar: boomer.av ?? 0,
          username: boomer.u ?? 'unknown',
        };
      }) || [];
      return {
        jackpotAmounts: data.jackpot,
        player: data.player,
        betSettings: data.settings,
        roundHistory: data.rounds || [],
        betPanels: defaultBetPanels,
        chatMessages: data.messages || [],
        boomers: initBoomers,
        statsCount: data.statsCount || 50,
        clientSeed: data.player?.clientSeed || '',
      };
    }),
    onLoading: assign(({ context, self }) => {
      Logger.log('Game is loading', context);

      context.pageLoadingService.setLoading(true);  
      (async () => {
        // await context.imageService.preload();

        await context.game?.createLoadStage((progress) => {
          const progressPercent = progress > 2.5 ? 2.5 * 100 * 4 : progress * 100 * 4;
          const clampedProgress = Math.min(100, progressPercent);

          // Logger.log(`Loading progress: ${clampedProgress}%`);

          context.pageLoadingService.updateProgress(clampedProgress);

        }).then(() => {

          context.pageLoadingService.updateProgress(100);
          setTimeout(() => {
            self.send({ type: 'GAME_READY' });
          }, 500);

        }).catch ((err) => {
          
            Logger.error('Loading failed:', err);
            context.pageLoadingService.setLoading(false);

            self.send({
              type: 'GO_TO_CONNECTION_ERROR',
              title: 'connection-error.title',
              description: 'connection-error.desc'
            });

        });

      })();

      return {
        screen: 'initialize' as CrashGameContext['screen'],
      };
    }),
    onGameReady: assign(({ context }) => {
      void context;
      Logger.log('Game is ready', /*context*/);
      return {
        screen: 'game' as CrashGameContext['screen'],
      };
    }),
    onCanvasReady: assign(({ context }) => {
      const game = context.game;
      if (!game || context.stageCreated) return {};

      Logger.log('Canvas is ready', /*context*/);

      (async () => {
        try {
          await game.createGameStage();
          game.setVersionText(environment.version, environment);
        } catch (err) {
          Logger.error('createGameStage failed:', err);
        }
      })();

      return { stageCreated: true };
    }),
    bindSocketEvents: ({ context, self }) => {
      const socket = context.socketService;
      if (!socket) return;

      const game = context.game;
      if (!game) return;

      // Listen for ping events from server and respond with pong
      socket.onPing().subscribe(() => {
        socket.emit(SocketEvent.PONG, {});
      });
      
      socket.onInit().subscribe((data) => {
        Logger.log('Socket re-initialized', data);
        self.send({ type: 'FETCH_INIT_DATA', data });
        self.send({ type: 'SET_SOCKET_STATUS', connected: true });
      });

      let resizeFlag = false;
      socket.onState<CrashGameState>().subscribe((state) => {

        if (!resizeFlag) {
          const latestContext = (self as any).getSnapshot
            ? (self as any).getSnapshot().context
            : (self as any).state?.context || context;

          if (latestContext.stageCreated) {
            game.createGameState(state.cs, context.providerInfo?.currency);
            // window.dispatchEvent(new Event("resize")); -> game.component.ts > window.dispatchEvent(new Event("resize")) | NgAFterViewİnit
            resizeFlag = true;
          }
        }

        if (state.maintenance) {
          self.send({
            type: 'GO_TO_CONNECTION_ERROR',
            title: 'maintenance.title',
            description: 'maintenance.desc'
          });
        }

        switch (state.cs) {
          case 'BETTING':
            game.showBetting(state.ct);
            // separately update betCount only when server provided it
            if (typeof state.bc !== 'undefined') {
              self.send({ type: 'SET_TOTAL_BET_COUNT', totalBetCount: state.bc });
            }
            break;
          case 'WAITING':
            game.showWaiting(state.m);
            const stats: CashoutStats = {
              cashoutCount: 0,
              cashoutAmount: 0
            }
            self.send({ type: 'CASHOUT_STATS', ...stats });
            break;
          case 'PLAYING':
            if (state.en) {
              game.showResult(state.m, state.ct);
              break;
            }
            game.showPlaying(state.m);
            break;
          case 'DISTRIBUTING':
            game.showDistributing(state.m, state.ct);
            break;
        }

        self.send({
          type: 'UPDATE_PHASE',
          phase: state.cs,
          multiplier: state.m ?? 1,
          countdown: state.ct ?? 0,
        });

      });

      socket.onChatMessage<ChatMessage>().subscribe((message) => {
        self.send({ type: 'NEW_CHAT_MESSAGE', message });
      });

      socket.onChatError<ChatError>().subscribe(({ data, reason }) => {
        Logger.log('onChatError message');
        self.send({ type: 'CHAT_ERROR', data, reason });
      });

      socket.onRoundInfo<RoundDetails>().subscribe((round) => {
        self.send({ type: 'NEW_ROUND_INFO', round });
      });

      socket
        .onNotify<{ code: NOTIFY_CODES; data: any }>()
        .subscribe((notification) => {
          // Logger.log('Received notification:', notification);
          self.send({ type: 'NOTIFICATIONS', notification });
        });

      socket.onBoomerUpdate<Boomer[]>().subscribe((boomers) => {
        self.send({ type: 'BOOMER_UPDATE', boomers });
      });

      socket.onJackpotUpdate<JackpotAmounts>().subscribe((jackpots) => {
        self.send({ type: 'JACKPOT_UPDATE_RECEIVED', jackpotAmounts: jackpots });
      });

      socket.onJackpotWin<any>().subscribe((jackpotType) => {
        self.send({ type: 'START_BLINK_JP_METER', jackpotType: jackpotType?.type ?? null });
      });

      socket.onDisconnect().subscribe((reason) => {
        Logger.log("Bağlantı koptu:", reason, new Date());
        self.send({ type: 'SET_SOCKET_STATUS', connected: false });
        
                // Remove visibility change event listener
        /*
        if ((context as any).visibilityChangeHandler) {
          document.removeEventListener('visibilitychange', (context as any).visibilityChangeHandler);
          (context as any).visibilityChangeHandler = null;
        }

        if ((context as any).focusHandler) {
          window.removeEventListener('focus', (context as any).focusHandler);
          (context as any).focusHandler = null;
        }

        if ((context as any).blurHandler) {
          window.removeEventListener('blur', (context as any).blurHandler);
          (context as any).blurHandler = null;
        }

        if ((context as any).pageShowHandler) {
          window.removeEventListener('pageshow', (context as any).pageShowHandler);
          (context as any).pageShowHandler = null;
        }

        if ((context as any).pageHiddenHandler) {
          window.removeEventListener('pagehide', (context as any).pageHiddenHandler);
          (context as any).pageHiddenHandler = null;
        }
        */

        document.removeEventListener('visibilitychange', (context as any).onVisibilityChange);
        window.removeEventListener('pagehide', (context as any).onPageHide);
        window.removeEventListener('pageshow', (context as any).onPageShow);
        window.removeEventListener('blur', (context as any).onBlur);
        window.removeEventListener('focus', (context as any).onFocus);

        const game = context.game;
        if (game && game.app) {
          try {
            // Stop ticker/animations only
            if (game.app.ticker) {
              game.app.ticker.stop();
            }

            // Stop any GSAP animations if available
            if ((window as any).gsap) {
              (window as any).gsap.killTweensOf("*");
            }

            // Hide stage content
            if (game.app.stage) {
              game.app.stage.alpha = 0;
            }

            // Stop all sounds using the game engine's audio system
            if (game.app && game.app.audio) {
              try {
                game.app.audio.soundBus.muteBgm();
                game.app.audio.soundBus.muteSfx();
                context.game?.bgmToggleSetVolume(0);
                context.game?.sfxToggleSetVolume(0);
              } catch (audioError) {
                Logger.error('Error stopping audio via game engine:', audioError);
              }
            }

          } catch (error) {
            Logger.error('Error during reconnect attempt cleanup:', error);
          }
        }
        self.send({
          type: 'ADD_NOTIFICATION',
          notification: {
            type: 'error',
            message: 'notifications.disconnected',
            duration: 2,
          },
        });
      });

      socket.onReconnectAttempt().subscribe((attempt) => {
        Logger.log("Yeniden bağlanma denemesi:", attempt, new Date());
        // Remove any existing reconnect attempt notification first
        self.send({ type: 'REMOVE_NOTIFICATION', id: 'reconnect-attempt' });

        self.send({
          type: 'ADD_NOTIFICATION',
          notification: {
            type: 'info',
            message: 'notifications.reconnecting',
            duration: 0,
            id: 'reconnect-attempt',
          },
        });
      });

      socket.onReconnectFailed().subscribe(() => {
        Logger.log("Tüm yeniden bağlanma denemeleri başarısız", new Date());
        self.send({
          type: 'GO_TO_CONNECTION_ERROR',
          title: 'connection-error.title',
          description: 'connection-error.desc'
        });
      });


      socket.onReconnect().subscribe((attempt) => {
        // Remove the permanent reconnect attempt notification
        Logger.log("Tekrar bağlandı (deneme sayısı):", attempt, new Date());
        self.send({ type: 'REMOVE_NOTIFICATION', id: 'reconnect-attempt' });
        self.send({ type: 'SET_SOCKET_STATUS', connected: true });

        const game = context.game;
        if (game && game.app) {
          try {
            // Restart ticker/animations
            if (game.app.ticker && !game.app.ticker.started) {
              game.app.ticker.start();
              window.dispatchEvent(new Event("resize"));
            }

            // Show stage content
            if (game.app.stage) {
              game.app.stage.alpha = 1;
            }

            // Stop all sounds using the game engine's audio system
            if (game.app && game.app.audio) {
              try {
                game.app.audio.soundBus.unmuteBgm();
                game.app.audio.soundBus.unmuteSfx();
                context.game?.bgmToggleSetVolume(1);
                context.game?.sfxToggleSetVolume(1);
              } catch (audioError) {
                Logger.error('Error stopping audio via game engine:', audioError);
              }
            }

          } catch (error) {
            Logger.error('Error during reconnect recovery:', error);
          }
        }
        self.send({
          type: 'ADD_NOTIFICATION',
          notification: {
            type: 'success',
            message: 'notifications.reconnected',
            duration: 2,
          },
        });
      });

      socket.onConnectError().subscribe((err) => {
        Logger.log("Bağlantı hatası:", err.message, new Date());
      });

      socket.onReconnectError().subscribe((err) => {
        Logger.log("Yeniden bağlanma hatası:", err.message, new Date());
      });

      socket.onNewServerSeedHash<{ seed: string, hash: string }>().subscribe((seedHash) => {
        self.send({ type: 'NEW_SERVER_SEED_HASH', serverSeedHash: seedHash });
      });

      socket.onCashoutStats<CashoutStats>().subscribe((stats) => {
        self.send({ type: 'CASHOUT_STATS', ...stats });
      });
    },
    onMaintenance: assign(({ context }) => {
      Logger.log('Game is in maintenance mode', context);
      return {
        screen: 'maintenance' as CrashGameContext['screen'],
      };
    }),
    onConnectionError: assign(({ context, event }) => {
      if (event.type !== 'GO_TO_CONNECTION_ERROR') return {};
      Logger.log('Game connection error', event);

      /*
      // Remove visibility change event listener
      if ((context as any).visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', (context as any).visibilityChangeHandler);
        (context as any).visibilityChangeHandler = null;
      }

      if ((context as any).focusHandler) {
        window.removeEventListener('focus', (context as any).focusHandler);
        (context as any).focusHandler = null;
      }

      if ((context as any).blurHandler) {
        window.removeEventListener('blur', (context as any).blurHandler);
        (context as any).blurHandler = null;
      }

      if ((context as any).pageShowHandler) {
        window.removeEventListener('pageshow', (context as any).pageShowHandler);
        (context as any).pageShowHandler = null;
      }

      if ((context as any).pageHiddenHandler) {
        window.removeEventListener('pagehide', (context as any).pageHiddenHandler);
        (context as any).pageHiddenHandler = null;
      }
      */

      document.removeEventListener('visibilitychange', (context as any).onVisibilityChange);
      window.removeEventListener('pagehide', (context as any).onPageHide);
      window.removeEventListener('pageshow', (context as any).onPageShow);
      window.removeEventListener('blur', (context as any).onBlur);
      window.removeEventListener('focus', (context as any).onFocus);

      // Cleanup game resources

      // TODO -> Edleron | 
      const game = context.game;
      if (game && game.app) {
        try {
          // Stop ticker/animations
          if (game.app.ticker) {
            game.app.ticker.stop();
            // Stop all active ticker callbacks
            game.app.ticker.destroy();
          }

          // Stop any GSAP animations if available
          if ((window as any).gsap) {
            (window as any).gsap.killTweensOf("*");
          }

          // Hide stage content
          if (game.app.stage) {
            game.app.stage.alpha = 0;
          }

          // Stop all sounds using the game engine's audio system
          if (game.app && game.app.audio) {
            try {
              game.app.audio.soundBus.muteBgm();
              game.app.audio.soundBus.muteSfx();
              context.game?.bgmToggleSetVolume(0);
              context.game?.sfxToggleSetVolume(0);
            } catch (audioError) {
              Logger.error('Error stopping audio via game engine:', audioError);
            }
          }
        } catch (error) {
          Logger.error('Error during game cleanup:', error);
        }
      }

      return {
        screen: 'connectionError' as CrashGameContext['screen'],
        connectionError: {
          title: event.title,
          description: event.description,
        },
        socketConnected: false,
      };
    }),
    sendChatMessage: ({ context, event }) => {
      if (event.type !== 'SEND_CHAT_MESSAGE') return;
      context.socketService?.emit(SocketEvent.CHAT_MESSAGE, {
        userId: context.player?.userId,
        username: context.player?.username,
        message: event.message,
      });
    },
    addChatMessage: assign({
      chatMessages: ({ context, event }) => {
        if (event.type !== 'NEW_CHAT_MESSAGE') return context.chatMessages;
        // Bellek sorunlarını önlemek için son 100 mesajı tut
        const MAX_MESSAGES = 100;
        const newMessages = [...context.chatMessages, event.message];
        return newMessages.slice(-MAX_MESSAGES);
      },
    }),
    setChatError: assign(({ context, event }) => {
      if (event.type !== 'CHAT_ERROR') return {};

      let updatedChatMessages = context.chatMessages; // Default olarak mevcut mesajları koru
      let setReason = null;

      if (event.reason === 'REMOVE') {
        updatedChatMessages = context.chatMessages.filter(msg => msg.messageId !== event.data);
        setReason = null;
        Logger.log('Found message to remove:');
      } else {        
        setReason = event.reason;
        Logger.log('Chat error occurred:');
      }    
      
      return {
        chatErrorReason: setReason,
        chatMessages: updatedChatMessages,
      };
    }),
    clearChatError: assign(() => ({
      chatErrorReason: null,
    })),
    checkChatUnlock: assign(({ context }) => {
      // If chat is already unlocked, do nothing
      if (context.chatUnlocked) return {};

      // Check if phase is playing and user has at least one active bet
      const hasActiveBet = context.betPanels.some(panel => panel.betId !== null);
      const shouldUnlock = context.phase === 'PLAYING' && hasActiveBet;

      if (shouldUnlock) {
        return {
          chatUnlocked: true,
          chatErrorReason: null,
        };
      }

      return {};
    }),
    addRoundHistory: assign({
      roundHistory: ({ context, event }) => {
        if (event.type !== 'NEW_ROUND_INFO') return context.roundHistory;
        // Keep the last 60 rounds for example
      
        /*
        const fakeData: RoundDetails[] = context.generalRoundData.rounds?.length > 0 
          ? context.generalRoundData.rounds.slice(31, MAX_HISTORY - 1).map((round) => ({
              betCount: round.betCount || 0,
              crash: round.crash,
              createdAt: round.createdAt,
              hash: round.hash || '',
              id: round.id,
              sha: round.sha || ''
            }))
        : [];
        */

        // TODO
        const MAX_HISTORY = 60;
        const newHistory = [event.round, ...context.roundHistory, /*...fakeData*/];
        return newHistory.slice(0, MAX_HISTORY);
      },
    }),
    addBetPanel: assign({
      betPanels: ({ context }) => {
        if (context.betPanels.length < (context.uiConf.maxBetPanels || 1)) {
          const newPanel: BetPanel = {
            betAmount: context.betSettings?.minBet || 1,
            autoBet: false,
            totalAutoBetCount: 0,
            remainingAutoBetCount: 0,
            autoCashoutEnabled: false,
            autoCashout: context.uiConf.minAutoCashoutMultiplier || 1.01,
            isActive: false,
            order: ORDER_VALUES[context.betPanels.length] || 'first',
            userId: context.player?.userId || '',
            vendorBonusId: '',
            betId: null, // Yeni panel için başlangıçta betId yok
            busy: false 
          };
          return [...context.betPanels, newPanel];
        }
        return context.betPanels;
      },
    }),
    removeBetPanel: assign({
      betPanels: ({ context, event }) => {
        if (
          event.type !== 'REMOVE_BET_PANEL' ||
          event.panel.isActive ||
          event.panel.betId
        )
          return context.betPanels;

        const newPanels = context.betPanels.filter(
          (panel) => panel.order !== event.panel.order
        );
        return newPanels;
      },
    }),
    addNotification: assign({
      notifications: ({ context, event }) => {
        if (event.type !== 'ADD_NOTIFICATION') return context.notifications;
        const newNotification: Notification = {
          ...event.notification,
          id: event.notification.id || `${new Date().getTime()}-${Math.random()}`, // Benzersiz ID oluştur
        };
        return [...context.notifications, newNotification];
      },
    }),
    removeNotification: assign({
      notifications: ({ context, event }) => {
        if (event.type !== 'REMOVE_NOTIFICATION') return context.notifications;
        return context.notifications.filter(
          (notification) => notification.id !== event.id
        );
      },
    }),
    updateBetPanel: assign({
      betPanels: ({ context, event }) => {
        if (event.type !== 'UPDATE_BET_PANEL') return context.betPanels;

        if (event.fieldType && event.fieldType === 'betAmount') {
          context.betPanels[event.index].betAmount = event.betPanel.betAmount;
          return context.betPanels;
        } else if (event.fieldType && event.fieldType === 'autoCashout') {
          context.betPanels[event.index].autoCashout = event.betPanel.autoCashout;
          return context.betPanels;
        } else if (event.fieldType && event.fieldType === 'totalAutoBetCount') {
          context.betPanels[event.index].totalAutoBetCount = event.betPanel.totalAutoBetCount || 0;
          context.betPanels[event.index].remainingAutoBetCount = context.betPanels[event.index].totalAutoBetCount;
          return context.betPanels;
        } else if (event.fieldType && event.fieldType === 'autoCashoutEnabled') {
          context.betPanels[event.index].autoCashoutEnabled = event.betPanel.autoCashoutEnabled;
          return context.betPanels;
        } else {
          const newPanels = [...context.betPanels];
          newPanels[event.index] = event.betPanel;
          return newPanels;
        }
      },
    }),
    checkAutoBet: ({ self, event }) => {
      if (event.type !== 'UPDATE_BET_PANEL') return;
      if (event.betPanel.autoBet && event.betPanel.remainingAutoBetCount && event.betPanel.betId === null) {
        self.send({ type: 'PLACE_BET', betPanel: event.betPanel });
      }
    },
    decrementAutoBetCount: assign(({ context, event }) => {
      if (event.type !== 'DECREMENT_AUTO_BET')
        return {};

      let betPanels = [...context.betPanels];

      betPanels = betPanels.map((panel) => {
        if (panel.autoBet && panel.remainingAutoBetCount > 0 && panel.betId && panel.order === event.order) {
          const remaining = panel.remainingAutoBetCount - 1;
          return {
            ...panel,
            remainingAutoBetCount: remaining,
            autoBet: remaining > 0, // disable when finished
          };
        }
        return panel;
      });

      return {
        betPanels,
      };
    }),
    increaseAutoBetCount: assign(({ context, event }) => {
      if (event.type !== 'INCREASE_AUTO_BET')
        return {};
      let betPanels = [...context.betPanels];
      betPanels[event.panelIndex].totalAutoBetCount += event.increaseRoundsBy;
      betPanels[event.panelIndex].remainingAutoBetCount += event.increaseRoundsBy;

      return {
        betPanels,
      };
    }),
    sendBet: ({ context, event }) => {
      if (
        event.type !== 'PLACE_BET' ||
        event.betPanel.betId ||
        context.phase !== 'BETTING'
      )
        return;
      // Logger.log('Placing bet:', event.betPanel);
      context.socketService?.emit(SocketEvent.BET, {
        ...event.betPanel,
        autoCashout: event.betPanel.autoCashoutEnabled
          ? event.betPanel.autoCashout
          : 0,
        userId: context.player?.userId,
        vendorBonusId: '',
      });
    },
    sendAvatarUpdate: ({ context, event }) => {
      if (event.type !== 'SEND_AVATAR_UPDATE') return;
      context.socketService?.emit(SocketEvent.AVATAR_UPDATE, {
        avatar: event.avatar,
      });
    },
    sendNewClientSeed: ({ context, event }) => {
      if (event.type !== 'SEND_NEW_CLIENT_SEED') return;
      context.socketService?.emit(SocketEvent.NEW_CLIENT_SEED, {
        clientSeed: event.newClientSeed,
      });
    },
    setManualClientSeed: assign(({ context, event }) => {
      if (event.type !== 'SET_MANUAL_CLIENT_SEED')
        return {};
      return {
        manualClientSeed: event.isManual,
      };
    }),
    cancelBet: ({ context, event }) => {
      if (
        event.type !== 'CANCEL_BET' ||
        !event.betPanel.betId ||
        context.phase !== 'BETTING'
      )
        return;
      Logger.log('Canceling bet:', event.betPanel);
      context.socketService?.emit(SocketEvent.CANCEL, {
        order: event.betPanel.order,
        processBetId: event.betPanel.betId,
        userId: context.player?.userId,
        vendorBonusId: '',
      });
    },
    cashoutBet: ({ context, event }) => {
      if (
        event.type !== 'CASHOUT_BET' ||
        !event.betPanel.betId ||
        context.phase !== 'PLAYING'
      )
        return;
      // Logger.log('Cashout bet:', event.betPanel);
      context.socketService?.emit(SocketEvent.CASHOUT, {
        order: event.betPanel.order,
        processBetId: event.betPanel.betId,
        userId: context.player?.userId,
        vendorBonusId: '',
      });
    },
    updateBoomers: assign(({ context, event }) => {
      if (event.type !== 'BOOMER_UPDATE') return {};

      const boomers = [...context.boomers];
      const newBoomers = [...event.boomers];

      newBoomers.forEach((boomer: any) => {
        if (!boomer) return;

        const type = boomer.t as 'BET' | 'CASHOUT' | 'CANCEL';

        if (type === 'BET') {
          // Yeni kayıt — eksik alanlara mantıklı default ver
          const newItem = {
            id: boomer.id,
            amount: boomer.a ?? 0,
            winAmount: boomer.w ?? 0,
            avatar: boomer.av ?? 0,
            multiplier: boomer.m ?? 1,
            username: boomer.u ?? 'unknown',
          };
          boomers.push(newItem);
          return;
        }

        const idx = boomers.findIndex(b => b.id === boomer.id);
        if (idx === -1) return;

        if (type === 'CASHOUT') {
          // Sadece gelen alanları patch et, gelmeyenleri koru
          const patch: Partial<typeof boomers[number]> = {};
          if (boomer.a !== undefined) patch.amount = boomer.a;
          if (boomer.w !== undefined) patch.winAmount = boomer.w;
          if (boomer.av !== undefined) patch.avatar = boomer.av;
          if (boomer.m !== undefined) patch.multiplier = boomer.m;
          if (boomer.u !== undefined) patch.username = boomer.u; // yoksa eski kalsın

          boomers[idx] = { ...boomers[idx], ...patch };
          return;
        }

        if (type === 'CANCEL') {
          boomers.splice(idx, 1);
        }
      });

      return {
        boomers: context.sortBoomers(boomers).slice(0, context.statsCount),
      };
    }),
    updatePhase: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_PHASE' || context.phase === event.phase)return {};
      const betPanels = [...context.betPanels];
      let boomers = [...context.boomers];

      if (event.phase === 'BETTING') {
        // Eğer oyun dağıtım aşamasındaysa, tüm panelleri pasif yap
        betPanels.forEach((panel) => {
          panel.isActive = false;
          panel.betId = null; // Bet ID'yi sıfırla
        });
        boomers = [];
      }
      return {
        betPanels,
        phase: event.phase,
        boomers,
      };
    }),
    updateStateValues: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_PHASE') return {};
      return {
        multiplier: event.multiplier || 1,
        countdown: event.countdown || 0,
      };
    }),
    updateTotalBetCount: assign(({ context, event }) => {
      if (event.type !== 'SET_TOTAL_BET_COUNT') return {};
      // Logger.log("Edleron updateTotalBetCount", event.totalBetCount);
      return { totalBetCount: event.totalBetCount || 0 };
    }),
    jackpotUpdateReceived: assign(({ context, event }) => {
      if (event.type !== 'JACKPOT_UPDATE_RECEIVED') return {};
      return { jackpotAmounts: event.jackpotAmounts };
    }),
    newClientSeedHash: assign(({ event }) => {
      if (event.type !== 'NEW_CLIENT_SEED_HASH') return {};
      return { clientSeed: event.clientSeed };
    }),
    newServerSeedHash: assign(({ event }) => {
      if (event.type !== 'NEW_SERVER_SEED_HASH') return {};
      return { serverSeedHash: { seed: event.serverSeedHash.seed, hash: event.serverSeedHash.hash } };
    }),
    startBlinkJPMeter: assign(({ context, event }) => {
      if (event.type !== 'START_BLINK_JP_METER') return {};
      context.game?.playOtherJackpotSound(event.jackpotType);
      return { blinkJackpotMeter: event.jackpotType };
    }),
    stopBlinkJPMeter: assign(({ event }) => {
      if (event.type !== 'STOP_BLINK_JP_METER') return {};
      return { blinkJackpotMeter: null, jackpotWinAmount: null };
    }),
    updateCashoutStats: assign(({ context, event }) => {
      if (event.type !== 'CASHOUT_STATS') return {};
      // Logger.log("Edleron updateCashoutStats:", event.cashoutCount, event.cashoutAmount);
      return {
        cashoutStats: {
          cashoutCount: event.cashoutCount || 0,
          cashoutAmount: event.cashoutAmount || 0,
        },
      };
    }),
    handleBackendNotifications: assign(({ context, event, self }) => {
      if (event.type !== 'NOTIFICATIONS') return {};
      const { code, data } = event.notification;
      // Logger.log('Handling notification:', code, data);

      switch (code) {
        case NOTIFY_CODES.CASHOUT:
          if (!context.player || data.balance === undefined) return {};

          const notification = {
            type: 'win',
            message: `You won $${data.winAmount} at ${data.multiplier}x`,
            duration: 2,
            amount: data.winAmount,
            multiplier: data.multiplier,
          };

          // Show the win notification
          context.game?.showWin(notification);
          self.send({ type: 'FETCH_PLAYER_HISTORY', limit: 10, offset: 0 });
          return {
            player: {
              ...context.player,
              balance: data.balance,
            },
            betPanels: context.updatePanelState(
              context,
              data.order,
              null,
              false,
              true
            ),
          };


        case NOTIFY_CODES.JACKPOT_WIN:
          Logger.log('Handling JACKPOT WIN:', event);
          if (!context.player || data.balance === undefined) return {};

          const notif = {
            type: data?.type ?? 'default',
            amount: data?.winAmount,
            multiplier: data?.multiplier,
          };

          // Show the win notif
          context.game?.showJackpot(notif);
          return {
            player: {
              ...context.player,
              balance: data.balance,
            },
            jackpotWinAmount: data?.winAmount || 0,
          };

        case NOTIFY_CODES.BET:
          if (!context.player || data.balance === undefined) return {};
          return {
            player: {
              ...context.player,
              balance: data.balance,
            },
            betPanels: context.updatePanelState(
              context,
              data.order,
              data.betId,
              true
            ),
          };
        case NOTIFY_CODES.CANCEL:
          if (!context.player || data.balance === undefined || !data.order)
            return {};
          return {
            player: {
              ...context.player,
              balance: data.balance,
            },
            betPanels: context.updatePanelState(
              context,
              data.order,
              null,
              false
            ),
          };
        case NOTIFY_CODES.AVATAR_UPDATED:
          if (!context.player || data.avatar === undefined)
            return {};
          return {
            player: {
              ...context.player,
              avatar: data.avatar,
            },
          };
        case NOTIFY_CODES.CLIENT_SEED_UPDATED:
          if (!data.clientSeed)
            return {};
          return {
            clientSeed: data.clientSeed || '',
          };

        case NOTIFY_CODES.InsufficientFunds:
        case NOTIFY_CODES.DISCONNECT:
        case NOTIFY_CODES.ALREADY_LOGGED:
        case NOTIFY_CODES.TokenNotFound:
        case NOTIFY_CODES.UnknownError:
        case NOTIFY_CODES.API_ERROR:
        case NOTIFY_CODES.EXPIRED:
          self.send({
            type: 'ADD_NOTIFICATION',
            notification: {
              type: 'error',
              message: code,
              duration: 2,
            },
          });
          return {};
        default:
          Logger.warn('Unhandled notification code:', code);
          return {};
      }
    }),
    //EDLERON API player history requests
    requestPlayerHistory: ({ context, event, self }) => {
      if (event.type !== 'FETCH_PLAYER_HISTORY') return;
      context.apiLoadingHandle = true;
      context.apiErrorHandle = null;
      context.apiService
        .playerHistory({ limit: event.limit, offset: event.offset })
        .subscribe({
          next: (res: any) => {
            const data: PlayerHistoryData = {
              status: res?.status,
              bets: Array.isArray(res) ? res : (res?.bets ?? []),
              total: (Array.isArray(res) ? res.length : (res?.total ?? 0)),
              more: res?.more,
              pagination: res?.pagination,
            };
            self.send({ type: 'PLAYER_HISTORY_SUCCESS', data });
          },
          error: (err) =>
            self.send({ type: 'PLAYER_HISTORY_FAILURE', error: err?.message ?? 'History request failed' }),
        });
    },
    setPlayerHistory: assign(({ context, event }) => {
      if (event.type !== 'PLAYER_HISTORY_SUCCESS') return {};
      return {
        playerHistoryData: event.data,
        apiLoadingHandle: false,
      };
    }),
    failPlayerHistory: assign(({ context, event }) => {
      if (event.type !== 'PLAYER_HISTORY_FAILURE') return {};
      return {
        apiErrorHandle: event.error,
        apiLoadingHandle: false,
      };
    }),
    //EDLERON API bet details requests  
    requestBetDetails: ({ context, event, self }) => {
      if (event.type !== 'FETCH_BET_DETAILS') return;
      context.apiLoadingHandle = true;
      context.apiErrorHandle = null;
      context.apiService
        .betDetails(event.betId)
        .subscribe({
          next: (res: any) => {
            const data: BetDetailsData = {
              status: res?.status,
              bet: res?.bet || res,
            };
            self.send({ type: 'BET_DETAILS_SUCCESS', data });
          },
          error: (err) =>
            self.send({ type: 'BET_DETAILS_FAILURE', error: err?.message ?? 'Bet details request failed' }),
        });
    },
    setBetDetails: assign(({ context, event }) => {
      if (event.type !== 'BET_DETAILS_SUCCESS') return {};
      return {
        betDetailsData: event.data,
        apiLoadingHandle: false,
      };
    }),
    failBetDetails: assign(({ context, event }) => {
      if (event.type !== 'BET_DETAILS_FAILURE') return {};
      return {
        apiErrorHandle: event.error,
        apiLoadingHandle: false,
      };
    }),
    //API round details requests  
    requestRoundDetails: assign(({ event }) => {
      if (event.type !== 'FETCH_ROUND_DETAILS') return {};
      return {
        apiLoadingHandle: true,
        apiErrorHandle: null,
      };
    }),
    doRoundDetailsRequest: ({ event, self, context }) => {
      if (event.type !== 'FETCH_ROUND_DETAILS') return;

      context.apiService
        .roundDetails(event.roundId)
        .pipe(take(1))
        .subscribe({
          next: (res: any) => {
            self.send({
              type: 'ROUND_DETAILS_SUCCESS',
              data: {
                status: res?.status,
                round: res?.round,
              },
            });
          },
          error: (err) =>
            self.send({
              type: 'ROUND_DETAILS_FAILURE',
              error: err?.message ?? 'Round details request failed',
            }),
        });
    },
    setRoundDetails: assign(({ context, event }) => {
      if (event.type !== 'ROUND_DETAILS_SUCCESS') return {};
      return {
        roundDetailsData: event.data,
        apiLoadingHandle: false,
      };
    }),
    failRoundDetails: assign(({ context, event }) => {
      if (event.type !== 'ROUND_DETAILS_FAILURE') return {};
      return {
        apiErrorHandle: event.error,
        apiLoadingHandle: false,
      };
    }),
    //EDLERON API general round requests
    requestGeneralRound: ({ context, event, self }) => {
      if (event.type !== 'FETCH_GENERAL_ROUND') return;
      context.apiLoadingHandle = true;
      context.apiErrorHandle = null;
      context.apiService.generalRound()
        .subscribe({
          next: (res: any) => {
            const data: GeneralRoundData = {
              status: res?.status,
              rounds: res?.rounds,
            };
            self.send({ type: 'GENERAL_ROUND_SUCCESS', data });
          },
          error: (err) =>
            self.send({
              type: 'GENERAL_ROUND_FAILURE',
              error: err?.message ?? 'General round request failed',
            }),
        });

    },
    setGeneralRound: assign(({ context, event }) => {
      if (event.type !== 'GENERAL_ROUND_SUCCESS') return {};
      const data = event.data || {};
      const raw = Array.isArray(data.rounds) ? data.rounds : [];
      const normalized = raw.map((r: any) => ({
        id: r.id,
        crash: r.crash,
        clientSeeds: r.clientSeeds ?? [],
        createdAt: r.createdAt,
        betCount: r.betCount,
        hash: r.hash,
        sha: r.sha,
      }));

      // TODO > 1.000.000 x' hiç gitmemelidir.

      let sectionOne = 0;
      let sectionTwo = 0;
      let sectionThree = 0;
      let sectionFour = 0;
      let sectionFive = 0;
      let sectionSix = 0;
      let sectionSeven = 0;
      const totalRounds = normalized.length;
      normalized.forEach(r => {
        if (r.crash === 1.00) sectionOne++;
        if (r.crash >= 1.01 && r.crash <= 2.00) sectionTwo++;
        if (r.crash >= 2.01 && r.crash <= 5.00) sectionThree++;
        if (r.crash >= 5.01 && r.crash <= 10.00) sectionFour++;
        if (r.crash >= 10.01 && r.crash <= 100.00) sectionFive++;
        if (r.crash >= 100.01 && r.crash <= 1000.00) sectionSix++;
        if (r.crash > 1000.00) sectionSeven++;
      });

      const percentOne = ((sectionOne / totalRounds) * 100).toFixed(2);
      const percentTwo = ((sectionTwo / totalRounds) * 100).toFixed(2);
      const percentThree = ((sectionThree / totalRounds) * 100).toFixed(2);
      const percentFour = ((sectionFour / totalRounds) * 100).toFixed(2);
      const percentFive = ((sectionFive / totalRounds) * 100).toFixed(2);
      const percentSix = ((sectionSix / totalRounds) * 100).toFixed(2);
      const percentSeven = ((sectionSeven / totalRounds) * 100).toFixed(2);

      const rawCharts = [
        { range: '1.00x', percent: percentOne },
        { range: '1.01x - 2.00x', percent: percentTwo },
        { range: '2.01x - 5.00x', percent: percentThree },
        { range: '5.01x - 10.00x', percent: percentFour },
        { range: '10.01x - 100.00x', percent: percentFive },
        { range: '100.01x - 1.000.00x', percent: percentSix },
        { range: '1.000.01x - 5.000.00x', percent: percentSeven },
      ];

      return {
        generalRoundData: {
          status: data.status,
          rounds: normalized,
          charts: rawCharts
        },
        apiLoadingHandle: false,
      };
    }),
    failGeneralRound: assign(({ context, event }) => {
      if (event.type !== 'GENERAL_ROUND_FAILURE') return {};
      return {
        apiErrorHandle: event.error,
        apiLoadingHandle: false,
      };
    }),
    //EDLERON API Best > Cashed
    requestBestCashed: (({ context, event, self }) => {
      if (event.type !== 'FETCH_BEST_CASHED') return;
      context.apiLoadingHandle = true;
      context.apiErrorHandle = null;
      context.apiService.topCashouts(event.periodVal)
        .subscribe({
          next: (res: any) => {
            const data = {
              status: res?.status,
              total: res?.total,
              data: res?.data,
            };
            self.send({ type: 'BEST_CASHED_SUCCESS', data });
          },
          error: (err) =>
            self.send({ type: 'BEST_CASHED_FAILURE', error: err?.message ?? 'Best cashed request failed' }),
        });
    }),
    setBestCashed: assign(({ context, event }) => {
      if (event.type !== 'BEST_CASHED_SUCCESS') return {};
      return {
        bestCashedData: event.data,
        apiLoadingHandle: false,
      };
    }),
    failBestCashed: assign(({ context, event }) => {
      if (event.type !== 'BEST_CASHED_FAILURE') return {};
      return {
        apiErrorHandle: event.error,
        apiLoadingHandle: false,
      };
    }),
    //EDLERON API Best > Wins
    requestBestWins: (({ context, event, self }) => {
      if (event.type !== 'FETCH_BEST_WINS') return;
      context.apiLoadingHandle = true;
      context.apiErrorHandle = null;
      context.apiService.topWins(event.periodVal)
        .subscribe({
          next: (res: any) => {
            const data = {
              status: res?.status,
              total: res?.total,
              data: res?.data,
            };
            self.send({ type: 'BEST_WINS_SUCCESS', data });
          },
          error: (err) =>
            self.send({ type: 'BEST_WINS_FAILURE', error: err?.message ?? 'Best wins request failed' }),
        });
    }),
    setBestWins: assign(({ context, event }) => {
      if (event.type !== 'BEST_WINS_SUCCESS') return {};
      return {
        bestWinsData: event.data,
        apiLoadingHandle: false,
      };
    }),
    failBestWins: assign(({ context, event }) => {
      if (event.type !== 'BEST_WINS_FAILURE') return {};
      return {
        apiErrorHandle: event.error,
        apiLoadingHandle: false,
      };
    }),
    //EDLERON API Best > Result
    requestBestResult: (({ context, event, self }) => {
      if (event.type !== 'FETCH_BEST_RESULT') return;
      context.apiLoadingHandle = true;
      context.apiErrorHandle = null;
      context.apiService.topRounds(event.periodVal)
        .subscribe({
          next: (res: any) => {
            const data = {
              status: res?.status,
              total: res?.total,
              data: res?.data,
            };
            self.send({ type: 'BEST_RESULT_SUCCESS', data });
          },
          error: (err) =>
            self.send({ type: 'BEST_RESULT_FAILURE', error: err?.message ?? 'Best result request failed' }),
        });
    }),
    setBestResult: assign(({ context, event }) => {
      if (event.type !== 'BEST_RESULT_SUCCESS') return {};
      return {
        bestResultData: event.data,
        apiLoadingHandle: false,
      };
    }),
    failBestResult: assign(({ context, event }) => {
      if (event.type !== 'BEST_RESULT_FAILURE') return {};
      return {
        apiErrorHandle: event.error,
        apiLoadingHandle: false,
      };
    }),
    onUiClick: assign(({ context, event }) => {
      const game = context.game;
      if (!game) return {};

      (async () => {
        try {
          let uniqueAction: string | null = null;

          if ('meta' in event && event.meta?.originalEvent?.target) {
            const t = event.meta.originalEvent.target as HTMLElement | null;

            if (t) {
              let buttonEl: HTMLElement | null =
                t.closest("button") as HTMLElement | null;

              if (!buttonEl && t.getAttribute?.("role") === "button") {
                buttonEl = t;
              }

              if (!buttonEl && t.classList.contains("btn")) {
                buttonEl = t;
              }

              if (buttonEl) {
                uniqueAction = buttonEl.getAttribute("data-action");
              }
            }
          }

          game.handleUiClick(uniqueAction);
        } catch (err) {
          Logger.error("handleUiClick failed:", err);
        }
      })();

      return {};
    }),
    // EDLERON SOUNDS
    toggleBgmVolume: ({ context, event }) => {
      if ((event as any).type !== 'TOGGLE_BGM') return;
      const vol = Number((event as any).volume) || 0;
      try {
        context.game?.bgmToggleSetVolume?.(vol).catch?.(() => { });
      } catch (err) {
        Logger.warn('toggleBgmVolume failed', err);
      }
    },
    toggleSfxVolume: ({ context, event }) => {
      if ((event as any).type !== 'TOGGLE_SFX') return;
      const vol = Number((event as any).volume) || 0;
      try {
        context.game?.sfxToggleSetVolume?.(vol).catch?.(() => { });
      } catch (err) {
        Logger.warn('toggleSfxVolume failed', err);
      }
    },
    toggleAnimVisibility: ({ context, event }) => {
      if ((event as any).type !== 'TOGGLE_ANIM') return;
      const visible = Boolean((event as any).visible) || false;
      try {
        context.game?.animToggleSetVisible?.(visible).catch?.(() => { });
      } catch (err) {
        Logger.warn('toggleAnimVisibility failed', err);
      }
    },
  },
  actors: {
    loadAndBootGame: fromPromise(
      async ({ input }: { input: CrashGameInput }) => {
        Logger.log('Starting asset loading and game boot...');

        // 1. Gerekli asset'leri yükle
        if (input.gameConf.assets) {
          await input.assetLoader.loadGameAssets(input.gameConf.assets);
          Logger.log('Assets loaded successfully.');
        }

        // 2. Oyun sınıfını bul ve başlat (boot)
        if ((globalThis as any).App.CrashGame) {
          const gameInstance = new (globalThis as any).App.CrashGame() as ICrashGame;
          await gameInstance.boot(input.gameConf, input.providerInfo);
          Logger.log('Game booted successfully.');

          if (isDevMode()) {
            (globalThis as any).__PIXI_APP__ = gameInstance.app;
          }
          return gameInstance; // Başarılı olunca oyun nesnesini döndür
        } else {
          throw new Error('CrashGame class not found on globalThis.');
        }
      }
    ),
  },
  guards: {},
}).createMachine({
  id: 'gameMachine',
  initial: 'initialize',
  context: ({ input }) => ({
    screen: 'initialize',
    stageCreated: false,
    gameConf: input.gameConf,
    uiConf: input.uiConf,
    providerInfo: input.providerInfo,
    socketFactory: input.socketFactory,
    assetLoader: input.assetLoader,
    pageLoadingService: input.pageLoadingService,
    apiService: input.apiService, // EDLERON API
    imageService: input.imageService,
    socketService: null,
    game: null,
    error: null,
    popup: null,
    chatMessages: [],
    chatErrorReason: 'BETNEEDED',
    chatUnlocked: false,
    player: null,
    betSettings: null,
    roundHistory: [],
    boomers: [],
    betPanels: [],
    notifications: [],
    phase: '',
    multiplier: 1,
    countdown: 0,
    statsCount: 50,
    totalBetCount: 0,
    cashoutStats: {
      cashoutCount: 0,
      cashoutAmount: 0,
    },
    jackpotAmounts: {
      mini: 0,
      minor: 0,
      major: 0,
      grand: 0,
      last: {
        mini: {
          distributedAt: '',
          winAmount: 0,
        },
        minor: {
          distributedAt: '',
          winAmount: 0,
        },
        major: {
          distributedAt: '',
          winAmount: 0,
        },
        grand: {
          distributedAt: '',
          winAmount: 0,
        }
      }
    },
    jackpotWinAmount: null,
    clientSeed: '',
    serverSeedHash: { seed: '', hash: '' },
    manualClientSeed: false,
    blinkJackpotMeter: null,
    sortBoomers: (boomers: Boomer[]) => {
      return boomers
        .sort((a: Boomer, b: Boomer) => b.amount - a.amount)
        .sort((a: Boomer, b: Boomer) => {
          if (a.amount === b.amount) {
            return a.username.localeCompare(b.username);
          }
          return 0;
        });
    },
    updatePanelState: (
      c: CrashGameContext,
      order: string,
      betId: string | null,
      isActive: boolean,
      fromCashout: boolean = false
    ) => {
      const panelIndex = c.betPanels.findIndex((p) => p.order === order);
      if (panelIndex === -1) return c.betPanels;
      const newPanels = [...c.betPanels];
      newPanels[panelIndex] = { ...newPanels[panelIndex], isActive, betId, busy: false };
      if (fromCashout && newPanels[panelIndex].autoBet) {
        newPanels[panelIndex].preBet = true;
      }
      if(!fromCashout){
        newPanels[panelIndex].preBet = false;
      }
      return newPanels;
    },
    // EDLERON API
    playerHistoryData: { bets: [], total: 0 },
    betDetailsData: null,
    roundDetailsData: null,
    generalRoundData: { rounds: [], charts: [] },
    apiLoadingHandle: false,
    apiErrorHandle: null,
    bestCashedData: { status: false, total: 0, data: [] },
    bestWinsData: { status: false, total: 0, data: [] },
    bestResultData: { status: false, total: 0, data: [] },
    // Visibility tracking
    socketConnected: false,
    isVisible: !document.hidden,
    lastVisibilityTime: new Date().getTime(),
  }),
  states: {
    initialize: {
      entry: 'onInitialize',
      on: {
        FETCH_INIT_DATA: 'loading',
        GO_TO_MAINTENANCE: 'maintenance',
        GO_TO_CONNECTION_ERROR: 'connectionError',
      },
    },
    loading: {
      entry: 'fetchInitData',
      invoke: {
        src: 'loadAndBootGame',
        input: ({ context }) => context, // Aktöre tüm context'i girdi olarak ver
        onDone: {
          target: 'gameWelcome',
          actions: assign({ game: ({ event }) => event.output }), // Aktörden dönen sonucu context'e ata
        },
        onError: {
          target: 'error',
          actions: ({ event }) =>
            Logger.error('Failed to load/boot game:', event.error),
        },
      },
    },
    gameWelcome: {
      entry: 'onLoading',
      on: {
        GAME_READY: 'game',
      },
    },
    game: {
      entry: ['onGameReady', 'bindSocketEvents', 'fetchInitData'],
      on: {
        FETCH_INIT_DATA: { actions: 'fetchInitData' },
        GO_TO_MAINTENANCE: 'maintenance',
        GO_TO_CONNECTION_ERROR: 'connectionError',
        CANVAS_READY: { actions: 'onCanvasReady' },
        RESET: 'initialize',
        SEND_CHAT_MESSAGE: { actions: ['sendChatMessage', 'clearChatError'] },
        NEW_CHAT_MESSAGE: { actions: 'addChatMessage' },
        CHAT_ERROR: { actions: 'setChatError' },
        NEW_ROUND_INFO: { actions: 'addRoundHistory' },
        ADD_BET_PANEL: { actions: 'addBetPanel' },
        REMOVE_BET_PANEL: { actions: 'removeBetPanel' },
        UPDATE_BET_PANEL: { actions: ['updateBetPanel', 'checkAutoBet', 'checkChatUnlock'] },
        PLACE_BET: { actions: 'sendBet' },
        SEND_AVATAR_UPDATE: { actions: 'sendAvatarUpdate' },
        SEND_NEW_CLIENT_SEED: { actions: 'sendNewClientSeed' },
        SET_MANUAL_CLIENT_SEED: { actions: 'setManualClientSeed' },
        DECREMENT_AUTO_BET: { actions: 'decrementAutoBetCount' },
        INCREASE_AUTO_BET: { actions: 'increaseAutoBetCount' },
        CANCEL_BET: { actions: 'cancelBet' },
        CASHOUT_BET: { actions: 'cashoutBet' },
        BOOMER_UPDATE: { actions: 'updateBoomers' },
        CASHOUT_STATS: { actions: 'updateCashoutStats' },
        NOTIFICATIONS: { actions: 'handleBackendNotifications' },
        ADD_NOTIFICATION: { actions: 'addNotification' },
        REMOVE_NOTIFICATION: { actions: 'removeNotification' },
        UPDATE_PHASE: { actions: ['updatePhase', 'updateStateValues', 'checkChatUnlock'] },
        SET_TOTAL_BET_COUNT: { actions: 'updateTotalBetCount' },
        JACKPOT_UPDATE_RECEIVED: { actions: 'jackpotUpdateReceived' },
        NEW_CLIENT_SEED_HASH: { actions: 'newClientSeedHash' },
        NEW_SERVER_SEED_HASH: { actions: 'newServerSeedHash' },
        START_BLINK_JP_METER: { actions: 'startBlinkJPMeter' },
        STOP_BLINK_JP_METER: { actions: 'stopBlinkJPMeter' },
        // EDLERON API Player History
        FETCH_PLAYER_HISTORY: { actions: 'requestPlayerHistory' },
        PLAYER_HISTORY_SUCCESS: { actions: 'setPlayerHistory' },
        PLAYER_HISTORY_FAILURE: { actions: 'failPlayerHistory' },
        // EDLERON API Bet Details
        FETCH_BET_DETAILS: { actions: 'requestBetDetails' },
        BET_DETAILS_SUCCESS: { actions: 'setBetDetails' },
        BET_DETAILS_FAILURE: { actions: 'failBetDetails' },
        FETCH_ROUND_DETAILS: {actions: ['requestRoundDetails', 'doRoundDetailsRequest']},
        ROUND_DETAILS_SUCCESS: { actions: 'setRoundDetails' },
        ROUND_DETAILS_FAILURE: { actions: 'failRoundDetails' },
        // EDLERON API General Round Data
        FETCH_GENERAL_ROUND: { actions: 'requestGeneralRound' },
        GENERAL_ROUND_SUCCESS: { actions: 'setGeneralRound' },
        GENERAL_ROUND_FAILURE: { actions: 'failGeneralRound' },
        // EDLERON API Best > Cashed
        FETCH_BEST_CASHED: { actions: 'requestBestCashed' },
        BEST_CASHED_SUCCESS: { actions: 'setBestCashed' },
        BEST_CASHED_FAILURE: { actions: 'failBestCashed' },
        // EDLERON API Best > Wins
        FETCH_BEST_WINS: { actions: 'requestBestWins' },
        BEST_WINS_SUCCESS: { actions: 'setBestWins' },
        BEST_WINS_FAILURE: { actions: 'failBestWins' },
        // EDLERON API Best > Result
        FETCH_BEST_RESULT: { actions: 'requestBestResult' },
        BEST_RESULT_SUCCESS: { actions: 'setBestResult' },
        BEST_RESULT_FAILURE: { actions: 'failBestResult' },
        HANDLE_UI_CLICK: { actions: 'onUiClick' },
        // EDLERON SOUNDS
        TOGGLE_BGM: { actions: 'toggleBgmVolume' },
        TOGGLE_SFX: { actions: 'toggleSfxVolume' },
        TOGGLE_ANIM: { actions: 'toggleAnimVisibility' },
        UPDATE_VISIBILITY_TIME: { actions: 'updateVisibilityTime' },
        SET_SOCKET_STATUS: { actions: 'setSocketStatus' },
        // Visibility change handling
        // VISIBILITY_CHANGE: { actions: 'handleVisibilityChange' },
      },
    },
    maintenance: {
      entry: 'onMaintenance',
      on: {
        RESET: 'initialize',
      },
    },
    connectionError: {
      entry: 'onConnectionError',
      on: {
        RESET: 'initialize',
      },
    },
    error: {
      tags: ['error'],
      entry: assign(({ context }) => ({
        popup: { type: 'error', data: { message: context.error } },
      })),
    },
  },
});

// Export types for type-safe configuration
export type CrashGameMachineType = StateFrom<typeof crashLogic>;
export type CrashGameLogicType = typeof crashLogic;
