# Mann–Whitney U Test Calculator
Cordova Public College · Advanced Statistics

A Next.js web app that computes the Mann–Whitney U test step by step for two independent groups. All calculations run in the browser.

## Run locally

Requires Node.js 20 or newer.

```bash
cd mann-whitney-calculator
npm install
npm run dev
```

Open http://localhost:3000.

Production build:

```bash
npm run build
npm start
```

## How to use

1. Enter the scores for Group 1 and Group 2 (separate them with commas, spaces or new lines).
2. Choose the level of significance (0.01, 0.05, 0.10) and the type of test.
3. Click **CALCULATE MANN–WHITNEY U TEST**.

**LOAD SAMPLE DATA** fills in the example data. **CLEAR DATA** resets the form.

## Project structure

| File | Purpose |
|---|---|
| `src/lib/mannWhitney.ts` | Statistics engine: parsing, ranking with ties, U₁/U₂, critical values, p-values |
| `src/components/Calculator.tsx` | Input cards, settings, buttons, validation |
| `src/components/Results.tsx` | Flowchart and steps A–F |
| `src/components/RankChart.tsx` | Recharts rank visualization |
| `src/components/Header.tsx` | Page header |

## Statistical methods

- **Ranks:** tied scores get the average of the positions they occupy.
- **U₁ = n₁n₂ + n₁(n₁ + 1)/2 − R₁** and **U₂ = n₁n₂ + n₂(n₂ + 1)/2 − R₂**; U = min(U₁, U₂).
- **Internal checks:** R₁ + R₂ = N(N + 1)/2 and U₁ + U₂ = n₁n₂. If either fails, no results are shown.
- **Critical value:** computed from the exact no-ties null distribution of U (largest U with P(U ≤ U) ≤ α per tail). For n₁, n₂ ≤ 20 this is the conventional table value. If no value exists (very small samples) the app says so. For very large samples, it uses the z critical value.
  - Two-tailed: compare U = min(U₁, U₂) with the critical value at α/2.
  - Left-tailed (H₁: Group 1 lower): compare U₂ at α.
  - Right-tailed (H₁: Group 1 higher): compare U₁ at α.
- **p-value:** exact permutation distribution using the actual (average) ranks, so ties are handled exactly. When the samples are too large for that, it uses the normal approximation with tie correction and a 0.5 continuity correction.
- With ties present, the app notes that the no-ties table value is not tie-adjusted, and the final decision follows the tie-aware p-value.

## Sample data check

Group 1: 92, 88, 95, 85, 90, 87, 93, 89 · Group 2: 85, 78, 82, 75, 80, 72, 84, 77

R₁ = 99.5, R₂ = 36.5, U₁ = 64 + 36 − 99.5 = 0.5, U₂ = 64 + 36 − 36.5 = 63.5, U = 0.5. Critical U (n₁ = n₂ = 8, α = 0.05 two-tailed) = 13. Exact p = 0.000311. Decision: reject H₀.
