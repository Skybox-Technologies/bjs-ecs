import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import "@babylonjs/core/Materials/standardMaterial";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { addEntity, queryXforms, removeEntity } from "./ecs";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsShapeBox, PhysicsShapeSphere } from "@babylonjs/core";
import { setupInspector } from "./inspector";

export async function createScene(engine: Engine): Promise<Scene> {
  const scene = new Scene(engine);

  // physics
  const havokInstance = await HavokPhysics();
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.8, 0), havokPlugin);

  // inspector
  setupInspector(scene);

  const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(true);

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const sphere = MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 1, segments: 32 },
    scene
  );
  sphere.position.y = 2;
  new PhysicsBody(sphere, PhysicsMotionType.DYNAMIC, false, scene).shape =
    new PhysicsShapeSphere(
      Vector3.Zero(),
      sphere.getRawBoundingInfo().boundingBox.extendSize.x,
      scene
    );
  addEntity(sphere, ["player", "grey"]);

  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 8, height: 6 },
    scene
  );
  new PhysicsBody(ground, PhysicsMotionType.STATIC, false, scene).shape =
    new PhysicsShapeBox(
      Vector3.Zero(),
      Quaternion.Identity(),
      ground.getRawBoundingInfo().boundingBox.extendSize.scale(2),
      scene
    );
  addEntity(ground, ["ground", "grey"]);

  console.log("ecs query:");
  const entities = queryXforms(["grey"]);
  console.log("entities:");
  entities.forEach((entity) => {
    console.log(" name:", entity.name);
    console.log(" pos:", entity.xform.position.toString());
  });

  // remove from BJS
//   ground.dispose();

    // remove from world
//   queryXforms(["ground"]).forEach((entity) => {
//     removeEntity(entity);
//   });

  const entities2 = queryXforms(["grey"]);
  console.log("entities2:");
  entities2.forEach((entity) => {
    console.log(" name:", entity.name);
    console.log(" pos:", entity.xform.position.toString());
  });

  return scene;
}
