import { Schema, Types, model, models } from "mongoose";

// Brand Metrics Database Interface
interface IBrandMetrics {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  date: Date;
  period: "daily" | "weekly" | "monthly";
  aggregated_data: {
    total_prompts: number;
    avg_score: number;
    avg_response_time: number;
    success_rate: number;
    model_breakdown: {
      ChatGPT: {
        score: number;
        prompts: number;
        avg_response_time: number;
        success_rate: number;
      };
      Claude: {
        score: number;
        prompts: number;
        avg_response_time: number;
        success_rate: number;
      };
      Gemini: {
        score: number;
        prompts: number;
        avg_response_time: number;
        success_rate: number;
      };
    };
    stage_breakdown: {
      TOFU: number;
      MOFU: number;
      BOFU: number;
      EVFU: number;
    };
    sentiment_breakdown: {
      positive: number;
      neutral: number;
      negative: number;
      strongly_positive: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const BrandMetricsSchema = new Schema<IBrandMetrics>(
  {
    brand_id: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "daily",
      required: true,
    },
    aggregated_data: {
      total_prompts: {
        type: Number,
        required: true,
        min: 0,
      },
      avg_score: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      avg_response_time: {
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
      model_breakdown: {
        ChatGPT: {
          score: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
          prompts: {
            type: Number,
            default: 0,
            min: 0,
          },
          avg_response_time: {
            type: Number,
            default: 0,
            min: 0,
          },
          success_rate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
        },
        Claude: {
          score: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
          prompts: {
            type: Number,
            default: 0,
            min: 0,
          },
          avg_response_time: {
            type: Number,
            default: 0,
            min: 0,
          },
          success_rate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
        },
        Gemini: {
          score: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
          prompts: {
            type: Number,
            default: 0,
            min: 0,
          },
          avg_response_time: {
            type: Number,
            default: 0,
            min: 0,
          },
          success_rate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
        },
      },
      stageBreakdown: {
        TOFU: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        MOFU: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        BOFU: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        EVFU: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },
      sentiment_breakdown: {
        positive: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        neutral: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        negative: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        strongly_positive: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
BrandMetricsSchema.index({ brand_id: 1, date: -1 });
BrandMetricsSchema.index({ brand_id: 1, period: 1, date: -1 });

// Unique constraint to prevent duplicate metrics for same brand/date/period
BrandMetricsSchema.index({ brand_id: 1, date: 1, period: 1 }, { unique: true });

const BrandMetrics =
  models.BrandMetrics ||
  model<IBrandMetrics>("BrandMetrics", BrandMetricsSchema);
export default BrandMetrics;
