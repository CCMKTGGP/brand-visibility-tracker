import { Schema, Types, model, models } from "mongoose";

// Multi-Prompt Analysis Database Interface [[memory:7832728]]
interface IMultiPromptAnalysis {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  model: "ChatGPT" | "Claude" | "Gemini";
  stage: "TOFU" | "MOFU" | "BOFU" | "EVFU";
  overall_score: number;
  weighted_score: number;
  total_response_time: number;
  success_rate: number;
  aggregated_sentiment: {
    overall: "positive" | "neutral" | "negative";
    confidence: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      strongly_positive: number;
    };
  };
  prompt_results: Array<{
    prompt_id: string;
    prompt_text: string;
    score: number;
    weighted_score: number;
    mention_position: number;
    response: string;
    response_time: number;
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        strongly_positive: number;
      };
    };
    status: "success" | "error" | "warning";
  }>;
  metadata: {
    user_id: Types.ObjectId;
    trigger_type: "manual" | "scheduled" | "webhook";
    version: string;
    total_prompts: number;
    successful_prompts: number;
  };
  status: "success" | "error" | "warning";
  createdAt: Date;
  updatedAt: Date;
}

const MultiPromptAnalysisSchema = new Schema<IMultiPromptAnalysis>(
  {
    brand_id: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    model: {
      type: String,
      enum: ["ChatGPT", "Claude", "Gemini"],
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: ["TOFU", "MOFU", "BOFU", "EVFU"],
      required: true,
      index: true,
    },
    overall_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    weighted_score: {
      type: Number,
      required: true,
      min: 0,
    },
    total_response_time: {
      type: Number,
      required: true,
      min: 0,
    },
    success_rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    aggregated_sentiment: {
      overall: {
        type: String,
        enum: ["positive", "neutral", "negative"],
        required: true,
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      distribution: {
        positive: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        neutral: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        negative: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        strongly_positive: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
      },
    },
    prompt_results: [
      {
        prompt_id: {
          type: String,
          required: true,
        },
        prompt_text: {
          type: String,
          required: true,
        },
        score: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        weighted_score: {
          type: Number,
          required: true,
          min: 0,
        },
        mention_position: {
          type: Number,
          required: true,
          min: 0,
          max: 5,
        },
        response: {
          type: String,
          required: true,
        },
        response_time: {
          type: Number,
          required: true,
          min: 0,
        },
        sentiment: {
          overall: {
            type: String,
            enum: ["positive", "neutral", "negative"],
            required: true,
          },
          confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
          },
          distribution: {
            positive: {
              type: Number,
              required: true,
              min: 0,
              max: 100,
            },
            neutral: {
              type: Number,
              required: true,
              min: 0,
              max: 100,
            },
            negative: {
              type: Number,
              required: true,
              min: 0,
              max: 100,
            },
            strongly_positive: {
              type: Number,
              required: true,
              min: 0,
              max: 100,
            },
          },
        },
        status: {
          type: String,
          enum: ["success", "error", "warning"],
          required: true,
        },
      },
    ],
    metadata: {
      user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      trigger_type: {
        type: String,
        enum: ["manual", "scheduled", "webhook"],
        required: true,
      },
      version: {
        type: String,
        required: true,
      },
      total_prompts: {
        type: Number,
        required: true,
        min: 0,
      },
      successful_prompts: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    status: {
      type: String,
      enum: ["success", "error", "warning"],
      default: "success",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
MultiPromptAnalysisSchema.index({ brand_id: 1, createdAt: -1 });
MultiPromptAnalysisSchema.index({ brand_id: 1, model: 1, stage: 1 });
MultiPromptAnalysisSchema.index({
  brand_id: 1,
  createdAt: -1,
  model: 1,
  stage: 1,
});
MultiPromptAnalysisSchema.index({ "metadata.user_id": 1, createdAt: -1 });
MultiPromptAnalysisSchema.index({ brand_id: 1, stage: 1, createdAt: -1 });

const MultiPromptAnalysis =
  models.MultiPromptAnalysis ||
  model<IMultiPromptAnalysis>("MultiPromptAnalysis", MultiPromptAnalysisSchema);

export default MultiPromptAnalysis;
export type { IMultiPromptAnalysis };
