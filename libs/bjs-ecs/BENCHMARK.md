# Initial benchmarks

## Info

- Adds 100 entities with 2 out of 10 tags
- Queries entities with 2 specific tags
- Run on Windows AMD Ryzen 7 6800H 3201 Mhz

## Results

### v0.1.4

```
┌─────────┬──────────────────┬──────────┬───────────────────┬───────────┬─────────┐
│ (index) │ Task Name        │ ops/sec  │ Average Time (ns) │ Margin    │ Samples │
├─────────┼──────────────────┼──────────┼───────────────────┼───────────┼─────────┤
│ 0       │ 'Add entities'   │ '11.496' │ 86981.6220880072  │ '±12.04%' │ 11590   │
│ 1       │ 'Query entities' │ '13'     │ 74465599.99999996 │ '±1.49%'  │ 14      │
└─────────┴──────────────────┴──────────┴───────────────────┴───────────┴─────────┘
```
