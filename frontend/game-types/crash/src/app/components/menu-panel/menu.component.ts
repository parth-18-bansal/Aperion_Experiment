import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { getAvatarPath } from '../../utils/avatarUtils';
import { TranslatePipe } from '@ngx-translate/core';
import { IProviderInfo } from '../../crash/interfaces';

@Component({
  selector: 'menu-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class MenuComponent {

  @Input() isSingleBetEnabled$!: Observable<boolean>;
  @Input() isChatVisible$!: Observable<boolean>;
  @Input() isMusicEnabled$!: Observable<boolean>;
  @Input() isSoundEnabled$!: Observable<boolean>;
  @Input() isAnimationEnabled$!: Observable<boolean>;
  @Input() player$!: any;
  @Input() providerInfo: IProviderInfo | null = null;

  @Output() toggleSingleBetClicked  = new EventEmitter<void>();
  @Output() toggleChatClicked       = new EventEmitter<void>();
  @Output() toggleMusicClicked      = new EventEmitter<void>();
  @Output() toggleSoundClicked      = new EventEmitter<void>();
  @Output() toggleAnimationClicked  = new EventEmitter<void>();
  @Output() openModalClicked        = new EventEmitter<'history' | 'quickGuide' | 'provablyFair' | 'gameHelp' | 'payouts' | 'editAvatar'>();
  
  getAvatarPath = getAvatarPath;

  onToggleSingleBet() {
    this.toggleSingleBetClicked.emit();
  } 

  onToggleChat() {
    this.toggleChatClicked.emit();
  } 
  
  onToggleMusic() {
    this.toggleMusicClicked.emit();
  } 
  
  onToggleSound() {
    this.toggleSoundClicked.emit();
  } 
  
  onClickHome() {
    if (this.providerInfo?.lobbyUrl) {
      // Decode the URL before redirecting
      window.location.href = decodeURIComponent(this.providerInfo?.lobbyUrl);
    } else {
      // Fallback to home
      window.location.href = window.location.origin + "/";
    }
  }
  
  onToggleAnimation() {
    this.toggleAnimationClicked.emit();
  } 
}
