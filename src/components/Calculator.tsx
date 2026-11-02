"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Calculator as CalcIcon, Database, Eraser, Settings2, Users } from "lucide-react";
import { mannWhitney, parseData, validateGroup, type Alpha, type MannWhitneyResult, type TestType } from "@/lib/mannWhitney";
import Results from "./Results";

const DEFAULT_NAME_1 = "Face-to-Face Learning";
const DEFAULT_NAME_2 = "Online Learning";

const SAMPLE_1 = "92, 88, 95, 85, 90, 87, 93, 89";
const SAMPLE_2 = "85, 78, 82, 75, 80, 72, 84, 77";

export interface CalcRun {
  id: number;
  result: MannWhitneyResult;
  name1: string;
  name2: string;
}

interface Errors {
  g1?: string;
  g2?: string;
  general?: string;
}

export default function Calculator() {
  const [name1, setName1] = useState(DEFAULT_NAME_1);
  const [name2, setName2] = useState(DEFAULT_NAME_2);
  const [data1, setData1] = useState("");
  const [data2, setData2] = useState("");
  const [alpha, setAlpha] = useState<Alpha>(0.05);
  const [testType, setTestType] = useState<TestType>("two");
  const [errors, setErrors] = useState<Errors>({});
  const [run, setRun] = useState<CalcRun | null>(null);
  const [runSnapshot, setRunSnapshot] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const snapshot = JSON.stringify([name1, name2, data1, data2, alpha, testType]);
  const stale = run !== null && snapshot !== runSnapshot;

  useEffect(() => {
    if (run) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [run]);

  const count1 = useMemo(() => parseData(data1).values.length, [data1]);
  const count2 = useMemo(() => parseData(data2).values.length, [data2]);

  function handleCalculate() {
    const label1 = `Group 1 (${name1.trim() || "Group 1"})`;
    const label2 = `Group 2 (${name2.trim() || "Group 2"})`;
    const e1 = validateGroup(label1, data1);
    const e2 = validateGroup(label2, data2);
    if (e1 || e2) {
      setErrors({ g1: e1 ?? undefined, g2: e2 ?? undefined });
      setRun(null);
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    try {
      const result = mannWhitney(parseData(data1).values, parseData(data2).values, alpha, testType);
      setErrors({});
      setRun((prev) => ({
        id: (prev?.id ?? 0) + 1,
        result,
        name1: name1.trim() || "Group 1",
        name2: name2.trim() || "Group 2",
      }));
      setRunSnapshot(snapshot);
    } catch (err) {
      setRun(null);
      setErrors({
        general:
          err instanceof Error
            ? `${err.message} No results were displayed because a validation check failed.`
            : "Something went wrong while computing the test.",
      });
    }
  }

  function handleClear() {
    setName1(DEFAULT_NAME_1);
    setName2(DEFAULT_NAME_2);
    setData1("");
    setData2("");
    setAlpha(0.05);
    setTestType("two");
    setErrors({});
    setRun(null);
  }

  function handleSample() {
    setName1(DEFAULT_NAME_1);
    setName2(DEFAULT_NAME_2);
    setData1(SAMPLE_1);
    setData2(SAMPLE_2);
    setAlpha(0.05);
    setTestType("two");
    setErrors({});
  }

  const hasErrors = Boolean(errors.g1 || errors.g2 || errors.general);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* ---------------- INPUT DATA ---------------- */}
      <section aria-labelledby="input-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="input-heading" className="text-2xl font-bold text-navy-900">
              Input Data
            </h2>
            <p className="text-sm text-slate-600">
              Enter two independent groups. Separate values with commas, spaces or line breaks. Decimals are allowed.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <GroupCard
            index={1}
            name={name1}
            onName={setName1}
            data={data1}
            onData={setData1}
            count={count1}
            error={errors.g1}
            placeholder={"e.g. 92, 88, 95, 85\nor one value per line"}
          />
          <GroupCard
            index={2}
            name={name2}
            onName={setName2}
            data={data2}
            onData={setData2}
            count={count2}
            error={errors.g2}
            placeholder={"e.g. 85 78 82 75\nor one value per line"}
          />

          {/* Settings */}
          <div className="rounded-2xl border border-sky-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white">
                <Settings2 className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-lg font-bold text-navy-900">Test Settings</h3>
            </div>

            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-semibold text-navy-800">Level of Significance (α)</legend>
              <div className="grid grid-cols-3 gap-2">
                {([0.01, 0.05, 0.1] as Alpha[]).map((a) => (
                  <label
                    key={a}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                      alpha === a
                        ? "border-navy-800 bg-navy-800 text-white shadow"
                        : "border-sky-line bg-sky-soft text-navy-800 hover:border-sky-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="alpha"
                      value={a}
                      checked={alpha === a}
                      onChange={() => setAlpha(a)}
                      className="sr-only"
                    />
                    {a.toFixed(2)}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-navy-800">Type of Test</legend>
              <div className="space-y-2">
                {(
                  [
                    ["two", "Two-tailed", "H₁: the two groups differ"],
                    ["left", "Left-tailed", "H₁: Group 1 tends to be lower than Group 2"],
                    ["right", "Right-tailed", "H₁: Group 1 tends to be higher than Group 2"],
                  ] as [TestType, string, string][]
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                      testType === value ? "border-navy-800 bg-sky-soft" : "border-sky-line hover:border-sky-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="testType"
                      value={value}
                      checked={testType === value}
                      onChange={() => setTestType(value)}
                      className="mt-1 accent-navy-800"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-navy-900">{label}</span>
                      <span className="block text-xs text-slate-600">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Errors */}
        <div ref={errorRef}>
          {hasErrors && (
            <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Please fix the following before calculating:</p>
                {errors.g1 && <p>{errors.g1}</p>}
                {errors.g2 && <p>{errors.g2}</p>}
                {errors.general && <p>{errors.general}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleCalculate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-md transition hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 sm:text-base"
          >
            <CalcIcon className="h-5 w-5" aria-hidden />
            CALCULATE MANN–WHITNEY U TEST
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-navy-800 bg-white px-6 py-3 text-sm font-bold tracking-wide text-navy-800 transition hover:bg-sky-soft sm:text-base"
          >
            <Eraser className="h-5 w-5" aria-hidden />
            CLEAR DATA
          </button>
          <button
            type="button"
            onClick={handleSample}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-sky-accent bg-sky-soft px-6 py-3 text-sm font-bold tracking-wide text-navy-800 transition hover:bg-sky-line sm:text-base"
          >
            <Database className="h-5 w-5" aria-hidden />
            LOAD SAMPLE DATA
          </button>
        </div>
      </section>

      {/* ---------------- RESULTS ---------------- */}
      <div ref={resultsRef} className="scroll-mt-4">
        {run && (
          <>
            {stale && (
              <div className="mt-8 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                The inputs have changed since this solution was computed. Click Calculate again to update the results.
              </div>
            )}
            <Results key={run.id} run={run} />
          </>
        )}
      </div>
    </div>
  );
}

function GroupCard(props: {
  index: 1 | 2;
  name: string;
  onName: (v: string) => void;
  data: string;
  onData: (v: string) => void;
  count: number;
  error?: string;
  placeholder: string;
}) {
  const { index, name, onName, data, onData, count, error, placeholder } = props;
  const id = `group${index}`;
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${error ? "border-red-300" : "border-sky-line"}`}>
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            index === 1 ? "bg-navy-900 text-white" : "bg-sky-accent text-navy-900"
          }`}
        >
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="text-lg font-bold text-navy-900">GROUP {index}</h3>
      </div>
      <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-semibold text-navy-800">
        Group Name
      </label>
      <input
        id={`${id}-name`}
        type="text"
        value={name}
        onChange={(e) => onName(e.target.value)}
        className="mb-4 w-full rounded-lg border border-sky-line bg-sky-soft px-3 py-2 text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-sky-line"
      />
      <label htmlFor={`${id}-data`} className="mb-1 block text-sm font-semibold text-navy-800">
        Numerical Data
      </label>
      <textarea
        id={`${id}-data`}
        value={data}
        onChange={(e) => onData(e.target.value)}
        rows={6}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        spellCheck={false}
        className="w-full resize-y rounded-lg border border-sky-line bg-sky-soft px-3 py-2 font-mono text-sm text-navy-900 outline-none placeholder:text-slate-400 focus:border-navy-600 focus:ring-2 focus:ring-sky-line"
      />
      <p className={`mt-2 text-xs ${error ? "text-red-700" : "text-slate-600"}`}>
        {error ? "Contains invalid entries, see message below." : `${count} numerical value${count === 1 ? "" : "s"} detected`}
      </p>
    </div>
  );
}
