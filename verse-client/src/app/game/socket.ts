import {Injectable} from '@angular/core';
import {environment} from "../../environments/environment";
import {BehaviorSubject, filter} from "rxjs";
import {isNonNull} from "../../util";
import * as THREE from "three";
import {ErrorsService} from "../errors.service";

export interface SelfPlayer {
  name: string,
  id: string,
  color: string,
}

export interface PlayerState {
  position: {x: number, y: number, z: number},
  rotation: {radians: number},
  cursor: {x: number, y: number, z: number} | null,
}

export interface Game {
  players: GamePlayer[],
  availablePlayers: string[],
}

export interface GamePlayer {
  name: string,
  id: string,
  color: string,
  state: PlayerState,
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private ws?: WebSocket;
  private ready = false;

  constructor(private errorsService: ErrorsService) {}

  connect(token: string) {
    this.ws = new WebSocket(`ws://${environment.host}/game`);
    this.ws.addEventListener("open", () => {
      this.ws!.send(JSON.stringify({joinCode: token}));
    });
    this.ws.addEventListener("message", (message: MessageEvent) => {
      if (!this.ready) {
        const playerInfo = JSON.parse(message.data) as SelfPlayer;
        this.selfPlayer.next(playerInfo);
        this.ready = true;
      } else {
        this.game.next(JSON.parse(message.data) as Game);
      }
    });
    this.ws.addEventListener("close", event => {
      if (event.code != 1000) {
        this.errorsService.error.next(event.reason);
        console.error("WebSocket connection closed:", event.code, event.reason);
      }
    });
  }

  private sendMessage(payload: any) {
    const message = JSON.stringify(payload);
    if (!this.ready) return;
    this.ws!.send(message);
  }

  // send

  playerState: PlayerState = {
    position: new THREE.Vector3(0, 0, 0),
    rotation: {radians: 0},
    cursor: null,
  };
  private lastPlayerState: PlayerState = JSON.parse(JSON.stringify(this.playerState));

  flushPlayerState() {
    if (!this.ready) return;

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

  // receive

  private selfPlayer = new BehaviorSubject<SelfPlayer | null>(null);
  getSelfPlayer() {
    return this.selfPlayer.pipe(filter(isNonNull));
  }

  private game = new BehaviorSubject<Game | null>(null);
  getGame() {
    return this.game.pipe(filter(isNonNull));
  }
}
