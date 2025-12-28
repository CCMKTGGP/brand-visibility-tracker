import fs from "fs/promises";
import path from "path";
import { AnalysisStage, IBrand } from "@/types/brand";
import { ProcessedPrompt, BrandPlaceholders } from "@/types/services";

/**
 * Prompt Management Service
 *
 * Handles all prompt-related operations for brand analysis:
 * - Loading and parsing prompts from CSV configuration files
 * - Stage-specific weight calculation and management
 * - Brand data placeholder replacement in prompt templates
 * - Prompt filtering and retrieval by marketing funnel stage
 *
 * This service acts as the central repository for analysis prompts,
 * ensuring consistent prompt formatting and proper weight application
 * across all AI models and analysis stages.
 */
export class PromptService {
  /**
   * In-memory cache of processed prompts to avoid repeated file I/O
   */
  private static prompts: ProcessedPrompt[] = [];

  /**
   * Flag to track whether prompts have been loaded from the CSV file
   */
  private static isInitialized = false;

  /**
   * Parses a CSV line while properly handling quoted text containing commas
   *
   * Standard CSV parsing that respects quoted fields, allowing prompts to
   * contain commas without breaking the parsing logic.
   *
   * @param line - Raw CSV line to parse
   * @returns Array of parsed field values
   */
  private static parseCSVLine(line: string): string[] {
    const result = [];
    let current = "";
    let inQuotes = false;

    // Parse character by character, respecting quote boundaries
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Loads and parses prompts from the CSV configuration file
   *
   * Reads the MVP prompts CSV file containing:
   * - Prompt templates with brand placeholders
   * - Stage-specific weight configurations
   * - Funnel stage assignments
   *
   * Results are cached in memory to avoid repeated file I/O operations.
   *
   * @returns Promise resolving to array of processed prompts
   * @throws Error if CSV file cannot be read or parsed
   */
  public static async loadPrompts(): Promise<ProcessedPrompt[]> {
    // Return cached prompts if already loaded
    if (this.isInitialized && this.prompts.length > 0) return this.prompts;

    try {
      // Read and parse the CSV file from the project root
      const csvFilePath = path.join(
        process.cwd(),
        "mvp_prompts_with_funnel_scoring.csv"
      );
      const csvContent = await fs.readFile(csvFilePath, "utf-8");
      const lines = csvContent.trim().split("\n");

      // Extract headers and initialize prompt collection
      const headers = lines[0].split(",").map((h) => h.trim());
      const prompts: ProcessedPrompt[] = [];

      // Process each data row (skip header)
      for (const line of lines.slice(1)) {
        const values = this.parseCSVLine(line);
        const row: Record<string, string> = {};

        // Map values to headers for easy access
        headers.forEach((header, i) => {
          row[header] = values[i];
        });

        const stage = row["funnel_stage"] as AnalysisStage;

        prompts.push({
          prompt_id: row["prompt_id"],
          prompt_text: row["prompt_text"],
          funnel_stage: stage,
        });
      }

      // Filter out invalid prompts and cache results
      this.prompts = prompts.filter((p) => p.prompt_id && p.prompt_text);
      this.isInitialized = true;
      return this.prompts;
    } catch (error) {
      console.error("Error loading prompts from CSV:", error);
      throw new Error("Failed to load prompts");
    }
  }

  /**
   * Retrieves all prompts for a specific marketing funnel stage
   *
   * Filters the complete prompt collection to return only prompts
   * configured for the specified stage (TOFU, MOFU, BOFU, or EVFU).
   *
   * @param stage - Marketing funnel stage to filter by
   * @returns Promise resolving to array of stage-specific prompts
   */
  public static async getPromptsByStage(
    stage: AnalysisStage
  ): Promise<ProcessedPrompt[]> {
    const allPrompts = await this.loadPrompts();
    return allPrompts.filter((prompt) => prompt.funnel_stage === stage);
  }

  /**
   * Replaces brand-specific placeholders in prompt templates
   *
   * Substitutes template variables with actual brand data:
   * - {brand_name}/{name}: Brand name
   * - {category}: Business category
   * - {region}: Geographic region
   * - {audience}: Target audience
   * - {use_case}: Primary use case
   * - {competitor}: Main competitor
   * - {feature_list}: Key features
   *
   * @param promptText - Template prompt with placeholders
   * @param brandData - Brand information for substitution
   * @returns Processed prompt with placeholders replaced
   */
  public static replacePromptPlaceholders(
    promptText: string,
    brandData: IBrand
  ): string {
    let text = promptText;

    // Define placeholder mappings with fallback values
    const placeholders: BrandPlaceholders = {
      "{brand_name}": brandData.name || "Unknown Brand",
      "{name}": brandData.name || "Unknown Brand",
      "{category}": brandData.category || "business services",
      "{region}": brandData.region || "your region",
      "{audience}": brandData.target_audience?.join(", ") || "businesses",
      "{use_case}": brandData.use_case || "general business needs",
      "{competitor}": brandData.competitors?.[0] || "industry leaders",
      "{feature_list}":
        brandData.feature_list?.slice(0, 2).join(" and ") ||
        "core services and features",
    };

    // Replace each placeholder with its corresponding value
    for (const [key, val] of Object.entries(placeholders)) {
      const regex = new RegExp(key.replace(/[{}]/g, "\\$&"), "g");
      text = text.replace(regex, val);
    }

    return text;
  }
}
