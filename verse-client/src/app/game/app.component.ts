import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import * as THREE from "three";
import {SocketService} from "./socket";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {AuthService} from "../auth.service";
import {PointerLockControls} from "three/examples/jsm/controls/PointerLockControls";
import {DefaultCube} from "./default_cube";
import {Cursor, Player} from "./player_controller";
import {OtherPlayers} from "./other_players";

@Component({
  selector: 'app-root',
  templateUrl: './ui/app.component.html',
  styleUrls: ['./ui/app.component.scss']
})
export class AppComponent implements AfterViewInit {
  @ViewChild("canvas") canvas?: ElementRef;

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;

  private objects: SceneObject[] = [];

  playerName?: string;

  constructor(public socket: SocketService, http: HttpClient, auth: AuthService) {
    while (true) {
      const name = prompt("Player name: ");
      const color = prompt("Player color: ");
      if (name == null || color == null) continue;

      http.post(`http://${environment.host}/login`, {name, color}, {responseType: "text"}).subscribe();
      auth.player.next({name, color});
      this.playerName = name;
      break;
    }
  }

  controls?: PointerLockControls;
  enterCursor() {
    this.controls!.lock();
  }

  ngAfterViewInit() {
    const canvas = this.canvas!.nativeElement as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.y = 1.5;
    this.controls = new PointerLockControls(this.camera, canvas);
    this.controls.connect();

    const renderer = new THREE.WebGLRenderer({canvas});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    window.addEventListener("resize", () => {
      this.camera!.aspect = window.innerWidth / window.innerHeight;
      this.camera!.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.populateScene();

    const scene = this.scene; const camera = this.camera; const animateScene = (frame: number) => this.animate(frame);
    (function animate(frame: number) {
      window.requestAnimationFrame(() => animate(frame + 1));
      animateScene(frame);
      renderer.render(scene, camera);
    }(0));
  }

  private populateScene() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshPhysicalMaterial({color: 0xffffff})
    ).rotateX(-Math.PI / 2);
    ground.receiveShadow = true;
    this.scene!.add(ground);

    this.objects.push(new DefaultCube(this.scene!));
    this.objects.push(new Player(this.socket, this.camera!, this.controls!));
    this.objects.push(new OtherPlayers(this.scene!, this.socket, this.playerName!));
    this.objects.push(new Cursor(this.scene!, this.camera!, this.socket));

    this.camera!.position.z = 5;

    const light = new THREE.DirectionalLight(0xcccccc);
    light.position.set(2, 3, 2);
    light.castShadow = true;
    this.scene!.add(light);
    this.scene!.add(light.target);
    this.scene!.add(new THREE.HemisphereLight(0xffffff, 0x000000));
  }

  private animate(frame: number) {
    this.objects.forEach(object => object.animate(frame));
    this.socket.flushPlayerState();
  }
}

export interface SceneObject {
  animate(frame: number): void;
}
