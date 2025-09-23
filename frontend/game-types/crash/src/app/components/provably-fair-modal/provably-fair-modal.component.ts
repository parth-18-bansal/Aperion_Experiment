import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // needed for [(ngModel)]
import { ProvablyFairInfoModalComponent } from '../provably-fair-info-modal/provably-fair-info-modal.component';
import { StateMachineService } from '../../services/state-machine.service';
import { map } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { copyToClipboard } from '../../utils/copyHandler';

@Component({
  selector: 'provably-fair-settings-modal',
  templateUrl: './provably-fair-modal.html',
  styleUrls: ['./provably-fair-modal.scss'],
  imports: [CommonModule, FormsModule, ProvablyFairInfoModalComponent, TranslatePipe]
})
export class ProvablyFairModalComponent {
  @Input() clientSeed!: string | null;
  @Input() serverSeedHash!: { seed: string, hash: string } | null;
  @Output() close = new EventEmitter<void>();
  private stateMachine = inject(StateMachineService);
  isModalOpen = false;
  isSeedEditOpen = false;

  seedValue: string = '';
  copiedId: string | null = null;
  
  readonly manualSeedMode$ = this.stateMachine.state$.pipe(
    map((state) => state.context.manualClientSeed)
  );

  openInfoModal = () => {
    this.isModalOpen = true;
  };

  closeInfoModal() {
    this.isModalOpen = false;
  }

  openSeedEdit = () => {
    this.isSeedEditOpen = true;
    this.seedValue = this.clientSeed ?? '';
  };

  closeSeedEdit() {
    this.isSeedEditOpen = false;
  }

  isValidSeed(value: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(value) && value.length >= 16;
  }

  generateRandomSeed() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    this.seedValue = Array.from({ length: 16 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  saveSeed() {
    if (this.isValidSeed(this.seedValue)) {
      this.stateMachine.actor?.send({ type: 'SEND_NEW_CLIENT_SEED', newClientSeed: this.seedValue });
      this.closeSeedEdit();
    }
  }

  setManualClientSeed(isManual: boolean) {
    this.stateMachine.actor?.send({ type: 'SET_MANUAL_CLIENT_SEED', isManual: isManual });
  }

  cancelSeedEdit() {
    this.seedValue = '';
    this.closeSeedEdit();
  }

  closeModal() {
    this.close.emit();
  }
  
  handleCopy(text: string | null = '', id: string) {
  if (!text) return;
    copyToClipboard(text,
      () => {
        this.copiedId = id;
        setTimeout(() => (this.copiedId = null), 2000);
      },
      (err) => console.error('Copy failed:', err)
    );
  }
}
