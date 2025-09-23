import { Injectable } from '@angular/core';
import { Subject, fromEvent, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ClickHandlerService {
  private clicks$ = new Subject<Event>();

  constructor() {
    fromEvent<MouseEvent>(document, 'click')
      .pipe(
        map(e => e as Event),
        filter(e => {
          const t = (e.target as HTMLElement) || null;
          if (!t) return false;
          return !!(
            t.closest('button') ||
            t.closest('.btn') ||
            (t.getAttribute && t.getAttribute('role') === 'button') ||
            t.classList.contains('btn') ||
            t.closest('[data-ui-click]')
          );
        })
      )
      .subscribe(e => this.clicks$.next(e));
  }

  onClick(): Observable<Event> {
    return this.clicks$.asObservable();
  }
}