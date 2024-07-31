import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { addNodeEntity, queryMeshes, queryXforms } from './bjs-ecs';
import { removeEntity } from './ecs';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';

const engine = new NullEngine();
const scene = new Scene(engine);

describe('handle BJS entities', () => {
  it('can add BJS entities with components', () => {
    const player = MeshBuilder.CreateSphere('player1', { diameter: 2 }, scene);
    player.position.x = 1;
    expect(addNodeEntity(player, ['player']).node.name).toBe('player1');

    const enemy1 = MeshBuilder.CreateBox('enemy1', { size: 2 }, scene);
    expect(addNodeEntity(enemy1, ['enemy']).node.name).toBe('enemy1');

    const enemy2 = MeshBuilder.CreateBox('enemy2', { size: 2 }, scene);
    expect(addNodeEntity(enemy2, ['enemy']).node.name).toBe('enemy2');
  });

  it('can query BJS entities by tags', () => {
    const players = queryXforms(['player']);
    expect(players.length).toBe(1);
    const player = players[0];
    expect(player.node.name).toBe('player1');
    expect(player.xform.position.x).toBe(1);
  });

  it('can remove entity when BJS Node is disposed', () => {
    const enemies1 = queryXforms(['enemy']);
    expect(enemies1.length).toBe(2);

    scene.getMeshByName('enemy1')?.dispose();
    const enemies2 = queryXforms(['enemy']);
    expect(enemies2.length).toBe(1);
  });

  it('can dispose BJS Node when entity is removed from world', () => {
    const enemy2 = scene.getMeshByName('enemy2');
    expect(enemy2).toBeDefined();

    queryXforms(['enemy']).forEach((enemy) => {
      removeEntity(enemy);
    });

    const enemy2After = scene.getMeshByName('enemy2');
    expect(enemy2After).toBeDefined();
  });

  it('can recognize mesh on an entityNode with mesh added', () => {
    const player = MeshBuilder.CreateSphere('player1', { diameter: 2 }, scene);
    addNodeEntity(player, ['player']);

    queryMeshes(['mesh']).forEach((p) => {
      expect(p.mesh).toBeDefined;
    });
  });
});
