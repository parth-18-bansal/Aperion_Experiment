import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { TranslatePipe } from "@ngx-translate/core";
import { PageLoadingService } from '../../services/page-loader.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-splash',
  imports: [CommonModule, /* TranslatePipe */],
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class SplashComponent implements OnInit, OnDestroy {
  loadingProgress = 0;
  isLoading = false;
  
  private progressSubscription?: Subscription;
  private loadingSubscription?: Subscription;

  constructor(private loadingService: PageLoadingService) {}

  ngOnInit(): void {
    // Progress değişikliklerini dinle
    this.progressSubscription = this.loadingService.progress$.subscribe(
      progress => {
        this.loadingProgress = progress;
        this.updateProgressBar(progress);
      }
    );

    // Loading durumu değişikliklerini dinle
    this.loadingSubscription = this.loadingService.isLoading$.subscribe(
      isLoading => this.isLoading = isLoading
    );
  }

  ngOnDestroy(): void {
    this.progressSubscription?.unsubscribe();
    this.loadingSubscription?.unsubscribe();
  }

  private updateProgressBar(progress: number): void {
    // CSS transition ile smooth progress bar güncellemesi
    const progressElement = document.querySelector('.LoadingContainer .loader .piece') as HTMLElement;
    if (progressElement) {
      // Progress bar'ı güncelle
      progressElement.style.width = `${progress}%`;
      
      // Progress %100 olduğunda finalize animasyonunu başlat
      if (progress >= 100) {        
        // 500ms sonra loading'i kapat (CSS animasyon süresi)
        setTimeout(() => {
          // this.loadingService.setLoading(false);
        }, 500);
      }
    }
  }
}