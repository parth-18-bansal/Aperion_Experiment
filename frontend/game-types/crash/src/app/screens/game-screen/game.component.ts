import { Component, ElementRef, Inject, inject, LOCALE_ID, QueryList, ViewChild, ViewChildren } from '@angular/core';
import {TranslatePipe} from "@ngx-translate/core";
import { AsyncPipe, CommonModule, NgClass, NgIf } from '@angular/common';
import { BehaviorSubject, distinctUntilChanged, map, Observable, shareReplay } from 'rxjs';
import { StateMachineService } from '../../services/state-machine.service';
import { GameViewComponent } from '../../components/game-view/game-view.component';
import { ChatBoxComponent } from '../../components/chat-box/chat-box.component';
import { RoundHistoryComponent } from '../../components/round-history/round-history.component';
import { BetPanelComponent } from '../../components/bet-panel/bet-panel.component';
import { PlayerBalanceComponent } from '../../components/player-balance/player-balance.component';
import { TotalBetComponent } from '../../components/total-bet/total-bet.component';
import { BetListComponent } from '../../components/bet-list/bet-list.component';
import { NotificationsComponent } from '../../components/notifications/notifications.component';
import { MenuComponent } from '../../components/menu-panel/menu.component';
import { QuickGuideModalComponent } from '../../components/quick-guide-modal/quick-guide-modal.component';
import { GameHelpModalComponent } from '../../components/game-help-modal/game-help-modal.component';
import { ProvablyFairModalComponent } from '../../components/provably-fair-modal/provably-fair-modal.component';
import { PayoutsModalComponent } from '../../components/payouts-modal/payouts-modal.component';
import { HistoryModalComponent } from '../../components/history-modal/history-modal.component';
import { ResultFairnessComponent } from '../../components/result-fairness/result-fairness.component';
import { EditAvatarComponent } from '../../components/edit-avatar/edit-avatar.component';
import { JackpotAmounts, RoundDetailsData } from '../../crash/interfaces';
import { TmNgOdometerModule } from 'odometer-ngx';
import { getCurrencySym } from '../../utils/getCurrencySymbol';
import { ImagePreloadService } from '../../services/image-preload.service';
@Component({
  selector: 'app-game',
  templateUrl: './game.html',
  styleUrl: './game.scss',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    TmNgOdometerModule,
    NgClass,
    CommonModule,
    TranslatePipe,
    GameViewComponent,
    ChatBoxComponent,
    RoundHistoryComponent,
    BetPanelComponent,
    PlayerBalanceComponent,
    TotalBetComponent,
    BetListComponent,
    MenuComponent,
    NotificationsComponent,
    HistoryModalComponent,
    QuickGuideModalComponent,
    GameHelpModalComponent,
    ProvablyFairModalComponent,
    PayoutsModalComponent,
    ResultFairnessComponent,
    EditAvatarComponent
  ],
})
export class GameComponent {
  @ViewChild('headerRef') headerRef!: ElementRef;
  @ViewChild('mobJackpotRef') mobJackpotRef!: ElementRef;
  @ViewChild('footerRef') footerRef!: ElementRef;
  @ViewChild('betPanelRef') betPanelRef!: ElementRef;
  @ViewChild('middleGameAreaContainer') middleGameAreaContainer!: ElementRef;
  @ViewChildren('grandJackpotRef') grandJackpotRefs!: QueryList<ElementRef>;
  @ViewChildren('majorJackpotRef') majorJackpotRefs!: QueryList<ElementRef>;
  @ViewChildren('minorJackpotRef') minorJackpotRefs!: QueryList<ElementRef>;
  @ViewChildren('miniJackpotRef') miniJackpotRefs!: QueryList<ElementRef>;

