import { SocketEvent } from '../crash/events';
// src/app/services/socket.service.ts
import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { Observable } from 'rxjs';

// Bu sınıf artık fabrika tarafından oluşturulacağı için Injectable olmasına gerek yok.
export class SocketService {
  private socket: Socket;

  constructor(uri: string, opts?: Partial<ManagerOptions & SocketOptions>) {
    this.socket = io(uri, opts);
  }

  // Sunucuya olay gönderme
  emit(event: SocketEvent, data: unknown): void {
    this.socket.emit(event, data);
  }

  // Sunucudan belirli bir olayı dinleme için genel bir metot
  listen<T>(eventName: SocketEvent): Observable<T> {
    const isReconnectEvent = [SocketEvent.RECONNECT_ATTEMPT, SocketEvent.RECONNECT, SocketEvent.RECONNECT_FAILED].includes(eventName);

    return new Observable<T>((observer) => {
      if (isReconnectEvent) {
        // @ts-ignore
        this.socket.io.on(eventName as any, (data: T) => {
          observer.next(data);
        });
      } else {
        this.socket.on(eventName, (data: T) => {
          observer.next(data);
        });
      }

      // Observable'dan çıkıldığında listener'ı kaldır
      return () => this.socket.off(eventName);
    });
  }

  // socket.io built-in events
  onConnect(): Observable<void> {
    return this.listen<void>(SocketEvent.CONNECT);
  }

  onDisconnect(): Observable<string> {
    return this.listen<string>(SocketEvent.DISCONNECT);
  }
  
  onPing(): Observable<void> {
    return this.listen<void>(SocketEvent.PING);
  }

  onReconnectAttempt(): Observable<number> {
    return this.listen<number>(SocketEvent.RECONNECT_ATTEMPT);
  }

  onReconnect(): Observable<number> {
    return this.listen<number>(SocketEvent.RECONNECT);
  }

  onReconnectFailed(): Observable<void> {
    return this.listen<void>(SocketEvent.RECONNECT_FAILED);
  }

  onNewServerSeedHash<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.NEW_SERVER_SEED_HASH);
  }

  onJackpotUpdate<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.JACKPOT_UPDATE);
  }

  onJackpotWin<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.JACKPOT_WIN);
  }
  
  onSessionExpired<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.SESSION_EXPIRED);
  }

  onBoomerUpdate<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.BOOMER_UPDATE);
  }

  onCashoutStats<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.CASHOUT_STATS);
  }

  onChatMessage<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.CHAT_MESSAGE);
  }

  onChatError<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.CHAT_ERROR);
  }

  onMaintenance<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.MAINTENANCE);
  }

  onRoundInfo<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.ROUND_INFO);
  }

  onMessages<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.MESSAGES);
  }

  onBalance<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.BALANCE);
  }

  onDisconnectDuplicate<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.DISCONNECT_DUPLICATE);
  }

  onCashout<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.CASHOUT);
  }

  onCancel<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.CANCEL);
  }

  onNotify<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.NOTIFY);
  }

  onState<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.STATE);
  }

  onInit<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.INIT);
  }

  onNew<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.NEW);
  }

  onBet<T>(): Observable<T> {
    return this.listen<T>(SocketEvent.BET);
  }

  onConnectError(): Observable<Error> {
  return new Observable<Error>((observer) => {
    this.socket.on('connect_error', (err: Error) => {
      observer.next(err);
    });
    return () => this.socket.off('connect_error');
  });
  }

  onReconnectError(): Observable<Error> {
    return new Observable<Error>((observer) => {
      this.socket.io.on('reconnect_error', (err: Error) => {
        observer.next(err);
      });
      return () => this.socket.io.off('reconnect_error');
    });
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  get id(): string |undefined {
    return this.socket.id;
  }
}
