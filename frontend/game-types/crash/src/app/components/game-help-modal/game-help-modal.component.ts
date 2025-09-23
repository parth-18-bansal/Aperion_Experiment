import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'game-help-modal',
  templateUrl: './game-help-modal.html',
  styleUrls: ['./game-help-modal.scss'],
  imports: [TranslatePipe]
})
export class GameHelpModalComponent {
  @Output() close = new EventEmitter<void>();
  @Input() providerCurrency!: string;

  closeModal() {
    this.close.emit();
  }
}