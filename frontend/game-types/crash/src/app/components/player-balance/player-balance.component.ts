import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { IProviderInfo, PlayerProfile } from '../../crash/interfaces';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-player-balance',
  templateUrl: './player-balance.html',
  styleUrls: ['./player-balance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Performans için
  imports: [CommonModule, TranslatePipe],
})
export class PlayerBalanceComponent {
  @Input() player: PlayerProfile | null = null;
  @Input() providerInfo: IProviderInfo | null = null;
}
