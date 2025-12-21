"use client";
import React, { useState, useEffect } from "react";
import moment from "moment";
import {
  Filter,
  Building2,
  BarChart3,
  Activity,
  Target,
  Play,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { DashboardBrand, DashboardResponse } from "@/types/brand";
import { useUserContext } from "@/context/userContext";
import { fetchData } from "@/utils/fetch";
import Loading from "@/components/loading";
import FunnelHeatmap from "@/components/funnel-heatmap";
import { models, periods, stages } from "@/constants/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AnalysisStartedModal from "@/components/analysis-started-modal";
import { AnalysisModelSelector } from "@/components/analysis-model-selector";
import { useAnalysisStatus } from "@/hooks/use-analysis-status";
import { isUserOwner, isUserViewer } from "@/utils/checkUserRole";
import CompetitorTreemap from "@/components/competitor-treemap";

const DashboardPage = ({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) => {
  const { user } = useUserContext();
  const { isRunning, currentAnalysis, refreshAnalysisStatus } =
    useAnalysisStatus({
      brandId,
      userId,
      refreshInterval: 20000,
    });

  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAnalysisSelectorModal, setShowAnalysisSelectorModal] =
    useState(false);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!userId || !brandId || !user._id) return;

      try {
        setLoading(true);
        setError("");

        const url = `/api/brand/${brandId}/dashboard?userId=${user._id}&period=${dateRange}&model=${selectedModel}&stage=${selectedStage}`;
        const response = await fetchData(url);
        const { data } = response;
        setDashboardData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch dashboard data"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [userId, brandId, user._id, dateRange, selectedModel, selectedStage]);

  // Loading state
  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loading message="Loading dashboard data..." />
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
              Error Loading Dashboard
            </h3>
            <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
            <Button
              variant="destructive"
              onClick={() => window.location.reload()}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-yellow-800 dark:text-yellow-200 font-medium">
              No Dashboard Data
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

  // Helper function to convert dashboard data to expected format
  const selectedBrand: DashboardBrand = {
    id: dashboardData.brand.id,
    name: dashboardData.brand.name,
    category: dashboardData.brand.category || "Not specified",
    region: dashboardData.brand.region || "Global",
    scores: dashboardData.scores,
    sentiment: dashboardData.sentiment,
    metrics: dashboardData.currentPeriodMetrics,
    weeklyData: dashboardData.weeklyData,
    modelPerformance: dashboardData.modelPerformance,
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

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
  }> = ({ title, value, subtitle, icon }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center">
        <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const FunnelChart: React.FC<{ scores: DashboardBrand["scores"] }> = ({
    scores,
  }) => {
    const stages = ["TOFU", "MOFU", "BOFU", "EVFU"] as const;
    const stageLabels = {
      TOFU: "Awareness",
      MOFU: "Consideration",
      BOFU: "Decision",
      EVFU: "Recommendation",
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Funnel Performance
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
            Scores
          </span>
        </div>
        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage} className="flex items-center">
              <div className="w-20 text-sm font-medium text-gray-600 dark:text-gray-400">
                <div>{stage}</div>
                <div className="text-xs text-gray-500">
                  {stageLabels[stage]}
                </div>
              </div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getScoreColor(
                      scores[stage]
                    )}`}
                    style={{ width: `${scores[stage]}%` }}
                  />
                </div>
              </div>
              <div
                className={`w-12 text-right text-sm font-semibold ${getScoreTextColor(
                  scores[stage]
                )}`}
              >
                {scores[stage]}%
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Based on multi-prompt analysis with position-based weighting
          </p>
        </div>
      </div>
    );
  };

  const SentimentAnalysis: React.FC<{
    sentiment: DashboardBrand["sentiment"];
  }> = ({ sentiment }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sentiment Analysis
        </h3>
      </div>

      <div className="space-y-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div
              className="bg-green-500"
              style={{ width: `${sentiment.distribution.stronglyPositive}%` }}
            />
            <div
              className="bg-green-400"
              style={{ width: `${sentiment.distribution.positive}%` }}
            />
            <div
              className="bg-gray-400"
              style={{ width: `${sentiment.distribution.neutral}%` }}
            />
            <div
              className="bg-red-400"
              style={{ width: `${sentiment.distribution.negative}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Strongly Positive: {sentiment.distribution.stronglyPositive}%
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Positive: {sentiment.distribution.positive}%
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Neutral: {sentiment.distribution.neutral}%
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Negative: {sentiment.distribution.negative}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const ModelPerformance: React.FC<{
    performance: DashboardBrand["modelPerformance"];
  }> = ({ performance }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        AI Model Performance
      </h3>
      <div className="space-y-4">
        {Object.entries(performance).map(
          ([model, data]: [string, { score: number; prompts: number }]) => (
            <div
              key={model}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {model}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {data.prompts} analyses
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-lg font-semibold ${getScoreTextColor(
                    data.score
                  )}`}
                >
                  {data.score}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Score
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );

  const WeeklyTrend: React.FC<{ data: DashboardBrand["weeklyData"] }> = ({
    data,
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Weekly Performance Trend
      </h3>
      <div className="space-y-4 w-full">
        <div className="flex items-center w-full">
          <div className="w-[70%]">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Score Trend
            </p>
          </div>
          <div className="w-[15%]">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Prompt
            </p>
          </div>
          <div className="w-[15%]">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Volume
            </p>
          </div>
        </div>
        {data.labels.map((label: string, index: number) => (
          <div key={label} className="flex items-center w-full">
            <div className="w-[70%]">
              <div className="flex items-center gap-1">
                <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {label}
                </div>
                <div className="flex-1 mx-4 flex items-center">
                  <div className="w-1/2 pr-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getScoreColor(
                          data.scores[index]
                        )}`}
                        style={{ width: `${data.scores[index]}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-1/2 pl-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${
                            (data.prompts[index] / Math.max(...data.prompts)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-[15%]">
              <p
                className={`text-sm ${getScoreTextColor(
                  data.scores[index]
                )} text-center`}
              >
                {data.scores[index]}%
              </p>
            </div>
            <div className="w-[15%]">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {data.prompts[index]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Brand Selector */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Brand Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Detailed analysis and performance metrics
            </p>
          </div>
        </div>
        {!isUserViewer(user) && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAnalysisSelectorModal(true)}
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
        )}
      </div>

      {/* Brand Info Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedBrand.name}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{selectedBrand.category}</span>
                <span>•</span>
                <span>{selectedBrand.region}</span>
                <span>•</span>
                <span>
                  Last updated:{" "}
                  <span className="font-medium text-foreground">
                    {moment(selectedBrand.metrics.lastUpdated).format("ll")}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            {isUserOwner(user) && (
              <Link
                href={`/${userId}/brands/${brandId}/edit-brand`}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Edit Brand
              </Link>
            )}
            <Link
              href={`/${userId}/brands/${brandId}/view-logs`}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
            >
              View Logs
            </Link>
          </div>
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
            </div>
          </div>
        </div>
      )}

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
                <SelectTrigger className="w-48">
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
                <SelectTrigger className="w-48">
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
                <SelectTrigger className="w-48">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Analyses"
          value={dashboardData.currentPeriodMetrics.totalAnalyses}
          subtitle={`${
            dashboardData.currentPeriodMetrics.totalPrompts || "N/A"
          } prompts processed`}
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        />
        {/* <MetricCard
          title="Weighted Score"
          value={`${Math.round(
            dashboardData.currentPeriodMetrics.avgWeightedScore || 0
          )}%`}
          subtitle="Position-weighted metric"
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          trend={{
            value: selectedBrand.sentiment.percentage,
            isPositive: selectedBrand.sentiment.trend === "up",
          }}
        /> */}
        <MetricCard
          title="Overall Score"
          value={`${Math.round(
            dashboardData.currentPeriodMetrics.avgOverallScore || 0
          )}%`}
          subtitle="Average score"
          icon={<Target className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Success Rate"
          value={`${dashboardData.currentPeriodMetrics.successRate}%`}
          subtitle="Average success rate"
          icon={<Activity className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Response Time"
          value={`${Math.round(
            dashboardData.currentPeriodMetrics.avgResponseTime / 1000
          )}s`}
          subtitle="Average processing time"
          icon={<Activity className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* Heatmap Section */}
      {dashboardData.heatmapData && (
        <div className="mb-6">
          <FunnelHeatmap
            data={dashboardData.heatmapData}
            title="Stage vs Model Performance Matrix"
            showSummary={true}
            brandDetails={{
              name: selectedBrand.name,
              category: selectedBrand.category,
              region: selectedBrand.region,
              target_audience: (dashboardData.brand as any).target_audience,
              competitors: (dashboardData.brand as any).competitors,
              use_case: (dashboardData.brand as any).use_case,
              feature_list: (dashboardData.brand as any).feature_list,
            }}
          />
        </div>
      )}

      {/* Competitor Analysis Section */}
      <div className="mb-6">
        <CompetitorTreemap
          brandId={brandId}
          userId={user._id}
          className="w-full"
          onTriggerAnalysis={() => setShowAnalysisSelectorModal(true)}
          isAnalysisRunning={isRunning}
        />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart scores={selectedBrand.scores} />
        <SentimentAnalysis sentiment={selectedBrand.sentiment} />
        <ModelPerformance performance={selectedBrand.modelPerformance} />
        <WeeklyTrend data={selectedBrand.weeklyData} />
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
};

export default DashboardPage;
