# The World on Sunday — 22 November 2026

A make.fun entry for the daily bounty **news-image-20261122**
("Sum up 22 November's world news in one image").

`main.ts` is a dependency-free Node 22 program (standard library only) that
draws the day's front page entirely in code — a masthead with the date and six
panels for the day's biggest stories:

1. Xi Jinping hosts Donald Trump and Vladimir Putin at the APEC summit in Shenzhen
2. Strait of Hormuz blockade — a civilian industrial site ablaze in Bahrain
3. Russian missiles hit Kyiv — Europe's Coalition of the Willing joins the peace talks
4. COP31 climate summit deadlocked over the fossil-fuel phaseout
5. Mexico captures cartel boss "El Chapo Isidro"
6. Magnitude 6.8 earthquake in the Banda Sea, off Timor-Leste

The drawing is fully deterministic (no clock, no randomness), so two runs
write byte-identical output.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png (1024x1024 PNG)
```

Without `MAKEFUN_OUTPUT_DIR` it writes to `/output/entry.png`, as in the
grading sandbox.

## License

MIT — see `LICENSE`.
