# Initial benchmarks

## Info

- Adds 1000 entities with one of 20 archetypes with 1-5 components
- Queries entities with 2 specific tags
- Run on Windows AMD Ryzen 7 6800H 3201 Mhz

## Running

Use this command:

```
npx tsx ./libs/bjs-ecs/src/lib/ecs.bench.ts
```

## Results

### v0.1.14

```
┌─────────┬──────────────────┬──────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name        │ ops/sec  │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼──────────────────┼──────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'Add entities'   │ '6.529'  │ 153141.92955589647 │ '±1.25%' │ 6530    │
│ 1       │ 'Query entities' │ '25.844' │ 38692.88837299189  │ '±0.59%' │ 25845   │
└─────────┴──────────────────┴──────────┴────────────────────┴──────────┴─────────┘
```
