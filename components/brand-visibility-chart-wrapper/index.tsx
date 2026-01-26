"use client";

import React, { useState, useEffect, useCallback } from "react";
import { subDays, format } from "date-fns";
import BrandVisibilityChart, {
  TimeSeriesDataPoint,
} from "@/components/brand-visibility-chart";
import ModelSelectorModal from "@/components/model-selector-modal";
import { fetchData } from "@/utils/fetch";
import { models } from "@/constants/dashboard";

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isValidDate(date: Date | null | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

export interface BrandVisibilityChartWrapperProps {
  userId: string;
  brandId: string;
}

const BrandVisibilityChartWrapper: React.FC<
  BrandVisibilityChartWrapperProps
> = ({ userId, brandId }) => {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state - default to last 30 days
  const [startDate, setStartDate] = useState<Date | null>(
    subDays(new Date(), 30)
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Popover states
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [startMonth, setStartMonth] = useState<Date>(startDate || new Date());
  const [endMonth, setEndMonth] = useState<Date>(endDate || new Date());

  // Model selection state - default to all models
  const [selectedModels, setSelectedModels] = useState<string[]>([...models]);

  // Modal states
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Fetch time-series data
  const fetchTimeSeriesData = useCallback(async () => {
    if (!userId || !brandId) return;

    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        userId,
      });

      if (startDate) {
        params.append("startDate", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        params.append("endDate", format(endDate, "yyyy-MM-dd"));
      }
      if (selectedModels.length > 0) {
        params.append("models", selectedModels.join(","));
      }

      const url = `/api/brand/${brandId}/time-series?${params.toString()}`;
      const response = await fetchData(url);

      if (response.success && response.data) {
        setTimeSeriesData(response.data.timeSeries || []);
      } else {
        throw new Error("Failed to fetch time-series data");
      }
    } catch (err) {
      console.error("Error fetching time-series data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch chart data"
      );
      setTimeSeriesData([]);
    } finally {
      setLoading(false);
    }
  }, [userId, brandId, startDate, endDate, selectedModels]);

  // Fetch data when filters change
  useEffect(() => {
    fetchTimeSeriesData();
  }, [fetchTimeSeriesData]);

  const handleStartDateChange = (date: Date | undefined) => {
    if (date && isValidDate(date)) {
      setStartDate(date);
      setStartMonth(date);
      // If end date is before start date, clear end date
      if (endDate && date > endDate) {
        setEndDate(null);
      }
    } else if (!date) {
      setStartDate(null);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date && isValidDate(date)) {
      // Ensure end date is not before start date
      if (startDate && date < startDate) {
        return;
      }
      setEndDate(date);
      setEndMonth(date);
    } else if (!date) {
      setEndDate(null);
    }
  };

  const handleModelsChange = (models: string[]) => {
    setSelectedModels(models);
    setModelSelectorOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <BrandVisibilityChart
        data={timeSeriesData}
        dateRange={{ start: startDate, end: endDate }}
        selectedModels={selectedModels}
        onModelsClick={() => setModelSelectorOpen(true)}
        loading={loading}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        startOpen={startOpen}
        endOpen={endOpen}
        onStartOpenChange={setStartOpen}
        onEndOpenChange={setEndOpen}
        startMonth={startMonth}
        endMonth={endMonth}
        onStartMonthChange={setStartMonth}
        onEndMonthChange={setEndMonth}
        formatDate={formatDate}
        isValidDate={isValidDate}
        disabled={loading}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal
        open={modelSelectorOpen}
        onOpenChange={setModelSelectorOpen}
        selectedModels={selectedModels}
        onSelectionChange={handleModelsChange}
      />

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
};

export default BrandVisibilityChartWrapper;
