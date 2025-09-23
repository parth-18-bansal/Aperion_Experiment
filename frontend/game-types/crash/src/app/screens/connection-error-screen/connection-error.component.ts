import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-connection-error',
  templateUrl: './connection-error.html',
  styleUrls: ['./connection-error.scss'],
  imports: [TranslatePipe],
  standalone: true,
})
export class ConnectionErrorComponent {
  @Input() title: string = 'Connection Error';
  @Input() description: string = 'Unable to connect to server';
}