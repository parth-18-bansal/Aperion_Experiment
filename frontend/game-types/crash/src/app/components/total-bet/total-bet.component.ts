import {
  Component,
  Input,
  ChangeDetectionStrategy,
  Inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IProviderInfo, BetPanel } from '../../crash/interfaces';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-total-bet',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './total-bet.html',
  styleUrls: ['./total-bet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TotalBetComponent {
  @Input() betPanels: BetPanel[] | null = [];
  @Input() providerInfo: IProviderInfo | null = null;
  @Input() phase: string | null = null;

  get totalBetAmount(): number {
    if (!this.betPanels) return 0;
    return this.betPanels
      .filter(
        (panel) =>
          panel.isActive && (panel.betId !== null)
      )
      .reduce((total, panel) => total + panel.betAmount, 0);
  }
}
