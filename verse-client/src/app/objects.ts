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
  private movement = new THREE.Vector2(0, 0);

  constructor(private socket: SocketService) {
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "w": this.movement.setX(1); break;
        case "a": this.movement.setY(-1); break;
        case "s": this.movement.setX(-1); break;
        case "d": this.movement.setY(1); break;
      }
    });
    document.addEventListener("keyup", (event) => {
      if (event.key == "w" || event.key == "s") this.movement.setX(0);
      if (event.key == "a" || event.key == "d") this.movement.setY(0);
    });
  }

  animate() {
    if (this.socket.isConnected()) {
      if (this.movement.x != 0 || this.movement.y != 0) {
        this.socket.sendMessage({deltaX: this.movement.x * 0.1, deltaY: this.movement.y * 0.1});
      }
    }
  }
}

interface GamePlayer {
  name: string,
  color: string,
  position: {x: number, y: number},
}

export class OtherPlayers implements SceneObject {
  players = new Map<string, THREE.Mesh>();

  constructor(scene: Scene, socket: SocketService) {
    socket.connect(packet => {
      const players = packet as GamePlayer[];
      console.log("received players");
      for (const player of players) {
        if (this.players.has(player.name)) {
          const position = this.players.get(player.name)!.position;
          position.setX(player.position.x);
          position.setZ(player.position.y);
        } else {
          const mesh = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.5),
            new THREE.MeshPhysicalMaterial({color: player.color})
          );
          this.players.set(player.name, mesh);
          scene.add(mesh);
        }
      }
      for (const [name, mesh] of this.players.entries()) {
        if (players.filter(player => player.name == name).length == 0) scene.remove(mesh);
      }
    });
  }

  animate(frame: number) {
    for (const mesh of this.players.values()) {
      mesh.position.setY(1 + 0.1 + 0.1 + Math.sin(frame / 30) * 0.1);
    }
  }
}
