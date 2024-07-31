import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import '@babylonjs/core/Helpers/sceneHelpers';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import '@babylonjs/core/Materials/standardMaterial';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsShapeBox, PhysicsShapeSphere } from '@babylonjs/core/Physics/v2/physicsShape';
import { Scene } from '@babylonjs/core/scene';
import HavokPhysics from '@babylonjs/havok';
import {
  addNodeEntity,
  createComponent,
  entityEvents,
  queryEntities,
  queryXforms,
  removeEntity
} from '@skyboxgg/bjs-ecs'; 
import { setupInspector, showInspector } from './inspector';

export async function createScene(engine: Engine): Promise<Scene> {
  const scene = new Scene(engine);

  // physics
  const havokInstance = await HavokPhysics();
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.8, 0), havokPlugin);

  // inspector
  setupInspector(scene);
  showInspector(true, scene);

  // environment
  scene.createDefaultEnvironment({ createGround: false });
  scene.environmentIntensity = 1.2;
  scene.imageProcessingConfiguration.toneMappingType = 1;
  scene.imageProcessingConfiguration.vignetteEnabled = true;

  // camera
  const camera = new FreeCamera('camera1', new Vector3(0, 5, -10), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(true);

  // light
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.2;

  const isGround = createComponent('isGround', (isGround: boolean) => isGround);

  entityEvents.on('add', ['ground', 'grey', isGround], (entity) => {
    console.log('Ground is added: ', entity.isGround);
  });

  // entities
  const sphere = MeshBuilder.CreateSphere(
    'sphere',
    { diameter: 1, segments: 32 },
    scene
  );
  sphere.position.y = 2;
  const sphereMat = new PBRMaterial('sphereMat', scene);
  sphereMat.roughness = 0.7;
  sphere.material = sphereMat;
  new PhysicsBody(sphere, PhysicsMotionType.DYNAMIC, false, scene).shape =
    new PhysicsShapeSphere(
      Vector3.Zero(),
      sphere.getRawBoundingInfo().boundingBox.extendSize.x,
      scene
    );
  addNodeEntity(sphere, ['player', 'grey']);

  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: 8, height: 6 },
    scene
  );
  const groundMat = new PBRMaterial('groundMat', scene);
  groundMat.roughness = 0.18;
  ground.material = groundMat;
  new PhysicsBody(ground, PhysicsMotionType.STATIC, false, scene).shape =
    new PhysicsShapeBox(
      Vector3.Zero(),
      Quaternion.Identity(),
      ground.getRawBoundingInfo().boundingBox.extendSize.scale(2),
      scene
    );
  addNodeEntity(ground, ['ground', 'grey', isGround(true)]);

  console.log('ecs query:');
  const entities = queryXforms(['grey']);
  console.log('entities:');
  entities.forEach((entity) => {
    console.log(' name:', entity.node.name);
    console.log(' pos:', entity.xform.position.toString());
  });

  // // remove from BJS
  // ground.dispose();

  // remove from world
  for(const entity of queryEntities(['ground'])) {
    removeEntity(entity);
  }

  const entities2 = queryXforms(['grey']);
  console.log('entities2:');
  for(const entity of entities2) {
    console.log(' name:', entity.node.name);
    console.log(' pos:', entity.xform.position.toString());
  }

  return scene;
}
