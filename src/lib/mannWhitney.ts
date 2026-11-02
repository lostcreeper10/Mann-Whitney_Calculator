/**
 * Mann–Whitney U test engine.
 *
 * All rank arithmetic is done on DOUBLED ranks (2 × rank). Average ranks of
 * ties are always multiples of 0.5, so doubling turns every rank, rank sum and
 * U value into an exact integer. This avoids floating-point drift and lets the
 * internal identity checks compare integers exactly.
 */

export type GroupId = 1 | 2;
export type TestType = "two" | "left" | "right";
export type Alpha = 0.01 | 0.05 | 0.1;

export interface RankedObservation {
  value: number;
  group: GroupId;
  /** Position of the value inside its own group as entered (0-based). */
  inputIndex: number;
  /** 1-based position in the sorted combined list. */
  position: number;
  rank: number;
  /** Index into `ties` when this value is tied, otherwise -1. */
  tieIndex: number;
}

export interface TieGroup {
  value: number;
  count: number;
  positions: number[];
  rank: number;
}

export interface CriticalValueInfo {
  /** "table": exact no-ties value inside the range of conventional tables (n ≤ 20).
   *  "exact": exact no-ties value computed for sizes beyond printed tables.
   *  "none": exact distribution exists but no U value is small enough (cannot reject at this α).
   *  "normal": samples too large for the exact distribution; z critical value is used. */
  kind: "table" | "exact" | "none" | "normal";
  value: number | null;
  /** α allotted to the lower tail used to read the critical value. */
  tailAlpha: number;
  /** Exact P(U ≤ critical value) under H₀ with no ties. */
  attainedAlpha: number | null;
  zCritical: number;
  /** Approximate U boundary μ − z·σ (informational, normal kind only). */
  approxBoundary: number | null;
}

export interface NormalApprox {
  mean: number;
  /** Σ(t³ − t) over tie groups. */
  tieSum: number;
  variance: number;
  sd: number;
  z: number | null;
  pValue: number;
  continuity: number;
}

export interface PValueInfo {
  method: "exact" | "exact-ties" | "normal";
  pValue: number;
  /** Probabilities under the (conditional) exact permutation distribution. */
  /** P(U₁ ≤ observed U₁) under the exact permutation distribution. */
  pU1Le: number | null;
  /** P(U₂ ≤ observed U₂) under the exact permutation distribution. */
  pU2Le: number | null;
  permutations: number | null;
}

export interface MannWhitneyResult {
  n1: number;
  n2: number;
  N: number;
  ranked: RankedObservation[];
  ties: TieGroup[];
  hasTies: boolean;
  /** Ranks of each group in the order the data were entered. */
  ranks1: { value: number; rank: number }[];
  ranks2: { value: number; rank: number }[];
  R1: number;
  R2: number;
  rankSumExpected: number;
  U1: number;
  U2: number;
  U: number;
  smaller: "U1" | "U2" | "equal";
  /** Statistic compared with the critical value (depends on the test type). */
  decisionStat: { label: "U" | "U₁" | "U₂"; value: number };
  critical: CriticalValueInfo;
  pInfo: PValueInfo;
  normal: NormalApprox;
  alpha: Alpha;
  testType: TestType;
  rejectByCritical: boolean | null;
  rejectByP: boolean;
  /** Direction of the sample effect vs. the one-tailed alternative. */
  directionMismatch: boolean;
}

/* ------------------------------------------------------------------ */
/* Input parsing                                                        */
/* ------------------------------------------------------------------ */

const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
export const MAX_PER_GROUP = 1000;

export interface ParseResult {
  values: number[];
  invalid: string[];
}

/** Splits on commas, whitespace and line breaks; keeps only plain decimal numbers. */
export function parseData(text: string): ParseResult {
  const tokens = text.split(/[\s,]+/).filter((t) => t.length > 0);
  const values: number[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    if (!NUMBER_RE.test(t)) {
      invalid.push(t);
      continue;
    }
    const v = Number(t);
    if (!Number.isFinite(v)) invalid.push(t);
    else values.push(v);
  }
  return { values, invalid };
}

