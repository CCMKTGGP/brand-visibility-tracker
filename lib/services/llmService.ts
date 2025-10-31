import axios from "axios";
import { LLMResponse, LLMConfiguration } from "@/types/services";

/**
 * Large Language Model (LLM) Service
 *
 * Provides unified API wrappers for multiple AI language models:
 * - OpenAI ChatGPT (GPT-3.5-turbo)
 * - Anthropic Claude (Claude-3.5-sonnet)
 * - Google Gemini
 *
 * This service handles:
 * - API authentication and configuration
 * - Request/response formatting for each provider
 * - Error handling and response time tracking
 * - Consistent response format across all models
 *
 * All methods return a standardized LLMResponse format regardless
 * of the underlying API differences.
 */
export class LLMService {
  /**
   * LLM API configuration containing authentication keys and endpoints
   * for all supported language models
   */
  private static readonly LLM_CONFIG: LLMConfiguration = {
    API_KEYS: {
      ChatGPT: process.env.OPENAI_API_KEY,
      Claude: process.env.CLAUDE_API_KEY,
      Gemini: process.env.GEMINI_API_KEY,
    },
    AI_ENDPOINTS: {
      ChatGPT: process.env.OPENAI_API_URL!,
      Claude: process.env.CLAUDE_API_URL!,
      Gemini: process.env.GEMINI_API_URL!,
    },
  };

  /**
   * Calls OpenAI's ChatGPT API (GPT-3.5-turbo)
   *
   * Sends a prompt to ChatGPT with an optional system message that defines
   * the AI's behavior and context. The system message helps guide the AI's
   * responses to be more relevant and consistent.
   *
   * @param prompt - The user prompt/question to send to ChatGPT
   * @param systemMessage - System-level instructions for the AI's behavior
   * @returns Promise resolving to standardized LLM response with timing
   * @throws Error if API key is not configured or API call fails
   */
  public static async callChatGPT(
    prompt: string,
    systemMessage: string = "You are a helpful AI assistant."
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.LLM_CONFIG.API_KEYS.ChatGPT) {
      throw new Error("ChatGPT API key not configured");
    }

    try {
      // Make API request to OpenAI with proper message formatting
      const response = await axios.post(
        this.LLM_CONFIG.AI_ENDPOINTS.ChatGPT,
        {
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.LLM_CONFIG.API_KEYS.ChatGPT}`,
          },
        }
      );

      const { data } = response;

      // Extract response content and calculate timing
      return {
        response: data?.choices[0]?.message?.content,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      // Handle API errors with detailed error information
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`ChatGPT API error (${status}): ${message}`);
      }
      throw new Error(
        `ChatGPT API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Calls Anthropic's Claude API (Claude-3.5-sonnet)
   *
   * Sends a prompt to Claude with system-level instructions. Claude uses
   * a different API format than ChatGPT, with separate system and message
   * parameters, and requires specific headers for authentication.
   *
   * @param prompt - The user prompt/question to send to Claude
   * @param systemMessage - System-level instructions for Claude's behavior
   * @returns Promise resolving to standardized LLM response with timing
   * @throws Error if API key is not configured or API call fails
   */
  public static async callClaude(
    prompt: string,
    systemMessage: string = "You are a helpful AI assistant."
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.LLM_CONFIG.API_KEYS.Claude) {
      throw new Error("Claude API key not configured");
    }

    try {
      // Make API request to Anthropic with Claude-specific formatting
      const response = await axios.post(
        this.LLM_CONFIG.AI_ENDPOINTS.Claude,
        {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemMessage,
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            "x-api-key": this.LLM_CONFIG.API_KEYS.Claude,
            "anthropic-version": "2023-06-01",
          },
        }
      );

      const { data } = response;

      // Extract response content from Claude's response format
      return {
        response: data?.content[0]?.text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      // Handle Claude API errors with detailed error information
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Claude API error (${status}): ${message}`);
      }
      throw new Error(
        `Claude API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Calls Google's Gemini API
   *
   * Sends a prompt to Gemini with system instructions. Gemini uses a different
   * API format that combines system and user messages into a single prompt.
   * The API uses Google's specific authentication and request format.
   *
   * @param prompt - The user prompt/question to send to Gemini
   * @param systemMessage - System-level instructions for Gemini's behavior
   * @returns Promise resolving to standardized LLM response with timing
   * @throws Error if API key is not configured or API call fails
   */
  public static async callGemini(
    prompt: string,
    systemMessage: string = "You are a helpful AI assistant."
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.LLM_CONFIG.API_KEYS.Gemini) {
      throw new Error("Gemini API key not configured");
    }

    // Combine system message and prompt for Gemini's format
    const geminiPrompt = `${systemMessage}\n\n${prompt}`;

    try {
      // Make API request to Google Gemini with proper formatting
      const response = await axios.post(
        this.LLM_CONFIG.AI_ENDPOINTS.Gemini,
        {
          model: "gemini-1.5-pro",
          contents: [{ parts: [{ text: geminiPrompt }] }],
        },
        {
          headers: {
            "x-goog-api-key": this.LLM_CONFIG.API_KEYS.Gemini,
          },
        }
      );

      const { data } = response;

      // Extract response content from Gemini's response format
      return {
        response: data?.candidates[0]?.content?.parts[0]?.text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      // Handle Gemini API errors with detailed error information
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Gemini API error (${status}): ${message}`);
      }
      throw new Error(
        `Gemini API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