  betListHeight: number = 200;
  gameViewHeight: number = 200;
  isMobile = false;
  isMobileBetListOpen = false;
  hasJackpotFeature = false;
  betSettings: any = null;
  isModalOpen = false;
  isLandscape = false;
  activeModal: 'history' | 'quickGuide' | 'provablyFair' | 'gameHelp' | 'payouts' | 'resultFairness' | 'editAvatar' | 'none' = 'none';
  jackpotAmounts: JackpotAmounts | null = null;
  virtualKeyboardHeight: number = 150;
  jackpotWinAmount: number | null = null;
  jackpotWinType: string | null = null;

  private stateMachine = inject(StateMachineService);
  getCurrencySym = getCurrencySym;

  
  constructor(@Inject(LOCALE_ID) private locale: string) {}

  // State machine'in durumunu dinleyerek canvas'ın gösterilip gösterilmeyeceğini belirleyen Observable
  readonly showGameView$ = this.stateMachine.state$.pipe(
    map((state) => state.matches('gameWelcome') || state.matches('game'))
  );

  // State machine'in context'inden canvas elementini alan Observable
  readonly canvas$ = this.stateMachine.state$.pipe(
    map((state) => state.context.game?.app.canvas)
  );

  // TODO -> Check metod refactors
  // State machine'in context'inden canvas elementini alan Observable
  readonly game$ = this.stateMachine.state$.pipe(
    map((state) => state.context.game)
  );
  

  // State machine'in context'inden sohbet mesajlarını alan Observable
  readonly messages$ = this.stateMachine.state$.pipe(
    map((state) => state.context.chatMessages)
  );

  // State machine'in context'inden geçmiş tur bilgilerini alan Observable
  readonly roundHistory$ = this.stateMachine.state$.pipe(
    map((state) => state.context.roundHistory)
  );

  // State machine'in context'inden bet panel bilgilerini alan Observable
  readonly betPanels$ = this.stateMachine.state$.pipe(
    map((state) => state.context.betPanels)
  );

  // State machine'in context'inden player bilgilerini alan Observable
  readonly player$ = this.stateMachine.state$.pipe(
    map((state) => state.context.player)
  );

  // State machine'in context'inden provider bilgilerini alan Observable
  readonly providerInfo$ = this.stateMachine.state$.pipe(
    map((state) => state.context.providerInfo)
  );

  // State machine'in context'inden boomer listesini alan Observable
  readonly boomers$ = this.stateMachine.state$.pipe(
    map((state) => state.context.boomers)
  );

  // State machine'in context'inden oyunun mevcut fazını alan Observable
  readonly phase$ = this.stateMachine.state$.pipe(
    map((state) => state.context.phase)
  );

  // State machine'in context'inden total bet yapan kişiler
  readonly totalBetCount$ = this.stateMachine.state$.pipe(
    map((state) => state.context.totalBetCount)
  );

  // State machine'in context'inden total bet yapan kişiler
  readonly jackpotAmounts$ = this.stateMachine.state$.pipe(
    map((state) => state.context.jackpotAmounts)
  );

  // State machine'in context'inden cashout bilgisini alan Observable
  readonly cashoutStats$ = this.stateMachine.state$.pipe(
    map((state) => state.context.cashoutStats)
  );

  // State machine'in context'inden cashout bilgisini alan Observable
  readonly stats$ = this.stateMachine.state$.pipe(
    map((state) => state.context.generalRoundData.charts)
  );

  // State machine'in context'inden best cashout alan observable
  readonly bestCashed$ = this.stateMachine.state$.pipe(
    map((state) => state.context.bestCashedData)
  );

  // State machine'in context'inden best wins alan observable
  readonly bestWins$ = this.stateMachine.state$.pipe(
    map((state) => state.context.bestWinsData)
  );

  // State machine'in context'inden best wins alan observable
  readonly bestResult$ = this.stateMachine.state$.pipe(
    map((state) => state.context.bestResultData)
  );

  // State machine'in context'inden bildirimleri alan Observable
  readonly notifications$ = this.stateMachine.state$.pipe(
    map((state) => state.context.notifications)
  );

