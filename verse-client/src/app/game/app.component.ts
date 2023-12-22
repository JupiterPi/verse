import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import * as THREE from "three";
import {SocketService} from "./socket";
import {PointerLockControls} from "three/examples/jsm/controls/PointerLockControls";
import {DefaultCube} from "./default_cube";
import {Cursor, Player} from "./player_controller";
import {OtherPlayers} from "./other_players";
import {ActivatedRoute} from "@angular/router";
import {BehaviorSubject, skip, Subject} from "rxjs";
import {ErrorsService} from "../errors.service";
import {Webframes} from "./webframes";
import {CSS3DRenderer} from "three/examples/jsm/renderers/CSS3DRenderer";

@Component({
  selector: 'app-root',
  templateUrl: './ui/app.component.html',
  styleUrls: ['./ui/app.component.scss']
})
export class AppComponent implements AfterViewInit {
  @ViewChild("canvas") canvas?: ElementRef;
  @ViewChild("cssCanvas") cssCanvas?: ElementRef;

  private scene?: THREE.Scene;
  private cssScene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;

  private objects: SceneObject[] = [];

  constructor(public socket: SocketService, private route: ActivatedRoute, private errorsService: ErrorsService) {
    this.route.queryParams.pipe(skip(1)).subscribe(params => {
      socket.connect(params["t"], initialCamera => {
        this.camera!.position.set(initialCamera.initialPosition.x, initialCamera.initialPosition.y + 1.5, initialCamera.initialPosition.z);
        this.camera!.rotation.set(0, initialCamera.initialRotation.radians, 0, "YXZ");
      });
    });
  }

  controls?: PointerLockControls;
  enterCursor() {
    this.controls!.lock();
  }

  @ViewChild("errorDialog") errorDialog?: ElementRef<HTMLDialogElement>;
  errorMessage = "";
  reload() {
    window.location.reload();
  }

  ngAfterViewInit() {
    this.errorsService.error.subscribe(error => {
      if (error == null) {
        this.errorMessage = "";
        this.errorDialog!.nativeElement.close();
      } else {
        this.errorMessage = error;
        this.errorDialog!.nativeElement.showModal();
      }
    });

    const canvas = this.canvas!.nativeElement as HTMLCanvasElement;
    const cssCanvas = this.cssCanvas!.nativeElement as HTMLDivElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.cssScene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.y = 1.5;
    this.controls = new PointerLockControls(this.camera, canvas);
    this.controls.connect();

    const renderer = new THREE.WebGLRenderer({canvas});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    const cssRenderer = new CSS3DRenderer({element: cssCanvas});
    cssRenderer.setSize(window.innerWidth, window.innerHeight);

    window.addEventListener("resize", () => {
      this.camera!.aspect = window.innerWidth / window.innerHeight;
      this.camera!.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      cssRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.populateScene();

    const scene = this.scene;
    const cssScene = this.cssScene;
    const camera = this.camera; const animateScene = (frame: number) => this.animate(frame);
    (function animate(frame: number) {
      window.requestAnimationFrame(() => animate(frame + 1));
      animateScene(frame);
      renderer.render(scene, camera);
      cssRenderer.render(cssScene, camera);
    }(0));
  }

  private populateScene() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshPhysicalMaterial({color: 0xffffff})
    ).rotateX(-Math.PI / 2);
    ground.receiveShadow = true;
    this.scene!.add(ground);

    const player = new Player(this.socket, this.camera!, this.controls!);
    this.objects.push(player);
    this.objects.push(new DefaultCube(this.scene!));
    this.objects.push(new OtherPlayers(this.scene!, this.socket));
    this.objects.push(new Cursor(this.scene!, this.camera!, this.socket));
    this.objects.push(new Webframes(this.scene!, this.cssScene!, player, this.camera!, () => this.controls!.unlock()));

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
