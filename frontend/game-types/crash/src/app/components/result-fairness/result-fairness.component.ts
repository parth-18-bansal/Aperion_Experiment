import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RoundDetails, RoundDetailsData } from '../../crash/interfaces';
import { getMultiplierBgColor } from '../../utils/multiplierColor';
import { CommonModule } from '@angular/common';
import { getRandomAvatarPath } from '../../utils/avatarUtils';
import { TranslatePipe } from '@ngx-translate/core';
import { copyToClipboard } from '../../utils/copyHandler';
import { StateMachineService } from '../../services/state-machine.service';
import { map } from 'rxjs';

@Component({
  selector: 'result-fairness',
  templateUrl: './result-fairness.html',
  styleUrls: ['./result-fairness.scss'],
  imports: [CommonModule, TranslatePipe]
})
export class ResultFairnessComponent {
  @Input() selectedRound: any = null;
  @Input() selectedRoundId: string = '';
  @Input() fromHistoryDetails: boolean = false;
  @Output() close = new EventEmitter<void>();
  roundDetails: RoundDetailsData | null = null;
  getMultiplierBgColor = getMultiplierBgColor;

  randomClientAvatars: string[] = [];
  copiedId: string | null = null;
  loading: boolean = false;
  error: boolean = false;

  ngOnInit() {
    if (this.fromHistoryDetails && this.selectedRoundId) {
      this.loading = true;
      this.error = false;
      this.stateMachine.actor?.send({ type: 'FETCH_ROUND_DETAILS', roundId: this.selectedRoundId });
    }
    
    this.randomClientAvatars = Array(3)
      .fill(null)
      .map(() => getRandomAvatarPath());
  }

  private stateMachine = inject(StateMachineService);

  readonly vm$ = this.stateMachine.state$.pipe(
    map((s) => ({
      loading: s.context.apiLoadingHandle,
      error: s.context.apiErrorHandle,
      roundDetails: s.context.roundDetailsData?.round,
    }))
  );
  
  

  fetchRoundDetailsById(roundId: string): void {
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

  closeModal() {
    this.error = false;
    this.loading = false;
    this.close.emit();
  }
}