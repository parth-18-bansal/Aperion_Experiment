import { Component, EventEmitter, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'quick-guide-modal',
  templateUrl: './quick-guide-modal.html',
  styleUrls: ['./quick-guide-modal.scss'],
  imports: [TranslatePipe]
})
export class QuickGuideModalComponent {
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}