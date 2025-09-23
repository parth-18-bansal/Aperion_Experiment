import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { getCurrencySym } from '../../utils/getCurrencySymbol';

@Component({
  selector: 'payouts-modal',
  templateUrl: './payouts-modal.html',
  styleUrls: ['./payouts-modal.scss'],
  imports: [TranslatePipe, DecimalPipe]
})
export class PayoutsModalComponent {
  @Input() betSettings: any = null;
  @Output() close = new EventEmitter<void>();
  @Input() providerCurrency!: string;
  getCurrencySym = getCurrencySym;
  closeModal() {
    this.close.emit();
  }
}