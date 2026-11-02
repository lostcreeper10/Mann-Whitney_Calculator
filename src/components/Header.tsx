import { GraduationCap, Sigma } from "lucide-react";

export default function Header() {
  return (
    <header className="relative overflow-hidden bg-navy-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6 sm:py-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25">
            <GraduationCap className="h-6 w-6 text-sky-accent" aria-hidden />
          </span>
          <p className="text-sm font-semibold tracking-[0.28em] text-sky-accent sm:text-base">CORDOVA PUBLIC COLLEGE</p>
        </div>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          MANN–WHITNEY U TEST CALCULATOR
        </h1>
        <p className="flex items-center gap-2 text-base text-sky-line sm:text-lg">
          <Sigma className="h-5 w-5" aria-hidden />
          Advanced Statistics Statistical Computation Tool
        </p>
      </div>
    </header>
  );
}
