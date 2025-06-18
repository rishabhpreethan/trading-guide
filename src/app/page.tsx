import ChartAnalysis from "./ChartAnalysis";

export default function Home() {
  return (
    <main className="flex flex-col items-center min-h-screen p-4 sm:p-10 bg-neutral-100 dark:bg-neutral-950">
      <h1 className="text-3xl font-bold mb-8 text-center text-blue-800 dark:text-blue-300">Trading Chart Analysis Guide</h1>
      <ChartAnalysis />
    </main>
  );
}
