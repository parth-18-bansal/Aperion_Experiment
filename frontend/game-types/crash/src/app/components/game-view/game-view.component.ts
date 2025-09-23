import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { environment }            from '../../../environments/environment';
import { StateMachineService }    from '../../services/state-machine.service';
import { Logger } from '../../utils/Logger';

@Component({
  selector: 'app-game-view',
  templateUrl: './game-view.html',
  styleUrl: './game-view.scss',
  standalone: true,
})
export class GameViewComponent implements OnChanges {
  @Input() game? : any;  
  @Input() canvas?: HTMLCanvasElement;
  @Input() containerHeight: number = 200;
  private viewReady = false;

  constructor(private hostEl: ElementRef<HTMLElement>, private readonly machine: StateMachineService) {}
  ngOnInit(): void {
    this.viewReady = true;
    this.mountCanvas();
  }

  ngAfterViewInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['canvas'] || changes['containerHeight']) {
      this.mountCanvas();
    }
  }

  private async mountCanvas() {
    // Logger.log('Mounting canvas...', this.canvas);

    if (!this.viewReady) return;

    const host = this.hostEl.nativeElement;

    // Host’u temizle
    while (host.firstChild) host.removeChild(host.firstChild);

    if (!this.canvas) return;

    // Başka parent’tan ayır
    if (this.canvas.parentElement && this.canvas.parentElement !== host) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    // Canvas stilini host’a uyumlu yap
    // this.canvas.style.width = '100%';
    // this.canvas.style.height = '100%';

    host.appendChild(this.canvas);

    // TODO -> Check metod refactors
    if(this.game){
      await (this.game.app.resizeTo = host as HTMLElement);
      this.machine.actor?.send({ type: 'CANVAS_READY' });
      // Logger.log('Canvas mounted and game resized to host.', host);
      // this.game.createGameStage();
      // this.game.setVersionText(environment.version);
    }
  }
}
