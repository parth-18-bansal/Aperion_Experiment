import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { StateMachineService } from '../../services/state-machine.service';
import { PlayerHistoryData } from '../../crash/interfaces';
import { Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, takeUntil, skip, startWith } from 'rxjs/operators';
import { HistoryDetailComponent } from '../history-detail/history-detail.component';
import { TranslatePipe } from '@ngx-translate/core';
import { getCurrencySym } from '../../utils/getCurrencySymbol';

interface BetData {
  currency: string;
  gameId: string;
  betId: string;
  amount: {
    bet: number;
    win: number;
  };
  winAmount: number;
  multiplier: number;
  roundId: string;
  createdAt: string;
}

interface HistoryResponse {
  status: boolean;
  bets: BetData[];
  total: number;
  more: boolean;
  pagination: {
    limit: number;
    offset: number;
    page: number;
  };
}

@Component({
  selector: 'history-modal',
  templateUrl: './history-modal.html',
  styleUrls: ['./history-modal.scss'],
  imports: [CommonModule, HistoryDetailComponent, TranslatePipe],
  standalone: true
})

export class HistoryModalComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() openRound = new EventEmitter<string>();
  readonly tabs_history$!: Observable<PlayerHistoryData>;
  private destroy$ = new Subject<void>();

  bets: BetData[] = [];
  currentOffset = 0;
  hasMore = true;
  private isInitialLoad = true;

  showDetail = false;
  selectedBetId = '';
  defaultLimit = 10;
  getCurrencySym = getCurrencySym
  constructor(private readonly machine: StateMachineService) {
    this.tabs_history$ = this.machine.state$.pipe(
      map((s) => s.context.playerHistoryData),
      distinctUntilChanged((a, b) => a === b),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Listen to observable continuously but skip the first value
    this.tabs_history$.pipe(
      startWith(null),
      skip(1),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      if (data && (data as any).bets) {
        const response = data as any as HistoryResponse;

        if (this.isInitialLoad || response.pagination.offset === 0) {
          this.bets = response.bets;
          this.isInitialLoad = false;
        } else {
          // Add only new bets
          const existingIds = new Set(this.bets.map(bet => bet.betId));
          const newBets = response.bets.filter(bet => !existingIds.has(bet.betId));
          this.bets = [...this.bets, ...newBets];
        }

        this.hasMore = response.more;
        this.currentOffset = response.pagination.offset;
      }
    });
  }

  ngOnInit(): void {
    this.fetchPlayerHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchPlayerHistory(limit = this.defaultLimit, offset = 0): void {
    this.machine.actor?.send({ type: 'FETCH_PLAYER_HISTORY', limit, offset });
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 100; // pixels from bottom
    
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      this.loadMore();
    }
  }

  loadMore(): void {
    if (this.hasMore) {
      this.fetchPlayerHistory(this.defaultLimit, this.currentOffset + this.defaultLimit);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openBetDetail(betId: string): void {
    this.selectedBetId = betId;
    this.showDetail = true;
  }

  closeBetDetail(): void {
    this.showDetail = false;
    this.selectedBetId = '';
  }

  openRoundDetail(roundId: string): void {
    this.closeBetDetail();
    this.openRound.emit(roundId);
  }

  closeModal() {
    // Clear all data when the modal is closed
    this.bets = [];
    this.currentOffset = 0;
    this.hasMore = true;
    this.isInitialLoad = true;

    this.close.emit();
  }
}