import {SocketService} from "../socket";
import {SceneObject} from "../app.component";
import * as THREE from "three";
import {NO_CURSOR} from "./player_controller";

export class OtherPlayers implements SceneObject {
  players = new Map<string, {
    base: THREE.Object3D,
    cursor: THREE.Object3D,
    cursorTrace: THREE.Object3D,
    cursorTraceGeometry: THREE.BufferGeometry,
  }>();

  selfPlayerId?: string;

  constructor(scene: THREE.Scene, socket: SocketService) {
    socket.getSelfPlayer().subscribe(selfPlayer => {
      this.selfPlayerId = selfPlayer.id;
    });
    socket.getGame().subscribe(game => {
      if (this.selfPlayerId == undefined) return;
      const players = game.players.filter(player => player.id != this.selfPlayerId);
      for (const player of players) {
        if (!this.players.has(player.id)) {
          const base = this.constructPlayerObject(player.color);
          scene.add(base);

          const cursor = this.constructCursor(player.color);
          scene.add(cursor.tip);
          scene.add(cursor.trace);

          this.players.set(player.id, {base, cursor: cursor.tip, cursorTrace: cursor.trace, cursorTraceGeometry: cursor.traceGeometry});
        }
        const object = this.players.get(player.id)!;
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
      for (const [id, mesh] of this.players.entries()) {
        if (players.filter(player => player.id == id).length == 0) {
          scene.remove(mesh.base);
          scene.remove(mesh.cursor);
          scene.remove(mesh.cursorTrace);
        } else {
          scene.add(mesh.base);
          scene.add(mesh.cursor);
          scene.add(mesh.cursorTrace);
        }
        //TODO optimize this?
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
