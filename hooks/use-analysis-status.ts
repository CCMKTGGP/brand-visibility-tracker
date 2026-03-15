"use client";
import { fetchData } from "@/utils/fetch";
import { useCallback, useEffect, useState } from "react";

interface AnalysisProgress {
  total_tasks: number;
  completed_tasks: number;
  current_task: string;
}

interface CurrentAnalysis {
  analysisId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  models: ("ChatGPT" | "Claude" | "Gemini" | "Perplexity")[];
  stages: ("TOFU" | "MOFU" | "BOFU" | "EVFU")[];
  startedAt: string;
  progress: AnalysisProgress;
}

export interface PairDetail {
  model: "ChatGPT" | "Claude" | "Gemini" | "Perplexity";
  stage: "TOFU" | "MOFU" | "BOFU" | "EVFU";
  status: "completed" | "failed" | "pending" | "running";
  errorMessage?: string;
}

export interface FailedAnalysis {
  analysisId: string;
  status: "failed";
  models: ("ChatGPT" | "Claude" | "Gemini" | "Perplexity")[];
  stages: ("TOFU" | "MOFU" | "BOFU" | "EVFU")[];
  startedAt: string;
  errorMessage?: string;
  progress: AnalysisProgress;
  /** Models that have at least one failed stage pair */
  failedModels: ("ChatGPT" | "Claude" | "Gemini" | "Perplexity")[];
  /** Models where every stage pair completed successfully */
  completedModels: ("ChatGPT" | "Claude" | "Gemini" | "Perplexity")[];
  /** Full per-pair breakdown (model × stage with status and error message) */
  pairDetails: PairDetail[];
}

interface RecentAnalysis {
  analysisId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  models: ("ChatGPT" | "Claude" | "Gemini" | "Perplexity")[];
  stages: ("TOFU" | "MOFU" | "BOFU" | "EVFU")[];
  startedAt: string;
  completedAt: string;
  errorMessage: string;
  progress: AnalysisProgress;
}

interface AnalysisStatusData {
  isRunning: boolean;
  isFailed: boolean;
  currentAnalysis: CurrentAnalysis | null;
  failedAnalysis: FailedAnalysis | null;
  recentAnalyses: RecentAnalysis[];
}

export function useAnalysisStatus({
  brandId,
  userId,
  autoRefresh = true,
  refreshInterval = 20000,
}: {
  brandId: string;
  userId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [analysisStatus, setAnalysisStatus] =
    useState<AnalysisStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchUpdatedLogs, setFetchUpdatedLogs] = useState(false);

  const fetchAnalysisStatus = useCallback(async () => {
    try {
      const response = await fetchData(
        `/api/brand/${brandId}/analysis-status?userId=${userId}&brandId=${brandId}`,
      );
      const { data } = response;
      setAnalysisStatus(data);
      setFetchUpdatedLogs(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analysis status",
      );
    } finally {
      setLoading(false);
    }
  }, [brandId, userId]);

  useEffect(() => {
    fetchAnalysisStatus();
  }, [fetchAnalysisStatus]);

  // Auto-refresh while an analysis is actively running
  useEffect(() => {
    if (!autoRefresh || !analysisStatus?.isRunning) {
      return;
    }
    const interval = setInterval(fetchAnalysisStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [
    fetchAnalysisStatus,
    autoRefresh,
    refreshInterval,
    analysisStatus?.isRunning,
  ]);

  return {
    isRunning: analysisStatus?.isRunning,
    isFailed: analysisStatus?.isFailed,
    currentAnalysis: analysisStatus?.currentAnalysis,
    failedAnalysis: analysisStatus?.failedAnalysis,
    loading,
    error,
    refreshAnalysisStatus: fetchAnalysisStatus,
    fetchUpdatedLogs,
    setFetchUpdatedLogs,
  };
}
