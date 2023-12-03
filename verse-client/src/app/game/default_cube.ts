import * as THREE from "three";
import {Scene} from "three";
import {SceneObject} from "./app.component";

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
