import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { getCurrencySym } from '../../utils/getCurrencySymbol';

export type KeyboardMode = 'bet' | 'multiplier';
@Component({
  selector: 'app-bet-keyboard',
  templateUrl: './bet-keyboard.html',
  imports: [CommonModule, TranslatePipe]
})
export class BetKeyboardComponent {
  @Input() value: string = "1.00";
  @Input() panelIndex!: number;
  @Input() minNumber: number = 1;
  @Input() maxNumber: number = 1000;
  @Input() providerCurrency!: string;
  @Input() maxHeightFromPanel: number | null = null;
  @Input() mode: KeyboardMode = 'bet';

  @Output() valueChange = new EventEmitter<string>();
  @Output() apply = new EventEmitter<{ value: string; index: number; mode: KeyboardMode }>();
  @Output() close = new EventEmitter<void>();

  keys: string[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'APPLY']
  ];
  getCurrencySym = getCurrencySym;

  get isValid(): boolean {
    const num = parseFloat(this.value);
    return !isNaN(num) && num >= this.minNumber && num <= this.maxNumber;
  }

  onKeyPress(key: string) {
    if (key === 'APPLY') {
      if (this.isValid) {
        this.apply.emit({ value: this.value, index: this.panelIndex, mode: this.mode });
      }
      return;
    }
    if (key === 'BACKSPACE') {
      this.value = this.value.slice(0, -1);
    } else {
      if (key === '.' && this.value.includes('.')) return;

      // Prevent more than 2 decimals
      if (this.value.includes('.')) {
        const decimals = this.value.split('.')[1];
        if (decimals.length >= 2) {
          return; // block further input after 2 decimals
        }
      }
      if (this.value === '0' && key !== '.') {
        this.value = key; // replace 0 with the new digit
      } else {
        const newValue = this.value + key;
        const numericValue = parseFloat(newValue);

        // Prevent exceeding maxNumber
        if (!isNaN(numericValue) && numericValue > this.maxNumber) {
          return;
        }

        this.value = newValue;
      }
    }
    this.valueChange.emit(this.value);
  }

  clearInput() {
    this.value = "";
    this.valueChange.emit(this.value);
  }

  onClose() {
    this.close.emit();
  }
}
