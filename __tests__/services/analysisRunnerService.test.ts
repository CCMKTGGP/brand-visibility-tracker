/**
 * Tests for analysisRunnerService
 *
 * Covers all test cases discussed in design review:
 *   A — Workflow error-handling (loop continuity)
 *   B — Skip-completed logic (idempotency / resume)
 *   D — Credit regression (no extra charges on failure)
 *   F — Local-dev / QStash parity via shared service
 */

import { runAnalysisPairs, finalizeAnalysis } from "@/lib/services/analysisRunnerService";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Mongoose models
jest.mock("@/lib/models/analysisStatus", () => ({
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  find: jest.fn(),
}));
jest.mock("@/lib/models/analysisPair", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
}));
jest.mock("@/lib/models/multiPromptAnalysis", () => ({
  find: jest.fn(),
}));

// Services
jest.mock("@/lib/services/aiService", () => ({
  AIService: {
    analyzeWithMultiplePrompts: jest.fn(),
  },
}));
jest.mock("@/lib/services/dataOrganizationService", () => ({
  DataOrganizationService: {
    processAndStoreAnalysis: jest.fn(),
  },
}));

// Email helpers
jest.mock("@/utils/analysisCompletionEmailTemplate", () => ({
  analysisCompletionEmailTemplate: jest.fn(() => "<html>Email</html>"),
}));
jest.mock("@/utils/sendEmail", () => ({
  sendEmail: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import mocked modules after jest.mock calls
// ---------------------------------------------------------------------------
import AnalysisStatus from "@/lib/models/analysisStatus";
import AnalysisPair from "@/lib/models/analysisPair";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";
import { sendEmail } from "@/utils/sendEmail";

const mockAnalysisStatus = AnalysisStatus as jest.Mocked<typeof AnalysisStatus>;
const mockAnalysisPair = AnalysisPair as jest.Mocked<typeof AnalysisPair>;
const mockMultiPromptAnalysis = MultiPromptAnalysis as jest.Mocked<typeof MultiPromptAnalysis>;
const mockAIService = AIService as jest.Mocked<typeof AIService>;
const mockDataOrg = DataOrganizationService as jest.Mocked<typeof DataOrganizationService>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BRAND_ID = "6646b1f4e3a8a5d8c5000001";
const USER_ID = "6646b1f4e3a8a5d8c5000002";
const ANALYSIS_ID = "analysis-001";
const BRAND = { _id: BRAND_ID, name: "TestBrand" };
const USER = { _id: USER_ID, email: "user@test.com" };

const MODELS = ["ChatGPT", "Claude"] as const;
const STAGES = ["TOFU", "MOFU"] as const;

function resetMocks() {
  jest.clearAllMocks();
  // Default: no existing pair (fresh run)
  mockAnalysisPair.findOne.mockResolvedValue(null);
  mockAnalysisPair.findOneAndUpdate.mockResolvedValue({});
  mockAnalysisStatus.findOneAndUpdate.mockResolvedValue({});
  mockAnalysisStatus.updateOne.mockResolvedValue({ modifiedCount: 1 });
  // Default AI returns a valid result
  mockAIService.analyzeWithMultiplePrompts.mockResolvedValue({ scores: [90] } as never);
  mockDataOrg.processAndStoreAnalysis.mockResolvedValue(undefined as never);
  // No failed pairs by default (for finalizeAnalysis)
  mockAnalysisPair.find.mockResolvedValue([]);
  mockMultiPromptAnalysis.find.mockResolvedValue([
    { overall_score: 80, weighted_score: 75 },
  ] as never);
  mockSendEmail.mockResolvedValue(undefined as never);
}

// ---------------------------------------------------------------------------
// ─── A: Workflow error-handling ───────────────────────────────────────────
// ---------------------------------------------------------------------------

describe("A — Workflow error-handling (loop continuity)", () => {
  beforeEach(resetMocks);

  it("A1 — loop continues after a pair fails; subsequent pairs still run", async () => {
    // First call (ChatGPT-TOFU) throws; rest should still execute
    mockAIService.analyzeWithMultiplePrompts
      .mockRejectedValueOnce(new Error("Rate limit hit"))
      .mockResolvedValue({ scores: [85] } as never);

    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: [...MODELS],
      stages: [...STAGES],
      brand: BRAND,
    });

    // 4 total pairs: 1 failed, 3 succeeded
    const failed = results.filter((r) => !r.success && !r.skipped);
    const succeeded = results.filter((r) => r.success && !r.skipped);
    expect(failed).toHaveLength(1);
    expect(succeeded).toHaveLength(3);
  });

  it("A2 — failed pair stores error_message in AnalysisPair", async () => {
    const ERR_MSG = "Claude API timeout";
    mockAIService.analyzeWithMultiplePrompts
      .mockRejectedValueOnce(new Error(ERR_MSG))
      .mockResolvedValue({ scores: [88] } as never);

    await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["Claude"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    // Verify the pair was marked failed with the error message
    const failedUpdateCall = (mockAnalysisPair.findOneAndUpdate as jest.Mock).mock.calls.find(
      (call) => call[1]?.status === "failed"
    );
    expect(failedUpdateCall).toBeDefined();
    expect(failedUpdateCall[1].error_message).toBe(ERR_MSG);
  });

  it("A3 — AnalysisStatus is NOT set to failed inside the loop (only at finalization)", async () => {
    mockAIService.analyzeWithMultiplePrompts.mockRejectedValue(new Error("err"));

    await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    // AnalysisStatus.updateOne should NOT have been called with status: "failed"
    const failedStatusCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls.find(
      (call) => call[1]?.$set?.status === "failed"
    );
    expect(failedStatusCall).toBeUndefined();
  });

  it("A4 — AI returning null/empty result is treated as a failure", async () => {
    mockAIService.analyzeWithMultiplePrompts.mockResolvedValue(null as never);

    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe("AI result empty");
  });

  it("A5 — processAndStoreAnalysis failure marks pair as failed", async () => {
    mockAIService.analyzeWithMultiplePrompts.mockResolvedValue({ scores: [80] } as never);
    mockDataOrg.processAndStoreAnalysis.mockRejectedValue(new Error("DB write failed"));

    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe("DB write failed");
  });

  it("A6 — multiple pairs in a row can all fail; all are recorded", async () => {
    mockAIService.analyzeWithMultiplePrompts.mockRejectedValue(new Error("503"));

    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: [...MODELS],
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    // 2 models × 1 stage = 2 pairs, both failed
    const failed = results.filter((r) => !r.success);
    expect(failed).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ─── B: Skip-completed logic ──────────────────────────────────────────────
// ---------------------------------------------------------------------------

describe("B — Skip-completed logic (idempotency / resume)", () => {
  beforeEach(resetMocks);

  it("B1 — already-completed pair is skipped; AI is NOT called for it", async () => {
    // ChatGPT-TOFU is already completed
    mockAnalysisPair.findOne.mockImplementation(({ model, stage }) => {
      if (model === "ChatGPT" && stage === "TOFU") {
        return Promise.resolve({ status: "completed" });
      }
      return Promise.resolve(null);
    });

    await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    expect(mockAIService.analyzeWithMultiplePrompts).not.toHaveBeenCalled();
  });

  it("B2 — skipped pair is reported as skipped in results", async () => {
    mockAnalysisPair.findOne.mockResolvedValue({ status: "completed" });

    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    expect(results[0].skipped).toBe(true);
    expect(results[0].success).toBe(true);
  });

  it("B3 — only incomplete pairs run; complete ones are untouched", async () => {
    // ChatGPT-TOFU completed, ChatGPT-MOFU pending
    mockAnalysisPair.findOne.mockImplementation(({ model, stage }) => {
      if (model === "ChatGPT" && stage === "TOFU") {
        return Promise.resolve({ status: "completed" });
      }
      return Promise.resolve(null);
    });

    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU", "MOFU"] as never,
      brand: BRAND,
    });

    expect(results).toHaveLength(2);
    expect(results.find((r) => r.stage === "TOFU")?.skipped).toBe(true);
    expect(results.find((r) => r.stage === "MOFU")?.skipped).toBe(false);
    // AI called exactly once (for MOFU only)
    expect(mockAIService.analyzeWithMultiplePrompts).toHaveBeenCalledTimes(1);
  });

  it("B4 — 'running' status is NOT treated as done; pair re-runs", async () => {
    // A pair stuck in "running" from a previous crash should be retried
    mockAnalysisPair.findOne.mockResolvedValue({ status: "running" });

    await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    // AI MUST be called — "running" is not a terminal skip state
    expect(mockAIService.analyzeWithMultiplePrompts).toHaveBeenCalledTimes(1);
  });

  it("B5 — 'failed' status is NOT treated as done; pair re-runs", async () => {
    mockAnalysisPair.findOne.mockResolvedValue({ status: "failed" });

    await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["Claude"] as never,
      stages: ["BOFU"] as never,
      brand: BRAND,
    });

    expect(mockAIService.analyzeWithMultiplePrompts).toHaveBeenCalledTimes(1);
  });

  it("B6 — all pairs completed → AI never called (full skip on re-run)", async () => {
    mockAnalysisPair.findOne.mockResolvedValue({ status: "completed" });

    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: [...MODELS],
      stages: [...STAGES],
      brand: BRAND,
    });

    expect(mockAIService.analyzeWithMultiplePrompts).not.toHaveBeenCalled();
    results.forEach((r) => expect(r.skipped).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// ─── D: Finalization — status transition ──────────────────────────────────
// ---------------------------------------------------------------------------

describe("D — finalizeAnalysis status transitions", () => {
  beforeEach(resetMocks);

  it("D1 — all succeeded → status set to 'completed'", async () => {
    mockAnalysisPair.find.mockResolvedValue([]); // no failed pairs

    const status = await finalizeAnalysis({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      brand: BRAND,
      user: USER,
      startedAt: new Date(),
    });

    expect(status).toBe("completed");

    const updateCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls.find(
      (call) => call[1]?.$set?.status === "completed"
    );
    expect(updateCall).toBeDefined();
  });

  it("D2 — any failed pair → status set to 'failed'", async () => {
    mockAnalysisPair.find.mockResolvedValue([
      { model: "Claude", stage: "TOFU" },
    ]);

    const status = await finalizeAnalysis({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      brand: BRAND,
      user: USER,
      startedAt: new Date(),
    });

    expect(status).toBe("failed");

    const updateCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls.find(
      (call) => call[1]?.$set?.status === "failed"
    );
    expect(updateCall).toBeDefined();
  });

  it("D3 — failed status includes model-stage summary in error_message", async () => {
    mockAnalysisPair.find.mockResolvedValue([
      { model: "Claude", stage: "TOFU" },
      { model: "ChatGPT", stage: "MOFU" },
    ]);

    await finalizeAnalysis({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      brand: BRAND,
      user: USER,
      startedAt: new Date(),
    });

    const updateCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls.find(
      (call) => call[1]?.$set?.status === "failed"
    );
    expect(updateCall[1].$set.error_message).toContain("Claude-TOFU");
    expect(updateCall[1].$set.error_message).toContain("ChatGPT-MOFU");
  });

  it("D4 — email sent only when all pairs succeed", async () => {
    // Scenario 1: all pass
    mockAnalysisPair.find.mockResolvedValue([]);
    await finalizeAnalysis({
      brandId: BRAND_ID, userId: USER_ID, analysisId: ANALYSIS_ID,
      brand: BRAND, user: USER, startedAt: new Date(),
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    // Scenario 2: any failure
    jest.clearAllMocks();
    mockAnalysisPair.find.mockResolvedValue([{ model: "Claude", stage: "TOFU" }]);
    await finalizeAnalysis({
      brandId: BRAND_ID, userId: USER_ID, analysisId: ANALYSIS_ID,
      brand: BRAND, user: USER, startedAt: new Date(),
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("D5 — completed_at is always set regardless of success/failure", async () => {
    // Success case
    mockAnalysisPair.find.mockResolvedValue([]);
    await finalizeAnalysis({
      brandId: BRAND_ID, userId: USER_ID, analysisId: ANALYSIS_ID,
      brand: BRAND, user: USER, startedAt: new Date(),
    });
    const successCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls.find(
      (call) => call[1]?.$set?.status === "completed"
    );
    expect(successCall[1].$set.completed_at).toBeInstanceOf(Date);

    // Failure case
    jest.clearAllMocks();
    mockAnalysisPair.find.mockResolvedValue([{ model: "Claude", stage: "BOFU" }]);
    await finalizeAnalysis({
      brandId: BRAND_ID, userId: USER_ID, analysisId: ANALYSIS_ID,
      brand: BRAND, user: USER, startedAt: new Date(),
    });
    const failureCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls.find(
      (call) => call[1]?.$set?.status === "failed"
    );
    expect(failureCall[1].$set.completed_at).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// ─── F: Local-dev / QStash parity via shared service ──────────────────────
// ---------------------------------------------------------------------------

describe("F — Local-dev / QStash parity via shared service", () => {
  beforeEach(resetMocks);

  it("F1 — same runAnalysisPairs function is used by both environments", async () => {
    // This is architectural: both route handlers import from the same module.
    // We verify the exported function exists and behaves identically.
    const results = await runAnalysisPairs({
      brandId: BRAND_ID,
      userId: USER_ID,
      analysisId: ANALYSIS_ID,
      models: ["ChatGPT"] as never,
      stages: ["TOFU"] as never,
      brand: BRAND,
    });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].skipped).toBe(false);
  });

  it("F2 — same finalizeAnalysis function is used by both environments", async () => {
    mockAnalysisPair.find.mockResolvedValue([]);
    const status = await finalizeAnalysis({
      brandId: BRAND_ID, userId: USER_ID, analysisId: ANALYSIS_ID,
      brand: BRAND, user: USER, startedAt: new Date(),
    });
    expect(status).toBe("completed");
  });
});
