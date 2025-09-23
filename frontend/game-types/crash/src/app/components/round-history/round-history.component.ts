import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoundDetails } from '../../crash/interfaces';
import { getMultiplierBgColor } from '../../utils/multiplierColor';
import { StateMachineService } from '../../services/state-machine.service';
import { map } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-round-history',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './round-history.html',
  styleUrl: './round-history.scss',
})
export class RoundHistoryComponent {
  @Input() history: RoundDetails[] = [];
  @Output() openModalClicked = new EventEmitter<{
    type: 'resultFairness';
    round: RoundDetails;
  }>();
  getMultiplierBgColor = getMultiplierBgColor;
  private stateMachine = inject(StateMachineService);

  readonly phase$ = this.stateMachine.state$.pipe(
    map((state) => state.context.phase)
  );
  
  readonly countDown$ = this.stateMachine.state$.pipe(
    map((state) => state.context.countdown)
  );

  
}
