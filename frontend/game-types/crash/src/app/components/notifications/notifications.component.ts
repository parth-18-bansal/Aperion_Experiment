import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notification } from '../../crash/interfaces';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent implements OnChanges {
  @Input() notifications: Notification[] | null = [];
  @Output() remove = new EventEmitter<string>();

  private processedIds = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notifications'] && this.notifications) {
      this.notifications.forEach((notification) => {
        if (notification.id && !this.processedIds.has(notification.id)) {
          this.processedIds.add(notification.id);
          if (notification.duration > 0) {
            setTimeout(() => {
              if (notification.id) {
                this.remove.emit(notification.id);
                this.processedIds.delete(notification.id);
              }
            }, notification.duration * 1000);
          }
        }
      });
    }
  }

  trackById(index: number, item: Notification): string {
    return item.id || `notification-${index}`;
  }
}
