import {Injectable} from '@angular/core';
import {environment} from "../../environments/environment";
import {AuthService} from "../auth.service";
import {filter, first} from "rxjs";
import {isNonNull} from "../../util";
import * as THREE from "three";

export interface PlayerState {
  position: {x: number, y: number, z: number},
  rotation: {radians: number},
  cursor: {x: number, y: number, z: number} | null,
}

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
          color: playerInfo.color
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
    return this.ready;
  }

  // player state

  playerState: PlayerState = {
    position: new THREE.Vector3(0, 0, 0),
    rotation: {radians: 0},
    cursor: null,
  };
  private lastPlayerState: PlayerState = JSON.parse(JSON.stringify(this.playerState));

  flushPlayerState() {
    this.roundVector(this.playerState.position);
    if (this.playerState.cursor != null) this.roundVector(this.playerState.cursor);
    this.playerState.rotation.radians = this.roundFloat(this.playerState.rotation.radians);

    if (JSON.stringify(this.playerState) != JSON.stringify(this.lastPlayerState)) {
      this.sendMessage(this.playerState);
      this.lastPlayerState = JSON.parse(JSON.stringify(this.playerState));
    }
  }

  private roundVector(vector: {x: number, y: number, z: number}) {
    vector.x = this.roundFloat(vector.x);
    vector.y = this.roundFloat(vector.y);
    vector.z = this.roundFloat(vector.z);
  }
  private roundFloat(float: number) {
    return parseFloat(float.toFixed(2));
  }
}
