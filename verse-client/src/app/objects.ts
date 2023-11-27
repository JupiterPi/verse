import * as THREE from "three";
import {Scene} from "three";
import {SocketService} from "./socket";

export interface SceneObject {
  animate(frame: number): void;
}

export class DefaultCube implements SceneObject {
  private readonly cube: THREE.Mesh;

  constructor(scene: Scene) {
    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhysicalMaterial({color: 0x2872fd})
    );
    this.cube.castShadow = true;
    scene.add(this.cube);
  }

  animate(frame: number) {
    this.cube.position.setY(0.5 + Math.abs(Math.sin(frame / 20)));
  }
}

export class Player implements SceneObject {
  private MOVEMENT_SPEED = 0.15;

  private forward = false;
  private backward = false;
  private strafeLeft = false;
  private strafeRight = false;

  constructor(private socket: SocketService, private movePlayer: (movement: THREE.Vector2) => THREE.Vector3) {
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "w": this.forward = true; break;
        case "a": this.strafeLeft = true; break;
        case "s": this.backward = true; break;
        case "d": this.strafeRight = true; break;
      }
    });
    document.addEventListener("keyup", (event) => {
      switch (event.key) {
        case "w": this.forward = false; break;
        case "a": this.strafeLeft = false; break;
        case "s": this.backward = false; break;
        case "d": this.strafeRight = false; break;
      }
    });
  }

  animate() {
    if (this.socket.isConnected()) {
      if (this.forward || this.backward || this.strafeLeft || this.strafeRight) {
        const x = (this.forward ? this.MOVEMENT_SPEED : 0) + (this.backward ? -this.MOVEMENT_SPEED : 0);
        const y = (this.strafeRight ? this.MOVEMENT_SPEED : 0) + (this.strafeLeft ? -this.MOVEMENT_SPEED : 0);
        const resultingPosition = this.movePlayer(new THREE.Vector2(x, y));
        this.socket.sendMessage({newPosition: resultingPosition});
      }
    }
  }
}

interface GamePlayer {
  name: string,
  color: string,
  position: THREE.Vector3,
}

export class OtherPlayers implements SceneObject {
  players = new Map<string, THREE.Mesh>();

  constructor(scene: Scene, socket: SocketService, playerName: string) {
    socket.connect(packet => {
      const players = (packet as GamePlayer[]).filter(player => player.name != playerName);
      for (const player of players) {
        if (!this.players.has(player.name)) {
          const mesh = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.5),
            new THREE.MeshPhysicalMaterial({color: player.color})
          );
          this.players.set(player.name, mesh);
          scene.add(mesh);
        }
        const position = this.players.get(player.name)!.position;
        position.set(player.position.x, player.position.y + 1, player.position.z);
      }
      for (const [name, mesh] of this.players.entries()) {
        if (players.filter(player => player.name == name).length == 0) scene.remove(mesh);
      }
    });
  }

  animate() {}
}
