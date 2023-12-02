import * as THREE from "three";
import {Scene} from "three";
import {SocketService} from "./socket";
import {PointerLockControls} from "three/examples/jsm/controls/PointerLockControls";

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

  constructor(private socket: SocketService, private camera: THREE.Camera, private controls: PointerLockControls) {
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

  private position: THREE.Vector3 = new THREE.Vector3();
  private rotation: number = 0;

  animate() {
    if (this.socket.isConnected()) {
      let update = false;
      if (this.forward || this.backward || this.strafeLeft || this.strafeRight) {
        this.controls.moveForward((this.forward ? this.MOVEMENT_SPEED : 0) + (this.backward ? -this.MOVEMENT_SPEED : 0));
        this.controls.moveRight((this.strafeRight ? this.MOVEMENT_SPEED : 0) + (this.strafeLeft ? -this.MOVEMENT_SPEED : 0));
        const position = new THREE.Vector3().copy(this.camera.position).add(new THREE.Vector3(0, -1.5, 0));
        if (this.position != position) {
          this.position = position;
          update = true;
        }
      }
      const rotation = this.camera.rotation.reorder("YXZ").y;
      if (this.rotation != rotation) {
        this.rotation = rotation;
        update = true;
      }
      if (update) {
        this.socket.sendMessage({position: this.position, rotation: {radians: this.rotation}});
      }
    }
  }
}

interface GamePlayer {
  name: string,
  color: string,
  position: THREE.Vector3,
  rotation: {radians: number},
}

export class OtherPlayers implements SceneObject {
  players = new Map<string, THREE.Object3D>();

  constructor(scene: Scene, socket: SocketService, playerName: string) {
    socket.connect(packet => {
      const players = (packet as GamePlayer[]).filter(player => player.name != playerName);
      console.log(", ".concat(...players.map(player => player.rotation.radians.toString())));
      for (const player of players) {
        if (!this.players.has(player.name)) {
          const object = this.constructPlayerObject(player.color);
          this.players.set(player.name, object);
          scene.add(object);
        }
        const position = this.players.get(player.name)!.position;
        position.set(player.position.x, player.position.y + 1, player.position.z);
      }
      for (const [name, mesh] of this.players.entries()) {
        if (players.filter(player => player.name == name).length == 0) scene.remove(mesh);
      }
    });
  }

  private constructPlayerObject(color: string): THREE.Object3D {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5),
      new THREE.MeshPhysicalMaterial({color: "white"})
    ));
    group.add(new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.2),
      new THREE.MeshPhysicalMaterial({color})
    ));
    return group;
  }

  animate() {}
}
