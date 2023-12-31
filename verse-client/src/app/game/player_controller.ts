import {SceneObject} from "./app.component";
import {SocketService} from "./socket";
import * as THREE from "three";
import {PointerLockControls} from "three/examples/jsm/controls/PointerLockControls";

export class Player implements SceneObject {
  private MOVEMENT_SPEED = 0.15;

  private forward = false;
  private backward = false;
  private strafeLeft = false;
  private strafeRight = false;

  disableKeyboardControls = 0;
  pushDisableKeyboardControls() {
    this.disableKeyboardControls++;
  }
  popDisableKeyboardControls() {
    this.disableKeyboardControls--;
  }

  constructor(private socket: SocketService, private camera: THREE.Camera, private controls: PointerLockControls) {
    document.addEventListener("keydown", (event) => {
      if (this.disableKeyboardControls > 0) return;
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
    if (!this.socket.isConnected()) return;
    if (this.forward || this.backward || this.strafeLeft || this.strafeRight) {
      this.controls.moveForward((this.forward ? this.MOVEMENT_SPEED : 0) + (this.backward ? -this.MOVEMENT_SPEED : 0));
      this.controls.moveRight((this.strafeRight ? this.MOVEMENT_SPEED : 0) + (this.strafeLeft ? -this.MOVEMENT_SPEED : 0));
      this.socket.playerState.position = new THREE.Vector3().copy(this.camera.position).add(new THREE.Vector3(0, -1.5, 0));
    }
    this.socket.playerState.rotation.radians = this.camera.rotation.reorder("YXZ").y;
  }
}

export const NO_CURSOR = "[nocursor]";

export class Cursor implements SceneObject {
  private raycaster = new THREE.Raycaster();

  private mouseIsDown = false;

  constructor(private scene: THREE.Scene, private camera: THREE.Camera, private socket: SocketService) {
    document.addEventListener("mousedown", () => {
      this.mouseIsDown = true;
    });
    document.addEventListener("mouseup", () => {
      this.mouseIsDown = false;
    });
  }

  animate() {
    if (this.mouseIsDown) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const objects = this.scene.children
        .filter(obj => obj.name.indexOf(NO_CURSOR) == -1);
      const intersections = this.raycaster.intersectObjects(objects);
      this.socket.playerState.cursor = intersections.length > 0 ? intersections[0].point : null;
    } else {
      this.socket.playerState.cursor = null;
    }
  }
}
