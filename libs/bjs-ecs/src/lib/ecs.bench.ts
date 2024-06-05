import { Bench } from 'tinybench';
import { addEntity, clearWorld, queryEntities } from './ecs';

// to run: npx tsx ./libs/bjs-ecs/src/lib/ecs.bench.ts

const bench = new Bench({ time: 1000 });

// create 20 different archetypes with 1-5 components each
const archetypes: string[][] = [];
for (let i = 0; i < 20; ++i) {
  const components = [];
  for (let j = 0; j < (i % 5) + 1; ++j) {
    components.push(`copmp-${j}`);
  }
  archetypes.push(components);
}

bench
  .add('Add entities', () => {
    clearWorld();
    for (let i = 0; i < 1000; ++i) {
      addEntity(archetypes[i % archetypes.length]);
    }
  })
  .add('Query entities', () => {
    const entities = queryEntities([`copmp-0`, `copmp-1`]);
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of entities) {
      ++count;
    }
    if(count !== entities.length) {
      throw new Error('count mismatch');
    }
  });

await bench.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
await bench.run();

console.table(bench.table());
