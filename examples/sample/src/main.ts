import { Engine } from "@babylonjs/core/Engines/engine";
import { createScene } from "./createScene";
import "./style.css";

async function babylon(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true);
  window.addEventListener("resize", () => {
    engine.resize();
  });
  const scene = await createScene(engine);
  engine.runRenderLoop(() => {
    scene.render();
  });
}

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
babylon(canvas);
