import ChartAnalysis from "./ChartAnalysis";

export default function Home() {
  return (
    <main className="flex flex-col items-center min-h-screen p-4 sm:p-10 bg-neutral-100 dark:bg-neutral-950">
      <h1 className="text-4xl font-extrabold mb-4 text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text tracking-tight">Trading Chart Analysis Guide</h1>
      
      {/* Risk Warning Banner */}
      <div className="w-full max-w-3xl mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md shadow-sm dark:bg-amber-900/20 dark:border-amber-400">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-amber-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            <span className="font-bold">DISCLAIMER:</span> Use this tool at your own risk. Trading involves substantial risk and is not suitable for all investors. Past performance is not indicative of future results.
          </p>
        </div>
      </div>
      
      <ChartAnalysis />
    </main>
  );
}
