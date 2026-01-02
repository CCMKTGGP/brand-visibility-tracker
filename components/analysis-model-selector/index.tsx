"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bot, Zap, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { CreditBalance } from "@/components/credit-balance";
import { postData } from "@/utils/fetch";
import Loading from "../loading";
import { CreditStats } from "@/types";
import { useUserContext } from "@/context/userContext";

interface AnalysisEstimate {
  creditsRequired: number;
  currentBalance: number;
  canAfford: boolean;
  breakdown: Array<{
    model: string;
    credits: number;
    stages: string;
  }>;
  analysis: {
    models: number;
    stages: number;
    totalCombinations: number;
  };
  estimatedTime: string;
}

interface AnalysisModelSelectorProps {
  brandId: string;
  onAnalysisStart?: (data: any) => void;
  disabled?: boolean;
}

const AI_MODELS = [
  {
    id: "ChatGPT",
    name: "ChatGPT",
    description: "OpenAI's powerful language model",
    color: "bg-green-100 text-green-700",
  },
  {
    id: "Claude",
    name: "Claude",
    description: "Anthropic's advanced AI assistant",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "Gemini",
    name: "Gemini",
    description: "Google's multimodal AI model",
    color: "bg-blue-100 text-blue-700",
  },
];

export function AnalysisModelSelector({
  brandId,
  onAnalysisStart,
  disabled = false,
}: AnalysisModelSelectorProps) {
  const { user, setUser } = useUserContext();
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "ChatGPT",
    "Claude",
    "Gemini",
  ]);
  const [estimate, setEstimate] = useState<AnalysisEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = async () => {
    if (selectedModels.length === 0) {
      setEstimate(null);
      return;
    }

    try {
      setEstimating(true);
      const response = await postData("/api/analysis/estimate", {
        models: selectedModels,
        userId: user._id,
      });
      const { data } = response;
      setEstimate(data);
      setError(null);
    } catch (err) {
      console.log("Error getting estimate:", err);
      setError(err instanceof Error ? err.message : "Failed to get estimate");
      setEstimate(null);
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchEstimate();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [selectedModels]);

  const handleModelToggle = (modelId: string) => {
    if (disabled) return;

    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleStartAnalysis = async () => {
    if (!estimate || !estimate.canAfford) {
      toast.error("Insufficient credits for this analysis");
      return;
    }

    try {
      setLoading(true);
      const response = await postData(`/api/brand/${brandId}/logs`, {
        userId: user._id,
        models: selectedModels,
        stages: ["TOFU", "MOFU", "BOFU", "EVFU"], // Always all stages
      });

      const { data } = response;
      setUser({
        ...user,
        credits_balance: data.newBalance,
        total_credits_used: data.totalCreditUsed,
      });
      toast.success("Analysis started successfully!");

      if (onAnalysisStart) {
        onAnalysisStart(data);
      }
    } catch (err) {
      console.log("Error starting analysis:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to start analysis"
      );
    } finally {
      setLoading(false);
    }
  };

  const canStartAnalysis =
    selectedModels.length > 0 && estimate?.canAfford && !disabled;

  return (
    <div className="space-y-4">
      {/* Credit Balance */}
      <CreditBalance
        compact={true}
        creditData={
          {
            currentBalance: user.credits_balance,
            totalPurchased: user.total_credits_purchased,
            totalUsed: user.total_credits_used,
          } as CreditStats
        }
      />

      {/* Model Selection */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Select AI Models</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose which AI models to use for your brand analysis
        </p>
        <div className="grid grid-cols-1 gap-3">
          {AI_MODELS.map((model) => {
            const isSelected = selectedModels.includes(model.id);

            return (
              <div
                key={model.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => handleModelToggle(model.id)}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={isSelected}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{model.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                      {model.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis Stages Info */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Analysis Coverage</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Your selected models will analyze all funnel stages automatically
        </p>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>10 credits per model</strong> - Each selected model will
            analyze all funnel stages (TOFU, MOFU, BOFU, EVFU) automatically.
          </p>
        </div>
      </div>

      {/* Analysis Estimate */}
      {(estimating || estimate) && (
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Wallet Balance</h3>
          </div>
          {estimating ? (
            <Loading message="Estimating analysis..." />
          ) : estimate ? (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 content-center gap-3">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xl font-bold text-primary">
                    {estimate.creditsRequired}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Credits Required
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xl font-bold text-primary">
                    {estimate.currentBalance}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Available
                  </div>
                </div>
              </div>

              {!estimate.canAfford && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      Insufficient Credits
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    You need{" "}
                    {estimate.creditsRequired - estimate.currentBalance} more
                    credits to run this analysis.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Start Analysis Button */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={handleStartAnalysis}
          disabled={!canStartAnalysis || loading}
          size="lg"
          className="px-8"
          variant={loading ? "outline" : "default"}
        >
          {loading ? (
            <Loading message="Starting Analysis..." />
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Start Analysis
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
