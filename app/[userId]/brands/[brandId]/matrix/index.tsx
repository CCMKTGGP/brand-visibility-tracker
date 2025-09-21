"use client";

import React, { useState, useEffect } from "react";
import {
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  Activity,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatrixResponse } from "@/types/brand";
import { useUserContext } from "@/context/userContext";
import { fetchData } from "@/utils/fetch";
import Loading from "@/components/loading";
import { models, periods, stages } from "@/constants/dashboard";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const MatrixPage = ({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) => {
  const { user } = useUserContext();

  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch matrix data
  useEffect(() => {
    async function fetchMatrixData() {
      if (!userId || !brandId || !user._id) return;

      try {
        setLoading(true);
        setError("");

        const url = `/api/brand/${brandId}/matrix?userId=${userId}&period=${dateRange}&model=${selectedModel}&stage=${selectedStage}&page=${page.toString()}&limit=${limit.toString()}`;
        const response = await fetchData(url);

        setMatrixData(response.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch matrix data"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchMatrixData();
  }, [
    userId,
    brandId,
    user._id,
    dateRange,
    selectedModel,
    selectedStage,
    page,
    limit,
  ]);

  // Loading state
  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loading message="Loading matrix data..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-red-800 dark:text-red-200 font-medium">
              Error Loading Matrix
            </h3>
            <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!matrixData || matrixData.data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-yellow-800 dark:text-yellow-200 font-medium">
              No Matrix Data
            </h3>
            <p className="text-yellow-600 dark:text-yellow-400 mt-2">
              No analysis data found for this brand. Try triggering an analysis
              first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Use real matrix data
  const matrixItems = matrixData.data;
  const pagination = matrixData.pagination;

  // Pagination helpers
  const totalPages = Math.ceil(
    (pagination?.total || 0) / (pagination?.limit || 10)
  );
  const hasNextPage = pagination?.hasMore || false;
  const hasPreviousPage = (pagination?.page || 1) > 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const currentPage = pagination?.page || 1;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxPagesToShow - 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-700 dark:text-green-400";
    if (score >= 60) return "text-yellow-700 dark:text-yellow-400";
    if (score >= 40) return "text-orange-700 dark:text-orange-400";
    return "text-red-700 dark:text-red-400";
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  // const filteredData = matrixItems.filter((item) => {
  //   if (selectedModel !== "all" && item.model.toLowerCase() !== selectedModel) {
  //     return false;
  //   }
  //   if (selectedStage !== "all" && item.stage !== selectedStage) {
  //     return false;
  //   }
  //   return true;
  // });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Matrix
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Multi-prompt analysis performance across AI models and funnel stages
          </p>
          <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Multi-Prompt Analysis:</strong> Each analysis runs 20
              custom prompts per model/stage with position-based weighted
              scoring. Higher weighted scores indicate better brand mention
              positioning in AI responses.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model
              </label>
              <Select
                value={selectedModel}
                onValueChange={(value) => setSelectedModel(value)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stage
              </label>
              <Select
                value={selectedStage}
                onValueChange={(value) => setSelectedStage(value)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period
              </label>
              <Select
                value={dateRange}
                onValueChange={(value) => setDateRange(value)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(({ label, value }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Matrix
            </h3>
            {pagination && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {pagination.total} total entries • Page {pagination.page} of{" "}
                {totalPages}
              </span>
            )}
          </div>

          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Model
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Stage
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Overall Score
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Weighted Score
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Analyses
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Total Prompts
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Success Rate
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrixItems.map((item, index) => (
                  <tr
                    key={`${item.model}-${item.stage}`}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      index % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/50" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.model}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {item.stage}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-2 ${getScoreColor(
                              item.score
                            )}`}
                          />
                          <span
                            className={`font-semibold ${getScoreTextColor(
                              item.score
                            )}`}
                          >
                            {item.score}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-2 ${getScoreColor(
                              (item as any).weightedScore || item.score
                            )}`}
                          />
                          <span
                            className={`font-semibold ${getScoreTextColor(
                              (item as any).weightedScore || item.score
                            )}`}
                          >
                            {Math.round(
                              (item as any).weightedScore || item.score
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="text-center">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {(item as any).analyses || "N/A"}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          multi-prompt runs
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {item.prompts}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {item.successRate}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div
                        className={`flex items-center justify-center space-x-1 ${getTrendColor(
                          item.trend
                        )}`}
                      >
                        {getTrendIcon(item.trend)}
                        <span className="text-sm font-medium">
                          {item.trendPercentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        handlePageChange((pagination?.page || 1) - 1)
                      }
                      className={
                        !hasPreviousPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {generatePageNumbers().map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={pageNumber === (pagination?.page || 1)}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  {totalPages > 5 &&
                    (pagination?.page || 1) < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        handlePageChange((pagination?.page || 1) + 1)
                      }
                      className={
                        !hasNextPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Performing
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {matrixData.summary?.bestPerforming
                  ? `${matrixData.summary.bestPerforming.model} - ${matrixData.summary.bestPerforming.stage}`
                  : "N/A"}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {matrixData.summary?.bestPerforming
                  ? `${Math.round(
                      matrixData.summary.bestPerforming.score
                    )}% Weighted Score`
                  : "No data"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Analyses
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {matrixData.summary?.totalAnalyses || 0}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Multi-prompt runs
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Prompts
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {(matrixData.summary as any)?.totalPrompts ||
                  matrixItems.reduce((sum, item) => sum + item.prompts, 0)}
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Across all analyses
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Weighted Score
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {(matrixData.summary as any)?.avgWeightedScore
                  ? `${Math.round(
                      (matrixData.summary as any).avgWeightedScore
                    )}%`
                  : `${Math.round(
                      matrixItems.reduce(
                        (sum, item) =>
                          sum + ((item as any).weightedScore || item.score),
                        0
                      ) / (matrixItems.length || 1)
                    )}%`}
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Position-weighted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixPage;
