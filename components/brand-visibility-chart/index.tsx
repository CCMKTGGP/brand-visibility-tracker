"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Filter, CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import Loading from "@/components/loading";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface TimeSeriesDataPoint {
  date: string;
  ChatGPT?: number;
  Claude?: number;
  Gemini?: number;
  Perplexity?: number;
}

export interface BrandVisibilityChartProps {
  data: TimeSeriesDataPoint[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  selectedModels: string[];
  onModelsClick?: () => void;
  loading?: boolean;
  // Date picker props
  startDate?: Date | null;
  endDate?: Date | null;
  onStartDateChange?: (date: Date | undefined) => void;
  onEndDateChange?: (date: Date | undefined) => void;
  startOpen?: boolean;
  endOpen?: boolean;
  onStartOpenChange?: (open: boolean) => void;
  onEndOpenChange?: (open: boolean) => void;
  startMonth?: Date;
  endMonth?: Date;
  onStartMonthChange?: (date: Date) => void;
  onEndMonthChange?: (date: Date) => void;
  formatDate?: (date: Date | null | undefined) => string;
  isValidDate?: (date: Date | null | undefined) => boolean;
  disabled?: boolean;
}

// Color palette for LLM lines
const MODEL_COLORS: Record<string, { border: string; background: string }> = {
  ChatGPT: {
    border: "rgb(16, 185, 129)", // green-500
    background: "rgba(16, 185, 129, 0.1)",
  },
  Claude: {
    border: "rgb(59, 130, 246)", // blue-500
    background: "rgba(59, 130, 246, 0.1)",
  },
  Gemini: {
    border: "rgb(168, 85, 247)", // purple-500
    background: "rgba(168, 85, 247, 0.1)",
  },
  Perplexity: {
    border: "rgb(245, 158, 11)", // amber-500
    background: "rgba(245, 158, 11, 0.1)",
  },
};

const BrandVisibilityChart: React.FC<BrandVisibilityChartProps> = ({
  data,
  selectedModels,
  onModelsClick,
  loading = false,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startOpen,
  endOpen,
  onStartOpenChange,
  onEndOpenChange,
  startMonth,
  endMonth,
  onStartMonthChange,
  onEndMonthChange,
  formatDate,
  isValidDate,
  disabled = false,
}) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Sort data by date
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const labels = sortedData.map((point) =>
      format(new Date(point.date), "MMM dd, yyyy")
    );

    // Create datasets for each selected model
    const datasets = selectedModels
      .filter((model) => {
        // Check if model has any data points
        return sortedData.some(
          (point) => point[model as keyof TimeSeriesDataPoint] !== undefined
        );
      })
      .map((model) => {
        const color = MODEL_COLORS[model] || {
          border: "rgb(107, 114, 128)",
          background: "rgba(107, 114, 128, 0.1)",
        };

        return {
          label: model,
          data: sortedData.map((point) => {
            const value = point[model as keyof TimeSeriesDataPoint] as
              | number
              | undefined;
            return value !== undefined ? value : null;
          }),
          borderColor: color.border,
          backgroundColor: color.background,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: color.border,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          fill: true,
          tension: 0.4, // Smooth curves
          spanGaps: false, // Don't connect across null values
        };
      });

