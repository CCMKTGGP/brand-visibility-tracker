import { Schema, Types, model, models } from "mongoose";

// Analysis Status Database Interface
interface IAnalysisStatus {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  user_id: Types.ObjectId;
  analysis_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  models: ("ChatGPT" | "Claude" | "Gemini" | "Perplexity")[];
  stages: ("TOFU" | "MOFU" | "BOFU" | "EVFU")[];
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  progress?: {
    total_tasks: number;
    completed_tasks: number;
    current_task?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisStatusSchema = new Schema<IAnalysisStatus>(
  {
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
    analysis_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["running", "completed", "failed", "cancelled"],
      required: true,
      index: true,
    },
    models: [
      {
        type: String,
        enum: ["ChatGPT", "Claude", "Gemini", "Perplexity"],
        required: true,
      },
    ],
    stages: [
      {
        type: String,
        enum: ["TOFU", "MOFU", "BOFU", "EVFU"],
        required: true,
      },
    ],
    started_at: {
      type: Date,
      required: true,
      index: true,
    },
    completed_at: {
      type: Date,
    },
    error_message: {
      type: String,
    },
    progress: {
      total_tasks: {
        type: Number,
        default: 0,
      },
      completed_tasks: {
        type: Number,
        default: 0,
      },
      current_task: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
AnalysisStatusSchema.index({ brand_id: 1, status: 1 });
AnalysisStatusSchema.index({ brand_id: 1, started_at: -1 });
AnalysisStatusSchema.index({ user_id: 1, started_at: -1 });

// TTL index to automatically clean up old completed/failed analyses after 30 days
AnalysisStatusSchema.index(
  { completed_at: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: {
      status: { $in: ["completed", "failed", "cancelled"] },
    },
  }
);

const AnalysisStatus =
  models.AnalysisStatus ||
  model<IAnalysisStatus>("AnalysisStatus", AnalysisStatusSchema);

export default AnalysisStatus;
export type { IAnalysisStatus };
