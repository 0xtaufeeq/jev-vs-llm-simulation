# Jev · Transaction Categorization

A recreation of the Jev "bye bye QuickBooks" demo. A bank statement is read in as a pile of cards. Each card is dealt off the stack, stamped with a category and flies out, while the donut, legend and **Money in & out** chart fill in live. It ends on a summary (Out / In / Net per category), then a **Jev vs LLM** comparison.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5178.

- **US sample · 3 mo**: 207 Chase-style transactions, Jan–Mar 2026 (totals match the original video: $17,240 out, $23,649 in).
- **India sample · 6 mo**: 349 HDFC-style transactions, Apr–Sep 2026, in ₹ with lakh formatting (₹5,76,816 out, ₹9,45,288 in).
- **Drop a CSV** to sort your own. Supported layouts: `Date, Description, Amount` (signed), or separate `Withdrawal`/`Deposit` (or `Debit`/`Credit`) columns. Dates can be `MM/DD/YYYY`, `DD/MM/YYYY`, ISO or `28-Sep-2026`. ₹/INR/UPI/NEFT switches the app to rupees.

The sample CSVs live in `public/samples/`. Regenerate and verify them with:

```bash
npm run samples
```

This writes both files from the same generator the app uses. It then re-imports each file and checks that every row comes back with the same category, amount and date.

## Jev vs LLM

Every run categorizes the statement twice:

1. **Jev**: the keyword rules in `src/data.ts` (`categorize()`), running on-device. The whole statement takes well under a millisecond.
2. **LLM**: a simulated LLM (`src/llm.ts`). **No API calls are made.** It is a deterministic, seeded model of batching an LLM: 25 transactions per request, 4 requests in parallel, a few seconds per request, token usage at typical frontier-model pricing ($4 / $20 per million tokens), and the ambiguous narrations LLMs tend to get wrong (refunds, "Instamart", SIPs, UPI transfers, recharges…).

While cards are dealt, each card shows the LLM's verdict (✓ / ✗). The strip under the chart races the two: time, rows done and cost so far. When both are finished, the right column switches to the comparison. A **Breakdown / Jev vs LLM** toggle lets you flip back. The comparison covers:

- accuracy against the known labels (or consistency for uploaded CSVs without a `Category` column)
- total time and cost
- consistency on repeat merchants and determinism
- time and cost projected to 10,000 transactions
- what data leaves the device
- the rows where the LLM disagreed with Jev

The UI doesn't say the LLM numbers are simulated. If you show this outside the team, say so yourself.

## Jev explainer page

`jev.html` (http://localhost:5178/jev.html, linked from the idle screen) explains what Jev is and compares it with LLMs: a live race on three example inputs, latency vs number of questions, a calibration dot plot with a threshold slider, a cost calculator, a side-by-side table, a quiz and LangChain harness patterns. It's a second React entry (`src/explainer/main.tsx`) that reuses the demo's `styles.css`, so it shares the demo's look: `Explainer.tsx` for the page, `RaceDemo.tsx` and `Interactives.tsx` for the interactive parts, `examples.ts` for the content and models. Like the comparison above, the race and charts are simulations built from TypeSafe's published ranges, not measurements.

Sources: [TypeSafe launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [LangChain](https://www.langchain.com/blog/building-a-harness-with-jev), [Lenny's Newsletter](https://www.lennysnewsletter.com/p/jev-for-beginners-how-to-use-it-and), [Vercel](https://vercel.com/i/what-is-jev).

## URL flags

| Flag | Effect |
| --- | --- |
| `?autoplay` / `?autoplay=india` | Start a sample immediately |
| `?t=9.5` (+ `&sample=india`) | Freeze the timeline at 9.5s, for inspecting a single frame |

## How it's built

- Vite + React + TypeScript, with no animation library.
- `src/timeline.ts`: one closed-form clock, `dealt(t)`, drives the stack, cards, donut, legend and bars together.
- `src/data.ts`: the sample generators, the CSV parser and exporter, the categorizer, and currency formatting.
- `src/llm.ts`: the simulated LLM run and the comparison metrics.
- `src/components/`: `Stack` (cards), `Charts` (donut, Money in & out), `Summary`, `Race`, `Compare`, `Idle`.
- The layout is a fixed 1166×692 stage (the size of the original recording), scaled to fit the window.
