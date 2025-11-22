"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { TreemapController, TreemapElement } from "chartjs-chart-treemap";
import { Chart } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/loading";
import { fetchData } from "@/utils/fetch";
import { Button } from "../ui/button";
import { BarChart3, Play, TrendingUp } from "lucide-react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  TreemapController,
  TreemapElement
);

interface CompetitorData {
  name: string;
  normalized_name: string;
  confidence_score: number;
  source_domains: string[];
  mention_count: number;
}

interface DomainData {
  domain: string;
  authority_score: number;
  source_type: string;
  relevance: string;
  reasoning: string;
  citation_count: number;
}

interface TreemapData {
  competitors: CompetitorData[];
  domains: DomainData[];
  totalCompetitors: number;
  totalDomains: number;
  totalMentions: number;
  totalCitations: number;
  displayedCompetitors?: number;
  displayedDomains?: number;
}

interface CompetitorTreemapProps {
  brandId: string;
  userId: string;
  className?: string;
  onTriggerAnalysis?: () => void;
}

// Color scheme constants
const COLOR_RANGES = {
  POOR: { backgroundColor: "#D73027", borderColor: "#B91C1C", color: "white" },
  FAIR: { backgroundColor: "#FC8D59", borderColor: "#EA580C", color: "white" },
  FAIR_PLUS: {
    backgroundColor: "#FEE08B",
    borderColor: "#D97706",
    color: "black",
  },
  GOOD: { backgroundColor: "#D9EF8B", borderColor: "#65A30D", color: "black" },
  GOOD_PLUS: {
    backgroundColor: "#91CF60",
    borderColor: "#16A34A",
    color: "black",
  },
  EXCELLENT: {
    backgroundColor: "#1A9850",
    borderColor: "#166534",
    color: "white",
  },
  NO_DATA: {
    backgroundColor: "#E5E7EB",
    borderColor: "#9CA3AF",
    color: "#374151",
  },
} as const;

// Chart configuration constants
const CHART_CONFIG = {
  spacing: 2,
  borderWidth: 2,
  competitorFontSize: 14,
  domainFontSize: 12,
  fontWeight: "600" as const,
  height: 320,
  padding: 4,
  borderRadius: 4,
  maxCompetitors: 15,
  maxDomains: 25,
} as const;

