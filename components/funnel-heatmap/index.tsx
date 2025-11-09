"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Target,
  Activity,
  BarChart3,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeatmapData {
  stages: string[];
  models: string[];
  matrix: Array<{
    stage: string;
    model: string;
    score: number;
    weightedScore: number;
    analyses: number;
    performance_level: "excellent" | "good" | "fair" | "poor";
    trend: "up" | "down" | "neutral";
    confidence: number;
  }>;
  summary: {
    best_combination: { stage: string; model: string; score: number };
    worst_combination: { stage: string; model: string; score: number };
    avg_score_by_stage: Record<string, number>;
    avg_score_by_model: Record<string, number>;
  };
}

interface FunnelHeatmapProps {
  data: HeatmapData;
  title?: string;
  showSummary?: boolean;
}

const FunnelHeatmap: React.FC<FunnelHeatmapProps> = ({
  data,
  title = "Stage vs Model Performance Matrix",
  showSummary = true,
}) => {
  const [selectedCell, setSelectedCell] = useState<{
    stage: string;
    model: string;
  } | null>(null);

  // Helper functions
  const getScoreColor = (score: number, performanceLevel: string) => {
    switch (performanceLevel) {
      case "excellent":
        return "bg-green-500 text-white";
      case "good":
        return "bg-green-400 text-white";
      case "fair":
        return "bg-yellow-400 text-gray-900";
      case "poor":
        return "bg-red-400 text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  const getScoreBorderColor = (score: number, performanceLevel: string) => {
    switch (performanceLevel) {
      case "excellent":
        return "border-green-600";
      case "good":
        return "border-green-500";
      case "fair":
        return "border-yellow-500";
      case "poor":
        return "border-red-500";
      default:
        return "border-gray-400";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-red-600" />;
      default:
        return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStageLabel = (stage: string) => {
    const labels = {
      TOFU: "Top of Funnel",
      MOFU: "Middle of Funnel",
      BOFU: "Bottom of Funnel",
      EVFU: "Extended Value Funnel",
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  const getCellData = (stage: string, model: string) => {
    return data.matrix.find(
      (item) => item.stage === stage && item.model === model
    );
  };

  const getPerformanceLevelDescription = (level: string) => {
    switch (level) {
      case "excellent":
        return "Outstanding performance (80%+)";
      case "good":
        return "Good performance (60-79%)";
      case "fair":
        return "Fair performance (40-59%)";
      case "poor":
        return "Needs improvement (<40%)";
      default:
        return "No data available";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Scores showing brand performance across AI models and funnel stages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  This heatmap shows weighted performance scores for each AI
                  model across different funnel stages. Darker colors indicate
                  better performance.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header Row */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="text-center font-medium text-gray-700 dark:text-gray-300 text-sm">
              Stage / Model
            </div>
            {data.models.map((model) => (
              <div
                key={model}
                className="text-center font-medium text-gray-700 dark:text-gray-300 text-sm p-2"
              >
                <div className="flex items-center justify-center space-x-1">
                  <Activity className="w-4 h-4" />
                  <span>{model}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Avg: {data.summary.avg_score_by_model[model] || 0}%
                </div>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {data.stages.map((stage) => (
            <div key={stage} className="grid grid-cols-4 gap-2 mb-2">
              {/* Stage Label */}
              <div className="flex flex-col justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {stage}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {getStageLabel(stage)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Avg: {data.summary.avg_score_by_stage[stage] || 0}%
                </div>
              </div>

              {/* Model Cells */}
              {data.models.map((model) => {
                const cellData = getCellData(stage, model);
                if (!cellData) {
                  return (
                    <div
                      key={`${stage}-${model}`}
                      className="p-3 bg-gray-100 dark:bg-gray-600 rounded-lg border-2 border-gray-300 dark:border-gray-500"
                    >
                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                        No Data
                      </div>
                    </div>
                  );
                }

                const isSelected =
                  selectedCell?.stage === stage &&
                  selectedCell?.model === model;

                return (
                  <TooltipProvider key={`${stage}-${model}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${getScoreColor(
                            cellData.weightedScore,
                            cellData.performance_level
                          )} ${getScoreBorderColor(
                            cellData.weightedScore,
                            cellData.performance_level
                          )} ${
                            isSelected
                              ? "ring-2 ring-blue-500 ring-offset-2"
                              : ""
                          }`}
                          onClick={() => setSelectedCell({ stage, model })}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-lg font-bold">
                              {cellData.weightedScore}%
                            </span>
                            {getTrendIcon(cellData.trend)}
                          </div>
                          <div className="text-xs opacity-90">
                            Raw: {cellData.score}%
                          </div>
                          <div className="text-xs opacity-75 mt-1">
                            {cellData.analyses} analyses
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <div className="font-medium">
                            {model} - {stage}
                          </div>
                          <div>Average Score: {cellData.score}%</div>
                          <div>Confidence: {cellData.confidence}%</div>
                          <div>Analyses: {cellData.analyses}</div>
                          <div>
                            Level:{" "}
                            {getPerformanceLevelDescription(
                              cellData.performance_level
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Performance Levels
            </h4>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Excellent (80%+)
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Good (60-79%)
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Fair (40-59%)
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-red-400 rounded"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Poor (&lt;40%)
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Click cells for details • Hover for tooltips
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {showSummary && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best Combination */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Best Performing Combination
                </h4>
              </div>
              <div className="text-lg font-bold text-green-900 dark:text-green-100">
                {data.summary.best_combination.model} -{" "}
                {data.summary.best_combination.stage}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                {data.summary.best_combination.score}% average score
              </div>
            </div>

            {/* Worst Combination */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Needs Improvement
                </h4>
              </div>
              <div className="text-lg font-bold text-red-900 dark:text-red-100">
                {data.summary.worst_combination.model} -{" "}
                {data.summary.worst_combination.stage}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                {data.summary.worst_combination.score}% average score
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Cell Details */}
      {selectedCell && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
              Selected: {selectedCell.model} - {selectedCell.stage}
            </h4>
            {(() => {
              const cellData = getCellData(
                selectedCell.stage,
                selectedCell.model
              );
              if (!cellData) return <div>No data available</div>;

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      Overall Score
                    </div>
                    <div className="text-blue-900 dark:text-blue-100 text-lg font-bold">
                      {cellData.weightedScore}%
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      Raw Score
                    </div>
                    <div className="text-blue-900 dark:text-blue-100 text-lg font-bold">
                      {cellData.score}%
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      Confidence
                    </div>
                    <div className="text-blue-900 dark:text-blue-100 text-lg font-bold">
                      {cellData.confidence}%
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      Analyses
                    </div>
                    <div className="text-blue-900 dark:text-blue-100 text-lg font-bold">
                      {cellData.analyses}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FunnelHeatmap;
