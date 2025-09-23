import { Component, inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { map } from 'rxjs';
import { StateMachineService } from '../../services/state-machine.service';
import { GameViewComponent } from '../../components/game-view/game-view.component';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.html',
  styleUrl: './loading.scss',
  standalone: true,
  imports: [NgIf, AsyncPipe, GameViewComponent],
})
export class LoadingComponent {
  private stateMachine = inject(StateMachineService);

  // State machine'in durumunu dinleyerek canvas'ın gösterilip gösterilmeyeceğini belirleyen Observable
  readonly showGameView$ = this.stateMachine.state$.pipe(
    map((state) => state.matches('gameWelcome') || state.matches('game'))
  );

  // State machine'in context'inden canvas elementini alan Observable
  readonly canvas$ = this.stateMachine.state$.pipe(
    map((state) => state.context.game?.app.canvas)
  );
}
