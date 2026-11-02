"use client";

import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Info,
  ListOrdered,
  Scale,
  Sigma,
  Target,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { fmt, fmtP, type MannWhitneyResult } from "@/lib/mannWhitney";
import type { CalcRun } from "./Calculator";
import RankChart from "./RankChart";

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                         */
/* ------------------------------------------------------------------ */

function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex flex-col items-center align-middle leading-tight">
      <span className="px-1">{num}</span>
      <span className="w-full border-t border-current px-1">{den}</span>
    </span>
  );
}

/** One line of an equation: "LHS = RHS". */
function Eq({ lhs, children, highlight }: { lhs: ReactNode; children: ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`math flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-1.5 text-lg ${
        highlight ? "bg-green-50 font-bold text-green-800 ring-1 ring-green-300" : "text-navy-900"
      }`}
    >
      <span className="whitespace-nowrap italic">{lhs}</span>
      <span>=</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function FormulaBox({ children, label = "Formula" }: { children: ReactNode; label?: string }) {
  return (
    <div className="rounded-xl border-l-4 border-navy-800 bg-sky-soft px-4 py-3">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-navy-700">{label}</p>
      <div className="math text-xl text-navy-900">{children}</div>
    </div>
  );
}

function ResultCard({ label, value, sub, big }: { label: ReactNode; value: ReactNode; sub?: ReactNode; big?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border-2 border-green-500 bg-green-50 px-5 ${big ? "py-5" : "py-3"}`}
    >
      <CheckCircle2 className={`${big ? "h-9 w-9" : "h-7 w-7"} shrink-0 text-green-600`} aria-hidden />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-green-800">{label}</p>
        <p className={`math font-bold text-green-900 ${big ? "text-4xl" : "text-2xl"}`}>{value}</p>
        {sub && <p className="mt-0.5 text-sm text-green-900">{sub}</p>}
      </div>
    </div>
  );
}

function CheckLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900 ring-1 ring-green-200">
      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
      <div className="math text-base">{children}</div>
    </div>
  );
}

function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  const warn = tone === "warn";
  const Icon = warn ? TriangleAlert : Info;
  return (
    <div
      className={`flex gap-2 rounded-lg px-3 py-2.5 text-sm ${
        warn ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200" : "bg-sky-soft text-navy-800 ring-1 ring-sky-line"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

const DOWN_ARROW = (
  <div className="flex justify-center py-1" aria-hidden>
    <div className="flex flex-col items-center text-red-600">
      <span className="h-6 w-1 rounded bg-red-600" />
      <ArrowDown className="animate-arrow -mt-2 h-7 w-7" strokeWidth={3} />
    </div>
  </div>
);

function StepCard({
  id,
  letter,
  title,
  icon,
  delay,
  children,
}: {
  id: string;
  letter: string;
  title: string;
  icon: ReactNode;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="animate-rise scroll-mt-4 rounded-2xl border border-sky-line bg-white shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-sky-line px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-extrabold text-white">
          {letter}
        </span>
        <h3 id={`${id}-title`} className="flex flex-1 items-center gap-2 text-lg font-bold text-navy-900 sm:text-xl">
          <span className="hidden text-navy-600 sm:inline">{icon}</span>
          {title}
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed
        </span>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

const SUB1 = "₁";
const SUB2 = "₂";

function testTypeLabel(t: MannWhitneyResult["testType"]) {
  return t === "two" ? "Two-tailed" : t === "left" ? "Left-tailed (one-tailed)" : "Right-tailed (one-tailed)";
}

/** "(8 + 9)/2" style explanation of an average rank for tied positions. */
function tieExplanation(positions: number[], rank: number) {
  const k = positions.length;
  const inner =
    k <= 4 ? positions.join(" + ") : `${positions[0]} + ${positions[1]} + … + ${positions[k - 1]}`;
  return `(${inner}) / ${k} = ${fmt(rank)}`;
}

/* ------------------------------------------------------------------ */
/* Main results                                                         */
/* ------------------------------------------------------------------ */

export default function Results({ run }: { run: CalcRun }) {
  const { result: r, name1, name2 } = run;
  const groupName = (g: 1 | 2) => (g === 1 ? name1 : name2);
  const halfN1 = r.n1 * (r.n1 + 1);
  const halfN2 = r.n2 * (r.n2 + 1);

  // Final decision follows the p-value: with ties the exact (tie-aware) p-value is
  // more accurate than a no-ties table; without ties both methods agree.
  const reject = r.rejectByP;
  const conflict = r.rejectByCritical !== null && r.rejectByCritical !== r.rejectByP;
  const meanRank1 = r.R1 / r.n1;
  const meanRank2 = r.R2 / r.n2;

  const crit = r.critical;
  const critDisplay =
    crit.kind === "table" || crit.kind === "exact"
      ? String(crit.value)
      : crit.kind === "none"
        ? "Not available"
        : `z = ${crit.zCritical.toFixed(4)}`;

  const flow: { id: string; letter: string; title: string; value: ReactNode }[] = [
    { id: "step-a", letter: "A", title: "Arrange & Rank", value: `N = ${r.N}, ${r.ties.length} tie group${r.ties.length === 1 ? "" : "s"}` },
    { id: "step-b", letter: "B", title: "Sum of Ranks", value: `R₁ = ${fmt(r.R1)}, R₂ = ${fmt(r.R2)}` },
    { id: "step-c", letter: "C", title: "Compute U₁", value: `U₁ = ${fmt(r.U1)}` },
    { id: "step-d", letter: "D", title: "Compute U₂", value: `U₂ = ${fmt(r.U2)}` },
    { id: "step-e", letter: "E", title: "Computed U", value: `U = ${fmt(r.U)}` },
    {
      id: "step-f",
      letter: "F",
      title: "Critical Value",
      value: `${crit.kind === "normal" ? "z" : "U"}crit: ${crit.kind === "normal" ? crit.zCritical.toFixed(3) : critDisplay} · ${reject ? "Reject H₀" : "Fail to reject H₀"}`,
    },
  ];

  return (
    <div className="mt-10 space-y-6">
      <div className="animate-rise">
        <h2 className="text-2xl font-bold text-navy-900">Solution</h2>
        <p className="text-sm text-slate-600">
          Group 1: <strong className="text-navy-900">{name1}</strong> (n₁ = {r.n1}) · Group 2:{" "}
          <strong className="text-navy-900">{name2}</strong> (n₂ = {r.n2}) · α = {r.alpha.toFixed(2)} ·{" "}
          {testTypeLabel(r.testType)}
        </p>
      </div>

      {/* ---------- Flowchart overview ---------- */}
      <nav
        aria-label="Computation flowchart"
        className="animate-rise rounded-2xl border border-sky-line bg-white p-4 shadow-sm"
        style={{ animationDelay: "80ms" }}
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-700">Computation Flowchart</p>
        <ol className="flex flex-col items-stretch lg:flex-row lg:items-center">
          {flow.map((f, i) => (
            <li key={f.id} className="flex flex-col items-stretch lg:flex-1 lg:flex-row lg:items-center">
              <a
                href={`#${f.id}`}
                className="animate-rise block flex-1 rounded-xl border-2 border-green-500 bg-white p-3 transition hover:bg-green-50"
                style={{ animationDelay: `${150 + i * 90}ms` }}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                    {f.letter}
                  </span>
                  <span className="text-sm font-bold text-navy-900">{f.title}</span>
                  <CheckCircle2 className="ml-auto h-4 w-4 text-green-600" aria-hidden />
                </span>
                <span className="math mt-1.5 block text-[0.95rem] font-semibold text-green-800">{f.value}</span>
              </a>
              {i < flow.length - 1 && (
                <span className="flex justify-center text-red-600 lg:px-1" aria-hidden>
                  <ArrowDown className="animate-arrow my-1 h-6 w-6 lg:hidden" strokeWidth={3} />
                  <ArrowRight className="animate-arrow hidden h-6 w-6 lg:block" strokeWidth={3} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* ---------- A ---------- */}
      <StepCard
        id="step-a"
        letter="A"
        title="Arrange the Scores from Lowest to Highest and Assign Ranks"
        icon={<ListOrdered className="h-5 w-5" />}
        delay={250}
      >
        <p className="text-sm text-slate-700">
          All {r.N} scores (n₁ = {r.n1}, n₂ = {r.n2}) were combined, sorted in ascending order and ranked from 1 to{" "}
          {r.N}. {r.hasTies ? "Tied scores receive the average of the positions they occupy." : "There are no tied scores."}
        </p>
        <div className={`overflow-auto rounded-xl border border-sky-line ${r.N > 30 ? "max-h-[40rem]" : ""}`}>
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-navy-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Position</th>
                <th className="px-3 py-2.5 text-left font-semibold">Score</th>
                <th className="px-3 py-2.5 text-left font-semibold">Group</th>
                <th className="px-3 py-2.5 text-left font-semibold">Assigned Rank</th>
              </tr>
            </thead>
            <tbody>
              {r.ranked.map((o) => {
                const tie = o.tieIndex >= 0 ? r.ties[o.tieIndex] : null;
                return (
                  <tr
                    key={`${o.group}-${o.inputIndex}`}
                    className={`border-t border-sky-line ${tie ? "bg-amber-50/70" : "odd:bg-white even:bg-sky-soft/60"}`}
                  >
                    <td className="px-3 py-2 text-slate-500">{o.position}</td>
                    <td className="math px-3 py-2 text-base font-semibold text-navy-900">{fmt(o.value, 10)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          o.group === 1 ? "bg-navy-900 text-white" : "bg-sky-line text-navy-900"
                        }`}
                      >
                        Group {o.group}
                        <span className="font-normal opacity-80">· {groupName(o.group)}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="math text-base font-bold text-navy-900">{fmt(o.rank)}</span>
                      {tie && (
                        <span className="math ml-2 text-xs text-amber-800">tied: {tieExplanation(tie.positions, tie.rank)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {r.hasTies && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-bold text-amber-900">Tied scores (average ranks)</p>
            <ul className="math space-y-1 text-base text-amber-950">
              {r.ties.map((t) => (
                <li key={t.value}>
                  Score {fmt(t.value, 10)} appears {t.count} times (positions {t.positions.join(", ")}) → rank ={" "}
                  {tieExplanation(t.positions, t.rank)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </StepCard>
      {DOWN_ARROW}

      {/* ---------- B ---------- */}
      <StepCard
        id="step-b"
        letter="B"
        title="Get the Sum of Ranks for Each Group"
        icon={<Sigma className="h-5 w-5" />}
        delay={320}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {([1, 2] as const).map((g) => {
            const ranks = g === 1 ? r.ranks1 : r.ranks2;
            const R = g === 1 ? r.R1 : r.R2;
            const n = g === 1 ? r.n1 : r.n2;
            const sub = g === 1 ? SUB1 : SUB2;
            return (
              <div key={g} className="space-y-2 rounded-xl border border-sky-line p-4">
                <p className="font-bold text-navy-900">
                  Group {g}: <span className="font-semibold text-navy-700">{groupName(g)}</span>
                </p>
                <p className="math text-base text-navy-800">
                  n{sub} = {n} observations
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ranks.map((x, k) => (
                    <span key={k} className="math rounded-md bg-sky-soft px-2 py-0.5 text-sm text-navy-900 ring-1 ring-sky-line">
                      {fmt(x.value, 10)} → <strong>{fmt(x.rank)}</strong>
                    </span>
                  ))}
                </div>
                <div className="space-y-1 pt-1">
                  <Eq lhs={`R${sub}`}>{ranks.map((x) => `R(${fmt(x.value, 10)})`).join(" + ")}</Eq>
                  <Eq lhs={`R${sub}`}>{ranks.map((x) => fmt(x.rank)).join(" + ")}</Eq>
                  <Eq lhs={`R${sub}`} highlight>
                    {fmt(R)}
                  </Eq>
                </div>
              </div>
            );
          })}
        </div>
        <CheckLine>
          Check: R₁ + R₂ = {fmt(r.R1)} + {fmt(r.R2)} = {fmt(r.R1 + r.R2)} and N(N + 1) / 2 = {r.N}({r.N} + 1) / 2 ={" "}
          {r.N * (r.N + 1)} / 2 = {fmt(r.rankSumExpected)} ✓
        </CheckLine>
      </StepCard>
      {DOWN_ARROW}

      {/* ---------- C ---------- */}
      <UStep
        id="step-c"
        letter="C"
        sub={SUB1}
        R={r.R1}
        n={r.n1}
        n1={r.n1}
        n2={r.n2}
        half={halfN1}
        U={r.U1}
        delay={390}
      />
      {DOWN_ARROW}

      {/* ---------- D ---------- */}
      <UStep
        id="step-d"
        letter="D"
        sub={SUB2}
        R={r.R2}
        n={r.n2}
        n1={r.n1}
        n2={r.n2}
        half={halfN2}
        U={r.U2}
        delay={460}
      />
      {DOWN_ARROW}

      {/* ---------- E ---------- */}
      <StepCard
        id="step-e"
        letter="E"
        title="Determine the Computed U-Value"
        icon={<Scale className="h-5 w-5" />}
        delay={530}
      >
        <FormulaBox>U = min(U₁, U₂)</FormulaBox>
        <div className="space-y-1">
          <Eq lhs="U">
            min({fmt(r.U1)}, {fmt(r.U2)})
          </Eq>
          <Eq lhs="U" highlight>
            {fmt(r.U)}
          </Eq>
        </div>
        <Note>
          {r.smaller === "equal" ? (
            <>
              U₁ and U₂ are equal ({fmt(r.U1)}), so U = {fmt(r.U)}.
            </>
          ) : r.smaller === "U1" ? (
            <>
              <strong>U₁ = {fmt(r.U1)}</strong> is smaller than U₂ = {fmt(r.U2)}, so the computed U-value is U₁.
            </>
          ) : (
            <>
              <strong>U₂ = {fmt(r.U2)}</strong> is smaller than U₁ = {fmt(r.U1)}, so the computed U-value is U₂.
            </>
          )}
        </Note>
        <ResultCard big label="Computed U-value" value={`U = ${fmt(r.U)}`} />
        <CheckLine>
          Check: U₁ + U₂ = {fmt(r.U1)} + {fmt(r.U2)} = {fmt(r.U1 + r.U2)} and n₁ × n₂ = {r.n1} × {r.n2} = {r.n1 * r.n2} ✓
        </CheckLine>
      </StepCard>
      {DOWN_ARROW}

      {/* ---------- F ---------- */}
      <StepCard
        id="step-f"
        letter="F"
        title="Determine the Critical/Table Value"
        icon={<Target className="h-5 w-5" />}
        delay={600}
      >
        <Hypotheses r={r} name1={name1} name2={name2} />

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["n₁", String(r.n1)],
            ["n₂", String(r.n2)],
            ["α", r.alpha.toFixed(2)],
            ["Test type", testTypeLabel(r.testType)],
            crit.kind === "normal"
              ? ["Critical z", `${r.testType === "two" ? "±" : r.testType === "left" ? "−" : "+"}${crit.zCritical.toFixed(4)}`]
              : ["Critical U", critDisplay],
            [`p-value`, fmtP(r.pInfo.pValue)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-sky-line bg-sky-soft px-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-navy-700">{k}</dt>
              <dd className="math mt-0.5 text-lg font-bold text-navy-900">{v}</dd>
            </div>
          ))}
        </dl>

        <CriticalSection r={r} />
        <PValueSection r={r} />

        {/* Decision */}
        <div
          className={`rounded-2xl border-2 p-5 ${reject ? "border-green-500 bg-green-50" : "border-navy-600 bg-sky-soft"}`}
        >
          <p className="mb-2 flex items-center gap-2 text-lg font-extrabold text-navy-900">
            {reject ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden />
            ) : (
              <XCircle className="h-6 w-6 text-navy-600" aria-hidden />
            )}
            Decision: {reject ? "Reject H₀" : "Fail to reject H₀"}
          </p>
          <p className="text-sm leading-relaxed text-navy-900">
            {reject ? (
              <>
                At the {r.alpha.toFixed(2)} level of significance, there is a statistically significant{" "}
                {r.testType === "two" ? "difference between" : "result for"} <strong>{name1}</strong>
                {r.testType === "two" ? " and " : r.testType === "left" ? " scoring lower than " : " scoring higher than "}
                <strong>{name2}</strong>.{" "}
                {r.testType === "two" && (
                  <>
                    {meanRank1 > meanRank2 ? name1 : name2} has the higher mean rank ({fmt(Math.max(meanRank1, meanRank2), 2)} vs.{" "}
                    {fmt(Math.min(meanRank1, meanRank2), 2)}), so its scores tend to be higher.
                  </>
                )}
              </>
            ) : (
              <>
                At the {r.alpha.toFixed(2)} level of significance, there is not enough evidence to conclude that{" "}
                <strong>{name1}</strong>
                {r.testType === "two" ? " and " : r.testType === "left" ? " scores lower than " : " scores higher than "}
                <strong>{name2}</strong>
                {r.testType === "two" ? " differ." : "."} Mean ranks: {fmt(meanRank1, 2)} vs. {fmt(meanRank2, 2)}.
              </>
            )}
          </p>
          {conflict && (
            <p className="mt-3 text-sm text-amber-900">
              Note: the conventional no-ties table and the p-value lead to different decisions here because the data contain
              tied scores. The decision above follows the {r.pInfo.method === "normal" ? "tie-corrected normal" : "exact, tie-aware"}{" "}
              p-value, which accounts for the ties correctly.
            </p>
          )}
        </div>
      </StepCard>

      {/* ---------- Chart ---------- */}
      <section
        className="animate-rise rounded-2xl border border-sky-line bg-white p-5 shadow-sm"
        style={{ animationDelay: "680ms" }}
        aria-label="Rank visualization"
      >
        <h3 className="mb-1 text-lg font-bold text-navy-900">Visualization: Ranks by Group</h3>
        <p className="mb-4 text-sm text-slate-600">
          Each bar is one observation in ascending order. Mean rank: {name1} = {fmt(meanRank1, 2)}, {name2} ={" "}
          {fmt(meanRank2, 2)}.
        </p>
        <RankChart ranked={r.ranked} name1={name1} name2={name2} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps C and D                                                        */
/* ------------------------------------------------------------------ */

function UStep(props: {
  id: string;
  letter: string;
  sub: string;
  R: number;
  n: number;
  n1: number;
  n2: number;
  half: number;
  U: number;
  delay: number;
}) {
  const { id, letter, sub, R, n, n1, n2, half, U, delay } = props;
  const halfVal = half / 2;
  const prod = n1 * n2;
  const U_ = `U${sub}`;
  return (
    <StepCard id={id} letter={letter} title={`Compute U${sub}`} icon={<Sigma className="h-5 w-5" />} delay={delay}>
      <FormulaBox>
        <span className="italic">U{sub}</span> = n₁n₂ + [<Frac num={<>n{sub}(n{sub} + 1)</>} den="2" />] − R{sub}
      </FormulaBox>
      <p className="text-sm font-semibold text-navy-700">
        Substitute n₁ = {n1}, n₂ = {n2} and R{sub} = {fmt(R)}:
      </p>
      <div className="space-y-1">
        <Eq lhs={U_}>
          {n1}({n2}) + [<Frac num={`${n}(${n} + 1)`} den="2" />] − {fmt(R)}
        </Eq>
        <Eq lhs={U_}>
          {prod} + [<Frac num={`${n}(${n + 1})`} den="2" />] − {fmt(R)}
        </Eq>
        <Eq lhs={U_}>
          {prod} + [<Frac num={half} den="2" />] − {fmt(R)}
        </Eq>
        <Eq lhs={U_}>
          {prod} + {fmt(halfVal)} − {fmt(R)}
        </Eq>
        <Eq lhs={U_}>
          {fmt(prod + halfVal)} − {fmt(R)}
        </Eq>
        <Eq lhs={U_} highlight>
          {fmt(U)}
        </Eq>
      </div>
      <ResultCard label={`Computed U${sub}`} value={`U${sub} = ${fmt(U)}`} />
    </StepCard>
  );
}

/* ------------------------------------------------------------------ */
/* Step F pieces                                                        */
/* ------------------------------------------------------------------ */

function Hypotheses({ r, name1, name2 }: { r: MannWhitneyResult; name1: string; name2: string }) {
  const h1 =
    r.testType === "two"
      ? `The distributions of ${name1} and ${name2} differ.`
      : r.testType === "left"
        ? `${name1} scores tend to be lower than ${name2} scores.`
        : `${name1} scores tend to be higher than ${name2} scores.`;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-sky-line p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-navy-700">Null hypothesis H₀</p>
        <p className="text-sm text-navy-900">
          There is no difference between the distributions of {name1} and {name2}.
        </p>
      </div>
      <div className="rounded-xl border border-sky-line p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-navy-700">Alternative hypothesis H₁</p>
        <p className="text-sm text-navy-900">{h1}</p>
      </div>
    </div>
  );
}

function CriticalSection({ r }: { r: MannWhitneyResult }) {
  const c = r.critical;
  const stat = r.decisionStat;
  const tailText =
    r.testType === "two"
      ? `two-tailed α = ${r.alpha.toFixed(2)} (α/2 = ${fmt(c.tailAlpha)} in each tail)`
      : `one-tailed α = ${r.alpha.toFixed(2)}`;
  const whichStat =
    r.testType === "two"
      ? "For a two-tailed test the smaller value U = min(U₁, U₂) is compared with the critical value."
      : r.testType === "left"
        ? "For a left-tailed test (H₁: Group 1 lower), Group 2 gets the higher ranks, which makes U₂ small, so U₂ is compared with the critical value."
        : "For a right-tailed test (H₁: Group 1 higher), Group 1 gets the higher ranks, which makes U₁ small, so U₁ is compared with the critical value.";

  return (
    <div className="space-y-3 rounded-xl border border-sky-line p-4">
      <p className="font-bold text-navy-900">Critical/Table Value</p>

      {(c.kind === "table" || c.kind === "exact") && (
        <>
          <Eq lhs="U_crit">
            U(n₁ = {r.n1}, n₂ = {r.n2}, {tailText}) = {c.value}
          </Eq>
          <Note>
            {c.kind === "table" ? (
              <>
                <strong>Source: conventional Mann–Whitney critical-value table (no ties).</strong> The value is computed
                from the exact null distribution of U for n₁ = {r.n1} and n₂ = {r.n2}, exactly as printed tables are built
                (largest U with P(U ≤ U_crit) ≤ {fmt(c.tailAlpha)}; attained probability = {fmtP(c.attainedAlpha!)}).
              </>
            ) : (
              <>
                <strong>Source: exact no-ties null distribution.</strong> Printed tables usually stop at n = 20, so this
                critical value was computed directly from the exact distribution of U for n₁ = {r.n1} and n₂ = {r.n2}{" "}
                (P(U ≤ U_crit) = {fmtP(c.attainedAlpha!)} ≤ {fmt(c.tailAlpha)}).
              </>
            )}
          </Note>
          <p className="text-sm text-slate-700">{whichStat}</p>
          <div className="math rounded-lg bg-sky-soft px-3 py-2 text-lg text-navy-900">
            Decision rule: reject H₀ if {stat.label} ≤ {c.value}. &nbsp;Here {stat.label} = {fmt(stat.value)}{" "}
            {stat.value <= c.value! ? "≤" : ">"} {c.value} → {r.rejectByCritical ? "Reject H₀" : "Fail to reject H₀"}
          </div>
        </>
      )}

      {c.kind === "none" && (
        <Note tone="warn">
          <strong>No critical value exists</strong> for n₁ = {r.n1}, n₂ = {r.n2} at {tailText}. Even the most extreme
          possible result (U = 0) has a probability larger than {fmt(c.tailAlpha)} under H₀, so conventional tables show
          “—” for these sample sizes and H₀ cannot be rejected at this α. Larger samples are needed.
        </Note>
      )}

      {c.kind === "normal" && (
        <>
          <Note tone="warn">
            <strong>No exact table value is available</strong> for samples this large (n₁ = {r.n1}, n₂ = {r.n2}). The
            large-sample normal approximation is used instead: the critical value is z = {c.zCritical.toFixed(4)} for{" "}
            {tailText}. For reference, this corresponds to an approximate U boundary of μ − z·σ ≈{" "}
            {fmt(c.approxBoundary!, 2)} (no ties).
          </Note>
          <div className="math rounded-lg bg-sky-soft px-3 py-2 text-lg text-navy-900">
            Decision rule:{" "}
            {r.testType === "two"
              ? `reject H₀ if |z| ≥ ${c.zCritical.toFixed(4)}`
              : r.testType === "left"
                ? `reject H₀ if z ≤ −${c.zCritical.toFixed(4)}`
                : `reject H₀ if z ≥ ${c.zCritical.toFixed(4)}`}
            . &nbsp;Here z = {r.normal.z === null ? "undefined" : r.normal.z.toFixed(4)} →{" "}
            {r.rejectByP ? "Reject H₀" : "Fail to reject H₀"}
          </div>
        </>
      )}

      {r.hasTies && c.kind !== "normal" && (
        <Note tone="warn">
          Your data contain {r.ties.length} group{r.ties.length === 1 ? "" : "s"} of tied scores. Conventional tables assume
          no ties, so this critical value is <strong>not</strong> an exact tie-adjusted value. Use the tie-aware p-value
          below for the most accurate decision.
        </Note>
      )}
      {r.directionMismatch && (
        <Note tone="warn">
          The sample result points in the opposite direction from the one-tailed alternative hypothesis, so H₀ cannot be
          rejected for this test direction.
        </Note>
      )}
    </div>
  );
}

function PValueSection({ r }: { r: MannWhitneyResult }) {
  const p = r.pInfo;
  const nm = r.normal;
  const N = r.N;
  const methodTitle =
    p.method === "exact"
      ? "Exact permutation p-value (exact Mann–Whitney distribution, no ties)"
      : p.method === "exact-ties"
        ? "Exact permutation p-value (conditional on the tied ranks)"
        : "Normal approximation with tie correction and continuity correction";

  const stat = r.decisionStat;
  const zNumerator =
    r.testType === "two"
      ? `|${fmt(r.U)} − ${fmt(nm.mean)}| − 0.5`
      : `${fmt(stat.value)} − ${fmt(nm.mean)} + 0.5`;
  const zFormula = r.testType === "two" ? "(|U − μ| − 0.5) / σ" : `(${stat.label} − μ + 0.5) / σ`;
  const pFormula = r.testType === "two" ? "2[1 − Φ(z)]" : "Φ(z)";

  return (
    <div className="space-y-3 rounded-xl border border-sky-line p-4">
      <p className="font-bold text-navy-900">p-value</p>
      <p className="text-sm font-semibold text-navy-700">Method: {methodTitle}</p>

      {p.method !== "normal" && (
        <>
          <p className="text-sm text-slate-700">
            Every one of the {p.permutations!.toLocaleString("en-US", { maximumFractionDigits: 0 })} equally likely ways of
            assigning the {N} ranks to groups of size {r.n1} and {r.n2} was counted to obtain the exact distribution of U
            {p.method === "exact-ties" ? " using the actual (average) ranks, so ties are handled exactly" : ""}.
          </p>
          <div className="space-y-1">
            <Eq lhs={`P(U₁ ≤ ${fmt(r.U1)})`}>{fmtP(p.pU1Le!)}</Eq>
            <Eq lhs={`P(U₂ ≤ ${fmt(r.U2)})`}>{fmtP(p.pU2Le!)}</Eq>
            <Eq lhs="p" highlight>
              {r.testType === "two"
                ? `2 × min(${fmtP(p.pU1Le!)}, ${fmtP(p.pU2Le!)}) = ${fmtP(p.pValue)}`
                : `P(${stat.label} ≤ ${fmt(stat.value)}) = ${fmtP(p.pValue)}`}
            </Eq>
          </div>
        </>
      )}

      <details className="group rounded-lg bg-sky-soft/70 px-3 py-2" open={p.method === "normal"}>
        <summary className="cursor-pointer text-sm font-semibold text-navy-800">
          {p.method === "normal" ? "Normal approximation (used for the p-value)" : "Normal approximation (for comparison)"}
        </summary>
        <div className="mt-2 space-y-1">
          <Eq lhs="μ">
            <Frac num="n₁n₂" den="2" /> = <Frac num={`${r.n1} × ${r.n2}`} den="2" /> = {fmt(nm.mean)}
          </Eq>
          <Eq lhs="σ">
            √( <Frac num="n₁n₂" den="12" />[(N + 1) − <Frac num="Σ(t³ − t)" den="N(N − 1)" />] )
          </Eq>
          <Eq lhs="σ">
            √( <Frac num={r.n1 * r.n2} den="12" />[({N} + 1) − <Frac num={fmt(nm.tieSum)} den={`${N}(${N - 1})`} />] ) ={" "}
            √{fmt(nm.variance)} = {fmt(nm.sd)}
          </Eq>
          {nm.z === null ? (
            <Note>σ = 0 because every score is identical, so z is undefined and p = 1.</Note>
          ) : (
            <>
              <Eq lhs="z">
                {zFormula} = <Frac num={zNumerator} den={fmt(nm.sd)} /> = {nm.z.toFixed(4)}
              </Eq>
              <Eq lhs="p">
                {pFormula} = {fmtP(nm.pValue)}
              </Eq>
            </>
          )}
          <p className="pt-1 text-xs text-slate-600">
            t = number of observations sharing a tied score; Σ(t³ − t) = {fmt(nm.tieSum)}
            {r.hasTies ? "" : " (no ties)"}. A continuity correction of 0.5 is applied.
          </p>
        </div>
      </details>

      <div className="math rounded-lg bg-sky-soft px-3 py-2 text-lg text-navy-900">
        p = {fmtP(p.pValue)} {p.pValue <= r.alpha ? "≤" : ">"} α = {r.alpha.toFixed(2)} →{" "}
        {r.rejectByP ? "Reject H₀" : "Fail to reject H₀"}
      </div>
    </div>
  );
}
