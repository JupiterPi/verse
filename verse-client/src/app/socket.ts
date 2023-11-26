import {Injectable} from '@angular/core';
import {environment} from "../environments/environment";
import {AuthService} from "./auth.service";
import {filter, first} from "rxjs";
import {isNonNull} from "../util";

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private ws?: WebSocket;
  private ready = false;

  constructor(private auth: AuthService) {}

  connect(onMessage: (packet: any) => void) {
    this.ws = new WebSocket(`ws://${environment.host}/game`);
    this.ws.addEventListener("open", () => {
      this.auth.player.pipe(filter(isNonNull), first()).subscribe(playerInfo => {
        this.ws!.send(JSON.stringify({
          name: playerInfo.name,
          color: playerInfo.color,
          position: {x: 2, y: 0}
        }));
        this.ready = true;
      });
    });
    this.ws.addEventListener("message", (message: MessageEvent) => {
      const packet = JSON.parse(message.data);
      onMessage(packet);
    });
    this.ws.addEventListener("close", event => {
      if (event.code != 1000) console.error("WebSocket connection closed:", event.code, event.reason);
    });
  }

  sendMessage(payload: any) {
    const message = JSON.stringify(payload);
    if (!this.ready) return;
    this.ws!.send(message);
  }

  isConnected() {
    return this.ws != null;
  }
}
