// Plan and billing related types

import { Types } from "mongoose";

// Database Plan model interface
export interface IPlan {
  _id: string;
  plan_id: string;
  name: string;
  description: string;
  max_brands?: number;
  ai_models_supported?: number;
  price: number;
  features?: string[];
  credits_included?: number;
  is_credit_based?: boolean;
  stripe_price_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Plan features interface
export interface PlanFeatures {
  maxBrands: number;
  aiModelsSupported: number;
  analytics: boolean;
  teamCollaboration: boolean;
  apiAccess: boolean;
  customIntegrations: boolean;
  prioritySupport: boolean;
}

// User's plan information
export interface UserPlan {
  _id: string;
  plan_id: string;
  plan_name: string;
}

// Credit-related types
export interface CreditTransaction {
  _id: string;
  user_id: Types.ObjectId;
  type: "purchase" | "usage" | "refund" | "bonus";
  amount: number;
  description: string;
  analysis_id?: string;
  stripe_payment_intent_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditPurchaseOption {
  credits: number;
  price: number; // in cents
  stripe_price_id: string;
  popular?: boolean;
  bonus_credits?: number;
}

// AI Model selection for analysis
export type AIModel = "ChatGPT" | "Claude" | "Gemini" | "Perplexity";
export type AnalysisStage = "TOFU" | "MOFU" | "BOFU" | "EVFU";

export interface AnalysisOptions {
  models: AIModel[];
  stages: AnalysisStage[];
  estimated_credits: number;
}
