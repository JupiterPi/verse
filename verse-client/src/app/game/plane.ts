import {SceneObject} from "./app.component";
import * as THREE from "three";
import {CSS3DObject} from "three/examples/jsm/renderers/CSS3DRenderer";
import {Player} from "./player_controller";

export class Plane implements SceneObject {
  constructor(cssScene: THREE.Scene, player: Player) {
    const container = document.createElement("div");
    container.setAttribute("style", "scale: 0.003; translate: -50% calc(-50% + 1.5px);");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("src", "https://wikipedia.org");
    iframe.setAttribute("width", "1536");
    iframe.setAttribute("height", "864");

    const input = document.createElement("input");
    input.setAttribute("style", "");
    input.onfocus = () => player.pushDisableKeyboardControls();
    input.onblur = () => player.popDisableKeyboardControls();

    const button = document.createElement("button");
    button.innerText = "Go";
    button.setAttribute("style", "background-color: lightgrey; border: none;");
    button.onclick = () => {
      console.log(input.value);
      iframe.setAttribute("src", input.value);
      input.value = "";
    };

    container.appendChild(input);
    container.appendChild(button);
    container.appendChild(document.createElement("br"));
    container.appendChild(iframe);

    const obj = new CSS3DObject(container);
    obj.position.set(0, 10, 0);
    cssScene.add(obj);
  }

  animate() {}
}
