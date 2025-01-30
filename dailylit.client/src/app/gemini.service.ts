import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, Part } from "@google/generative-ai";
import { from, Observable, catchError, map, of } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private geminiConfig = {
    model: 'gemini-pro', // Model name to use
    apiKey: environment.googleAiApiKey, // API key from environment file
    temperature: 0.9, // Temperature for generation (controls response variability)
    maxOutputTokens: 2048, // Maximum number of tokens in the output
  };

  /**
   * Calls Gemini Pro to generate content
   * @param message The message text for the model
   * @param history Chat history
   * @returns Observable with the generation result
   */
  generateContentWithGeminiPro(
    message: string,
    history: { role: string; parts: Part[] }[]
  ): Observable<string> {
    const { model, apiKey, temperature, maxOutputTokens } = this.geminiConfig;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelInstance = genAI.getGenerativeModel({ model });

      const generationConfig = {
        temperature,
        maxOutputTokens,
      };

      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];

       // Validate and Correct History
       const validatedHistory = history.map(item => {
        if (!['user', 'model', 'function', 'system'].includes(item.role)) {
          console.warn(`Invalid role "${item.role}" in history.  Assuming 'user'.`);
          return { ...item, role: 'user' }; // or 'model', depending on the context.
        }
        return item;
      });

      const chat = modelInstance.startChat({
        generationConfig,
        safetySettings,
        history: validatedHistory, // Use the validated history
      });

      return from(chat.sendMessage(message)).pipe(
        map(result => result.response.text()),
        catchError((error) => {
          console.error('Error in generateContentWithGeminiPro:', error);
          return of(`Error generating content: ${error.message || error}`); // Return a user-friendly error message
        })
      );
    } catch (error) {
      console.error('Error initializing Gemini:', error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      return of(`Error initializing Gemini: ${errorMessage}`); // Return a user-friendly error message
    }
  }
}