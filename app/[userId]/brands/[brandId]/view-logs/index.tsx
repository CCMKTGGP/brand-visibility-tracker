"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  Play,
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
import { fetchData, postData } from "@/utils/fetch";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ViewLogs({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const router = useRouter();
  const { user } = useUserContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  // Fetch logs data
  useEffect(() => {
    async function fetchLogsData() {
      if (!userId || !brandId || !user._id) return;

      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          userId: user._id,
          page: currentPage.toString(),
          limit: limit.toString(),
          model: selectedModel,
          stage: selectedStage,
          status: selectedStatus,
          search: searchTerm,
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
    }

    fetchLogsData();
  }, [
    userId,
    brandId,
    user._id,
    selectedModel,
    selectedStage,
    selectedStatus,
    searchTerm,
    currentPage,
    limit,
    sortBy,
  ]);

  // Trigger new analysis
  const triggerAnalysis = async () => {
    if (!userId || !brandId || !user._id) return;

    try {
      setTriggeringAnalysis(true);

      const requestBody = {
        userId: user._id,
      };

      const response = await postData(
        `/api/brand/${brandId}/logs`,
        requestBody
      );

      // Refresh logs after successful analysis
      setTimeout(() => {
        setCurrentPage(1); // Reset to first page
        // This will trigger the useEffect to refresh data
      }, 2000);

      toast.success(
        "Analysis triggered successfully! Check back in a few moments."
      );
      router.refresh();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to trigger analysis";
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setTriggeringAnalysis(false);
    }
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
      searchTerm &&
      !log.prompt.toLowerCase().includes(searchTerm.toLowerCase())
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
            disabled={triggeringAnalysis}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <Play className="w-4 h-4" />
            {triggeringAnalysis ? "Analyzing..." : "Trigger Analysis"}
          </Button>
          <Button className="flex items-center gap-2" variant="outline">
            <Download className="w-4 h-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Prompts
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-input rounded-md bg-background text-foreground"
              />
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
                                          <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                                            {prompt.response}
                                          </p>
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

                  {generatePageNumbers().map((pageNumber, index) => (
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
    </div>
  );
}
