import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input, OnInit, OnChanges } from '@angular/core';
import { StateMachineService } from '../../services/state-machine.service';
import { BetDetailsData } from '../../crash/interfaces';
import { Observable } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { copyToClipboard } from '../../utils/copyHandler';
import { TranslatePipe } from '@ngx-translate/core';
import { getCurrencySym } from '../../utils/getCurrencySymbol';

@Component({
  selector: 'history-detail',
  templateUrl: './history-detail.html',
  styleUrls: ['./history-detail.scss'],
  imports: [CommonModule, TranslatePipe],
  standalone: true
})

export class HistoryDetailComponent implements OnInit, OnChanges {
  @Input() betId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() openRoundDetail = new EventEmitter<string>();
  getCurrencySym = getCurrencySym;
  
  readonly betDetails$!: Observable<BetDetailsData | null>;
  betData: BetDetailsData | null = null;
  loading = false;
  betIdCopied = false;
  roundIdCopied = false;
  copiedId: string | null = null;

  constructor(private readonly machine: StateMachineService) {
    this.betDetails$ = this.machine.state$.pipe(
      map((s) => s.context.betDetailsData),
      distinctUntilChanged((a, b) => a === b),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  ngOnInit(): void {
    if (this.betId) {
      this.fetchBetDetails();
    }
  }
  
  openBetFairness(roundId: string): void {
    this.openRoundDetail.emit(roundId);
  }
  
  handleCopy(text: string, id: string) {
    copyToClipboard(text,
      () => {
        this.copiedId = id;
        setTimeout(() => (this.copiedId = null), 2000);
      },
      (err) => console.error('Copy failed:', err)
    );
  }

  ngOnChanges(): void {
    if (this.betId) {
      this.fetchBetDetails();
    }
  }

  fetchBetDetails(): void {
    if (!this.betId) return;
    
    this.loading = true;
    this.machine.actor?.send({ type: 'FETCH_BET_DETAILS', betId: this.betId });
    
    this.betDetails$.subscribe(data => {
      if (data) {
        this.betData = data;
        this.loading = false;
      }
    });
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

  formatDateTime(dateString: string): { date: string, time: string } {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  }

  closeModal() {
    this.close.emit();
  }
}