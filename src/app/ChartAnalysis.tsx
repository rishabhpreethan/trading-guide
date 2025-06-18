"use client";
import React, { useState, useEffect } from "react";
import { analyzeChartWithGemini } from "./geminiApi";
import ReactMarkdown from "react-markdown";

interface ChartImages {
  chart4h: File | null;
  chart1h: File | null;
  chart15m: File | null;
  chart5m: File | null;
}

interface AnalysisResults {
  analysis4h?: string;
  analysis1h?: string;
  analysis15m?: string;
  analysis5m?: string;
  finalSuggestion?: string;
}

type AnalysisStep = '4h' | '1h' | '15min' | '5min' | 'final';

type TabType = 'overall' | '4h' | '1h' | '15min' | '5min';

const ChartAnalysis: React.FC = () => {
  const [images, setImages] = useState<ChartImages>({
    chart4h: null,
    chart1h: null,
    chart15m: null,
    chart5m: null,
  });
  const [results, setResults] = useState<AnalysisResults>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<AnalysisStep | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>('overall'); // Default to overall tab
  const [contentHeight, setContentHeight] = useState<string>("calc(100vh - 200px)"); // Default height
  
  // Set the content height based on viewport
  useEffect(() => {
    const updateHeight = () => {
      // Subtract header height and some padding
      setContentHeight(`calc(100vh - 200px)`);
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, timeframe: keyof ChartImages) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImages((prev) => ({ ...prev, [timeframe]: file }));
      
      // Preview logic could be added here if needed
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResults({});
    setProgress(0);
    setCurrentStep(null);
    
    try {
      let analysis4h = "";
      let analysis1h = "";
      let analysis15m = "";
      let analysis5m = "";
      let finalSuggestion = "";

      // 4H chart analysis
      setCurrentStep('4h');
      if (images.chart4h) {
        analysis4h = await analyzeChartWithGemini({
          image: images.chart4h,
          prompt: "Analyze this 4-hour trading chart image. Summarize the market structure, trend, and any key levels or patterns."
        });
      } else {
        analysis4h = "No 4h chart uploaded.";
      }
      setResults(r => ({ ...r, analysis4h }));
      setProgress(20);

      // 1H chart analysis
      setCurrentStep('1h');
      if (images.chart1h) {
        analysis1h = await analyzeChartWithGemini({
          image: images.chart1h,
          prompt: `Analyze this 1-hour trading chart. Consider the 4H context: ${analysis4h}. What does the 1H chart show?`
        });
      } else {
        analysis1h = "No 1h chart uploaded.";
      }
      setResults(r => ({ ...r, analysis1h }));
      setProgress(40);

      // 15min chart analysis
      setCurrentStep('15min');
      if (images.chart15m) {
        analysis15m = await analyzeChartWithGemini({
          image: images.chart15m,
          prompt: `Analyze this 15-minute trading chart. Consider the 1H context: ${analysis1h}. What does the 15min chart show?`
        });
      } else {
        analysis15m = "No 15min chart uploaded.";
      }
      setResults(r => ({ ...r, analysis15m }));
      setProgress(60);

      // 5min chart analysis
      setCurrentStep('5min');
      if (images.chart5m) {
        analysis5m = await analyzeChartWithGemini({
          image: images.chart5m,
          prompt: `Analyze this 5-minute trading chart. Consider the 15min context: ${analysis15m}. What does the 5min chart show?`
        });
      } else {
        analysis5m = "No 5min chart uploaded.";
      }
      setResults(r => ({ ...r, analysis5m }));
      setProgress(80);

      // Final suggestion (combine all)
      setCurrentStep('final');
      finalSuggestion = await analyzeChartWithGemini({
        image: images.chart4h || images.chart1h || images.chart15m || images.chart5m!,
        prompt: `Given the following analyses:\n4H: ${analysis4h}\n1H: ${analysis1h}\n15min: ${analysis15m}\n5min: ${analysis5m}\n\nProvide a final trading recommendation with a clear structure. Your response MUST follow this exact format:\n\nTrade Action: [Clear action to take - Buy, Sell, or No Trade]\n\nReasoning: [Detailed explanation of why this trade action is recommended, including key support/resistance levels, trend analysis, and other relevant factors]\n\nPosition Details: [If recommending a trade, provide specific entry price or range, stop loss level, and take profit target(s). If no trade is recommended, explain what conditions would need to change for a trade setup to become valid]`
      });
      setResults(r => ({ ...r, finalSuggestion }));
      setProgress(100);
    } catch {
      setError("Failed to analyze charts. Please check your images and network, or try again.");
    } finally {
      setLoading(false);
      setCurrentStep(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-8 flex flex-col gap-6">
      <div className="flex items-center justify-center mb-2">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Trading Chart Analysis</h2>
      </div>
      
      <div className="text-sm text-center text-gray-500 mb-4">
        Upload charts from different timeframes for AI-powered sequential analysis
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Image uploads */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-6 shadow-sm lg:col-span-1 overflow-hidden flex flex-col" style={{ height: contentHeight }}>
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Upload Chart Images</h3>
          <form className="flex flex-col gap-5 overflow-y-auto flex-1 pr-2" onSubmit={e => { e.preventDefault(); handleAnalyze(); }}>
            {/* 4H Chart */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">4H Chart</label>
              <div className={`border-2 border-dashed rounded-lg p-4 transition-all ${images.chart4h ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-blue-500'}`}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handleImageChange(e, "chart4h")} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  {images.chart4h ? (
                    <div className="text-sm text-green-600 dark:text-green-400">{images.chart4h.name} ✓</div>
                  ) : (
                    <div className="text-sm text-gray-500">Click to upload 4H chart</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 1H Chart */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">1H Chart</label>
              <div className={`border-2 border-dashed rounded-lg p-4 transition-all ${images.chart1h ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-blue-500'}`}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handleImageChange(e, "chart1h")} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  {images.chart1h ? (
                    <div className="text-sm text-green-600 dark:text-green-400">{images.chart1h.name} ✓</div>
                  ) : (
                    <div className="text-sm text-gray-500">Click to upload 1H chart</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 15min Chart */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">15min Chart</label>
              <div className={`border-2 border-dashed rounded-lg p-4 transition-all ${images.chart15m ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-blue-500'}`}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handleImageChange(e, "chart15m")} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  {images.chart15m ? (
                    <div className="text-sm text-green-600 dark:text-green-400">{images.chart15m.name} ✓</div>
                  ) : (
                    <div className="text-sm text-gray-500">Click to upload 15min chart</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 5min Chart */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">5min Chart</label>
              <div className={`border-2 border-dashed rounded-lg p-4 transition-all ${images.chart5m ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-blue-500'}`}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handleImageChange(e, "chart5m")} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  {images.chart5m ? (
                    <div className="text-sm text-green-600 dark:text-green-400">{images.chart5m.name} ✓</div>
                  ) : (
                    <div className="text-sm text-gray-500">Click to upload 5min chart</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            {loading && (
              <div className="mt-4 mb-2">
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                        {currentStep === '4h' && 'Analyzing 4h Chart...'}
                        {currentStep === '1h' && 'Analyzing 1h Chart...'}
                        {currentStep === '15min' && 'Analyzing 15min Chart...'}
                        {currentStep === '5min' && 'Analyzing 5min Chart...'}
                        {currentStep === 'final' && 'Generating Final Suggestion...'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div 
                      style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-indigo-600">
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <button 
              type="submit" 
              className={`mt-4 px-6 py-3 rounded-lg font-medium text-white shadow-md transition-all ${loading ? 'bg-gray-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`} 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Analyzing...</span>
                </div>
              ) : (
                <span>Analyze Charts</span>
              )}
            </button>
          </form>
        </div>
        
        {/* Right side - Results */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Analysis Results</h3>
          
          {/* Tabs */}
          {(results.analysis4h || results.analysis1h || results.analysis15m || results.analysis5m || results.finalSuggestion) && (
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                <li className="mr-2">
                  <button
                    onClick={() => setActiveTab('overall')}
                    className={`inline-block p-4 rounded-t-lg ${activeTab === 'overall' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}
                  >
                    Overall Suggestion
                  </button>
                </li>
                {results.analysis4h && (
                  <li className="mr-2">
                    <button
                      onClick={() => setActiveTab('4h')}
                      className={`inline-block p-4 rounded-t-lg ${activeTab === '4h' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}
                    >
                      4H Analysis
                    </button>
                  </li>
                )}
                {results.analysis1h && (
                  <li className="mr-2">
                    <button
                      onClick={() => setActiveTab('1h')}
                      className={`inline-block p-4 rounded-t-lg ${activeTab === '1h' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}
                    >
                      1H Analysis
                    </button>
                  </li>
                )}
                {results.analysis15m && (
                  <li className="mr-2">
                    <button
                      onClick={() => setActiveTab('15min')}
                      className={`inline-block p-4 rounded-t-lg ${activeTab === '15min' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}
                    >
                      15min Analysis
                    </button>
                  </li>
                )}
                {results.analysis5m && (
                  <li className="mr-2">
                    <button
                      onClick={() => setActiveTab('5min')}
                      className={`inline-block p-4 rounded-t-lg ${activeTab === '5min' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}
                    >
                      5min Analysis
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
          
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 dark:bg-red-900/20 dark:border-red-400">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {!loading && !error && !(results.analysis4h || results.analysis1h || results.analysis15m || results.analysis5m) && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="mt-2">Upload charts and click analyze to see results</p>
            </div>
          )}
          
          {/* Tab Content */}
          {activeTab === 'overall' && results.finalSuggestion && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-5 shadow-sm">
              <h4 className="font-semibold text-lg text-blue-800 dark:text-blue-300 mb-4">Trade Suggestion</h4>
              
              {/* Parse and structure the final suggestion */}
              {(() => {
                // Extract sections using regex patterns
                const tradeActionMatch = results.finalSuggestion.match(/Trade Action:([^\n]*)/i);
                const reasoningMatch = results.finalSuggestion.match(/Reasoning:([\s\S]*?)(?=Position Details:|$)/i);
                const positionMatch = results.finalSuggestion.match(/Position Details:([\s\S]*?)(?=$)/i);
                
                const tradeAction = tradeActionMatch ? tradeActionMatch[1].trim() : "No specific trade action provided";
                const reasoning = reasoningMatch ? reasoningMatch[1].trim() : results.finalSuggestion;
                const positionDetails = positionMatch ? positionMatch[1].trim() : "No position details provided";
                
                return (
                  <div className="space-y-6">
                    {/* Trade Action Section */}
                    <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 border-l-4 border-blue-500 dark:border-blue-400">
                      <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Trade Action</h5>
                      <div className="text-lg font-medium">{tradeAction}</div>
                    </div>
                    
                    {/* Reasoning Section */}
                    <div className="bg-white dark:bg-neutral-700 rounded-lg p-4">
                      <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Reasoning</h5>
                      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {reasoning}
                        </ReactMarkdown>
                      </div>
                    </div>
                    
                    {/* Position Details Section */}
                    {positionMatch && (
                      <div className="bg-white dark:bg-neutral-700 rounded-lg p-4 border-l-4 border-green-500 dark:border-green-400">
                        <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Position Details</h5>
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                          <ReactMarkdown>
                            {positionDetails}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          
          {activeTab === '4h' && results.analysis4h && (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-5 shadow-sm">
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3">4H Analysis</h4>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {results.analysis4h}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {activeTab === '1h' && results.analysis1h && (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-5 shadow-sm">
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3">1H Analysis</h4>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {results.analysis1h}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {activeTab === '15min' && results.analysis15m && (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-5 shadow-sm">
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3">15min Analysis</h4>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {results.analysis15m}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {activeTab === '5min' && results.analysis5m && (
            <div className="bg-white dark:bg-neutral-700 rounded-lg p-5 shadow-sm">
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3">5min Analysis</h4>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {results.analysis5m}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-gray-500">Analyzing your charts...</p>
              <p className="text-xs text-gray-400 mt-2">This may take a moment</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartAnalysis;