/** Returns a friendly error message, or null when the group is valid. */
export function validateGroup(name: string, text: string): string | null {
  if (text.trim() === "") return `${name}: please enter at least one numerical observation.`;
  const { values, invalid } = parseData(text);
  if (invalid.length > 0) {
    const shown = invalid.slice(0, 5).map((t) => `"${t}"`).join(", ");
    const more = invalid.length > 5 ? ` and ${invalid.length - 5} more` : "";
    return `${name}: ${shown}${more} ${invalid.length === 1 ? "is not a valid number" : "are not valid numbers"}. Use plain numbers such as 85 or 72.5, separated by commas, spaces or new lines.`;
  }
  if (values.length === 0) return `${name}: please enter at least one numerical observation.`;
  if (values.length > MAX_PER_GROUP)
    return `${name}: at most ${MAX_PER_GROUP} observations are supported (you entered ${values.length}).`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Normal distribution helpers                                          */
/* ------------------------------------------------------------------ */

/** Standard normal CDF (Hart 1968 / West 2005, ~double precision). */
export function normCdf(x: number): number {
  const z = Math.abs(x);
  let c: number;
  if (z > 37) c = 0;
  else {
    const e = Math.exp((-z * z) / 2);
    if (z < 7.07106781186547) {
      let n = 3.52624965998911e-2 * z + 0.700383064443688;
      n = n * z + 6.37396220353165;
      n = n * z + 33.912866078383;
      n = n * z + 112.079291497871;
      n = n * z + 221.213596169931;
      n = n * z + 220.206867912376;
      let d = 8.83883476483184e-2 * z + 1.75566716318264;
      d = d * z + 16.064177579207;
      d = d * z + 86.7807322029461;
      d = d * z + 296.564248779674;
      d = d * z + 637.333633378831;
      d = d * z + 793.826512519948;
      d = d * z + 440.413735824752;
      c = (e * n) / d;
    } else {
      let f = z + 0.65;
      f = z + 4 / f;
      f = z + 3 / f;
      f = z + 2 / f;
      f = z + 1 / f;
      c = e / f / 2.506628274631;
    }
  }
  return x <= 0 ? c : 1 - c;
}

/** Inverse standard normal CDF (Acklam's algorithm + one Newton step). */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x: number;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pl) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // Newton refinement
  const e = normCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/* ------------------------------------------------------------------ */
/* Exact permutation distribution                                       */
/* ------------------------------------------------------------------ */

/** Work limit (items × k × sums) for the exact dynamic programme. */
const EXACT_WORK_LIMIT = 6e7;

/**
 * Exact distribution of the sum of `k` doubled ranks drawn without
 * replacement from `doubledRanks` (all C(N, k) subsets equally likely).
 * Returns counts indexed by doubled sum, or null when too large.
 */
function subsetSumDistribution(doubledRanks: number[], k: number): Float64Array | null {
  const sorted = [...doubledRanks].sort((x, y) => y - x);
  let maxSum = 0;
  for (let i = 0; i < k; i++) maxSum += sorted[i];
  if (doubledRanks.length * k * (maxSum + 1) > EXACT_WORK_LIMIT) return null;

  // dp[j][s] = number of j-subsets (of items seen so far) with doubled sum s
  const dp: Float64Array[] = [];
  for (let j = 0; j <= k; j++) dp.push(new Float64Array(maxSum + 1));
  dp[0][0] = 1;
  let reach = 0;
  for (const r of doubledRanks) {
    reach = Math.min(maxSum, reach + r);
    for (let j = k; j >= 1; j--) {
      const cur = dp[j];
      const prev = dp[j - 1];
      for (let s = reach; s >= r; s--) {
        const add = prev[s - r];
        if (add !== 0) cur[s] += add;
      }
    }
  }
  return dp[k];
}

interface UDistribution {
  /** probability mass indexed by doubled U₁ (0 … 2·n₁n₂) */
  pmf: Float64Array;
  total: number;
}

/** Exact null distribution of doubled U₁ given the (possibly tied) doubled ranks. */
function exactU1Distribution(doubledRanks: number[], n1: number, n2: number): UDistribution | null {
  const useGroup1 = n1 <= n2;
  const k = useGroup1 ? n1 : n2;
  const counts = subsetSumDistribution(doubledRanks, k);
  if (!counts) return null;
  const maxU2x = 2 * n1 * n2;
  const pmf = new Float64Array(maxU2x + 1);
  let total = 0;
  const offset = k * (k + 1); // doubled k(k+1)/2
  for (let s = 0; s < counts.length; s++) {
    const c = counts[s];
    if (c === 0) continue;
    total += c;
    const uk2 = s - offset; // doubled U of the chosen group
    const u1x2 = useGroup1 ? uk2 : maxU2x - uk2;
    pmf[u1x2] += c;
  }
  for (let i = 0; i < pmf.length; i++) pmf[i] /= total;
  return { pmf, total };
}

/* ------------------------------------------------------------------ */
/* Critical values                                                      */
/* ------------------------------------------------------------------ */

const noTieCache = new Map<string, Float64Array | null>();

