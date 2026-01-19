import { Schema, Types, model, models } from "mongoose";

// Analysis Pair Database Interface
interface IAnalysisPair {
  _id: Types.ObjectId;
  analysis_id: string; // Reference to the main analysis
  brand_id: Types.ObjectId;
  user_id: Types.ObjectId;
  model: "ChatGPT" | "Claude" | "Gemini" | "Perplexity";
  stage: "TOFU" | "MOFU" | "BOFU" | "EVFU";
  status: "pending" | "running" | "completed" | "failed";
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisPairSchema = new Schema<IAnalysisPair>(
  {
    analysis_id: {
      type: String,
      required: true,
      index: true,
    },
    brand_id: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    model: {
      type: String,
      enum: ["ChatGPT", "Claude", "Gemini", "Perplexity"],
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: ["TOFU", "MOFU", "BOFU", "EVFU"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      required: true,
      default: "pending",
      index: true,
    },
    started_at: {
      type: Date,
    },
    completed_at: {
      type: Date,
    },
    error_message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
AnalysisPairSchema.index({ analysis_id: 1, status: 1 });
AnalysisPairSchema.index({ brand_id: 1, analysis_id: 1 });
AnalysisPairSchema.index({ brand_id: 1, status: 1 });
AnalysisPairSchema.index({ user_id: 1, analysis_id: 1 });
AnalysisPairSchema.index({ model: 1, stage: 1 });

const AnalysisPair =
  models.AnalysisPair ||
  model<IAnalysisPair>("AnalysisPair", AnalysisPairSchema);

export default AnalysisPair;
export type { IAnalysisPair };
