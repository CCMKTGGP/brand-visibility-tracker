"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, CircleX, Clock, Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Loading from "../loading";
import { fetchData } from "@/utils/fetch";

interface AnalysisStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  userEmail?: string;
}

export default function AnalysisStartedModal({
  isOpen,
  onClose,
  brandId,
  userEmail,
}: AnalysisStartedModalProps) {
  const [brandName, setBrandName] = useState("");
  const [useCase, setUseCase] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchBrandName = useCallback(async () => {
    try {
      const response = await fetchData(`/api/brand/${brandId}`);
      const { data } = response;
      setBrandName(data.name || `Brand ${brandId}`);
      setUseCase(data.use_case || null);
    } catch (error) {
      setError(
        `Failed to fetch brand name - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    setLoading(true);
    if (brandId) {
      fetchBrandName();
    }
  }, [fetchBrandName]);

  function renderLayout() {
    if (loading) {
      return (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Analysis Started
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 min-h-48 flex items-center justify-center">
            <Loading message="Fetching brand name..." />
          </div>
        </DialogContent>
      );
    }
    if (error) {
      return (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Analysis Started Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <CircleX className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchBrandName}
                className="text-red-600 border-red-300 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </div>
        </DialogContent>
      );
    }
    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Analysis Started Successfully!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">
                Analysis is now running in the background
              </p>
              <p className="text-sm text-green-700 mt-1">
                We&apos;ve started analyzing the brand visibility for{" "}
                <strong>{brandName}</strong>.
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Use Case:</strong> {useCase}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">
                Estimated completion time
              </p>
              <p className="text-sm text-blue-700 mt-1">
                5-10 minutes depending on the analysis scope
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Mail className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-900">Email notification</p>
              <p className="text-sm text-purple-700 mt-1">
                We&apos;ll send you an email at{" "}
                <strong>{userEmail || "your registered email"}</strong> once the
                analysis is complete with detailed results.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
              <li>• You can continue using the platform normally</li>
              <li>• Check your email for completion notification</li>
              <li>• View results in the dashboard once complete</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Got it, thanks!
          </Button>
        </div>
      </DialogContent>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {renderLayout()}
    </Dialog>
  );
}
