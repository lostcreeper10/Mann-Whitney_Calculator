import Calculator from "@/components/Calculator";
import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Calculator />
      </main>
      <footer className="border-t border-sky-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-navy-700 sm:px-6">
          Cordova Public College · Advanced Statistics · Mann–Whitney U Test Calculator
          <span className="mt-1 block text-xs text-slate-500">
            All computations run in your browser. No data is sent to a server.
          </span>
        </div>
      </footer>
    </>
  );
}
