# bjs-esc

ECS for Babylon.js

## Sample

To run the sample:

```
npm install
npx nx run sample:serve
```

See also [CodeSandbox](https://codesandbox.io/p/devbox/bjs-ecs-sample-sw27pj?file=%2Fsrc%2FcreateScene.ts)

## Installation

```
npm install @skyboxgg/bjs-ecs
```

## Usage

Core ECS:

```ts
import { addEntity, queryEntities, removeEntity } from '@skyboxgg/bjs-ecs';

// add entity with tgs
const player = addEntity(['actor', 'player']);

// define components
function color(hex: string) {
  return { id: 'color', color: hex };
}
color.id = 'color';

function door(isLocked: boolean) {
  return { id: 'door', locked: isLocked };
}
door.id = 'door';

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
const doors = queryEntities([door, color]);
doors.forEach((door) => {
  console.log('door color:', door.color);
  console.log('door lock status:', door.locked);
});
```
