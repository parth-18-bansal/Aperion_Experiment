import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PageLoadingService {
  private progressSubject = new BehaviorSubject<number>(0);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  public progress$: Observable<number> = this.progressSubject.asObservable();
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();

  // Progress güncelleme
  updateProgress(progress: number): void {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    this.progressSubject.next(clampedProgress);
  }

  // Loading durumu
  setLoading(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
    if (!isLoading) {
      this.progressSubject.next(0); // Reset progress when loading ends
    }
  }

  // Progress sıfırlama
  resetProgress(): void {
    this.progressSubject.next(0);
  }

  // Mevcut progress değerini al
  getCurrentProgress(): number {
    return this.progressSubject.value;
  }
}