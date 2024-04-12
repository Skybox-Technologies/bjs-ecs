import { Bench } from 'tinybench';
import { addEntity, queryEntities } from './ecs';

// to run: npx tsx ./libs/bjs-ecs/src/lib/ecs.bench.ts

const bench = new Bench({ time: 1000 });

bench
  .add('Add entities', () => {
    [...Array(100).keys()].forEach((i) => {
      addEntity([`copmp-${i % 10}`, `copmp-${(i / 10) | 0}`]);
    });
  })
  .add('Query entities', () => {
      queryEntities([`copmp-0`, `copmp-5`]);
  });

await bench.warmup(); // make results more reliable, ref: https://github.com/tinylibs/tinybench/pull/50
await bench.run();

console.table(bench.table());
