import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateMachineService } from '../../services/state-machine.service';
import { BetPanel, ORDER_VALUES } from '../../crash/interfaces';
import { map, distinctUntilChanged, pairwise, startWith, Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { OrientationService } from '../../services/orientation.service';
import { BetKeyboardComponent, KeyboardMode } from '../bet-keyboard/bet-keyboard.component';
import { getCurrencySym } from '../../utils/getCurrencySymbol';
import { Logger } from '../../utils/Logger';

@Component({
  selector: 'app-bet-panel',
  standalone: true,
  imports: [CommonModule, FormsModule,BetKeyboardComponent, TranslatePipe],
  templateUrl: './bet-panel.html',
  styleUrl: './bet-panel.scss',
})
export class BetPanelComponent implements OnInit, OnDestroy {
  private stateMachine = inject(StateMachineService);
  private subscriptions: Subscription[] = [];
  betTrackingForUndo: Map<string, number[]> = new Map();
  @Input() isSingleBetEnabled$!: Observable<boolean>;
  @Input() providerCurrency!: string;
  @Input() toggleMenu!: (forceClose?: boolean) => void;
  @Input() menuOpen$!: Observable<boolean>;
  @Input() virtualKeyboardHeight: number = 0;
  lastIncrements: (number | null)[] = [];
  showKeyboard = false;
  inSufficentBalanceActivated= false;

  betValueArray = [1, 5, 10, 15, 25, 50, 100, 150, 200, 250, 500, 1000, 1500, 2000, 2500, 4000, 5000, 10000, 15000,25000];
  getCurrencySym = getCurrencySym;
  // State machine'in context'inden sohbet mesajlarını alan Observable
  readonly betSettings$ = this.stateMachine.state$.pipe(
    map((state) => state.context.betSettings)
  );

  readonly phase$ = this.stateMachine.state$.pipe(
    map((state) => state.context.phase)
  );

  readonly providerInfo$ = this.stateMachine.state$.pipe(
    map((state) => state.context.providerInfo)
  );

  readonly multiplier$ = this.stateMachine.state$.pipe(
    map((state) => state.context.multiplier)
  );

  panels: BetPanel[] = [];
  isEditingCashoutInput = false;
  maxPanels = 1;
  minAutoCashoutMultiplier = 1.01;
  maxAutoCashoutMultiplier = 5000;
  betValueIncrements = [1, 2, 5, 10];
  autoBetCountOptions = [5, 10, 25, 50, 100];
  autoBetCountIncrements = [2, 5, 10];
  minBet = 1;
  maxBet = 5000;
  
  virtualKeyboardAllowed= false;


  constructor(private orientationService: OrientationService) {}

  ngOnInit(): void {
    // State machine'den maksimum panel sayısını ve mevcut panelleri al
    
    if (this.stateMachine.actor) {
        const { uiConf } = this.stateMachine.actor.getSnapshot().context;

        this.minAutoCashoutMultiplier = uiConf.minAutoCashoutMultiplier ?? 1.01;
        this.betValueIncrements      = uiConf.betValueIncrements      ?? [1, 2, 5, 10];
        this.autoBetCountOptions     = uiConf.autoBetCountOptions     ?? [5, 10, 25, 50, 100, -1];
        this.autoBetCountIncrements  = uiConf.autoBetCountIncrements  ?? [5, 10, 25, 50, 100];
        this.maxPanels               = uiConf.maxBetPanels            ?? 1;
        this.betValueArray           = uiConf.betValueArray           ?? [1, 5, 10, 15, 25, 50, 100, 150, 200, 250, 500, 1000, 1500, 2000, 2500, 4000, 5000, 10000, 15000,25000];
        this.lastIncrements = new Array(uiConf.maxBetPanels).fill(null);
    }
    
    const stateSubscription = this.stateMachine.state$.subscribe((state) => {
      this.panels = [...state.context.betPanels];
    });
    this.subscriptions.push(stateSubscription);

    const singleBetSub = this.isSingleBetEnabled$.subscribe((enabled) => {
      if (enabled) {
        this.removePanel();
      } else {
        this.addPanel();
      }
    });
    this.subscriptions.push(singleBetSub);

    const betSettingsSub = this.betSettings$.subscribe((settings) => {
      if (settings) {
        this.minBet = settings.minBet;
        this.maxBet = settings.maxBet;
        this.maxAutoCashoutMultiplier = settings.maxMultiplier;
      }
    });
    this.subscriptions.push(betSettingsSub);

    // Phase değişikliklerini dinle ve otomatik bet işlemini yap
    const phaseSubscription = this.phase$
      .pipe(startWith(''), distinctUntilChanged(), pairwise())
      .subscribe(([previousPhase, currentPhase]) => {
        // Eğer önceki phase DISTRIBUTING ve şu anki phase BETTING ise
        if (previousPhase === 'DISTRIBUTING' && currentPhase === 'BETTING') {
          this.handlePreBets();
          this.handleAutoBets();
        }
        
        if (previousPhase === 'WAITING' && currentPhase === 'PLAYING') {
          this.decrementAutoBetCount();
        }
        
        if (previousPhase === 'PLAYING' && currentPhase === 'DISTRIBUTING') {
          this.panels.forEach((panel, index) => {
            panel.betId = null;
            panel.busy = false;
          });
          this.handleAutoBets(true);
        }
        
        if (previousPhase === 'BETTING' && currentPhase === 'WAITING') {
          this.removeBusyStatePanels();
        }
      });
    this.subscriptions.push(phaseSubscription);

    if (this.menuOpen$) {
      const menuSub = this.menuOpen$.subscribe((open) => {
        if (open) {
          this.activePopupIndex = null; // close autoplay popup
        }
      });
      this.subscriptions.push(menuSub);
    }

    this.virtualKeyboardAllowed = this.orientationService.isMobile() || this.orientationService.isTablet();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private handlePreBets(): void {
    this.panels.forEach((panel) => {
      if (panel.preBet && panel.betId === null) {
        this.placeBet(panel);
      }
      // panel.preBet = false;
    });
  }

  private handleAutoBets(inDistributingPhase: boolean = false): void {
    // AutoBet aktif olan ve betId'si null olan panelleri bul
    this.panels.forEach((panel, index) => {
      if (panel.autoBet && panel.betId === null) {
        
        if(!this.sufficientBalance(panel)){
          this.updatePanel(index, 'autoBet', false);
          this.updatePanel(index, 'totalAutoBetCount', 0);
        } else {
          if(inDistributingPhase){
            panel.preBet = true;
          } else {
            this.placeBet(panel);
          }
        }
      }
    });
  }

  private decrementAutoBetCount(): void {
    this.panels.forEach((panel, index) => {
      if (panel.autoBet && panel.betId) {
        this.stateMachine.actor?.send({
          type: 'DECREMENT_AUTO_BET',
          order: ORDER_VALUES[index],
          betPanel: panel,
        });
      }
    });
  }

  addPanel(): void {
    if (this.panels.length < this.maxPanels) {
      this.stateMachine.actor?.send({ type: 'ADD_BET_PANEL' });
    }
  }

  removePanel(): void {
    if (this.panels.length > 1) {
      let panel = this.panels[this.panels.length - 1];
      this.stateMachine.actor?.send({ type: 'REMOVE_BET_PANEL', panel });
    }
  }

  sufficientBalance(panel: BetPanel): boolean {
    if(this.getPlayerBalance() < panel.betAmount){
      
      if(!this.inSufficentBalanceActivated){
        // this is to prevent multiple notifications in a short time
        this.inSufficentBalanceActivated = true;
        setTimeout(() => {
          this.inSufficentBalanceActivated = false;
        }, 2000);
        this.stateMachine.actor?.send({
          type: 'ADD_NOTIFICATION',
          notification: {
            type: 'error', 
            message: 'low-balance',
            duration: 2
          }
        });
      }
      return false;

    }
    return true;
  }

  removeBusyStatePanels(): void {
    this.panels.forEach((panel) => {
        panel.busy = false;
    });
  }

  placeBet(panel: BetPanel, preBet:boolean = false): void {
    this.activePopupIndex = null; // close popup if open
    if(!this.sufficientBalance(panel)){
      return;
    } 
    panel.isActive = true; // Set the panel as active before placing the bet
    if(preBet){
      panel.preBet = preBet;
    } else {
      // panel.preBet = false;
      panel.busy = true;
      this.stateMachine.actor?.send({
        type: 'PLACE_BET',
        betPanel: panel,
      });
    }
  }

  cancelBet(panel: BetPanel): void {
    this.activePopupIndex = null; // close popup if open
    panel.isActive = false; // Set the panel as inactive before canceling the bet
    panel.busy = true;
    this.stateMachine.actor?.send({
      type: 'CANCEL_BET',
      betPanel: panel,
    });
  }

  cashoutBet(panel: BetPanel): void {
    this.activePopupIndex = null; // close popup if open
    panel.isActive = false; // Set the panel as inactive before cashing out
    panel.busy = true;
    this.stateMachine.actor?.send({
      type: 'CASHOUT_BET',
      betPanel: panel,
    });
  }

  updatePanel(index: number, field: keyof BetPanel, value: any, skipTracking = false) {
    const currentPanel = this.panels[index];
    const key = currentPanel.order;

    // Track betAmount changes
    if (field === 'betAmount') {
      if (isNaN(value) || value < this.minBet) value = this.minBet;
      if (value > this.maxBet) value = this.maxBet;

      // Track betAmount changes
      if (!skipTracking) {
        const history = this.betTrackingForUndo.get(key) ?? [];
        history.push(currentPanel.betAmount); // push current value
        this.betTrackingForUndo.set(key, history);
      }
    }
      
    const updatedPanel = { ...currentPanel, [field]: value };
    this.stateMachine.actor?.send({
      type: 'UPDATE_BET_PANEL',
      index,
      betPanel: updatedPanel,
      fieldType: field,
    });
  }

  onBlurBetAmountInput(input: HTMLInputElement, index: number) {
    let value = parseFloat(input.value);

    // fallback if empty/invalid
    if (isNaN(value) || value < this.minBet) value = this.minBet;
    if (value > this.maxBet) value = this.maxBet;

    // clamp to 2 decimals max
    value = parseFloat(value.toFixed(2));

    this.updatePanel(index, 'betAmount', value);

    // rewrite input with cleaned value
    input.value = value.toFixed(2);
    this.lastIncrements[index] = null;
  }

  getToggleBtnClasses(panel: BetPanel): string[] | { [klass: string]: boolean } {
    if (panel.preBet || panel.betId) {
      return {
        'opacity-40': true,
        'cursor-default': true
      };
    }

    return {
      'btn': true,
      'cursor-pointer': true,
      'hover:opacity-80': true
    };
  }

  onCashoutClick(input: HTMLInputElement, index: number) {
    if (!this.panels[index].autoCashoutEnabled) return;
    if (this.virtualKeyboardAllowed) {
      // Mobile → open custom keyboard
      this.openKeyboard(this.panels[index].autoCashout, index, 'multiplier');
    } else {
      // Desktop → allow normal editing
      this.isEditingCashoutInput = true;
    }
  }

  onFocusCashoutInput(input: HTMLInputElement, index: number) {
    if (!this.virtualKeyboardAllowed) {
      this.isEditingCashoutInput = true;
      // Remove "x" when editing manually
      if (input.value.endsWith('x')) {
        input.value = input.value.replace('x', '');
      }
    }
  }

  onBlurCashoutInput(input: HTMLInputElement, index: number) {
    this.isEditingCashoutInput = false;

    let value = parseFloat(input.value);
    value = parseFloat(value.toFixed(2));

    if (isNaN(value) || value < this.minAutoCashoutMultiplier) {
      value = this.minAutoCashoutMultiplier;
    }
    if (value > this.maxAutoCashoutMultiplier) {
      value = this.maxAutoCashoutMultiplier;
    }

    this.updatePanel(index, 'autoCashout', value);

    // Always append "x" back
    input.value = value.toFixed(2) + 'x';
  }

  onToggleAutoCashout(event: Event, index: number) {
    event.stopPropagation();
    event.preventDefault();
    if(!this.panels[index].preBet && this.panels[index].betId === null){
      this.stateMachine.actor?.send({ type: 'HANDLE_UI_CLICK', meta: { originalEvent: event } });
      const newVal = !this.panels[index].autoCashoutEnabled;
      this.updatePanel(index, 'autoCashoutEnabled', newVal);
    }
  }

  activePopupIndex: number | null = null; // Track which panel's popup is open
  openAutoplayPopup(index: number) {
    this.activePopupIndex = index;
    this.toggleMenu(true);
  }

  increaseAutoplayRounds(index: number, rounds: number) {
    this.stateMachine.actor?.send({
      type: 'INCREASE_AUTO_BET',
      panelIndex: index,
      increaseRoundsBy: rounds,
    });
  }

  selectAutoplayRounds(index: number, rounds: number) {
    if(!this.sufficientBalance(this.panels[index])){
      return;
    }
    this.updatePanel(index, 'autoBet', true); // activate
    this.updatePanel(index, 'totalAutoBetCount', rounds);
    if (this.getCurrentPhase() === 'BETTING') {
      this.handleAutoBets();
    }
    if (this.getCurrentPhase() === 'PLAYING' || this.getCurrentPhase() === 'DISTRIBUTING') {
      const panel = this.panels[index];
      if(panel.betId === null){
        panel.preBet = true;
      }
    }

    this.activePopupIndex = null; // close popup
  }

  getPlayerBalance(){
    return this.stateMachine.actor?.getSnapshot().context.player?.balance || 0;
  }

  getCurrentPhase(){
    return this.stateMachine.actor?.getSnapshot().context.phase;
  }

  stopAutoplay(index: number) {
    this.updatePanel(index, 'autoBet', false); // deactivate
    this.updatePanel(index, 'totalAutoBetCount', 0); // reset
    this.activePopupIndex = null;
  }

  closePopup() {
    this.activePopupIndex = null;
  }

  undoBet(panel: BetPanel, index: number) {
    const key = panel.order;
    const history = this.betTrackingForUndo.get(key);

    if (history && history.length > 0 && panel.betId === null) {
      const prevAmount = history.pop()!;
      this.updatePanel(index, 'betAmount', prevAmount, true);
    }
  }
  
  canUndo(panel: any): boolean {
    const hasHistory = (this.betTrackingForUndo.get(panel.order)?.length || 0) > 0;
    return hasHistory && panel.betId === null && !panel.preBet;
  }

  cancelPreBet(panel: BetPanel): void {
      this.activePopupIndex = null; // close popup if open
      panel.preBet = false;
  }

  // track rapid click state per panel
  private clickStates: { [panelIndex: number]: { count: number; lastClick: number } } = {};
  

  increaseBet(index: number) {
    this.activePopupIndex = null; // close popup if open
    const panel = this.panels[index];
    const currentAmount = panel.betAmount;

    const sortedIncrements = [...this.betValueArray].sort((a, b) => a - b);
    const currentIndex = sortedIncrements.findIndex(val => val > currentAmount);

    // Move to the next higher value, if it exists and <= maxBet
    if (currentIndex !== -1 && sortedIncrements[currentIndex] <= this.maxBet) {
      this.updatePanel(index, 'betAmount', sortedIncrements[currentIndex]);
    }
  }

  decreaseBet(index: number) {
    this.activePopupIndex = null;
    const panel = this.panels[index];
    const currentAmount = panel.betAmount;

    const sortedIncrements = [...this.betValueArray].sort((a, b) => a - b);
    let previousValue = sortedIncrements[0];

    for (let i = 0; i < sortedIncrements.length; i++) {
      if (sortedIncrements[i] >= currentAmount) {
        break;
      }
      previousValue = sortedIncrements[i];
    }

    if (previousValue >= this.minBet) {
      this.updatePanel(index, 'betAmount', previousValue);
    }
  }
  
  preventInvalidInput(event: KeyboardEvent) {
    if (["e", "E", "+", "-", ","].includes(event.key)) {
      event.preventDefault();
    }
  }
  
  
  keyboardValue: string = '';
  activePanelIndex: number = -1;
  activeKeyboardMode: KeyboardMode = 'bet';
  openKeyboard(value: number, index: number, mode: KeyboardMode = 'bet') {
    if(!this.virtualKeyboardAllowed) return;
    this.keyboardValue = value.toString();
    this.activePanelIndex = index;
    this.activeKeyboardMode = mode;
    this.showKeyboard = true;
  }

  onKeyboardValueChange(value: string) {
    this.keyboardValue = value;
  }

  onKeyboardApply(event: { value: string; index: number; mode: KeyboardMode}) {
    const { value, index, mode } = event;
    if (!isNaN(+value)) {
      // this.panels[index].betAmount = +value;
       if (mode === 'bet') {
          this.lastIncrements[index] = null;
          this.updatePanel(index, 'betAmount', +value);
        } else if (mode === 'multiplier') {
          this.updatePanel(index, 'autoCashout', +value);
        }
    }
    this.showKeyboard = false;
  }

  onIncrementClick(panelIndex: number, amt: number) {
    const panel = this.panels[panelIndex];
    let newAmount: number;

    if (this.lastIncrements[panelIndex] !== amt) {
      // First click or different button → reset betAmount to amt
      newAmount = amt;
    } else {
      // Same button → keep increasing by amt
      newAmount = panel.betAmount + amt;
    }

    // Clamp between min & max
    if (newAmount < this.minBet) newAmount = this.minBet;
    if (newAmount > this.maxBet) newAmount = this.maxBet;

    // Update betAmount
    this.updatePanel(panelIndex, 'betAmount', newAmount);

    // Remember last increment used for this panel
    this.lastIncrements[panelIndex] = amt;
  }
  
}
