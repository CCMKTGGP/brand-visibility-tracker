/**
 * Service Layer Types
 *
 * This file contains all type definitions used across service classes.
 * These types are extracted from inline definitions to promote reusability
 * and maintain consistency across the application.
 */

import { AIModel, AnalysisStage } from "./brand";

// ============================================================================
// AI SERVICE TYPES
// ============================================================================

/**
 * Configuration for AI API endpoints and keys
 */
export interface AIConfiguration {
  readonly API_KEYS: {
    ChatGPT: string | undefined;
    Claude: string | undefined;
    Gemini: string | undefined;
    Perplexity: string | undefined;
  };
  readonly AI_ENDPOINTS: {
    ChatGPT: string;
    Claude: string;
    Gemini: string;
    Perplexity: string;
  };
}

/**
 * Sentiment analysis distribution data
 */
export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  strongly_positive: number;
}

/**
 * Complete sentiment analysis result
 */
export interface SentimentAnalysis {
  overall: "positive" | "neutral" | "negative";
  confidence: number;
  distribution: SentimentDistribution;
}

/**
 * AI analysis result for a single brand analysis
 */
export interface AIAnalysisResult {
  score: number;
  position_weighted_score: number;
  response: string;
  responseTime: number;
  sentiment: SentimentAnalysis;
  mentionPosition: number | null;
  analysis: string;
  status: "success" | "error";
  competitorData?: {
    competitors: CompetitorData[];
    domains: DomainCitation[];
  };
}

/**
 * Parsed AI response with scoring information
 */
export interface ParsedAIResponse {
  score: number;
  position_weighted_score: number;
  mentionPosition: number | null;
  analysis: string;
  sentiment: SentimentAnalysis;
  status: "success" | "error";
}

/**
 * Stage-specific analysis prompt configuration
 */
export interface StageAnalysisPrompt {
  systemMessage: string;
  prompt: string;
}

/**
 * Multi-prompt analysis results aggregated across all prompts
 */
export interface AIAnalysisResults {
  overallScore: number;
  weightedScore: number;
  promptResults: Array<{
    promptId: string;
    promptText: string;
    score: number;
    weightedScore: number;
    mentionPosition: number | null;
    response: string;
    responseTime: number;
    sentiment: SentimentAnalysis;
    status: "success" | "error";
    competitorData?: {
      competitors: CompetitorData[];
      domains: DomainCitation[];
    };
  }>;
  aggregatedSentiment: SentimentAnalysis;
  totalResponseTime: number;
  successRate: number;
}

// ============================================================================
// LLM SERVICE TYPES
// ============================================================================

/**
 * Standard response format from LLM services
 */
export interface LLMResponse {
  response: string;
  responseTime: number;
}

/**
 * LLM API configuration
 */
export interface LLMConfiguration {
  readonly API_KEYS: {
    ChatGPT: string | undefined;
    Claude: string | undefined;
    Gemini: string | undefined;
    Perplexity: string | undefined;
  };
  readonly AI_ENDPOINTS: {
    ChatGPT: string;
    Claude: string;
    Gemini: string;
    Perplexity: string;
  };
}

// ============================================================================
// CREDIT SERVICE TYPES
// ============================================================================

/**
 * Credit cost configuration for different operations
 */
export interface CreditCosts {
  readonly per_model_all_stages: number;
}

/**
 * Credit balance check result
 */
export interface CreditBalanceCheck {
  hasEnough: boolean;
  currentBalance: number;
}

/**
 * Credit operation result
 */
export interface CreditOperationResult {
  success: boolean;
  newBalance: number;
  totalCreditUsed: number;
}

/**
 * Credit transaction types
 */
export type CreditTransactionType = "purchase" | "usage" | "bonus" | "refund";

/**
 * Credit history filters
 */
export interface CreditHistoryFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Credit usage statistics
 */
export interface CreditStats {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
  recentTransactions: any[]; // Using any[] to match existing implementation
}

/**
 * Analysis request validation result
 */
export interface AnalysisValidationResult {
  isValid: boolean;
  creditsNeeded: number;
  breakdown: Array<{
    model: AIModel;
    credits: number;
    stages: string;
  }>;
  errors?: string[];
}

// ============================================================================
// DATA ORGANIZATION SERVICE TYPES
// ============================================================================

/**
 * Performance level classification
 */
export type PerformanceLevel = "excellent" | "good" | "fair" | "poor";

/**
 * Analysis trigger types
 */
export type TriggerType = "manual" | "scheduled" | "webhook";

/**
 * Analysis status types
 */
