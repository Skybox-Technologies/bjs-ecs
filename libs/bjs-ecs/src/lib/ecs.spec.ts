import { addEntity, queryEntities, removeEntity } from './ecs';

function door(isLocked: boolean) {
  return { id: 'door', locked: isLocked };
}
door.id = 'door';

function color(hex: string) {
  return { id: 'color', color: hex };
}
color.id = 'color';

describe('handle entities and queries', () => {
  it('can add entities with tags', () => {
    const player = addEntity(['actor', 'player']);
    expect(player).toBeDefined();
    expect(player.is('player')).toBe(true);

    // add 10 enemies
    for (let i = 0; i < 10; i++) {
      const enemy = addEntity(['actor', 'enemy']);
      expect(enemy).toBeDefined();
      expect(enemy.is('enemy')).toBe(true);
      expect(enemy.is('player')).toBe(false);
    }
  });

  it('can add entities with components', () => {
    const redDoor = addEntity([door(true), color('#ff0000')]);
    expect(redDoor).toBeDefined();
    expect(redDoor.locked).toBe(true);
    expect(redDoor.color).toBe('#ff0000');
  });

  it('can query entities by tags', () => {
    const entities = queryEntities(['actor']);
    expect(entities.length).toBe(11);
  });

  it('can query entities by component', () => {
    const entities = queryEntities([color]);
    expect(entities.length).toBe(1);
    expect(entities[0].color).toBe('#ff0000');
  });

  it('can remove entities', () => {
    let entities = queryEntities(['enemy']);
    expect(entities.length).toBe(10);

    removeEntity(entities[0]);

    entities = queryEntities(['enemy']);
    expect(entities.length).toBe(9);
  });
});
