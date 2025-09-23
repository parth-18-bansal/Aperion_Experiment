import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { SocketConfig } from '../crash/interfaces';

@Injectable({
  providedIn: 'root',
})
export class SocketFactory {
  /**
   * Verilen konfigürasyona göre yeni bir SocketService örneği oluşturur.
   * @param config Oyunun soket ayarlarını içeren obje.
   * @returns Yeni bir SocketService örneği.
   */
  create(config: SocketConfig): SocketService {
    return new SocketService(config.wsUrl, config.opts);
  }
}
