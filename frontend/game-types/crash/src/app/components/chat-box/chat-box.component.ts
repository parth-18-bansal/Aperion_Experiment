import {
  AfterViewChecked,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateMachineService } from '../../services/state-machine.service';
import { ChatMessage } from '../../crash/interfaces';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, map, distinctUntilChanged } from 'rxjs';
import { getAvatarPath } from '../../utils/avatarUtils';

@Component({
  selector: 'app-chat-box',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './chat-box.html',
  styleUrl: './chat-box.scss',
})
export class ChatBoxComponent implements OnChanges, AfterViewChecked, OnDestroy {
  @Input() messages: ChatMessage[] = [];
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(private translate: TranslateService) {}
  
  private stateMachine = inject(StateMachineService);
  newMessage = '';
  characterLimit = 160;
  private shouldScrollDown = false;
  private messageWaitingTimeInSec = 60;
  chatErrorMessage = '';
  private destroy$ = new Subject<void>();
  getAvatarPath = getAvatarPath;

 
  ngOnInit() {
    if (this.stateMachine.actor) {
      const {uiConf} = this.stateMachine.actor.getSnapshot().context;
      this.messageWaitingTimeInSec = uiConf.messageWaitingTimeInSec;
      this.characterLimit = uiConf.chatCharLimit;
      
      this.stateMachine.state$.pipe(
        takeUntil(this.destroy$),
        map(state => state.context.chatErrorReason),
        distinctUntilChanged()
      ).subscribe((chatErrorReason) => {
        if (chatErrorReason) {
          this.handleChatError(chatErrorReason);
        } else {
          this.chatErrorMessage = '';
        }
      });
    }
  }

  private handleChatError(reason: string): void {
    switch (reason) {
      case 'BETNEEDED':
        this.chatErrorMessage = this.translate.instant('chat.error.betneeded');
        break;
      case 'MESSAGETOOLONG':
        this.chatErrorMessage = this.translate.instant('chat.error.messagetoolong');
        break; 
      case 'UNAUTHORIZED':
        this.chatErrorMessage = this.translate.instant('chat.error.unauthorized');
        break;
      default:
        this.chatErrorMessage = this.translate.instant('chat.error.default');
        break;
    }
  }

  ngOnDestroy() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // `messages` input'u her güncellendiğinde, scroll yapılması gerektiğini işaretliyoruz.
    if (changes['messages']) {
      this.shouldScrollDown = true;
    }
  }

  ngAfterViewChecked() {
    // DOM güncellendikten sonra, eğer scroll gerekiyorsa, en alta kaydırıyoruz.
    if (this.shouldScrollDown) {
      this.scrollToBottom();
      this.shouldScrollDown = false;
    }
  }

  private scrollToBottom(): void {
    this.scrollContainer.nativeElement.scrollTop =
    this.scrollContainer.nativeElement.scrollHeight;
    // this.scrollContainer.nativeElement.scrollTo({
    //   top: this.scrollContainer.nativeElement.scrollHeight,
    //   behavior: 'smooth',
    // });
  }

  sendDisabled = false;
  cooldownTime = 0;
  private cooldownTimer?: any;

  sendMessage(): void {
    if (this.newMessage.trim() && !this.sendDisabled) {
      this.stateMachine.actor?.send({
        type: 'SEND_CHAT_MESSAGE',
        message: this.newMessage.trim(),
      });
      this.newMessage = '';
      this.startCooldown(this.messageWaitingTimeInSec);
    }
  }

  private startCooldown(seconds: number): void {
    this.sendDisabled = true;
    this.cooldownTime = seconds;

    this.cooldownTimer = setInterval(() => {
      this.cooldownTime--;
      if (this.cooldownTime <= 0) {
        clearInterval(this.cooldownTimer);
        this.sendDisabled = false;
      }
    }, 1000);
  }

  onEnter(event: any): void {
    if (!event.shiftKey) { // Only Enter without Shift
      event.preventDefault(); // Prevents newline
      this.sendMessage();
    }
  }

  onMessageChange() {
    if (this.newMessage.length > this.characterLimit) {
      this.newMessage = this.newMessage.slice(0, this.characterLimit);
    }
  }

}
