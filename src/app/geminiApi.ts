// Gemini Vision API call helper using @google/generative-ai SDK
// WARNING: For production, move API calls and secrets to a backend endpoint or serverless function!
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyAqwpnpyu9v2e7e6eTxHCUaK20EA-NL5YI";
// Using gemini-1.5-flash as gemini-pro-vision was deprecated on July 12, 2024
const MODEL_NAME = "gemini-1.5-flash";

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

console.log("Initializing Gemini API with model:", MODEL_NAME);

// Helper to convert File to base64 string
function fileToBase64(file: File): Promise<string> {
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

// Main function to analyze a chart image using Gemini Vision
export async function analyzeChartWithGemini({ image, prompt }: { image: File; prompt: string }): Promise<string> {
  console.log("Starting chart analysis with Gemini Vision");
  if (!image) throw new Error("No image provided for analysis");
  
  try {
    console.log("Converting image to base64...");
    const imageBase64 = await fileToBase64(image);
    console.log("Image converted successfully");
    
    console.log("Creating Gemini parts...");
    const imageParts = imageToGeminiParts(imageBase64, image.type);
    
    console.log("Getting Gemini model...");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    console.log("Sending request to Gemini API...");
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
    
    console.log("Received response from Gemini API");
    // SDK v0.6.0+ returns response as result.response.text()
    const text = await result.response.text();
    console.log("Analysis complete");
    return text || "No analysis returned from Gemini.";
  } catch (err: unknown) {
    console.error("Gemini Vision API error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error("Gemini Vision API error: " + errorMessage);
  }
}
