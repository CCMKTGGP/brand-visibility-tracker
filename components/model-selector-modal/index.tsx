"use client";

import React from "react";
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
  const handleModelToggle = (model: string) => {
    if (selectedModels.includes(model)) {
      // Don't allow deselecting if it's the last one
      if (selectedModels.length === 1) {
        return;
      }
      onSelectionChange(selectedModels.filter((m) => m !== model));
    } else {
      onSelectionChange([...selectedModels, model]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange([...models]);
  };

  const handleClearAll = () => {
    // Keep at least one model selected
    onSelectionChange([models[0]]);
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
              const isSelected = selectedModels.includes(model);
              return (
                <div
                  key={model}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Checkbox
                    id={model}
                    checked={isSelected}
                    onCheckedChange={() => handleModelToggle(model)}
                    disabled={isSelected && selectedModels.length === 1}
                  />
                  <label htmlFor={model} className="flex-1 cursor-pointer">
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
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedModels.length} of {models.length} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={selectedModels.length === 1}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={selectedModels.length === models.length}
            >
              Select All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelSelectorModal;
