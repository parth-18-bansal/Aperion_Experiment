// components/orientation-warning/orientation-warning.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrientationService } from '../../services/orientation.service';

@Component({
  selector: 'app-orientation-warning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orientation-warning.html',
  styleUrls: ['./orientation-warning.scss'],
})
export class OrientationWarningComponent {
  private orientationService = inject(OrientationService);
  isLandscapeBlocked$ = this.orientationService.isLandscapeBlocked$;
}