export type AnalysisStatus = "success" | "error" | "warning";

export interface CompetitorData {
  name: string;
  normalized_name: string;
  confidence_score: number;
  source_domains: string[];
}

export interface DomainCitation {
  domain: string;
  authority_score: number;
  source_type: string;
  relevance: string;
  reasoning: string;
}

/**
 * Processed prompt result with enhanced scoring
 */
export interface ProcessedPromptResult {
  prompt_id: string;
  prompt_text: string;
  raw_response: string;
  scoring_result: {
    raw_score: number;
    position_weighted_score: number;
    mention_position: number | null;
    competitorData?: {
      competitors: CompetitorData[];
      domains: DomainCitation[];
    };
  };
  performance_level: PerformanceLevel;
  processing_time: number;
  status: AnalysisStatus;
}

/**
 * Organized analysis data structure
 */
export interface OrganizedAnalysisData {
  analysis_id: string;
  brand_id: string;
  model: AIModel;
  stage: AnalysisStage;
  timestamp: Date;

  // Core Metrics
  overall_score: number;
  weighted_score: number;

  // Detailed Results
  prompt_results: ProcessedPromptResult[];

  // Aggregated Sentiment
  sentiment_analysis: SentimentAnalysis;

  // Metadata
  metadata: {
    user_id: string;
    trigger_type: TriggerType;
    version: string;
    total_prompts: number;
    successful_prompts: number;
    total_processing_time: number;
  };
}

/**
 * Funnel performance with trend analysis
 */
export interface FunnelPerformanceData {
  [key: string]: {
    score: number;
    trend: "up" | "down" | "neutral";
    change: number;
  };
}

/**
 * Service model performance metrics (different from brand ModelPerformanceData)
 */
export interface ServiceModelPerformanceData {
  [key: string]: {
    score: number;
    analyses: number;
    reliability: number;
  };
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  date: string;
  overall_score: number;
  weighted_score: number;
  mention_rate: number;
  analyses_count: number;
}

/**
 * Dashboard insights
 */
export interface DashboardInsights {
  top_performing_stage: AnalysisStage;
  best_model: AIModel;
  key_recommendations: string[];
  performance_trend: "improving" | "declining" | "stable";
}

/**
 * Complete dashboard metrics
 */
export interface DashboardMetrics {
  brand_summary: {
    brand_id: string;
    brand_name: string;
    last_updated: Date;
    total_analyses: number;
  };
  funnel_performance: FunnelPerformanceData;
  model_performance: ServiceModelPerformanceData;
  time_series_data: TimeSeriesDataPoint[];
  insights: DashboardInsights;
}

/**
 * Dashboard metrics filters
 */
export interface DashboardFilters {
  model?: AIModel;
  stage?: AnalysisStage;
}

/**
 * Date range for analysis
 */
export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// PROMPT SERVICE TYPES
// ============================================================================

/**
 * Custom prompt from CSV file
 */
export interface CustomPrompt {
  prompt_id: string;
  prompt_text: string;
  funnel_stage: AnalysisStage;
  [key: string]: string | number; // for CSV flexibility
}

/**
 * Processed prompt with weights
 */
export interface ProcessedPrompt {
  prompt_id: string;
  prompt_text: string;
  funnel_stage: AnalysisStage;
}

/**
 * Brand data placeholders for prompt replacement
 */
export interface BrandPlaceholders {
  "{brand_name}": string;
  "{name}": string;
  "{category}": string;
  "{region}": string;
  "{audience}": string;
  "{use_case}": string;
  "{competitor}": string;
  "{feature_list}": string;
}

// ============================================================================
// STRIPE SERVICE TYPES
// ============================================================================

/**
 * Credit package configuration
 */
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  priceId: string;
  popular?: boolean;
  bonusCredits?: number;
  description: string;
}

/**
 * Payment intent creation result
 */
export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  credits: number;
}

/**
 * Checkout session creation result
 */
export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

/**
 * Stripe refund parameters
 */
export interface RefundParameters {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

// ============================================================================
// COMMON SERVICE TYPES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Service pagination parameters (different from API PaginationParams)
 */
export interface ServicePaginationParams {
  limit: number;
  skip: number;
}

/**
 * Service operation metadata
 */
export interface ServiceMetadata {
  timestamp: Date;
  version: string;
  user_id?: string;
  operation_id?: string;
}

/**
 * Error handling context
 */
export interface ServiceErrorContext {
  service: string;
  method: string;
  parameters?: Record<string, any>;
  timestamp: Date;
}
