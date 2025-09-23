import { Injectable, OnDestroy }            from '@angular/core';
import { ActorRef, createActor }            from 'xstate';
import { crashLogic, CrashGameMachineType } from '../crash/crash.logic';
import { CrashGameInput }                   from '../crash/interfaces';
import { ReplaySubject }                    from 'rxjs';
import { CrashGameEvent }                   from '../crash/events';
import { ClickHandlerService }              from '../services/click-handle.service';

@Injectable({
  providedIn: 'root',
})
export class StateMachineService implements OnDestroy {
  public actor?: ActorRef<CrashGameMachineType, CrashGameEvent>;

  private stateSubject = new ReplaySubject<CrashGameMachineType>(1);
  public readonly state$ = this.stateSubject.asObservable();

  /**
   *
   */
  constructor(private uiClick: ClickHandlerService) {
    this.uiClick.onClick().subscribe((event) => {
      this.actor?.send({ type: 'HANDLE_UI_CLICK', meta: { originalEvent: event } });
    });
  }

  public createActor(options: { input: CrashGameInput }): void {
    if (this.actor) {
      this.actor.stop();
    }
    this.actor = createActor(crashLogic, options);
    this.actor.subscribe((state) => {
      this.stateSubject.next(state);
    });
    this.actor.start();
  }

  ngOnDestroy(): void {
    this.actor?.stop();
  }
}
