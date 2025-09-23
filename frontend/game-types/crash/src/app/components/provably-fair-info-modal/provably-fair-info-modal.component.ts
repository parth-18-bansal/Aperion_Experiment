import { Component, EventEmitter, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'provably-fair-info-modal',
  templateUrl: './provably-fair-info-modal.html',
  styleUrls: ['./provably-fair-info-modal.scss'],
  imports: [TranslatePipe]
})
export class ProvablyFairInfoModalComponent {
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}