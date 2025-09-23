import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, SimpleChanges } from '@angular/core';
import { getAvatarPath, getRandomAvatarPath } from '../../utils/avatarUtils';
import { StateMachineService } from '../../services/state-machine.service';
import { TranslatePipe } from '@ngx-translate/core';
import { ImagePreloadService } from '../../services/image-preload.service';

@Component({
  selector: 'edit-avatar',
  templateUrl: './edit-avatar.html',
  styleUrls: ['./edit-avatar.scss'],
  standalone: true,
  imports: [CommonModule, TranslatePipe],
})
export class EditAvatarComponent {
  @Output() close = new EventEmitter<void>();
  @Input() player$!: any;
  getAvatarPath = getAvatarPath;
  private stateMachine = inject(StateMachineService);
  private imageService = inject(ImagePreloadService);

  
  avatars: string[] = [];
  selectedAvatar: number | null = null;

  constructor() {
    this.avatars = this.imageService.getAvatars();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['player$'] && this.player$) {
      // assuming player$.avatar is a number (e.g. 12 for av-12.jpg)
      this.selectedAvatar = Number(this.player$.avatar) ?? null;
    }
  }

  selectAvatar(index: number) {
    this.selectedAvatar = index;
  }

  closeModal() {
    this.close.emit();
  }

  updateAvatar(avatarId: number | null): void {
    if(avatarId === undefined || avatarId === null || this.selectedAvatar === Number(this.player$.avatar)) return;
    this.stateMachine.actor?.send({ type: 'SEND_AVATAR_UPDATE', avatar: avatarId });
    this.closeModal();
  }
  

}