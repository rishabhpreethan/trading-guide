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

interface UploadedImage {
  file: File;
  detectedTimeframe?: keyof ChartImages;
  error?: string;
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
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [detectingTimeframes, setDetectingTimeframes] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Clear uploaded images and reset input
  const clearUploadedImages = () => {
    setUploadedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
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

  // Multi-image upload handler
  const handleMultiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedImages(files.map(file => ({ file })));
    }
  };

  // Identify timeframe for each uploaded image
  const identifyTimeframes = async () => {
    setDetectingTimeframes(true);
    const tfPrompts = {
      chart4h: '4h',
      chart1h: '1h',
      chart15m: '15m',
      chart5m: '5m',
    };
    const timeframeMap: Record<string, keyof ChartImages> = {
      '4h': 'chart4h',
      '4H': 'chart4h',
      '1h': 'chart1h',
      '1H': 'chart1h',
      '15m': 'chart15m',
      '15min': 'chart15m',
      '15M': 'chart15m',
      '5m': 'chart5m',
      '5min': 'chart5m',
      '5M': 'chart5m',
    };
    const newUploadedImages = await Promise.all(uploadedImages.map(async (img) => {
      try {
        const tfResp = await analyzeChartWithGemini({
          image: img.file,
          prompt: 'What is the exact timeframe shown in this trading chart? Respond with ONLY one of the following and nothing else: 4h, 1h, 15m, 5m. If the chart is 15 minutes, respond with exactly: 15m. If 5 minutes, respond with exactly: 5m.'
        });
        // Extract only exact valid timeframe, not substrings
        const cleaned = tfResp.trim().toLowerCase();
        const valid = ['4h', '1h', '15m', '5m'];
        if (valid.includes(cleaned)) {
          return { ...img, detectedTimeframe: timeframeMap[cleaned] };
        } else {
          return { ...img, error: 'Could not detect timeframe' };
        }
      } catch (err) {
        return { ...img, error: 'Detection failed' };
      }
    }));
    setUploadedImages(newUploadedImages);
    // Map to ChartImages
    const chartImages: ChartImages = {
      chart4h: null, chart1h: null, chart15m: null, chart5m: null
    };
    newUploadedImages.forEach(img => {
      if (img.detectedTimeframe) chartImages[img.detectedTimeframe] = img.file;
    });
    setImages(chartImages);
    setDetectingTimeframes(false);
  };

  const handleAnalyze = async () => {
    // Always ensure timeframes are detected before analysis
    if (uploadedImages.length > 0 && uploadedImages.some(img => !img.detectedTimeframe && !img.error)) {
      await identifyTimeframes();
    }
    // Prevent analysis if any image has not been classified
    if (uploadedImages.some(img => !img.detectedTimeframe && !img.error)) {
      setError("Please detect timeframes for all images before analysis.");
      return;
    }
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
          prompt: `Analyze this 4-hour chart using the Fib-RSI Confluence Strategy:

1. Identify the major trend direction (bullish/bearish/neutral)
2. Note key Fibonacci levels (0.382, 0.5, 0.618, 0.786) visible on the chart
3. Report the RSI value and whether it's above/below 50
4. Highlight any significant support/resistance zones
5. Determine if this chart provides a clear bias for trading

Your analysis should focus on establishing overall market structure and primary trend. Draw Fibonacci retracement on major swings (last 1-2 weeks) and identify longer-term momentum state from RSI (bullish >50, bearish <50).`
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
          prompt: `Analyze this 1-hour chart using the Fib-RSI Confluence Strategy while considering the 4h context:

1. Identify if price is at/approaching any significant Fibonacci level from 4h analysis
2. Note any new 1h Fibonacci levels that align with 4h levels
3. Check if RSI direction confirms the 4h trend bias
4. Identify potential entry zones where Fibonacci levels create confluence
5. Determine if this timeframe is setting up for a potential trade opportunity

The 4h analysis found: ${analysis4h.substring(0, 300)}...

Focus specifically on finding entry zones that align with the 4h structure, paying attention to RSI reversals (30-40 for bullish, 60-70 for bearish).`
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
          prompt: `Analyze this 15-minute chart using the Fib-RSI Confluence Strategy while considering higher timeframe context:

1. Identify any clear candlestick patterns at Fibonacci confluence zones
2. Check if RSI confirms the momentum in the expected direction
3. Look for any bearish/bullish divergence on RSI
4. Suggest precise entry point, stop loss (below/above relevant Fib level), and take profit targets
5. Calculate the Risk:Reward ratio and only recommend the trade if it's at least 1:2

The 4h analysis found: ${analysis4h.substring(0, 200)}...
The 1h analysis found: ${analysis1h.substring(0, 200)}...

Focus specifically on fine-tuning entry timing and precise stop-loss placement. Look for short-term Fib levels from recent 1h swings and immediate RSI confirmation signals.`
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
          prompt: `Analyze this 5-minute chart using the Fib-RSI Confluence Strategy while considering the 15min context: ${analysis15m.substring(0, 300)}...

1. Identify exact price levels for entry based on short-term price reaction at Fibonacci levels
2. Check if current RSI reading confirms the momentum seen in higher timeframes
3. Look for any very recent RSI divergences that could signal short-term reversals
4. Provide exact stop loss placement (specify price) below/above the nearest key Fibonacci level
5. Provide exact take profit targets (specify prices) at the next significant Fibonacci levels
6. Describe the specific candlestick pattern or price action that should trigger entry execution

Focus ONLY on precise execution details for the trade setup identified in the higher timeframes. This should be the final tactical guidance for trade execution.`
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
        prompt: `Given the following analyses based on the multi-timeframe Fib-RSI Confluence Strategy:\n4H: ${analysis4h}\n1H: ${analysis1h}\n15min: ${analysis15m}\n5min: ${analysis5m}\n\nProvide a final trading recommendation that synthesizes all timeframes. Your response MUST follow this exact format with clear visual indicators:\n\n## CHECKLIST EVALUATION\n\n| Criteria | Status | Details |\n|---------|--------|---------|\n| **1. DIRECTIONAL ALIGNMENT** | PASS or FAIL | |\n| 4h RSI trend bias | PASS or FAIL | [DETAIL] |\n| 1h RSI confirmation | PASS or FAIL | [DETAIL] |\n| 15m RSI momentum | PASS or FAIL | [DETAIL] |\n| **2. FIBONACCI STRUCTURE** | PASS or FAIL | |\n| 4h Fibonacci level | PASS or FAIL | [DETAIL] |\n| 1h Fibonacci confirmation | PASS or FAIL | [DETAIL] |\n| 15m price action at confluence | PASS or FAIL | [DETAIL] |\n| **3. ENTRY CONFIRMATION** | PASS or FAIL | |\n| 15m candlestick pattern | PASS or FAIL | [DETAIL] |\n| RSI momentum confirmation | PASS or FAIL | [DETAIL] |\n| Risk:Reward ratio >= 1:2 | PASS or FAIL | [DETAIL] |\n\n## TRADE RECOMMENDATION\n\n**TRADE ACTION: [BUY/SELL/NO TRADE]**\n\n## TRADE PARAMETERS\n\nENTRY: [Exact price or tight range]\nSTOP LOSS: [Exact price] (Based on [relevant Fibonacci level])\nTAKE PROFIT 1: [Exact price] (Based on [Fibonacci level])\nTAKE PROFIT 2: [Exact price] (Based on [Fibonacci level])\nTAKE PROFIT 3: [Exact price] (Based on [Fibonacci level])\nRISK:REWARD RATIO: [Precise calculation]\nPOSITION SIZE RECOMMENDATION: [Based on stop distance]\n\n## REASONING\n[Concise explanation of the trade recommendation based on the checklist evaluation]\n\n## VISUAL MARKERS\n- **Fibonacci Confluence Zones**: [Specific price levels]\n- **Entry Trigger Pattern**: [Specific candle pattern to watch for]\n- **RSI Confirmation Points**: [Specific RSI levels across timeframes]\n\nIf recommending NO TRADE, clearly highlight which checklist items FAILED and explain what specific conditions would need to change for a valid setup.`
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
            {/* Multi-image upload */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Chart Images (4h, 1h, 15m, 5m)</label>
              <div className={`border-2 border-dashed rounded-lg p-4 transition-all ${uploadedImages.length > 0 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-blue-500'}`}
  style={{ minHeight: '120px', position: 'relative' }}>
  <input
    type="file"
    accept="image/*"
    multiple
    ref={fileInputRef}
    onChange={handleMultiImageChange}
    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', zIndex: 2, cursor: 'pointer' }}
    tabIndex={0}
    aria-label="Upload chart images"
  />
  <div className="text-center flex flex-col items-center justify-center" style={{ minHeight: 80, zIndex: 1 }}>
    <span className="block text-sm text-gray-500">Click or drag to upload chart images (4h, 1h, 15m, 5m)</span>
    {uploadedImages.length > 0 && (
      <div className="flex flex-col items-center gap-1 mt-2">
        <div className="text-xs text-green-600 dark:text-green-400">{uploadedImages.length} image(s) selected</div>
        <button type="button" className="text-xs text-red-600 hover:underline mt-1" onClick={clearUploadedImages}>Clear</button>
      </div>
    )}
  </div>
</div>
            </div>
            {/* Show detected timeframes and errors */}
            {uploadedImages.length > 0 && (
              <div className="mt-2">
                <ul className="text-xs">
                  {uploadedImages.map((img, idx) => (
                    <li key={idx} className="flex items-center gap-2 mb-1">
                      <span className="font-mono">{img.file.name}</span>
                      {img.detectedTimeframe && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-2">{img.detectedTimeframe.replace('chart', '')}</span>}
                      {img.error && <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ml-2">{img.error}</span>}
                    </li>
                  ))}
                </ul>
                {detectingTimeframes && <div className="text-xs text-blue-500 mt-1">Detecting timeframes...</div>}
                {!detectingTimeframes && (
                  <button
                    type="button"
                    className="mt-2 px-4 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all"
                    disabled={detectingTimeframes || uploadedImages.length === 0}
                    onClick={identifyTimeframes}
                  >
                    Detect Timeframes
                  </button>
                )}
              </div>
            )}
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
