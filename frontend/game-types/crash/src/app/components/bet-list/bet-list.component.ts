import { Component, Input, ChangeDetectionStrategy, inject, ViewChild, ElementRef }        from '@angular/core';
import { CommonModule }                                     from '@angular/common';
import { Boomer, PlayerHistoryData, IProviderInfo, 
  CashoutStats, PlayerProfile, RoundDetails,
  BestCashedSchema, BestWinsSchema, BestResultSchema }                       from '../../crash/interfaces';
import { getMultiplierBgColor }                             from '../../utils/multiplierColor';
import { StateMachineService }                              from '../../services/state-machine.service';
import { Observable, BehaviorSubject }                      from 'rxjs';
import { map, distinctUntilChanged, shareReplay }           from 'rxjs/operators';
import { getAvatarPath, getRandomAvatarPath } from '../../utils/avatarUtils';
import { TranslatePipe } from '@ngx-translate/core';
import { getCurrencySym } from '../../utils/getCurrencySymbol';

@Component({
  selector: 'app-bet-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './bet-list.html',
  styleUrls: ['./bet-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BetListComponent {
  @Input() boomers                        : Boomer[]        | null                = [];
  @Input() player                         : PlayerProfile   | null                = null;
  @Input() totalBetCount                  : number                                = 0;
  @Input() cashoutStats                   : CashoutStats                          = {cashoutAmount: 0, cashoutCount: 0};
  @Input() provider_currency              : string                                = "";
  @Input() subtabs_stats_last_history     : RoundDetails[]                        = [];
  @Input() subtabs_best_cashed            : BestCashedSchema[]                    = [];
  @Input() subtabs_best_wins              : BestWinsSchema[]                      = [];
  @Input() subtabs_best_result            : BestResultSchema[]                    = [];
  @Input() subtabs_stats_stats_info       : any             | null                = null
  @ViewChild('bestTabScrollContainer') bestTabScrollContainer!: ElementRef<HTMLDivElement>;
  readonly tabs_history$!                 : Observable<PlayerHistoryData>;
  getMultiplierBgColor                    = getMultiplierBgColor
  getAvatarPath                           = getAvatarPath
  getRandomAvatarPath                     = getRandomAvatarPath
  getCurrencySym                          = getCurrencySym;
  Math                                    = Math

  // Pagination state for history tab
  currentOffset = 0;
  hasMore = true;
  defaultLimit = 30;
  isInitialLoad = true;
  private preventAutoRefresh = false;
  isLoading = false;
  private hasRefreshedThisRound = false;
  
  // Local data management for infinite scroll
  private mergedHistorySubject = new BehaviorSubject<any>({ bets: [], total: 0, more: false, pagination: { offset: 0, limit: 30 } });
  mergedHistory$ = this.mergedHistorySubject.asObservable();
  

  private stateMachine = inject(StateMachineService);

  constructor(private readonly machine: StateMachineService) {
    this.tabs_history$ = this.machine.state$.pipe(
      map((s) => s.context.playerHistoryData),
      distinctUntilChanged((a, b) => a === b),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Subscribe to history data changes to handle pagination
    this.tabs_history$.subscribe((response) => {
      if (response?.bets) {
        this.handleHistoryDataUpdate(response);
      }
    });

    // Subscribe to phase changes to refresh history when round ends
    this.phase$.subscribe((phase) => {
      if (phase === 'DISTRIBUTING' && this.activeTab === 1 && !this.hasRefreshedThisRound) {
        // Round crashed, refresh history once to capture lost bets
        this.hasRefreshedThisRound = true;
        setTimeout(() => {
          this.refreshHistoryAfterRound();
        }, 500); // Wait 0.5 second for backend to process the round results
      } else if (phase === 'BETTING') {
        // Reset flag when new round starts
        this.hasRefreshedThisRound = false;
      }
    });
  }

  private handleHistoryDataUpdate(response: any): void {
    if (!response?.bets) return;

    // Update pagination state
    this.currentOffset = response.pagination?.offset || 0;
    this.hasMore = response.more !== undefined ? response.more : true;
    this.isLoading = false; // Reset loading state when response is received

    const currentData = this.mergedHistorySubject.value;

    // Handle data merging for infinite scroll
    if (this.isInitialLoad || (response.pagination?.offset === 0 && this.preventAutoRefresh === false)) {
      // Initial load or intentional refresh - replace all data
      this.mergedHistorySubject.next({
        ...response,
        bets: response.bets
      });
      this.isInitialLoad = false;
      this.preventAutoRefresh = true; // Prevent subsequent auto-refreshes from resetting data
    } else if (response.pagination?.offset === 0 && this.preventAutoRefresh === true && currentData.bets.length > 0) {
      // Auto-refresh after round end - only add new bets to the top, don't replace
      const existingIds = new Set(currentData.bets.map((bet: any) => bet.betId));
      const newBets = response.bets.filter((bet: any) => !existingIds.has(bet.betId));
      
      if (newBets.length > 0) {
        this.mergedHistorySubject.next({
          ...response,
          bets: [...newBets, ...currentData.bets], // New bets go to top
          total: currentData.total + newBets.length
        });
      }
    } else {
      // Load more - merge new data with existing
      const existingIds = new Set(currentData.bets.map((bet: any) => bet.betId));
      const newBets = response.bets.filter((bet: any) => !existingIds.has(bet.betId));

      this.mergedHistorySubject.next({
        ...response,
        bets: [...currentData.bets, ...newBets], // New bets go to bottom
        total: currentData.total + newBets.length
      });
    }
  }

  private refreshHistoryAfterRound(): void {
    // Refresh history when round ends to capture lost bets
    if (this.activeTab === 1 && !this.isLoading) {
      // Use current offset to maintain scroll position
      const currentData = this.mergedHistorySubject.value;
      const currentCount = currentData.bets?.length || 0;
      
      this.fetchPlayerHistory(currentCount, 0); // Fetch same amount from beginning to get latest data
    }
  }

  
    readonly phase$ = this.stateMachine.state$.pipe(
      map((state) => state.context.phase)
    );
    
    readonly countDown$ = this.stateMachine.state$.pipe(
      map((state) => state.context.countdown)
    );

  readonly cashoutStats$ = this.stateMachine.state$.pipe(
      map((state) => state.context.cashoutStats)
  );

  // ---- API dispatch helpers (call as needed) ----
  fetchPlayerHistory(limit = 30, offset = 0): void {
    this.machine.actor?.send({ type: 'FETCH_PLAYER_HISTORY', limit, offset });
  }

  randomAvatars: string[] = [];
  
  ngOnInit(){
      this.randomAvatars[0] =  getRandomAvatarPath();
      this.randomAvatars[1] =  getRandomAvatarPath();
  }

  fetchGeneralRound(): void {
    this.machine.actor?.send({ type: 'FETCH_GENERAL_ROUND' });
  }

  fetchBestCharts(period: string = 'daily'): void {
    this.machine.actor?.send({ type: 'FETCH_BEST_CASHED', periodVal: period });
  }

  fetchBestWins(period: string = 'daily'): void {
    this.machine.actor?.send({ type: 'FETCH_BEST_WINS', periodVal: period });
  }

  fetchBestResult(period: string = 'daily'): void {
    this.machine.actor?.send({ type: 'FETCH_BEST_RESULT', periodVal: period });
  }


  mapPeriod(label: string): string {
    const l = (label || '').toLowerCase();
    if (l.startsWith('day')) return 'daily';
    if (l.startsWith('month')) return 'monthly';
    if (l.startsWith('year')) return 'yearly';
    // fallback (accept also if user passed already API value)
    if (['daily','monthly','yearly'].includes(l)) return l;
    return 'daily';
  }

  fetchCurrentBestTab(): void {
    const period =
      this.activeBestTab === 0
        ? this.mapPeriod(this.selectedBestCashedPeriod)
        : this.activeBestTab === 1
        ? this.mapPeriod(this.selectedBestWinsPeriod)
        : this.mapPeriod(this.selectedBestResultsPeriod);

    if (this.activeBestTab === 0) this.fetchBestCharts(period);
    if (this.activeBestTab === 1) this.fetchBestWins(period);
    if (this.activeBestTab === 2) this.fetchBestResult(period);
  }

  setActiveTab(index: number) {
    // Always reset history state when changing tabs to prevent state corruption
    if (this.activeTab === 1 && index !== 1) {
      // Leaving history tab - reset all state
      this.resetHistoryState();
    }
    
    this.activeTab = index;
    
    // lazy load only when HISTORY tab opened
    if (index === 1) {
      this.resetHistoryState();
      this.fetchPlayerHistory(this.defaultLimit, 0);
    }
    if (index === 2) {
      // this.fetchBestCharts();
      this.fetchCurrentBestTab();
    }
    if (index === 3) {
      this.fetchGeneralRound();
      // TODO -> Fetch stats data if needed
    }
  }

  private resetHistoryState(): void {
    this.currentOffset = 0;
    this.hasMore = true;
    this.isInitialLoad = true;
    this.preventAutoRefresh = false;
    this.isLoading = false;
    // Reset local data
    this.mergedHistorySubject.next({ 
      bets: [], 
      total: 0, 
      more: true, 
      pagination: { offset: 0, limit: this.defaultLimit } 
    });
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 100; // pixels from bottom
    
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      this.loadMore();
    }
  }

  loadMore(): void {
    // Prevent multiple simultaneous requests and check if more data is available
    if (this.hasMore && !this.isLoading) {
      const nextOffset = this.currentOffset + this.defaultLimit;
      this.isLoading = true;
      this.fetchPlayerHistory(this.defaultLimit, nextOffset);
    }
  }

  prevBestTab() {
    if (this.activeBestTab > 0) {
      this.activeBestTab--;
      this.fetchCurrentBestTab();
      this.bestTabScrollContainer.nativeElement.scrollTop = 0;
    }
  }

  nextBestTab() {
    if (this.activeBestTab < this.bestTabs.length - 1) {
      this.activeBestTab++;
      this.fetchCurrentBestTab();
      this.bestTabScrollContainer.nativeElement.scrollTop = 0;
    }
  }

  prevStatsTab() {
    if (this.activeStatsTab > 0) {
      this.activeStatsTab--;
    }
  }

  nextStatsTab() {
    if (this.activeStatsTab < this.statsTabs.length - 1) {
      this.activeStatsTab++;
    }
  }

  setBestCashedPeriod(period: string) {
    this.selectedBestCashedPeriod = period;
    this.fetchBestCharts(period);
  }

  setBestWinsPeriod(period: string) {
    this.selectedBestWinsPeriod = period;
    this.fetchBestWins(period);
  }

  setBestResultsPeriod(period: string) {
    this.selectedBestResultsPeriod = period;
    this.fetchBestResult(period);
  }

  
  tabs = ['left-sidebar.bets', 'left-sidebar.history', 'left-sidebar.best', 'left-sidebar.stats'];
  bestTabs = ['left-sidebar.best_tab.cashed-multiplier', 'left-sidebar.best_tab.wins', 'left-sidebar.best_tab.results'];
  
  bestPeriods = [
    { key: 'left-sidebar.day', value: 'daily' },
    { key: 'left-sidebar.month', value: 'monthly' },
    { key: 'left-sidebar.year', value: 'yearly' }
  ];
  selectedBestCashedPeriod  = this.bestPeriods[0].value; // 'daily'
  selectedBestWinsPeriod    = this.bestPeriods[1].value; // 'monthly'
  selectedBestResultsPeriod = this.bestPeriods[2].value; // 'yearly'

  statsTabs = ['left-sidebar.stats_tab.last-results', 'left-sidebar.stats_tab.chart'];
  
  activeTab                 = 0;
  activeBestTab             = 0;
  activeStatsTab            = 0;
  
}