    return {
      labels,
      datasets,
    };
  }, [data, selectedModels]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
            color: "rgb(107, 114, 128)",
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          titleFont: {
            size: 14,
            weight: "bold" as const,
          },
          bodyFont: {
            size: 13,
          },
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          callbacks: {
            label: function (context: any) {
              const label = context.dataset.label || "";
              const value = context.parsed.y;
              if (value === null) return `${label}: No data`;
              return `${label}: ${value.toFixed(2)}%`;
            },
          },
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: 11,
            },
            color: "rgb(107, 114, 128)",
          },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
          ticks: {
            font: {
              size: 11,
            },
            color: "rgb(107, 114, 128)",
            callback: function (value: any) {
              return `${value}%`;
            },
          },
        },
      },
    }),
    []
  );

  // Default formatDate and isValidDate functions
  const defaultFormatDate = (date: Date | null | undefined) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const defaultIsValidDate = (date: Date | null | undefined) => {
    if (!date) return false;
    return !isNaN(date.getTime());
  };

  const formatDateFn = formatDate || defaultFormatDate;
  const isValidDateFn = isValidDate || defaultIsValidDate;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const statsByModel: Record<
      string,
      { avg: number; min: number; max: number; count: number }
    > = {};

    selectedModels.forEach((model) => {
      const values = data
        .map(
          (point) =>
            point[model as keyof TimeSeriesDataPoint] as number | undefined
        )
        .filter((v): v is number => v !== undefined);

      if (values.length > 0) {
        statsByModel[model] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
        };
      }
    });

    return statsByModel;
  }, [data, selectedModels]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Visibility Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <Loading message="Loading chart data..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Brand Visibility Trends</CardTitle>
            <div className="ml-auto flex items-end gap-4">
              {/* Date Pickers */}
              {onStartDateChange && onEndDateChange && (
                <div className="flex flex-wrap items-end gap-4">
                  {/* Start Date */}
                  <div className="flex-1 min-w-[140px]">
                    <label
                      htmlFor="startDate"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Start Date
                    </label>
                    <div className="relative">
                      <Input
                        id="startDate"
                        autoComplete="off"
                        value={formatDateFn(startDate)}
                        placeholder="02/01/2025"
                        className="bg-background pr-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={disabled}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) {
                            onStartDateChange(undefined);
                            return;
                          }
                          const date = new Date(value);
                          if (isValidDateFn(date)) {
                            onStartDateChange(date);
                            if (onStartMonthChange) {
                              onStartMonthChange(date);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown" && onStartOpenChange) {
                            e.preventDefault();
                            onStartOpenChange(true);
                          }
                        }}
                      />
                      {startOpen !== undefined && onStartOpenChange && (
                        <Popover
                          open={startOpen}
                          onOpenChange={onStartOpenChange}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                              disabled={disabled}
                            >
                              <CalendarIcon className="size-3.5" />
                              <span className="sr-only">Select date</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="end"
                            alignOffset={-8}
                            sideOffset={10}
                          >
                            <Calendar
                              mode="single"
                              selected={startDate || undefined}
                              captionLayout="dropdown"
                              month={startMonth}
                              disabled={(date) => date > new Date()}
                              onMonthChange={(date) => {
                                if (onStartMonthChange) {
                                  onStartMonthChange(date);
                                }
                              }}
                              onSelect={(date) => {
                                onStartDateChange(date);
                                onStartOpenChange(false);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="flex-1 min-w-[140px]">
                    <label
                      htmlFor="endDate"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      End Date
                    </label>
                    <div className="relative">
                      <Input
                        id="endDate"
                        autoComplete="off"
                        value={formatDateFn(endDate)}
                        disabled={disabled || !startDate}
                        placeholder="02/01/2025"
                        className="bg-background pr-10 w-full"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) {
                            onEndDateChange(undefined);
                            return;
                          }
                          const date = new Date(value);
                          if (isValidDateFn(date)) {
                            if (startDate && date < startDate) {
                              return;
                            }
                            onEndDateChange(date);
                            if (onEndMonthChange) {
                              onEndMonthChange(date);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown" && onEndOpenChange) {
                            e.preventDefault();
                            onEndOpenChange(true);
                          }
                        }}
                      />
                      {endOpen !== undefined && onEndOpenChange && (
                        <Popover open={endOpen} onOpenChange={onEndOpenChange}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                              disabled={disabled || !startDate}
                            >
                              <CalendarIcon className="size-3.5" />
                              <span className="sr-only">Select date</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="end"
                            alignOffset={-8}
                            sideOffset={10}
                          >
                            <Calendar
                              mode="single"
                              selected={endDate || undefined}
                              disabled={(date) => {
                                if (startDate) {
                                  return date < startDate || date > new Date();
                                }
                                return date > new Date();
                              }}
                              captionLayout="dropdown"
                              month={endMonth}
                              onMonthChange={(date) => {
                                if (onEndMonthChange) {
                                  onEndMonthChange(date);
                                }
                              }}
                              onSelect={(date) => {
                                onEndDateChange(date);
                                onEndOpenChange(false);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {onModelsClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onModelsClick}
                  className="gap-2 h-9"
                  disabled={disabled}
                >
                  <Filter className="h-4 w-4" />
                  Models ({selectedModels.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.datasets.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No data available</p>
              <p className="text-sm">
                {selectedModels.length === 0
                  ? "Please select at least one LLM model to display"
                  : "No data points found for the selected models and date range"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Statistics Summary */}
            {stats && Object.keys(stats).length > 0 && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(stats).map(([model, stat]) => (
                  <div
                    key={model}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {model}
                      </span>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor:
                            MODEL_COLORS[model]?.border || "currentColor",
                          color: MODEL_COLORS[model]?.border || "currentColor",
                        }}
                      >
                        {stat.count} points
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.avg.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Range: {stat.min.toFixed(1)}% - {stat.max.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chart */}
            <div className="h-[400px]">
              <Line data={chartData} options={chartOptions} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BrandVisibilityChart;
