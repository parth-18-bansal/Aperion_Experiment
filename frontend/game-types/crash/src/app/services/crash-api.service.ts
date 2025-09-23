import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

type Period = 'daily' | 'monthly' | 'yearly';

@Injectable({ providedIn: 'root' })
export class CrashApiService {
  private baseUrl = '';
  private sessionId?: string;

  constructor(private http: HttpClient) {}

  // Configuration is done by the state machine: baseUrl at initialize, sessionId after INIT data.
  //#region Configuration
  setBaseUrl(url?: string) {
    if (!url) return;
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  setSessionId(sessionId?: string) {
    this.sessionId = sessionId;
  }
  //#endregion

  //#region Helpers
  private requireBase() {
    if (!this.baseUrl) throw new Error('API baseUrl is not configured.');
  }
  private requireSession(session?: string) {
    const s = session ?? this.sessionId;
    if (!s) throw new Error('API sessionId is not configured.');
    return s;
  }
  //#endregion

  //#region HISTORY
  playerHistory(params: { limit?: number; offset?: number; session?: string } = {}): Observable<unknown> {
    this.requireBase();
    const session = this.requireSession(params.session);
    const body = {
      session,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    };
    return this.http.post<unknown>(`${this.baseUrl}/history/`, body);
  }
  //#endregion

  //#region BEST
  // CASHED MULTIPLIERS
  topCashouts(periodVal: string, session?: string): Observable<unknown> {
    this.requireBase();
    const body = { session: this.requireSession(session), period: periodVal };
    return this.http.post<unknown>(`${this.baseUrl}/topCashouts/`, body);
  }

  // WINS
  topWins(periodVal: string, session?: string): Observable<unknown> {
    this.requireBase();
    const body = { session: this.requireSession(session), period: periodVal };
    return this.http.post<unknown>(`${this.baseUrl}/topWins/`, body);
  }

  // RESULTS
  topRounds(periodVal: string, session?: string): Observable<unknown> {
    this.requireBase();
    const body = { session: this.requireSession(session), period: periodVal };
    return this.http.post<unknown>(`${this.baseUrl}/topRounds/`, body);
  }
  //#endregion
  

  // STATS
  generalRound(session?: string): Observable<unknown> {
    this.requireBase();
    // Postman shows empty body; expose session optionally in case backend supports it.
    const body = session || this.sessionId ? { session: this.requireSession(session) } : {};
    return this.http.post<unknown>(`${this.baseUrl}/roundHistory/`, body);
  }


  // BET DETAILS
  betDetails(betId: string, session?: string): Observable<unknown> {
    this.requireBase();
    const body = { session: this.requireSession(session) };
    return this.http.post<unknown>(`${this.baseUrl}/details/${betId}`, body);
  }
  
  // TODO | EXTRA -> Bunlar entegre edilmedi !
  roundDetails(roundId: string, session?: string): Observable<unknown> {
    this.requireBase();
    const s = this.requireSession(session);
    const params = new HttpParams().set('session', s);
    return this.http.get<unknown>(`${this.baseUrl}/rounds/${roundId}`, { params });
  }

  // Getter to read the current sessionId when needed in components
  getSessionId(): string | undefined {
    return this.sessionId;
  }
}
