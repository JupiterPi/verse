import {SceneObject} from "./app.component";
import * as THREE from "three";
import {CSS3DObject} from "three/examples/jsm/renderers/CSS3DRenderer";
import {Player} from "./player_controller";

export const WEBFRAME = "[webframe]";

interface Webframe {
  screen: CSS3DObject;
  box: THREE.Mesh;
}

export class Webframes implements SceneObject {
  private raycaster = new THREE.Raycaster();

  webframes = new Map<string, Webframe>();

  constructor(private scene: THREE.Scene, cssScene: THREE.Scene, player: Player, private camera: THREE.Camera) {
    const container = document.createElement("div");
    container.setAttribute("style", "scale: 0.003; translate: -50% calc(-50% + 1.5px);");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("src", "https://wikipedia.org");
    iframe.setAttribute("width", "1536");
    iframe.setAttribute("height", "864");

    const input = document.createElement("input");
    input.setAttribute("style", "background-color: white; border: black; outline: none;");
    input.onfocus = () => player.pushDisableKeyboardControls();
    input.onblur = () => player.popDisableKeyboardControls();

    const button = document.createElement("button");
    button.innerText = "Go";
    button.setAttribute("style", "background-color: white; border: black;");
    button.onclick = () => {
      console.log(input.value);
      iframe.setAttribute("src", input.value);
      input.value = "";
    };

    container.appendChild(input);
    container.appendChild(button);
    container.appendChild(document.createElement("br"));
    container.appendChild(iframe);

    const screen = new CSS3DObject(container);
    screen.position.set(1536/2, 864/2, 0);
    cssScene.add(screen);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(4.7, 2.8, 0.1),
      this.idleBoxMaterial
    );
    box.name = WEBFRAME;
    box.position.set(0, 1.45, -0.05);
    scene.add(box);

    this.webframes.set("0", {screen, box});
  }

  idleBoxMaterial = new THREE.MeshPhysicalMaterial({color: "darkgrey"});
  activeBoxMaterial = new THREE.MeshPhysicalMaterial({color: 0x2872fd});

  animate() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children);
    this.webframes.forEach(webframe => {
      webframe.screen.visible = false;
      webframe.box.material = this.idleBoxMaterial;
    });
    if (intersections.length > 0) {
      const boxHit = intersections[0].object;
      if (!boxHit.name.includes(WEBFRAME)) return;
      this.webframes.forEach(webframe => {
        if (webframe.box.uuid == boxHit.uuid) {
          webframe.screen.visible = true;
          webframe.box.material = this.activeBoxMaterial;
        }
      });
    }
  }
}
