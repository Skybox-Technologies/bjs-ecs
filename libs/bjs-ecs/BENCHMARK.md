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

### v0.3.5 (Array concat)
```
┌─────────┬──────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name        │ ops/sec   │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼──────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'Add entities'   │ '1.567'   │ 637899.4260204054  │ '±8.74%' │ 1568    │
│ 1       │ 'Query entities' │ '629.671' │ 1588.1287400421918 │ '±0.43%' │ 629672  │
└─────────┴──────────────────┴───────────┴────────────────────┴──────────┴─────────┘
```

### v0.1.16 (Archetypes)

```
┌─────────┬──────────────────┬───────────┬───────────────────┬──────────┬─────────┐
│ (index) │ Task Name        │ ops/sec   │ Average Time (ns) │ Margin   │ Samples │
├─────────┼──────────────────┼───────────┼───────────────────┼──────────┼─────────┤
│ 0       │ 'Add entities'   │ '1.164'   │ 858759.7770154395 │ '±8.88%' │ 1166    │
│ 1       │ 'Query entities' │ '253.030' │ 3952.094012196288 │ '±0.47%' │ 253031  │
└─────────┴──────────────────┴───────────┴───────────────────┴──────────┴─────────┘
```

### v0.1.14

```
┌─────────┬──────────────────┬──────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name        │ ops/sec  │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼──────────────────┼──────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'Add entities'   │ '6.529'  │ 153141.92955589647 │ '±1.25%' │ 6530    │
│ 1       │ 'Query entities' │ '25.844' │ 38692.88837299189  │ '±0.59%' │ 25845   │
└─────────┴──────────────────┴──────────┴────────────────────┴──────────┴─────────┘
```
