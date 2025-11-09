"use client";

import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Clock,
} from "lucide-react";
import { BrandMatrixSummary } from "@/app/api/(brand)/brand/matrix-summary/route";

interface BrandMatrixSummaryProps {
  matrixData: BrandMatrixSummary;
  compact?: boolean;
}

export default function BrandMatrixSummaryComponent({
  matrixData,
  compact = false,
}: BrandMatrixSummaryProps) {
  if (!matrixData.hasData) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No analysis data available</p>
        <p className="text-xs">Run an analysis to see metrics</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80)
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (score >= 60)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (score >= 40)
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Key Metrics Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div
                className={`text-lg font-bold ${getScoreColor(
                  matrixData.avgWeightedScore
                )}`}
              >
                {matrixData.avgWeightedScore}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Avg Score
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {matrixData.totalAnalyses}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Analyses
              </div>
            </div>
          </div>
          <Badge className={getScoreBadgeColor(matrixData.successRate)}>
            {matrixData.successRate}% Success
          </Badge>
        </div>

        {/* Best Performance */}
        {matrixData.bestPerforming && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Best:</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {matrixData.bestPerforming.model}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {matrixData.bestPerforming.stage}
              </Badge>
              <span
                className={`font-medium ${getScoreColor(
                  matrixData.bestPerforming.score
                )}`}
              >
                {matrixData.bestPerforming.score}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with main metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${getScoreColor(
              matrixData.avgWeightedScore
            )}`}
          >
            {matrixData.avgWeightedScore}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {matrixData.totalAnalyses}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Analyses
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {matrixData.totalPrompts}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Prompts
          </div>
        </div>
      </div>

      {/* Performance indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {matrixData.successRate}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Success Rate
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(matrixData.avgResponseTime / 1000)}s
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Avg Response
            </div>
          </div>
        </div>
      </div>

      {/* Best and Worst Performance */}
      <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {matrixData.bestPerforming && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Best:
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {matrixData.bestPerforming.model}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {matrixData.bestPerforming.stage}
              </Badge>
              <span
                className={`font-medium ${getScoreColor(
                  matrixData.bestPerforming.score
                )}`}
              >
                {matrixData.bestPerforming.score}%
              </span>
            </div>
          </div>
        )}

        {matrixData.worstPerforming && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Worst:
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {matrixData.worstPerforming.model}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {matrixData.worstPerforming.stage}
              </Badge>
              <span
                className={`font-medium ${getScoreColor(
                  matrixData.worstPerforming.score
                )}`}
              >
                {matrixData.worstPerforming.score}%
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
          Last updated: {formatDate(matrixData.lastAnalysisDate)}
        </div>
      </div>
    </div>
  );
}
