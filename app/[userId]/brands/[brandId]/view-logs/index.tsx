"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Play,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogsResponse } from "@/types/brand";
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
import AnalysisStartedModal from "@/components/analysis-started-modal";
import { AnalysisModelSelector } from "@/components/analysis-model-selector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAnalysisStatus } from "@/hooks/use-analysis-status";
import { Badge } from "@/components/ui/badge";

export default function ViewLogs({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const { user } = useUserContext();
  const {
    isRunning,
    currentAnalysis,
    refreshAnalysisStatus,
    fetchUpdatedLogs,
    setFetchUpdatedLogs,
  } = useAnalysisStatus({
    brandId,
    userId,
    refreshInterval: 20000,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10); // setLimit removed as not currently used
  const [sortBy, setSortBy] = useState("createdAt");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(
    new Set()
  );
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAnalysisSelectorModal, setShowAnalysisSelectorModal] =
    useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset to first page when search changes
      if (searchTerm !== debouncedSearchTerm) {
        setCurrentPage(1);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    // If search is cleared, immediately update debounced term
    if (value === "") {
      setDebouncedSearchTerm("");
      setCurrentPage(1);
    }
  }, []);

  // Helper function to toggle row expansion
  const toggleRowExpansion = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  // Helper function to toggle response expansion
  const toggleResponseExpansion = (responseId: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedResponses(newExpanded);
  };

  // Helper function to parse markdown text
  const parseMarkdown = (text: string) => {
    // Parse bold text (**text**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold part
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add the bold part
      parts.push({
        type: "bold",
        content: match[1],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: "text", content: text }];
  };

  // Helper function to render parsed markdown
  const renderMarkdownText = (text: string, key: string) => {
    const parts = parseMarkdown(text);

    return (
      <span key={key}>
        {parts.map((part, index) => {
          if (part.type === "bold") {
            return (
              <strong
                key={index}
                className="font-semibold text-gray-900 dark:text-white"
              >
                {part.content}
              </strong>
            );
          }
          return <span key={index}>{part.content}</span>;
        })}
      </span>
    );
  };

  const fetchLogsData = useCallback(async () => {
    if (!userId || !brandId || !user._id) return;

    try {
      setError("");

      const params = new URLSearchParams({
        userId: user._id,
        page: currentPage.toString(),
        limit: limit.toString(),
        model: selectedModel,
        stage: selectedStage,
        status: selectedStatus,
        search: debouncedSearchTerm,
        sortBy: sortBy,
        sortOrder: "desc",
      });

      const url = `/api/brand/${brandId}/logs?${params.toString()}`;
      const response = await fetchData(url);
      const { data } = response;
      setLogsData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch logs data"
      );
      console.error("Logs fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    brandId,
    user._id,
    selectedModel,
    selectedStage,
    selectedStatus,
    debouncedSearchTerm,
    currentPage,
    limit,
    sortBy,
  ]);

  // Fetch logs data
  useEffect(() => {
    setLoading(true);
    fetchLogsData();
  }, [fetchLogsData]);

  // use effect to fetch updated logs
  useEffect(() => {
    if (fetchUpdatedLogs) {
      fetchLogsData();
      setFetchUpdatedLogs(false);
    }
  }, [fetchUpdatedLogs, fetchLogsData]);

  // Open analysis model selector modal
  const triggerAnalysis = () => {
    setShowAnalysisSelectorModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loading message="Loading logs..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-medium">
            Error Loading Logs
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
    );
  }

  // Use real logs data or empty array
  const logs = logsData?.logs || [];
  const pagination = logsData?.pagination;

  // Pagination helpers
  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = pagination?.hasMore || false;
  const hasPreviousPage = pagination?.hasPrevious || false;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
      case "error":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const filteredLogs = logs.filter((log) => {
    if (
      debouncedSearchTerm &&
      !log.promptResults.some((prompt: any) =>
        prompt.promptText
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase())
      )
    ) {
      return false;
    }
    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Activity Logs
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor all AI interactions and responses for Brand {brandId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={triggerAnalysis}
            disabled={isRunning}
            className={`flex items-center gap-2 ${
              isRunning
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isRunning ? (
              <>
                <Clock className="w-4 h-4 animate-pulse" />
                Analysis Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Trigger Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Running Analysis Status */}
      {isRunning && currentAnalysis && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Analysis in Progress
                </h4>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                >
                  Running
                </Badge>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                {currentAnalysis?.progress?.current_task ||
                  "Processing analysis..."}
              </p>
              {currentAnalysis.progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                    <span>Progress</span>
                    <span>
                      {currentAnalysis.progress.completed_tasks} /{" "}
                      {currentAnalysis.progress.total_tasks}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (currentAnalysis.progress.completed_tasks /
                            currentAnalysis.progress.total_tasks) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center flex-wrap gap-1 mt-2">
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Models:
                </span>
                {currentAnalysis.models.map((model) => (
                  <Badge
                    key={model}
                    variant="outline"
                    className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300"
                  >
                    {model}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4 w-full">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center space-x-4 w-full">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Prompts
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search prompts..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className={`pl-10 ${
                    searchTerm !== debouncedSearchTerm
                      ? "border-blue-300 dark:border-blue-600"
                      : ""
                  }`}
                />
                {searchTerm !== debouncedSearchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
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
                Status
              </label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
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

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pagination
                ? `${pagination.total} total entries • Page ${pagination.page} of ${totalPages}`
                : `${filteredLogs.length} entries found`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    <button
                      className="flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => setSortBy("createdAt")}
                    >
                      Timestamp
                      {sortBy === "createdAt" && (
                        <span className="ml-1">↓</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Model
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Stage
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    <button
                      className="flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => setSortBy("overallScore")}
                    >
                      Overall Score
                      {sortBy === "overallScore" && (
                        <span className="ml-1">↓</span>
                      )}
                    </button>
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    <button
                      className="flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => setSortBy("weightedScore")}
                    >
                      Weighted Score
                      {sortBy === "weightedScore" && (
                        <span className="ml-1">↓</span>
                      )}
                    </button>
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    <button
                      className="flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => setSortBy("successRate")}
                    >
                      Success Rate
                      {sortBy === "successRate" && (
                        <span className="ml-1">↓</span>
                      )}
                    </button>
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        index % 2 === 0
                          ? "bg-gray-50/50 dark:bg-gray-800/50"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 mr-2" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {log.model}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {log.stage}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`font-semibold ${getScoreColor(
                            log.score
                          )}`}
                        >
                          {Math.round(log.score)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {(log as any).weightedScore !== undefined ? (
                          <span
                            className={`font-semibold ${getScoreColor(
                              (log as any).weightedScore
                            )}`}
                          >
                            {Math.round((log as any).weightedScore)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {Math.round(log.successRate)}%
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round(log.responseTime / 1000)}s
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              log.status
                            )}`}
                          >
                            {getStatusIcon(log.status)}
                            <span className="ml-1 capitalize">
                              {log.status}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {(log as any).promptResults &&
                          (log as any).promptResults.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(log.id)}
                              className="h-8 w-8 p-0"
                            >
                              {expandedRows.has(log.id) ? "−" : "+"}
                            </Button>
                          )}
                      </td>
                    </tr>

                    {/* Expanded row showing prompt details */}
                    {expandedRows.has(log.id) && (log as any).promptResults && (
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <td colSpan={9} className="py-4 px-4">
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                              Individual Prompt Results (
                              {(log as any).promptResults.length} prompts)
                            </h4>
                            <div className="grid gap-3 max-h-96 overflow-y-auto">
                              {(log as any).promptResults.map(
                                (prompt: any, promptIndex: number) => {
                                  return (
                                    <div
                                      key={`${prompt.promptId}-${promptIndex}`}
                                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                              {prompt.promptId}
                                            </span>
                                            <span
                                              className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                                prompt.status
                                              )}`}
                                            >
                                              {prompt.status}
                                            </span>
                                            {prompt.mentionPosition > 0 && (
                                              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                                                Mentioned at position{" "}
                                                {prompt.mentionPosition}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {prompt.promptText}
                                          </p>
                                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border relative">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                  LLM Response
                                                </span>
                                                {!expandedResponses.has(
                                                  `response-${prompt.promptId}-${promptIndex}`
                                                ) && (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                                    <svg
                                                      className="w-3 h-3 mr-1"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                      />
                                                    </svg>
                                                    Truncated
                                                  </span>
                                                )}
                                              </div>
                                              <button
                                                onClick={() => {
                                                  const responseId = `response-${prompt.promptId}-${promptIndex}`;
                                                  toggleResponseExpansion(
                                                    responseId
                                                  );
                                                }}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                              >
                                                {expandedResponses.has(
                                                  `response-${prompt.promptId}-${promptIndex}`
                                                ) ? (
                                                  <>
                                                    <svg
                                                      className="w-4 h-4"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 15l7-7 7 7"
                                                      />
                                                    </svg>
                                                    <span>Show Less</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <svg
                                                      className="w-4 h-4"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                      />
                                                    </svg>
                                                    <span>
                                                      Show Full Response
                                                    </span>
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                            <div className="relative">
                                              <div
                                                id={`response-${prompt.promptId}-${promptIndex}`}
                                                className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed transition-all duration-300 ${
                                                  expandedResponses.has(
                                                    `response-${prompt.promptId}-${promptIndex}`
                                                  )
                                                    ? "max-h-none"
                                                    : "max-h-18 overflow-hidden"
                                                }`}
                                                style={{
                                                  maxHeight:
                                                    expandedResponses.has(
                                                      `response-${prompt.promptId}-${promptIndex}`
                                                    )
                                                      ? "none"
                                                      : "4.5rem",
                                                }}
                                              >
                                                {prompt.response
                                                  .split("\n")
                                                  .map(
                                                    (
                                                      line: string,
                                                      lineIndex: number,
                                                      allLines: string[]
                                                    ) => {
                                                      // Handle numbered lists (including standalone numbers and various formats)
                                                      const numberedMatch =
                                                        line.match(
                                                          /^(\d+)\.?\s*(.+)/
                                                        ) || // "1. Content" or "1 Content"
                                                        line.match(
                                                          /^(\d+)\s*$/
                                                        ) || // Standalone "1"
                                                        line.match(
                                                          /^\s*(\d+)\.?\s*(.+)/
                                                        ) || // "  1. Content" (with leading spaces)
                                                        (line
                                                          .trim()
                                                          .match(/^\d+$/) &&
                                                        lineIndex >= 0
                                                          ? [
                                                              line.trim(),
                                                              line.trim(),
                                                              "",
                                                            ]
                                                          : null);

                                                      // Check if this is a standalone number followed by content on next line
                                                      const isStandaloneNumber =
                                                        line
                                                          .trim()
                                                          .match(/^\d+$/);
                                                      if (
                                                        isStandaloneNumber &&
                                                        lineIndex <
                                                          allLines.length - 1
                                                      ) {
                                                        const nextLine =
                                                          allLines[
                                                            lineIndex + 1
                                                          ];
                                                        if (
                                                          nextLine &&
                                                          nextLine.trim()
                                                        ) {
                                                          return (
                                                            <div
                                                              key={lineIndex}
                                                              className="flex items-start gap-3 mb-3 mt-2"
                                                            >
                                                              <span className="flex-shrink-0 w-7 h-7 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold flex items-center justify-center">
                                                                {line.trim()}
                                                              </span>
                                                              <div className="flex-1 pt-0.5">
                                                                {renderMarkdownText(
                                                                  nextLine.trim(),
                                                                  `${lineIndex}-next`
                                                                )}
                                                              </div>
                                                            </div>
                                                          );
                                                        }
                                                      }

                                                      // Skip the next line if current line was a standalone number
                                                      const prevLine =
                                                        lineIndex > 0
                                                          ? allLines[
                                                              lineIndex - 1
                                                            ]
                                                          : "";
                                                      if (
                                                        prevLine
                                                          .trim()
                                                          .match(/^\d+$/) &&
                                                        line.trim()
                                                      ) {
                                                        return null; // Skip this line as it's already rendered with the number
                                                      }

                                                      if (
                                                        numberedMatch &&
                                                        !isStandaloneNumber
                                                      ) {
                                                        return (
                                                          <div
                                                            key={lineIndex}
                                                            className="flex items-start gap-3 mb-2"
                                                          >
                                                            <span className="flex-shrink-0 w-7 h-7 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold flex items-center justify-center">
                                                              {numberedMatch[1]}
                                                            </span>
                                                            <div className="flex-1 pt-0.5">
                                                              {renderMarkdownText(
                                                                numberedMatch[2] ||
                                                                  "",
                                                                `${lineIndex}-content`
                                                              )}
                                                            </div>
                                                          </div>
                                                        );
                                                      }

                                                      // Handle recommendation section
                                                      if (
                                                        line
                                                          .toLowerCase()
                                                          .includes(
                                                            "recommendation:"
                                                          )
                                                      ) {
                                                        const recommendationText =
                                                          line.replace(
                                                            /recommendation:\s*/i,
                                                            ""
                                                          );
                                                        return (
                                                          <div
                                                            key={lineIndex}
                                                            className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 rounded-r-lg"
                                                          >
                                                            <div className="flex items-start gap-3">
                                                              <span className="text-amber-600 dark:text-amber-400 font-medium text-sm mt-0.5">
                                                                💡
                                                              </span>
                                                              <div className="flex-1">
                                                                <div className="text-amber-700 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide mb-1">
                                                                  Recommendation
                                                                </div>
                                                                <div className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed">
                                                                  {renderMarkdownText(
                                                                    recommendationText,
                                                                    `${lineIndex}-rec`
                                                                  )}
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                      }

                                                      // Handle empty lines
                                                      if (line.trim() === "") {
                                                        return (
                                                          <div
                                                            key={lineIndex}
                                                            className="h-2"
                                                          />
                                                        );
                                                      }

                                                      // Regular text
                                                      return (
                                                        <div
                                                          key={lineIndex}
                                                          className="mb-1 leading-relaxed"
                                                        >
                                                          {renderMarkdownText(
                                                            line,
                                                            `${lineIndex}-text`
                                                          )}
                                                        </div>
                                                      );
                                                    }
                                                  )
                                                  .filter(Boolean)}
                                              </div>
                                              {/* Fade gradient overlay when truncated */}
                                              {!expandedResponses.has(
                                                `response-${prompt.promptId}-${promptIndex}`
                                              ) && (
                                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-50 dark:from-gray-800 to-transparent pointer-events-none"></div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right ml-4">
                                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            Score: {Math.round(prompt.score)}%
                                          </div>
                                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                            Weighted:{" "}
                                            {Math.round(prompt.weightedScore)}%
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No logs found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters to see more results.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
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
                        isActive={pageNumber === currentPage}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
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

      {/* Analysis Model Selector Modal */}
      <Dialog
        open={showAnalysisSelectorModal}
        onOpenChange={setShowAnalysisSelectorModal}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Analysis</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <AnalysisModelSelector
              brandId={brandId}
              onAnalysisStart={() => {
                setShowAnalysisSelectorModal(false);
                setShowAnalysisModal(true);
                setTimeout(() => {
                  setCurrentPage(1);
                }, 2000);
                refreshAnalysisStatus();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Analysis Started Modal */}
      <AnalysisStartedModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        brandId={brandId}
        userEmail={user?.email}
      />
    </div>
  );
}