/** Exact no-ties null pmf of U (indexed by integer U), symmetric so valid for U₁, U₂ or min. */
function noTiesPmf(n1: number, n2: number): Float64Array | null {
  const key = `${Math.min(n1, n2)}-${Math.max(n1, n2)}`;
  if (noTieCache.has(key)) return noTieCache.get(key)!;
  const N = n1 + n2;
  const doubled = Array.from({ length: N }, (_, i) => 2 * (i + 1));
  const dist = exactU1Distribution(doubled, n1, n2);
  let out: Float64Array | null = null;
  if (dist) {
    out = new Float64Array(n1 * n2 + 1);
    for (let u = 0; u <= n1 * n2; u++) out[u] = dist.pmf[2 * u];
  }
  noTieCache.set(key, out);
  return out;
}

export function criticalValue(n1: number, n2: number, alpha: Alpha, testType: TestType): CriticalValueInfo {
  const tailAlpha = testType === "two" ? alpha / 2 : alpha;
  const zCritical = normInv(1 - tailAlpha);
  const pmf = noTiesPmf(n1, n2);
  if (!pmf) {
    const mean = (n1 * n2) / 2;
    const sd = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    return { kind: "normal", value: null, tailAlpha, attainedAlpha: null, zCritical, approxBoundary: mean - zCritical * sd };
  }
  // Largest c such that P(U ≤ c) ≤ tail α (the convention used by printed tables).
  let cdf = 0;
  let crit = -1;
  let attained: number | null = null;
  for (let u = 0; u < pmf.length; u++) {
    cdf += pmf[u];
    if (cdf <= tailAlpha + 1e-12) {
      crit = u;
      attained = cdf;
    } else break;
  }
  const inTableRange = n1 <= 20 && n2 <= 20;
  if (crit < 0) return { kind: "none", value: null, tailAlpha, attainedAlpha: null, zCritical, approxBoundary: null };
  return { kind: inTableRange ? "table" : "exact", value: crit, tailAlpha, attainedAlpha: attained, zCritical, approxBoundary: null };
}

/* ------------------------------------------------------------------ */
/* Main computation                                                     */
/* ------------------------------------------------------------------ */

export class ValidationError extends Error {}

