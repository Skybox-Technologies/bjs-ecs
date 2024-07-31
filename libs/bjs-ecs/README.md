# bjs-esc

[ECS](https://en.wikipedia.org/wiki/Entity_component_system) for [Babylon.js](https://babylonjs.com/)

## Objectives

Provide an easy way to help structure your game logic for Babylon.js based projects using ECS.
This is (currently) more about the functionality of ECS than the performance benefits.
In short if you are looking for an ECS implementation to handle 10Ks of entities,
you may want to look elsewhere.

- ✅ (current) Focus on developer ergonomics, e.g. being TypeScript idiomatic
- ✅ (current) Tight integration with Babylon.js
- ✅ (current) Optimize query performance
- ❓ (not currently in scope) Optimized data storage for Entities/Components

## Sample

To run the sample:

```
git clone https://github.com/Skybox-Technologies/bjs-ecs.git
cd bjs-ecs
npm install
npx nx run sample:serve
```

See also [CodeSandbox](https://codesandbox.io/p/devbox/bjs-ecs-sample-sw27pj?file=%2Fsrc%2FcreateScene.ts)

## Installation

```
npm install @skyboxgg/bjs-ecs
```

## Usage

### Core ECS:

```ts
import { addEntity, createComponent, queryEntities, removeEntity } from '@skyboxgg/bjs-ecs';

// add entity with tags
const player = addEntity(['actor', 'player']);

// define components
const color = createComponent('color', (hex: string) => hex);
const door = createComponent('door', (isLocked: boolean) => ({isLocked}));

// Subscribe to events when entities are added to the world.
entityEvents.on('add', [door], (entity) => {
  // This callback is invoked whenever an entity, which includes the components specified in the second argument, is added to the world.
  console.log('Entity added: ', entity.door);
});

// Subscribe to events when entities are removed from the world.
entityEvents.on('remove', [door], (entity) => {
  // This callback is invoked whenever an entity, which includes the components specified in the second argument, is removed from the world.
  console.log('Entity removed: ', entity.door);
});

// add entity with components (and tag)
// component properties propagate to entity with typing
const redDoor = addEntity([door(true), color('#ff0000'), 'static']);
console.log('redDoor color:', redDoor.color);
console.log('redDoor lock status:', redDoor.locked);

const greenDoor = addEntity([door(false), color('#00ff00'), 'static']);
console.log('greenDoor color:', greenDoor.color);
console.log('greenDoor lock status:', greenDoor.locked);

// query entities by component
// result is typed
const entities = queryEntities([door, color]);
for (const entity of entities) {
  console.log('entity color:', entity.color);
  console.log('entity door lock status:', entity.door.locked);
}

// remove entity from world
removeEntity(entities[0]);
```

### With Babylon.js

Babylon Nodes can be added as entities, and subtypes (TransformNode, Mesh) as well as PhysicsBody
are automatically detected as additional components.

Nodes are automatically disposed from the Babylon scenegraph when removed from the ECS world and vice versa.

There is also initial support to show entity ID and list of components / tags, for Nodes in the Babylon inspector

![Inspector Support](https://raw.githubusercontent.com/Skybox-Technologies/bjs-ecs/main/libs/bjs-ecs/inspector.png)

```ts
import { Scene } from '@babylonjs/core/scene';
import { addNodeEntity, queryXforms } from '@skyboxgg/bjs-ecs';

function setupScene(scene: Scene) {
  // other scene setup: camera, lights, etc

  // create and add entities
  const sphere1 = MeshBuilder.CreateSphere('player1', { diameter: 1, segments: 32 }, scene);
  addNodeEntity(sphere1, ['player']);

  const sphere2 = MeshBuilder.CreateSphere('player2', { diameter: 1, segments: 32 }, scene);
  addNodeEntity(sphere2, ['player']);

  const ground = MeshBuilder.CreateGround('ground', { width: 8, height: 6 }, scene);
  addNodeEntity(ground, ['ground']);

  // query transform entities (with typing)
  for(const player of queryXforms(['player'])) {
    player.xform.position.y += 2;
  }
}
```

## Acknowledgements

- The interface and TypeScript Fu for adding entities with components, is inspired by [Kaboom.js](https://kaboomjs.com/)