    // State machine'in context'inden provider bilgilerini alan Observable
  readonly providerCurrency$ = this.stateMachine.state$.pipe(
    map((state) => state.context.providerInfo?.currency)
  );

  readonly clientSeed$ = this.stateMachine.state$.pipe(
    map((state) => state.context.clientSeed)
  );

  readonly serverSeedHash$ = this.stateMachine.state$.pipe(
    map((state) => state.context.serverSeedHash)
  );

  readonly jackpotMeterBlinking$ = this.stateMachine.state$.pipe(
    map((state) => state.context.blinkJackpotMeter)
  );

  
  selectedRound: any = null;
  selectedRoundId: string = '';
  fromHistoryDetails: boolean = false;
  private lastIsDesktop = window.innerWidth > 1025;
  private imagePreload = inject(ImagePreloadService);
  async ngOnInit() {
    this.imagePreload.preload();

    if (this.stateMachine.actor) {
      const {context} = this.stateMachine.actor.getSnapshot();
      this.hasJackpotFeature = context.uiConf.hasJackpotFeature;
      this.betSettings = context.betSettings;
      if(this.betSettings?.chat === false){
        this.toggleChat(true);
      }
    }
    this.checkScreen();
    
    if(this.isMobile){
      // this will close the chat box if on mobile
      this.toggleChat(true);
    }

    this.jackpotAmounts$.subscribe((value) => {
      this.jackpotAmounts = value;
    });

    this.jackpotMeterBlinking$.subscribe((value) => {
      if(value !== null ){
        this.blinkJackpot(value)
      }
    });

    const mediaQuery = window.matchMedia("(orientation: portrait)");
    this.updateOrientation(mediaQuery.matches);
    mediaQuery.addEventListener("change", (event) => {
      this.updateOrientation(event.matches);
    });
    // this.checkKeyboardHeight();
  }