const CompetitorTreemap: React.FC<CompetitorTreemapProps> = ({
  brandId,
  userId,
  className = "",
  onTriggerAnalysis,
}) => {
  const [data, setData] = useState<TreemapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeView, setActiveView] = useState<"competitors" | "domains">(
    "competitors"
  );

  // Fetch treemap data
  useEffect(() => {
    const fetchTreemapData = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchData(
          `/api/brand/${brandId}/treemap?userId=${userId}`
        );
        const { data } = response;

        // Optimized competitor grouping with memoized base name calculation
        const getBaseName = (normalizedName: string): string => {
          return normalizedName.replace(/-[a-z]+$/i, "").toLowerCase();
        };

        // Use Map for better performance than object
        const competitorMap = new Map<string, any>();

        data.competitors.forEach((competitor: any) => {
          const baseKey = getBaseName(competitor.normalized_name);

          if (!competitorMap.has(baseKey)) {
            competitorMap.set(baseKey, {
              ...competitor,
              name: competitor.name,
              normalized_name: baseKey,
              mention_count: 0,
              source_domains: new Set(competitor.source_domains || []),
              confidence_score: 0,
              _totalVariants: 0,
            });
          }

          const existing = competitorMap.get(baseKey)!;
          existing.mention_count += competitor.mention_count;
          existing.confidence_score += competitor.confidence_score ?? 0;
          existing._totalVariants += 1;

          // Use Set for efficient deduplication
          if (competitor.source_domains) {
            competitor.source_domains.forEach((domain: string) => {
              existing.source_domains.add(domain);
            });
          }
        });

        // Convert back to array format and finalize
        const allCompetitors = Array.from(competitorMap.values()).map(
          (comp) => ({
            ...comp,
            confidence_score: Math.round(
              comp.confidence_score / (comp._totalVariants || 1)
            ),
            source_domains: Array.from(comp.source_domains),
            _totalVariants: undefined, // Remove helper property
          })
        );

        // Sort competitors by mention count (descending) and limit to top 10
        data.competitors = allCompetitors
          .sort(
            (a: CompetitorData, b: CompetitorData) =>
              b.mention_count - a.mention_count
          )
          .slice(0, CHART_CONFIG.maxCompetitors);

        // Sort domains by citation count (descending) and limit to top 25
        if (data.domains && data.domains.length > 0) {
          data.domains = data.domains
            .sort(
              (a: DomainData, b: DomainData) =>
                b.citation_count - a.citation_count
            )
            .slice(0, CHART_CONFIG.maxDomains);
        }

        // Update totals to reflect original data before filtering
        data.totalCompetitors = allCompetitors.length;
        data.totalMentions = allCompetitors.reduce(
          (sum, comp) => sum + comp.mention_count,
          0
        );

        // Calculate filtered totals for display
        data.displayedCompetitors = data.competitors.length;
        data.displayedDomains = data.domains ? data.domains.length : 0;
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (brandId && userId) {
      fetchTreemapData();
    }
  }, [brandId, userId]);

  // Optimized color calculation functions
  const getScoreColorByMentions = useCallback(
    (mentionCount: number, maxMentions: number) => {
      const percentage =
        maxMentions > 0 ? (mentionCount / maxMentions) * 100 : 0;

      if (percentage <= 16) return COLOR_RANGES.POOR;
      if (percentage <= 33) return COLOR_RANGES.FAIR;
      if (percentage <= 50) return COLOR_RANGES.FAIR_PLUS;
      if (percentage <= 67) return COLOR_RANGES.GOOD;
      if (percentage <= 83) return COLOR_RANGES.GOOD_PLUS;
      if (percentage <= 100) return COLOR_RANGES.EXCELLENT;
      return COLOR_RANGES.NO_DATA;
    },
    []
  );

  const getScoreColorByAuthority = useCallback((authorityScore: number) => {
    if (authorityScore <= 16) return COLOR_RANGES.POOR;
    if (authorityScore <= 33) return COLOR_RANGES.FAIR;
    if (authorityScore <= 50) return COLOR_RANGES.FAIR_PLUS;
    if (authorityScore <= 67) return COLOR_RANGES.GOOD;
    if (authorityScore <= 83) return COLOR_RANGES.GOOD_PLUS;
    if (authorityScore <= 100) return COLOR_RANGES.EXCELLENT;
    return COLOR_RANGES.NO_DATA;
  }, []);

  // Memoized competitor chart data generation
  const competitorChartData = useMemo(() => {
    if (!data?.competitors || data.competitors.length === 0) return null;

    const maxMentions = Math.max(
      ...data.competitors.map((c) => c.mention_count)
    );
    const treeValues = data.competitors.map(
      (competitor) => competitor.mention_count
    );

    const competitorLookup = data.competitors.reduce(
      (acc, competitor, index) => {
        acc[index] = competitor;
        return acc;
      },
      {} as Record<number, (typeof data.competitors)[0]>
    );

    // Helper function to format competitor name for better display
    const formatCompetitorName = (name: string, mentionCount: number) => {
      // Truncate long names for better display
      const maxNameLength = 15;
      const displayName =
        name.length > maxNameLength
          ? `${name.substring(0, maxNameLength)}...`
          : name;
      return [displayName, `${mentionCount} mentions`];
    };

    return {
      datasets: [
        {
          label: "Competitors",
          tree: treeValues,
          spacing: CHART_CONFIG.spacing,
          borderWidth: CHART_CONFIG.borderWidth,
          borderRadius: CHART_CONFIG.borderRadius,
          borderColor: (ctx: any) => {
            const competitor = competitorLookup[ctx.dataIndex];
            const mentionCount = competitor?.mention_count || 0;
            return getScoreColorByMentions(mentionCount, maxMentions)
              .borderColor;
          },
          backgroundColor: (ctx: any) => {
            const competitor = competitorLookup[ctx.dataIndex];
            const mentionCount = competitor?.mention_count || 0;
            return getScoreColorByMentions(mentionCount, maxMentions)
              .backgroundColor;
          },
          hoverBackgroundColor: (ctx: any) => {
            const competitor = competitorLookup[ctx.dataIndex];
            const mentionCount = competitor?.mention_count || 0;
            return (
              getScoreColorByMentions(mentionCount, maxMentions)
                .backgroundColor + "DD"
            );
          },
          labels: {
            display: true,
            align: "center",
            position: "middle",
            color: (ctx: any) => {
              const competitor = competitorLookup[ctx.dataIndex];
              const mentionCount = competitor?.mention_count || 0;
              return getScoreColorByMentions(mentionCount, maxMentions).color;
            },
            formatter: (ctx: any) => {
              const competitor = competitorLookup[ctx.dataIndex];
              if (!competitor) return "";
              return formatCompetitorName(
                competitor.name,
                competitor.mention_count
              );
            },
            font: (ctx: any) => {
              // Dynamic font size based on tile area
              const tileArea = ctx.parsed._custom || 100;
              const dynamicSize = Math.max(
                10,
                Math.min(14, Math.floor(Math.sqrt(tileArea) / 12))
              );
              return {
                size: dynamicSize,
                weight: CHART_CONFIG.fontWeight,
                family: "'Inter', 'system-ui', sans-serif",
              };
            },
            padding: CHART_CONFIG.padding,
            textStrokeColor: (ctx: any) => {
              // Add subtle text stroke for better readability
              const competitor = competitorLookup[ctx.dataIndex];
              const mentionCount = competitor?.mention_count || 0;
              const colors = getScoreColorByMentions(mentionCount, maxMentions);
              return colors.color === "white"
                ? "rgba(0,0,0,0.3)"
                : "rgba(255,255,255,0.3)";
            },
            textStrokeWidth: 0.5,
          },
          _competitorLookup: competitorLookup,
        },
      ],
    } as any;
  }, [data?.competitors, getScoreColorByMentions]);

  // Memoized domain chart data generation
  const domainChartData = useMemo(() => {
    if (!data?.domains || data.domains.length === 0) return null;

    const treeValues = data.domains.map((domain) => domain.citation_count);
    const domainLookup = data.domains.reduce((acc, domain, index) => {
      acc[index] = domain;
      return acc;
    }, {} as Record<number, (typeof data.domains)[0]>);

    // Helper function to format domain name for better display
    const formatDomainName = (domain: string, citationCount: number) => {
      // Truncate long domain names for better display
      const maxDomainLength = 20;
      const displayDomain =
        domain.length > maxDomainLength
          ? `${domain.substring(0, maxDomainLength)}...`
          : domain;
      return [displayDomain, `${citationCount} citations`];
    };

    return {
      datasets: [
        {
          label: "Domains",
          tree: treeValues,
          spacing: CHART_CONFIG.spacing,
          borderWidth: CHART_CONFIG.borderWidth,
          borderRadius: CHART_CONFIG.borderRadius,
          borderColor: (ctx: any) => {
            const domain = domainLookup[ctx.dataIndex];
            const authority = domain?.authority_score || 0;
            return getScoreColorByAuthority(authority).borderColor;
          },
          backgroundColor: (ctx: any) => {
            const domain = domainLookup[ctx.dataIndex];
            const authority = domain?.authority_score || 0;
            return getScoreColorByAuthority(authority).backgroundColor;
          },
          hoverBackgroundColor: (ctx: any) => {
            const domain = domainLookup[ctx.dataIndex];
            const authority = domain?.authority_score || 0;
            return getScoreColorByAuthority(authority).backgroundColor + "DD";
          },
          labels: {
            display: true,
            align: "center",
            position: "middle",
            color: (ctx: any) => {
              const domain = domainLookup[ctx.dataIndex];
              const authority = domain?.authority_score || 0;
              return getScoreColorByAuthority(authority).color;
            },
            formatter: (ctx: any) => {
              const domain = domainLookup[ctx.dataIndex];
              if (!domain) return "";
              return formatDomainName(domain.domain, domain.citation_count);
            },
            font: (ctx: any) => {
              // Dynamic font size based on tile area
              const tileArea = ctx.parsed._custom || 100;
              const dynamicSize = Math.max(
                8,
                Math.min(
                  CHART_CONFIG.domainFontSize,
                  Math.floor(Math.sqrt(tileArea) / 14)
                )
              );
              return {
                size: dynamicSize,
                weight: CHART_CONFIG.fontWeight,
                family: "'Inter', 'system-ui', sans-serif",
              };
            },
            padding: CHART_CONFIG.padding,
            textStrokeColor: (ctx: any) => {
              // Add subtle text stroke for better readability
              const domain = domainLookup[ctx.dataIndex];
              const authority = domain?.authority_score || 0;
              const colors = getScoreColorByAuthority(authority);
              return colors.color === "white"
                ? "rgba(0,0,0,0.3)"
                : "rgba(255,255,255,0.3)";
            },
            textStrokeWidth: 0.5,
          },
          _domainLookup: domainLookup,
        },
      ],
    } as any;
  }, [data?.domains, getScoreColorByAuthority]);

  // Memoized chart options
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        },
      },
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (context: any) => {
              const dataIndex = context[0]?.dataIndex;
              if (activeView === "competitors") {
                const competitor =
                  competitorChartData?.datasets[0]._competitorLookup?.[
                    dataIndex
                  ];
                return competitor?.name || "";
              } else {
                const domain =
                  domainChartData?.datasets[0]._domainLookup?.[dataIndex];
                return domain?.domain || "";
              }
            },
            label: (context: any) => {
              const dataIndex = context.dataIndex;
              if (activeView === "competitors") {
                const competitor =
                  competitorChartData?.datasets[0]._competitorLookup?.[
                    dataIndex
                  ];
                if (!competitor) return [];
                return [
                  `Mentions: ${competitor.mention_count}`,
                  `Confidence: ${competitor.confidence_score}%`,
                  `Source Domains: ${competitor.source_domains.length}`,
                ];
              } else {
                const domain =
                  domainChartData?.datasets[0]._domainLookup?.[dataIndex];
                if (!domain) return [];
                return [
                  `Citations: ${domain.citation_count}`,
                  `Authority Score: ${domain.authority_score}%`,
                  `Type: ${domain.source_type}`,
                  `Relevance: ${domain.relevance}`,
                ];
              }
            },
          },
        },
      },
    }),
    [activeView, competitorChartData, domainChartData]
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Competitor Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <Loading message="Loading competitor data..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Competitor Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.competitors?.length && !data.domains?.length)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Competitor Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-center space-y-6">
            {/* Empty State Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* Empty State Content */}
            <div className="space-y-3 max-w-md">
              <h3 className="text-lg font-semibold text-foreground">
                No Competitor Data Available
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Start your first analysis to discover competitors and domains in
                your market. Our AI will analyze your brand across different
                funnel stages to identify key competitors and authoritative
                domains.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {onTriggerAnalysis && (
                <Button
                  onClick={onTriggerAnalysis}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Play className="w-4 h-4" />
                  Start Analysis
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.reload()}
              >
                Refresh Data
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✨ Analysis typically takes 5-10 minutes</p>
              <p>📊 Results include competitor mentions and domain authority</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentChartData =
    activeView === "competitors" ? competitorChartData : domainChartData;

  // Check if current view has no data
  const hasNoDataForCurrentView =
    activeView === "competitors"
      ? !data.competitors?.length
      : !data.domains?.length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Competitor Analysis</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeView === "competitors" ? "default" : "outline"}
              onClick={() => setActiveView("competitors")}
            >
              Competitors
            </Button>
            <Button
              variant={activeView === "domains" ? "default" : "outline"}
              onClick={() => setActiveView("domains")}
            >
              Domains
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {activeView === "competitors"
                ? `Top ${
                    data.displayedCompetitors || data.competitors?.length || 0
                  } of ${data.totalCompetitors} Competitors`
                : `${data.totalCompetitors} Competitors`}
            </Badge>
            <Badge variant="secondary">{data.totalMentions} Mentions</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {activeView === "domains"
                ? `Top ${
                    data.displayedDomains || data.domains?.length || 0
                  } of ${data.totalDomains} Domains`
                : `${data.totalDomains} Domains`}
            </Badge>
            <Badge variant="outline">{data.totalCitations} Citations</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height: CHART_CONFIG.height }}>
          {hasNoDataForCurrentView ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">
                  No {activeView === "competitors" ? "Competitors" : "Domains"}{" "}
                  Found
                </h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {activeView === "competitors"
                    ? "No competitor data available for this analysis. Try running a new analysis or switch to domains view."
                    : "No domain data available for this analysis. Try running a new analysis or switch to competitors view."}
                </p>
              </div>
              {onTriggerAnalysis && (
                <Button
                  onClick={onTriggerAnalysis}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Run New Analysis
                </Button>
              )}
            </div>
          ) : currentChartData ? (
            <Chart
              key={`treemap-${activeView}`}
              type="treemap"
              data={currentChartData}
              options={chartOptions}
            />
          ) : null}
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {activeView === "competitors"
              ? `Showing top ${CHART_CONFIG.maxCompetitors} competitors by mention count. Size represents mention frequency. Colors indicate mention count ranges (relative to highest).`
              : `Showing top ${CHART_CONFIG.maxDomains} domains by citation count. Size represents citation frequency. Colors indicate authority score ranges.`}
          </p>

          {/* Color Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries({
              "0-16%": {
                range: COLOR_RANGES.POOR,
                label: activeView === "competitors" ? "Low" : "Poor",
              },
              "17-33%": {
                range: COLOR_RANGES.FAIR,
                label: activeView === "competitors" ? "Fair" : "Fair",
              },
              "34-50%": {
                range: COLOR_RANGES.FAIR_PLUS,
                label: activeView === "competitors" ? "Moderate" : "Fair+",
              },
              "51-67%": {
                range: COLOR_RANGES.GOOD,
                label: activeView === "competitors" ? "Good" : "Good",
              },
              "68-83%": {
                range: COLOR_RANGES.GOOD_PLUS,
                label: activeView === "competitors" ? "High" : "Good+",
              },
              "84-100%": {
                range: COLOR_RANGES.EXCELLENT,
                label: activeView === "competitors" ? "Highest" : "Excellent",
              },
            }).map(([percentage, { range, label }]) => (
              <div key={percentage} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded border"
                  style={{
                    backgroundColor: range.backgroundColor,
                    borderColor: range.borderColor,
                  }}
                ></div>
                <span>
                  {percentage} {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompetitorTreemap;
