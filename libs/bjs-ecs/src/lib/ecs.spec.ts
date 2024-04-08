import { addEntity } from './ecs';

describe('bjsEsc', () => {
  it('addEntity', () => {
    const ent = addEntity(['test']);
    expect(ent).toBeDefined();
    expect(ent.is('test')).toBe(true);
  });
});
