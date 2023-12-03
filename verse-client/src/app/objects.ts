import * as THREE from "three";
import {Object3D, Scene} from "three";
import {PlayerState, SocketService} from "./socket";
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

  animate() {
    if (this.socket.isConnected()) {
      if (this.forward || this.backward || this.strafeLeft || this.strafeRight) {
        this.controls.moveForward((this.forward ? this.MOVEMENT_SPEED : 0) + (this.backward ? -this.MOVEMENT_SPEED : 0));
        this.controls.moveRight((this.strafeRight ? this.MOVEMENT_SPEED : 0) + (this.strafeLeft ? -this.MOVEMENT_SPEED : 0));
        this.socket.playerState.position = new THREE.Vector3().copy(this.camera.position).add(new THREE.Vector3(0, -1.5, 0));
      }
      this.socket.playerState.rotation.radians = this.camera.rotation.reorder("YXZ").y;
    }
  }
}

interface GamePlayer {
  name: string,
  color: string,
  state: PlayerState,
}

export class OtherPlayers implements SceneObject {
  players = new Map<string, {
    base: THREE.Object3D,
    cursor: THREE.Object3D,
    cursorTrace: THREE.Object3D,
    cursorTraceGeometry: THREE.BufferGeometry,
  }>();

  constructor(scene: Scene, socket: SocketService, playerName: string) {
    socket.connect(packet => {
      const players = (packet as GamePlayer[]).filter(player => player.name != playerName);
      for (const player of players) {
        if (!this.players.has(player.name)) {
          const base = this.constructPlayerObject(player.color);
          scene.add(base);

          const cursor = this.constructCursor(player.color);
          scene.add(cursor.tip);
          scene.add(cursor.trace);

          this.players.set(player.name, {base, cursor: cursor.tip, cursorTrace: cursor.trace, cursorTraceGeometry: cursor.traceGeometry});
        }
        const object = this.players.get(player.name)!;
        object.base.position.set(player.state.position.x, player.state.position.y + 1, player.state.position.z);
        object.base.rotation.set(0, player.state.rotation.radians, 0, "YXZ");
        if (player.state.cursor != null) {
          object.cursor.visible = true;
          object.cursor.position.set(player.state.cursor.x, player.state.cursor.y, player.state.cursor.z);
          object.cursorTrace.visible = true;
          object.cursorTraceGeometry.setFromPoints([
            new THREE.Vector3(player.state.position.x, player.state.position.y + 1.5, player.state.position.z),
            new THREE.Vector3(player.state.cursor.x, player.state.cursor.y, player.state.cursor.z)
          ]);
        } else {
          object.cursor.visible = false;
          object.cursorTrace.visible = false;
        }
      }
      for (const [name, mesh] of this.players.entries()) {
        if (players.filter(player => player.name == name).length == 0) {
          scene.remove(mesh.base);
          scene.remove(mesh.cursor);
        }
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

    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.05),
      new THREE.MeshPhysicalMaterial({color})
    );
    face.rotateX(Math.PI * 0.5);
    face.position.set(0, 0.6, -0.5);
    group.add(face);

    return group;
  }

  private constructCursor(color: string): {tip: THREE.Object3D, trace: THREE.Object3D, traceGeometry: THREE.BufferGeometry} {
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.05),
      new THREE.MeshPhysicalMaterial({color})
    );
    tip.name = NO_CURSOR;
    const traceGeometry = new THREE.BufferGeometry();
    const trace = new THREE.Line(
      traceGeometry,
      new THREE.LineBasicMaterial({color})
    );
    trace.name = NO_CURSOR;
    return {tip, trace, traceGeometry};
  }

  animate() {}
}

const NO_CURSOR = "[nocursor]";

export class Cursor implements SceneObject {
  private object: Object3D;
  private raycaster = new THREE.Raycaster();

  constructor(private scene: Scene, private camera: THREE.Camera, private socket: SocketService) {
    this.object = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshPhysicalMaterial({color: "black"})
    );
    scene.add(this.object);
  }

  animate() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const objects = this.scene.children
      .filter(obj => obj != this.object)
      .filter(obj => obj.name.indexOf(NO_CURSOR) == -1);
    const intersections = this.raycaster.intersectObjects(objects);
    const cursor = intersections.length > 0 ? intersections[0].point : null;
    this.object.visible = cursor != null;
    if (cursor != null) this.object.position.copy(cursor);
    this.socket.playerState.cursor = cursor;
  }
}