  updateOrientation(isPortrait: boolean) {
    this.isLandscape = !isPortrait;
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new CustomEvent("orientation-resize", { detail: { state: this.isLandscape } }));
    }, 100);
  }
  
  ngAfterViewInit(): void {
    this.calculateGameViewHeight();
    this.calculateBetListHeight();

    window.addEventListener("resize", () => this.checkScreen());
    window.addEventListener("resize", this.calculateGameViewHeight);
    window.addEventListener("resize", this.calculateBetListHeight);
    
    // This is to fit the game to the screen on load and prevemt scrollbars
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }

  /** 
   * Calculates the height of the bet list container based on the middle game view area.
   */
  calculateBetListHeight = () => {
    const calculatedHeight = this.gameViewHeight + this.betPanelRef.nativeElement.getBoundingClientRect().height;
    this.betListHeight = Math.max(calculatedHeight, 200);
  };

  /** Calculates the height of the game canvas container based on the available space in the viewport.
   * This is done so that the game view can adapt to different screen sizes and orientations and the bet panel
   * is always visible to the player. Min height is set to 120px to ensure the game view is always usable.
   * @param {number} marginPaddingExtras - Additional space to account for margins and paddings.
   */
  calculateGameViewHeight = () => {
    let marginPaddingExtras = window.innerWidth <=1025 ? 30 : 25 // Adjust this value based on your layout needs

    const headerHeight = this.headerRef.nativeElement.getBoundingClientRect().height;
    const mobJackpotHeight = this.mobJackpotRef.nativeElement.getBoundingClientRect().height;
    const footerHeight = this.footerRef.nativeElement.getBoundingClientRect().height;
    const betPanelHeight = this.isMobile && this.isLandscape ? 0 : this.betPanelRef.nativeElement.getBoundingClientRect().height;

    const totalUsedHeight = headerHeight + footerHeight + betPanelHeight + mobJackpotHeight;
    let availableHeight = window.innerHeight - totalUsedHeight;
    
    this.gameViewHeight = Math.max(availableHeight - marginPaddingExtras, 50);
    if(!this.lastIsDesktop && window.innerWidth >= 1025){
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100);
    }
    this.lastIsDesktop = window.innerWidth > 1025;
  };

  ngOnDestroy(): void {
    window.removeEventListener("resize", this.calculateGameViewHeight);
    window.removeEventListener("resize", this.checkScreen);
    window.removeEventListener("resize", this.calculateBetListHeight);
  }

  // Menu visibility state
  private isMenuVisibleSubject = new BehaviorSubject<boolean>(false);
  readonly isMenuVisible$ = this.isMenuVisibleSubject.asObservable();
  /** Toggles the visibility of the Menu sidebar. */
  toggleMenu(forceClose: boolean = false): void {
    this.isMenuVisibleSubject.next(forceClose ? false : !this.isMenuVisibleSubject.value);
    this.isMobileBetListOpen = false;

    if(this.isMobile) return;

    if (this.isChatVisibleSubject.value) return;

    if(this.isMenuVisible$){
      window.dispatchEvent(new Event("resize"));
    }
  }

  
  // Chat visibility state
  private isChatVisibleSubject = new BehaviorSubject<boolean>(true);
  readonly isChatVisible$ = this.isChatVisibleSubject.asObservable();
  /** Toggles the visibility of the chat sidebar. */
  toggleChat(forceClose: boolean = false): void {
    this.isChatVisibleSubject.next(forceClose ? false : !this.isChatVisibleSubject.value);
    this.toggleMenu(true);

    if (this.isMenuVisibleSubject.value) return;

    if (this.isChatVisible$) {
      window.dispatchEvent(new Event("resize"));
    }
  }
  
  toggleMobileBetList(forceClose: boolean = false): void {
    this.isMobileBetListOpen = forceClose ? false : !this.isMobileBetListOpen;
    this.isMenuVisibleSubject.next(false);
  }

  private isMusicEnabledSubject = new BehaviorSubject<boolean>(true);
  readonly isMusicEnabled$ = this.isMusicEnabledSubject.asObservable();
  toggleMusic(): void {
    // this.isMusicEnabledSubject.next(!this.isMusicEnabledSubject.value);
    const next = !this.isMusicEnabledSubject.value;
    this.isMusicEnabledSubject.next(next);
    // send event to state machine so crash.logic will call the game implementation
    const vol = next ? 1 : 0;
    this.stateMachine.actor?.send({ type: 'TOGGLE_BGM', volume: vol });
  }

  private isSoundEnabledSubject = new BehaviorSubject<boolean>(true);
  readonly isSoundEnabled$ = this.isSoundEnabledSubject.asObservable();
  toggleSound(): void {
    // this.isSoundEnabledSubject.next(!this.isSoundEnabledSubject.value);
    const next = !this.isSoundEnabledSubject.value;
    this.isSoundEnabledSubject.next(next);
    const vol = next ? 1 : 0;
    this.stateMachine.actor?.send({ type: 'TOGGLE_SFX', volume: vol });
  }

  private isAnimationEnabledSubject = new BehaviorSubject<boolean>(true);
  readonly isAnimationEnabled$ = this.isAnimationEnabledSubject.asObservable();
  toggleAnimation(): void {
    // this.isAnimationEnabledSubject.next(!this.isAnimationEnabledSubject.value);
    const next = !this.isAnimationEnabledSubject.value;
    this.isAnimationEnabledSubject.next(next);
    const value = next ? true : false;
    this.stateMachine.actor?.send({ type: 'TOGGLE_ANIM', visible: value });
  }

  private isSingleBetEnabledSubject = new BehaviorSubject<boolean>(false);
  readonly isSingleBetEnabled$ = this.isSingleBetEnabledSubject.asObservable();
  toggleSingleBet(): void {
    this.isSingleBetEnabledSubject.next(!this.isSingleBetEnabledSubject.value);
    this.toggleMenu(true);
    if(this.isMobile){
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 0);
    }
  }

  /** Removes a notification from the state machine. */
  onRemoveNotification(id: string): void {
    this.stateMachine.actor?.send({ type: 'REMOVE_NOTIFICATION', id });
  }

  checkScreen() {
    this.isMobile = window.innerWidth < 1025; // lg breakpoint
    if (!this.isMobile) {
      this.isMobileBetListOpen = false; // hide on desktop
    }
  }

  // checkKeyboardHeight() {
  //   const footerHeight = this.footerRef.nativeElement.getBoundingClientRect().height;
  //   const betPanelHeight = this.betPanelRef.nativeElement.getBoundingClientRect().height;
  //   this.virtualKeyboardHeight = footerHeight + betPanelHeight;
  // }
  
  openModal = (type: 'history' | 'quickGuide' | 'provablyFair' | 'gameHelp' | 'payouts' | 'editAvatar')  => {
    this.activeModal = type;
    this.isModalOpen = true;
    this.toggleMenu(true);
  }

  openRoundDetail(roundId: string) {
    if(roundId){
      this.closeModal();
      this.selectedRoundId = roundId;
      this.fromHistoryDetails = true;
      this.activeModal = 'resultFairness';
      this.isModalOpen = true;
    }
  }
  
  openFairnessModal(event: { type: 'resultFairness'; round: any }) {
    this.activeModal = event.type;
    this.isModalOpen = true;
    this.toggleMenu(true);
    this.selectedRound = event.round;
  }

  closeModal() {
    this.fromHistoryDetails = false;
    this.selectedRoundId = '';
    this.isModalOpen = false;
    this.activeModal = 'none';
  }

  tooltip = {
    type: '',
    date: '',
    amount: 0,
    left: '0',
    y: 0,
    right: 'unset',
    width: 0,
    height: 0,
    visible: false,
  };

  showTooltip(event: MouseEvent, type: keyof JackpotAmounts['last']) {
    const jackpots = this.jackpotAmounts;
    const last = jackpots?.last?.[type];
    const amount = last?.winAmount ?? 0;

    const date = last?.distributedAt
      ? new Date(last.distributedAt).toLocaleDateString(this.locale, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).toUpperCase()
      : '-';

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    const tooltipWidth = rect.width;
    let left = `${rect.left + rect.width / 2 - tooltipWidth / 2}`;
    let right = 'unset';

    if (window.innerWidth <= 1025) {
      if (type !== "mini") {
        left = `${rect.left}`;
        right = 'unset';
      } else {
        left = 'unset';
        right = window.innerWidth > 640 ? `12` : `3`;
      }
    }

    this.tooltip = {
      type,
      date,
      amount,
      left: left === 'unset' ? 'unset' : left + 'px',
      right: right === 'unset' ? 'unset' : right + 'px',
      y: rect.bottom + 6,
      width: tooltipWidth,
      height: rect.height,
      visible: true,
    };
  }

  hideTooltip() {
    this.tooltip.visible = false;
  }

  blinkJackpot(type: 'grand' | 'major' | 'minor' | 'mini', durationMs: number = 8000): void {
    const map: Record<string, QueryList<ElementRef>> = {
      grand: this.grandJackpotRefs,
      major: this.majorJackpotRefs,
      minor: this.minorJackpotRefs,
      mini: this.miniJackpotRefs,
    };

    const refs = map[type];
    if (!refs || refs.length === 0) return;

    
    if (this.stateMachine.actor) {
      const {context} = this.stateMachine.actor.getSnapshot();
      this.jackpotWinAmount = context.jackpotWinAmount;
      this.jackpotWinType = type;
    }

    refs.forEach((ref) => {
      const el = ref.nativeElement as HTMLElement;
      el.classList.add('jackpot-blink');

      setTimeout(() => {
        el.classList.remove('jackpot-blink');
        this.stateMachine.actor?.send({ type: 'STOP_BLINK_JP_METER' });
        this.jackpotWinAmount = null;
        this.jackpotWinType = null;
      }, durationMs);
    });
  }
  
}
