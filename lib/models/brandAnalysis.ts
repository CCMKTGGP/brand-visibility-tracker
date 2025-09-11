import { Schema, Types, model, models } from "mongoose";

// Brand Analysis Database Interface
interface IBrandAnalysis {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  model: "ChatGPT" | "Claude" | "Gemini";
  stage: "TOFU" | "MOFU" | "BOFU" | "EVFU";
  score: number;
  prompt: string;
  response: string;
  response_time: number;
  success_rate: number;
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
  metadata: {
    user_id: Types.ObjectId;
    trigger_type: "manual" | "scheduled" | "webhook";
    version: string;
  };
  status: "success" | "error" | "warning";
  createdAt: Date;
  updatedAt: Date;
}

const BrandAnalysisSchema = new Schema<IBrandAnalysis>(
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
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    prompt: {
      type: String,
      required: true,
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
    success_rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
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
BrandAnalysisSchema.index({ brand_id: 1, createdAt: -1 });
BrandAnalysisSchema.index({ brand_id: 1, model: 1, stage: 1 });
BrandAnalysisSchema.index({ brand_id: 1, createdAt: -1, model: 1, stage: 1 });
BrandAnalysisSchema.index({ "metadata.user_id": 1, createdAt: -1 });

const BrandAnalysis =
  models.BrandAnalysis ||
  model<IBrandAnalysis>("BrandAnalysis", BrandAnalysisSchema);
export default BrandAnalysis;
