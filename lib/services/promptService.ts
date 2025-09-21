import fs from "fs/promises";
import path from "path";
import { AnalysisStage } from "@/types/brand";

export interface CustomPrompt {
  prompt_id: string;
  prompt_text: string;
  funnel_stage: AnalysisStage;
  base_weight: number;
  weight_first: number;
  weight_second: number;
  weight_third: number;
  weight_fourth: number;
  weight_fifth: number;
  weight_absent: number;
}

export interface ProcessedPrompt {
  prompt_id: string;
  prompt_text: string;
  funnel_stage: AnalysisStage;
  weights: {
    base_weight: number;
    weight_first: number;
    weight_second: number;
    weight_third: number;
    weight_fourth: number;
    weight_fifth: number;
    weight_absent: number;
  };
}

export class PromptService {
  private static prompts: ProcessedPrompt[] = [];
  private static isInitialized = false;

  // Load and parse CSV file
  public static async loadPrompts(): Promise<ProcessedPrompt[]> {
    if (this.isInitialized && this.prompts.length > 0) {
      return this.prompts;
    }

    try {
      const csvFilePath = path.join(
        process.cwd(),
        "mvp_prompts_1752263341495.csv"
      );
      const csvContent = await fs.readFile(csvFilePath, "utf-8");

      const lines = csvContent.trim().split("\n");
      const headers = lines[0].split(",");

      this.prompts = lines
        .slice(1)
        .map((line) => {
          const values = this.parseCSVLine(line);

          return {
            prompt_id: values[0],
            prompt_text: values[1],
            funnel_stage: values[2] as AnalysisStage,
            weights: {
              base_weight: parseFloat(values[3]),
              weight_first: parseFloat(values[4]),
              weight_second: parseFloat(values[5]),
              weight_third: parseFloat(values[6]),
              weight_fourth: parseFloat(values[7]),
              weight_fifth: parseFloat(values[8]),
              weight_absent: parseFloat(values[9]),
            },
          };
        })
        .filter((prompt) => prompt.prompt_id && prompt.prompt_text);

      this.isInitialized = true;
      return this.prompts;
    } catch (error) {
      console.error("Error loading prompts from CSV:", error);
      throw new Error("Failed to load custom prompts");
    }
  }

  // Parse CSV line handling potential commas in quoted text
  private static parseCSVLine(line: string): string[] {
    const result = [];
    let current = "";
    let inQuotes = false;

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

  // Get prompts by funnel stage
  public static async getPromptsByStage(
    stage: AnalysisStage
  ): Promise<ProcessedPrompt[]> {
    const allPrompts = await this.loadPrompts();
    return allPrompts.filter((prompt) => prompt.funnel_stage === stage);
  }

  // Get all prompts grouped by stage
  public static async getPromptsGroupedByStage(): Promise<
    Record<AnalysisStage, ProcessedPrompt[]>
  > {
    const allPrompts = await this.loadPrompts();

    const grouped: Record<AnalysisStage, ProcessedPrompt[]> = {
      TOFU: [],
      MOFU: [],
      BOFU: [],
      EVFU: [],
    };

    allPrompts.forEach((prompt) => {
      grouped[prompt.funnel_stage].push(prompt);
    });

    return grouped;
  }

  // Replace placeholders in prompt text with brand data
  public static replacePromptPlaceholders(
    promptText: string,
    brandData: any
  ): string {
    let processedPrompt = promptText;

    // Define placeholder mappings
    const placeholders = {
      "{brand_name}": brandData.name || "Unknown Brand",
      "{name}": brandData.name || "Unknown Brand", // Added for CSV compatibility
      "{category}": brandData.category || "business services",
      "{region}": brandData.region || "your region",
      "{audience}": brandData.target_audience?.join(", ") || "businesses",
      "{use_case}": brandData.use_case || "general business needs",
      "{competitor}": brandData.competitors?.[0] || "industry leaders",
      "{feature_list}":
        brandData.feature_list?.slice(0, 2).join(" and ") ||
        "core services and features",
    };

    // Replace all placeholders
    Object.entries(placeholders).forEach(([placeholder, replacement]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g");
      processedPrompt = processedPrompt.replace(regex, replacement);
    });

    return processedPrompt;
  }

  // Get all unique prompt IDs
  public static async getAllPromptIds(): Promise<string[]> {
    const allPrompts = await this.loadPrompts();
    return allPrompts.map((prompt) => prompt.prompt_id);
  }

  // Get prompt by ID
  public static async getPromptById(
    promptId: string
  ): Promise<ProcessedPrompt | null> {
    const allPrompts = await this.loadPrompts();
    return allPrompts.find((prompt) => prompt.prompt_id === promptId) || null;
  }

  // Get summary statistics
  public static async getPromptStatistics(): Promise<{
    totalPrompts: number;
    promptsByStage: Record<AnalysisStage, number>;
    weightRanges: {
      minBaseWeight: number;
      maxBaseWeight: number;
    };
  }> {
    const allPrompts = await this.loadPrompts();

    const promptsByStage: Record<AnalysisStage, number> = {
      TOFU: 0,
      MOFU: 0,
      BOFU: 0,
      EVFU: 0,
    };

    let minBaseWeight = Infinity;
    let maxBaseWeight = -Infinity;

    allPrompts.forEach((prompt) => {
      promptsByStage[prompt.funnel_stage]++;
      minBaseWeight = Math.min(minBaseWeight, prompt.weights.base_weight);
      maxBaseWeight = Math.max(maxBaseWeight, prompt.weights.base_weight);
    });

    return {
      totalPrompts: allPrompts.length,
      promptsByStage,
      weightRanges: {
        minBaseWeight: minBaseWeight === Infinity ? 0 : minBaseWeight,
        maxBaseWeight: maxBaseWeight === -Infinity ? 0 : maxBaseWeight,
      },
    };
  }
}
