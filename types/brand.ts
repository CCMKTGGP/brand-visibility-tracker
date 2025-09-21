import { Types } from "mongoose";

// Database Brand model
export interface IBrand {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  category?: string;
  region?: string;
  target_audience?: string[];
  competitors?: string[];
  use_case?: string;
  feature_list?: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Dashboard Brand interface
export interface DashboardBrand {
  id: string;
  name: string;
  category: string;
  region: string;
  scores: {
    TOFU: number;
    MOFU: number;
    BOFU: number;
    EVFU: number;
  };
  sentiment: {
    trend: "up" | "down" | "neutral";
    percentage: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  metrics: {
    totalPrompts: number;
    avgResponseTime: number;
    successRate: number;
    lastUpdated: string;
  };
  weeklyData: {
    labels: string[];
    scores: number[];
    prompts: number[];
  };
  modelPerformance: {
    ChatGPT: { score: number; prompts: number };
    Claude: { score: number; prompts: number };
    Gemini: { score: number; prompts: number };
  };
}

// Brand analysis stages
export type AnalysisStage = "TOFU" | "MOFU" | "BOFU" | "EVFU";

// Sentiment trends
export type SentimentTrend = "up" | "down" | "neutral";

// AI Models supported
export type AIModel = "ChatGPT" | "Claude" | "Gemini";

// Model performance data
export interface ModelPerformanceData {
  score: number;
  prompts: number;
}

// Matrix data for brand analysis
export interface MatrixData {
  model: string;
  stage: AnalysisStage;
  score: number;
  prompts: number;
  avgResponseTime: number;
  successRate: number;
  trend: SentimentTrend;
  trendPercentage: number;
}

// Log entry for brand monitoring
export interface LogEntry {
  id: string;
  timestamp: string;
  model: string;
  stage: AnalysisStage;
  prompt: string;
  response: string;
  score: number;
  responseTime: number;
  status: "success" | "error" | "warning";
  userId: string;
}
// Legacy interfaces removed - using MultiPromptAnalysis only

// API Response Types
export interface DashboardResponse {
  brand: {
    id: string;
    name: string;
    category?: string;
    region?: string;
  };
  currentPeriodMetrics: {
    totalPrompts: number;
    avgScore: number;
    avgResponseTime: number;
    successRate: number;
    lastUpdated: string;
  };
  scores: {
    TOFU: number;
    MOFU: number;
    BOFU: number;
    EVFU: number;
  };
  sentiment: {
    trend: SentimentTrend;
    percentage: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  modelPerformance: {
    ChatGPT: ModelPerformanceData;
    Claude: ModelPerformanceData;
    Gemini: ModelPerformanceData;
  };
  weeklyData: {
    labels: string[];
    scores: number[];
    prompts: number[];
  };
  filters: {
    period: string;
    model: string;
    stage: string;
    availablePeriods: string[];
    availableModels: string[];
    availableStages: string[];
  };
}

export interface MatrixResponse {
  data: MatrixData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  summary: {
    totalAnalyses: number;
    avgScore: number;
    bestPerforming: {
      model: string;
      stage: string;
      score: number;
    } | null;
    worstPerforming: {
      model: string;
      stage: string;
      score: number;
    } | null;
  };
  filters: {
    period: string;
    model: string;
    stage: string;
    availablePeriods: string[];
    availableModels: string[];
    availableStages: string[];
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export interface LogsResponse {
  logs: LogEntryDetailed[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
  filters: {
    model: string;
    stage: string;
    status: string;
    search: string;
    sortBy: string;
    sortOrder: string;
    availableModels: string[];
    availableStages: string[];
    availableStatuses: string[];
    availableSortBy: string[];
    availableSortOrder: string[];
  };
  summary: {
    totalLogs: number;
    currentPage: number;
    totalPages: number;
    showingFrom: number;
    showingTo: number;
  };
}

export interface LogEntryDetailed extends LogEntry {
  successRate: number;
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    confidence: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  metadata: {
    userId: string;
    userName: string;
    userEmail: string;
    triggerType: "manual" | "scheduled" | "webhook";
    version: string;
  };
}

// Multi-Prompt Analysis Types (camelCase for types folder)
export interface MultiPromptAnalysisResult {
  id: string;
  brandId: string;
  model: AIModel;
  stage: AnalysisStage;
  overallScore: number;
  weightedScore: number;
  totalResponseTime: number;
  successRate: number;
  aggregatedSentiment: {
    overall: "positive" | "neutral" | "negative";
    confidence: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  promptResults: Array<{
    promptId: string;
    promptText: string;
    score: number;
    weightedScore: number;
    mentionPosition: number;
    response: string;
    responseTime: number;
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        stronglyPositive: number;
      };
    };
    status: "success" | "error" | "warning";
  }>;
  metadata: {
    userId: string;
    triggerType: "manual" | "scheduled" | "webhook";
    version: string;
    totalPrompts: number;
    successfulPrompts: number;
  };
  status: "success" | "error" | "warning";
  createdAt: string;
  updatedAt: string;
}

export interface IMultiPromptAnalysis {
  _id: Types.ObjectId;
  brandId: Types.ObjectId;
  model: AIModel;
  stage: AnalysisStage;
  overallScore: number;
  weightedScore: number;
  totalResponseTime: number;
  successRate: number;
  aggregatedSentiment: {
    overall: "positive" | "neutral" | "negative";
    confidence: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  promptResults: Array<{
    promptId: string;
    promptText: string;
    score: number;
    weightedScore: number;
    mentionPosition: number;
    response: string;
    responseTime: number;
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        stronglyPositive: number;
      };
    };
    status: "success" | "error" | "warning";
  }>;
  metadata: {
    userId: Types.ObjectId;
    triggerType: "manual" | "scheduled" | "webhook";
    version: string;
    totalPrompts: number;
    successfulPrompts: number;
  };
  status: "success" | "error" | "warning";
  createdAt: Date;
  updatedAt: Date;
}

// Funnel Stage Performance Analysis
export interface FunnelStagePerformance {
  stage: AnalysisStage;
  averageScore: number;
  averageWeightedScore: number;
  totalAnalyses: number;
  bestPerformingModel: {
    model: AIModel;
    score: number;
    weightedScore: number;
  } | null;
  worstPerformingModel: {
    model: AIModel;
    score: number;
    weightedScore: number;
  } | null;
  sentimentTrend: {
    overall: "positive" | "neutral" | "negative";
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  topPrompts: Array<{
    promptId: string;
    averageScore: number;
    averageWeightedScore: number;
    totalMentions: number;
  }>;
}

// Comprehensive Brand Performance Summary
export interface BrandPerformanceSummary {
  brandId: string;
  brandName: string;
  overallWeightedScore: number;
  funnelStagePerformance: FunnelStagePerformance[];
  modelComparison: Array<{
    model: AIModel;
    averageScore: number;
    averageWeightedScore: number;
    stageBreakdown: Record<AnalysisStage, number>;
  }>;
  timePeriodAnalysis: {
    period: string;
    scoreProgress: Array<{
      date: string;
      score: number;
      weightedScore: number;
    }>;
  };
  recommendations: Array<{
    stage: AnalysisStage;
    priority: "high" | "medium" | "low";
    issue: string;
    recommendation: string;
  }>;
}

// API Request/Response Types
export interface MultiPromptAnalysisRequest {
  userId: string;
  models?: AIModel[];
  stages?: AnalysisStage[];
}

export interface MultiPromptAnalysisResponse {
  success: boolean;
  message: string;
  data: {
    analysisId: string;
    results: Array<{
      model: AIModel;
      stage: AnalysisStage;
      result: {
        overallScore: number;
        weightedScore: number;
        promptResults: Array<{
          promptId: string;
          score: number;
          weightedScore: number;
          mentionPosition: number;
          status: "success" | "error" | "warning";
        }>;
        totalResponseTime: number;
        successRate: number;
      };
    }>;
    summary: {
      totalAnalyses: number;
      averageScore: number;
      averageWeightedScore: number;
      estimatedCompletionTime: number;
    };
  };
}
