"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { models } from "@/constants/dashboard";

export interface ModelSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModels: string[];
  onSelectionChange: (models: string[]) => void;
}

const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  open,
  onOpenChange,
  selectedModels,
  onSelectionChange,
}) => {
  const [pendingModels, setPendingModels] = useState<string[]>(selectedModels);

  // Sync draft state with the applied selection whenever the modal opens
  useEffect(() => {
    if (open) {
      setPendingModels(selectedModels);
    }
  }, [open]);

  const handleModelToggle = (model: string) => {
    if (pendingModels.includes(model)) {
      // Don't allow deselecting if it's the last one
      if (pendingModels.length === 1) {
        return;
      }
      setPendingModels(pendingModels.filter((m) => m !== model));
    } else {
      setPendingModels([...pendingModels, model]);
    }
  };

  const handleSelectAll = () => {
    setPendingModels([...models]);
  };

  const handleClearAll = () => {
    // Keep at least one model selected
    setPendingModels([models[0]]);
  };

  const handleApply = () => {
    onSelectionChange(pendingModels);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select LLM Models</DialogTitle>
          <DialogDescription>
            Choose which AI models to display on the chart. At least one model
            must be selected.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-3">
            {models.map((model) => {
              const isSelected = pendingModels.includes(model);
              return (
                <div
                  key={model}
                  role="button"
                  tabIndex={0}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => {
                    handleModelToggle(model);
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isSelected && pendingModels.length === 1}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => handleModelToggle(model)}
                  />
                  <span className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {model}
                      </span>
                      {isSelected && (
                        <Badge variant="outline" className="ml-2">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {pendingModels.length} of {models.length} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={pendingModels.length === 1}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={pendingModels.length === models.length}
            >
              Select All
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={pendingModels.length === 0}
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelSelectorModal;
