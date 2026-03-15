"use client";

import React from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  type FailedAnalysis,
  type PairDetail,
} from "@/hooks/use-analysis-status";
import moment from "moment";

interface FailedAnalysisDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedAnalysis: FailedAnalysis;
}

/** Stage display order — always shown top-to-bottom in funnel order */
const STAGE_ORDER = ["TOFU", "MOFU", "BOFU", "EVFU"] as const;

/** Lookup a specific pair's detail */
function getPair(
  pairDetails: PairDetail[],
  model: string,
  stage: string,
): PairDetail | undefined {
  return pairDetails.find((p) => p.model === model && p.stage === stage);
}

export default function FailedAnalysisDetailModal({
  isOpen,
  onClose,
  failedAnalysis,
}: FailedAnalysisDetailModalProps) {
  const { models, stages, pairDetails, progress, startedAt, errorMessage } =
    failedAnalysis;

  // Only show stage columns that were actually part of this run
  const activeStages = STAGE_ORDER.filter((s) => stages.includes(s));

  const totalPairs = progress.total_tasks;
  const completedPairs = pairDetails.filter(
    (p) => p.status === "completed",
  ).length;
  const failedPairs = pairDetails.filter((p) => p.status === "failed").length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Analysis Error Details
          </DialogTitle>
        </DialogHeader>

        {/* Summary bar */}
        <div className="flex flex-wrap gap-3 py-3 border-b border-gray-100 dark:border-gray-800 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Started{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {moment(startedAt).format("MMM D, YYYY [at] h:mm A")}
            </span>
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {completedPairs}/{totalPairs} completed
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <XCircle className="h-3.5 w-3.5" />
            {failedPairs} failed
          </span>
        </div>

        {/* Per-model breakdown table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-32">
                  Model
                </th>
                {activeStages.map((stage) => (
                  <th
                    key={stage}
                    className="text-center py-2 px-3 font-medium text-gray-500 dark:text-gray-400"
                  >
                    {stage}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {models.map((model) => (
                <tr key={model} className="group">
                  <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {model}
                  </td>
                  {activeStages.map((stage) => {
                    const pair = getPair(pairDetails, model, stage);
                    return (
                      <td key={stage} className="py-3 px-3 text-center">
                        <PairStatusCell pair={pair} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Failed pair error messages — expanded list */}
        {failedPairs > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Error Messages
            </p>
            {pairDetails
              .filter((p) => p.status === "failed")
              .map((p) => (
                <div
                  key={`${p.model}-${p.stage}`}
                  className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-lg px-3 py-2.5"
                >
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium text-red-800 dark:text-red-200 text-sm">
                        {p.model}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-red-200 text-red-700 dark:border-red-700 dark:text-red-300 py-0 h-4"
                      >
                        {p.stage}
                      </Badge>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">
                      {p.errorMessage ?? "Unknown error"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Overall error summary from AnalysisStatus if present */}
        {errorMessage && (
          <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
            {errorMessage}
          </p>
        )}

        {/* Resume note */}
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          Resuming will retry only the failed stages — no additional credits
          charged.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Small sub-component for the status cell inside the table
// ---------------------------------------------------------------------------

function PairStatusCell({ pair }: { pair: PairDetail | undefined }) {
  if (!pair) {
    // Pair record not yet created (shouldn't happen, but handle gracefully)
    return (
      <span className="inline-flex items-center justify-center text-gray-300 dark:text-gray-600">
        <Clock className="h-4 w-4" />
      </span>
    );
  }

  if (pair.status === "completed") {
    return (
      <span
        className="inline-flex items-center justify-center text-green-600 dark:text-green-400"
        title="Completed"
      >
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }

  if (pair.status === "failed") {
    return (
      <span
        className="inline-flex items-center justify-center text-red-500 dark:text-red-400"
        title={pair.errorMessage ?? "Failed"}
      >
        <XCircle className="h-4 w-4" />
      </span>
    );
  }

  // pending / running
  return (
    <span
      className="inline-flex items-center justify-center text-gray-400 dark:text-gray-500"
      title={pair.status}
    >
      <Clock className="h-4 w-4" />
    </span>
  );
}
