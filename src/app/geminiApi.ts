// Gemini Vision API call helper with rate limiting and caching
import { GoogleGenerativeAI } from "@google/generative-ai";
import PQueue from "p-queue";
import { LRUCache } from 'lru-cache';
import { v4 as uuidv4 } from 'uuid';

// Configuration
// const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_KEY = "AIzaSyAE8p_vWov7LUqDW-V4o6NT5hXoSg8A8tk";
const MODEL_NAME = "gemini-1.5-flash";
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Create a queue for rate limiting
const apiQueue = new PQueue({
  concurrency: 1, // Process one request at a time
  interval: 1000, // 1 second between requests
  intervalCap: 5, // 5 requests per second (adjust based on your quota)
  carryoverConcurrencyCount: true,
});

// Response cache (1 hour TTL, max 100 entries)
const responseCache = new LRUCache<string, string>({
  max: 100,
  ttl: 60 * 60 * 1000, // 1 hour
  ttlAutopurge: true,
});

// Track active requests to prevent duplicates
const activeRequests = new Map<string, Promise<string>>();

// Helper to generate a unique cache key for requests
function generateCacheKey(file: File, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const fileContent = reader.result as string;
      // Create a hash of file content and prompt for cache key
      const data = JSON.stringify({ 
        content: fileContent.substring(0, 1000), // First 1000 chars for hash
        prompt: prompt.substring(0, 200), // First 200 chars of prompt
        size: file.size,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Use Buffer for safe base64 encoding in Node.js
      let hash: string;
      if (typeof window === 'undefined') {
        // Node.js environment
        hash = Buffer.from(data).toString('base64');
      } else {
        // Browser environment - use TextEncoder if available, fallback to btoa with encodeURIComponent
        try {
          hash = window.btoa(unescape(encodeURIComponent(data)));
        } catch (e) {
          // Fallback to simple hash if encoding fails
          hash = Array.from(data).reduce((acc, char) => {
            return acc + char.charCodeAt(0).toString(16);
          }, '');
        }
      }
      
      resolve(`gemini:${hash}`);
    };
    reader.readAsDataURL(file);
  });
}

// Helper to convert File to base64 string
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to create Gemini Vision image parts
function imageToGeminiParts(imageBase64: string, mimeType: string) {
  return [
    {
      inlineData: {
        data: imageBase64.split(",")[1], // Remove data URL prefix
        mimeType,
      },
    },
  ];
}

// Function to execute Gemini API call with retry logic
async function executeGeminiRequest(image: File, prompt: string, attempt = 1): Promise<string> {
  try {
    const imageBase64 = await fileToBase64(image);
    const imageParts = imageToGeminiParts(imageBase64, image.type);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...imageParts,
          ],
        },
      ],
    });
    
    return await result.response.text() || "No analysis returned from Gemini.";
  } catch (error: any) {
    // Handle rate limiting (429) or server errors (5xx)
    const status = error?.response?.status;
    const isRateLimit = status === 429 || (status >= 500 && status < 600);
    
    if (isRateLimit && attempt <= MAX_RETRIES) {
      // Exponential backoff: 2^attempt * 1000ms
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeGeminiRequest(image, prompt, attempt + 1);
    }
    
    throw error;
  }
}

// Main function to analyze a chart image using Gemini Vision with caching and rate limiting
export async function analyzeChartWithGemini({ 
  image, 
  prompt 
}: { 
  image: File; 
  prompt: string 
}): Promise<string> {
  if (!image) throw new Error("No image provided for analysis");
  
  // Generate a unique cache key for this request
  const cacheKey = await generateCacheKey(image, prompt);
  
  // Check cache first
  const cachedResponse = responseCache.get(cacheKey);
  if (cachedResponse) {
    console.log("Returning cached response for:", cacheKey.substring(0, 50) + '...');
    return cachedResponse;
  }
  
  // Check for duplicate in-flight requests
  if (activeRequests.has(cacheKey)) {
    console.log("Request already in progress, returning existing promise");
    return activeRequests.get(cacheKey)!;
  }
  
  console.log("Starting new Gemini API request for:", cacheKey.substring(0, 50) + '...');
  
  // Create a promise for this request
  const requestPromise = (async () => {
    try {
      // Add to queue for rate limiting
      const response = await apiQueue.add(
        () => executeGeminiRequest(image, prompt),
        { throwOnTimeout: true }
      );
      
      // Cache the successful response
      responseCache.set(cacheKey, response);
      return response;
    } finally {
      // Clean up the active request
      activeRequests.delete(cacheKey);
    }
  })();
  
  // Store the promise for de-duplication
  activeRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
}