export function mannWhitney(group1: number[], group2: number[], alpha: Alpha, testType: TestType): MannWhitneyResult {
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 < 1 || n2 < 1) throw new ValidationError("Both groups need at least one observation.");
  const N = n1 + n2;

  // 1. Combine and sort ascending (ties: Group 1 first, then entry order — display only).
  const combined = [
    ...group1.map((value, inputIndex) => ({ value, group: 1 as GroupId, inputIndex })),
    ...group2.map((value, inputIndex) => ({ value, group: 2 as GroupId, inputIndex })),
  ].sort((a, b) => a.value - b.value || a.group - b.group || a.inputIndex - b.inputIndex);

  // 2. Assign average ranks to ties (doubled rank of positions i..j is i + j).
  const ranked: RankedObservation[] = [];
  const doubledRank: number[] = new Array(N);
  const ties: TieGroup[] = [];
  let i = 0;
  while (i < N) {
    let j = i;
    while (j + 1 < N && combined[j + 1].value === combined[i].value) j++;
    const d = i + 1 + (j + 1); // doubled average of positions i+1 … j+1
    let tieIndex = -1;
    if (j > i) {
      tieIndex = ties.length;
      ties.push({
        value: combined[i].value,
        count: j - i + 1,
        positions: Array.from({ length: j - i + 1 }, (_, k) => i + 1 + k),
        rank: d / 2,
      });
    }
    for (let k = i; k <= j; k++) {
      doubledRank[k] = d;
      ranked.push({ ...combined[k], position: k + 1, rank: d / 2, tieIndex });
    }
    i = j + 1;
  }

  // 3. Rank sums (doubled, exact integers).
  let R1x2 = 0;
  let R2x2 = 0;
  const ranks1: { value: number; rank: number }[] = new Array(n1);
  const ranks2: { value: number; rank: number }[] = new Array(n2);
  ranked.forEach((o, k) => {
    if (o.group === 1) {
      R1x2 += doubledRank[k];
      ranks1[o.inputIndex] = { value: o.value, rank: o.rank };
    } else {
      R2x2 += doubledRank[k];
      ranks2[o.inputIndex] = { value: o.value, rank: o.rank };
    }
  });

  // Internal check: R₁ + R₂ = N(N + 1)/2
  if (R1x2 + R2x2 !== N * (N + 1)) throw new Error("Internal check failed: R₁ + R₂ ≠ N(N + 1)/2.");

  // 4. U values (doubled), textbook form:
  //    U₁ = n₁n₂ + n₁(n₁ + 1)/2 − R₁,  U₂ = n₁n₂ + n₂(n₂ + 1)/2 − R₂.
  //    A small U₁ means Group 1 has high ranks; a small U₂ means Group 2 has high ranks.
  const U1x2 = 2 * n1 * n2 + n1 * (n1 + 1) - R1x2;
  const U2x2 = 2 * n1 * n2 + n2 * (n2 + 1) - R2x2;
  if (U1x2 + U2x2 !== 2 * n1 * n2) throw new Error("Internal check failed: U₁ + U₂ ≠ n₁n₂.");
  if (U1x2 < 0 || U2x2 < 0) throw new Error("Internal check failed: negative U value.");
  // The exact distribution below is of R₁ − n₁(n₁ + 1)/2, which equals U₂.
  const S1x2 = U2x2;

  const U1 = U1x2 / 2;
  const U2 = U2x2 / 2;
  const U = Math.min(U1, U2);
  const smaller = U1 < U2 ? "U1" : U2 < U1 ? "U2" : "equal";

  // 5. Statistic used for the decision.
  //    Left-tailed (Group 1 lower)  → Group 2 has high ranks → U₂ is small.
  //    Right-tailed (Group 1 higher) → Group 1 has high ranks → U₁ is small.
  const decisionStat =
    testType === "two"
      ? { label: "U" as const, value: U }
      : testType === "left"
        ? { label: "U₂" as const, value: U2 }
        : { label: "U₁" as const, value: U1 };
  const mean = (n1 * n2) / 2;
  const directionMismatch = testType !== "two" && decisionStat.value > mean;

  // 6. Critical value (conventional no-ties distribution).
  const critical = criticalValue(n1, n2, alpha, testType);
  let rejectByCritical: boolean | null = null;
  if (critical.kind === "table" || critical.kind === "exact") rejectByCritical = decisionStat.value <= critical.value!;
  else if (critical.kind === "none") rejectByCritical = false;

  // 7. Normal approximation with tie correction and continuity correction.
  const tieSum = ties.reduce((s, t) => s + (t.count ** 3 - t.count), 0);
  const variance = N > 1 ? ((n1 * n2) / 12) * (N + 1 - tieSum / (N * (N - 1))) : 0;
  const sd = Math.sqrt(Math.max(variance, 0));
  let z: number | null = null;
  let pNormal = 1;
  const cc = 0.5;
  if (sd > 0) {
    if (testType === "two") {
      z = Math.max(Math.abs(U - mean) - cc, 0) / sd;
      pNormal = Math.min(1, 2 * (1 - normCdf(z)));
    } else {
      // one-tailed: small values of the decision statistic support H₁
      z = (decisionStat.value - mean + cc) / sd;
      pNormal = normCdf(z);
    }
  }
  const normal: NormalApprox = { mean, tieSum, variance, sd, z, pValue: pNormal, continuity: cc };

  // 8. Exact permutation p-value where feasible (conditional on tied ranks).
  let pInfo: PValueInfo;
  const dist = exactU1Distribution(doubledRank, n1, n2);
  if (dist) {
    // P(U₂ ≤ observed U₂) and P(U₁ ≤ observed U₁) = P(U₂ ≥ observed U₂)
    let pU2 = 0;
    let pU1 = 0;
    for (let u = 0; u < dist.pmf.length; u++) {
      if (u <= S1x2) pU2 += dist.pmf[u];
      if (u >= S1x2) pU1 += dist.pmf[u];
    }
    pU2 = Math.min(1, pU2);
    pU1 = Math.min(1, pU1);
    const p = testType === "two" ? Math.min(1, 2 * Math.min(pU1, pU2)) : testType === "left" ? pU2 : pU1;
    pInfo = { method: ties.length > 0 ? "exact-ties" : "exact", pValue: p, pU1Le: pU1, pU2Le: pU2, permutations: dist.total };
  } else {
    pInfo = { method: "normal", pValue: pNormal, pU1Le: null, pU2Le: null, permutations: null };
  }

  return {
    n1,
    n2,
    N,
    ranked,
    ties,
    hasTies: ties.length > 0,
    ranks1,
    ranks2,
    R1: R1x2 / 2,
    R2: R2x2 / 2,
    rankSumExpected: (N * (N + 1)) / 2,
    U1,
    U2,
    U,
    smaller,
    decisionStat,
    critical,
    pInfo,
    normal,
    alpha,
    testType,
    rejectByCritical,
    rejectByP: pInfo.pValue <= alpha,
    directionMismatch,
  };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                           */
/* ------------------------------------------------------------------ */

/** Formats a number without trailing zeros (max 4 decimals). */
export function fmt(n: number, maxDecimals = 4): string {
  if (!Number.isFinite(n)) return String(n);
  const r = Number(n.toFixed(maxDecimals));
  return (Object.is(r, -0) ? 0 : r).toLocaleString("en-US", { maximumFractionDigits: maxDecimals, useGrouping: false });
}

export function fmtP(p: number): string {
  if (p >= 0.001) return p.toFixed(4);
  if (p >= 1e-6) return p.toPrecision(4);
  return p.toExponential(3);
}
