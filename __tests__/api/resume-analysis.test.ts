/**
 * Tests for POST /api/brand/[brandId]/resume-analysis
 *
 * Covers:
 *   C — Resume endpoint functionality
 *   E — Resume pair-state resets
 *   G — Credit regression (no charges on resume)
 */

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE importing the handler
// ---------------------------------------------------------------------------

const mockConnect = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/db", () => mockConnect);

jest.mock("@/middlewares/apis/authMiddleware", () => ({
  authMiddleware: jest.fn().mockResolvedValue({ isValid: true }),
}));

jest.mock("@/lib/models/brand", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/lib/models/user", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/lib/models/analysisStatus", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock("@/lib/models/analysisPair", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock("@/lib/models/membership", () => ({
  Membership: { findOne: jest.fn() },
}));
jest.mock("@/lib/qstash", () => ({
  qstash: { trigger: jest.fn().mockResolvedValue({ messageId: "q-1" }) },
}));
jest.mock("@/lib/services/analysisRunnerService", () => ({
  runAnalysisPairs: jest.fn().mockResolvedValue([]),
  finalizeAnalysis: jest.fn().mockResolvedValue("completed"),
}));
jest.mock("@/lib/services/creditService", () => ({
  CreditService: {
    deductCredits: jest.fn(),
    addCredits: jest.fn(),
    getUserBalance: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import Brand from "@/lib/models/brand";
import User from "@/lib/models/user";
import AnalysisStatus from "@/lib/models/analysisStatus";
import AnalysisPair from "@/lib/models/analysisPair";
import { Membership } from "@/lib/models/membership";
import { qstash } from "@/lib/qstash";
import { CreditService } from "@/lib/services/creditService";
import { POST } from "@/app/api/(brand)/brand/[brandId]/resume-analysis/route";

const mockBrand = Brand as jest.Mocked<typeof Brand>;
const mockUser = User as jest.Mocked<typeof User>;
const mockAnalysisStatus = AnalysisStatus as jest.Mocked<typeof AnalysisStatus>;
const mockAnalysisPair = AnalysisPair as jest.Mocked<typeof AnalysisPair>;
const mockMembership = Membership as jest.Mocked<typeof Membership>;
const mockQstash = qstash as jest.Mocked<typeof qstash>;
const mockCreditService = CreditService as jest.Mocked<typeof CreditService>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BRAND_ID = "6646b1f4e3a8a5d8c5000001";
const USER_ID = "6646b1f4e3a8a5d8c5000002";
const ANALYSIS_ID = "analysis-failed-xyz";

const FAILED_ANALYSIS = {
  analysis_id: ANALYSIS_ID,
  brand_id: BRAND_ID,
  user_id: USER_ID,
  status: "failed",
  models: ["ChatGPT", "Claude"],
  stages: ["TOFU", "MOFU", "BOFU", "EVFU"],
  started_at: new Date(Date.now() - 10 * 60 * 1000),
  progress: { total_tasks: 8, completed_tasks: 4, current_task: "..." },
};

function makeRequest(body: object) {
  return {
    json: () => Promise.resolve(body),
    headers: { get: () => "Bearer token" },
  } as unknown as Request;
}

function makeContext(brandId: string = BRAND_ID) {
  return { params: Promise.resolve({ brandId }) };
}

function resetMocks() {
  jest.clearAllMocks();
  mockBrand.findById.mockResolvedValue({ _id: BRAND_ID, name: "TestBrand", ownerId: { toString: () => USER_ID } });
  mockUser.findById.mockResolvedValue({ _id: USER_ID, email: "user@test.com" });
  mockMembership.findOne.mockResolvedValue(null); // user is owner, no membership needed
  mockAnalysisStatus.findOne.mockResolvedValue({ ...FAILED_ANALYSIS });
  mockAnalysisPair.countDocuments.mockResolvedValue(4);
  mockAnalysisPair.updateMany.mockResolvedValue({ modifiedCount: 4 });
  mockAnalysisStatus.updateOne.mockResolvedValue({ modifiedCount: 1 });
  // Force local dev behavior
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  return () => { process.env.NODE_ENV = origEnv; };
}

// ---------------------------------------------------------------------------
// ─── C: Resume endpoint functionality ────────────────────────────────────
// ---------------------------------------------------------------------------

describe("C — Resume endpoint functionality", () => {
  beforeEach(resetMocks);

  it("C1 — returns 200 with success message for valid failed analysis", async () => {
    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.analysisId).toBe(ANALYSIS_ID);
    expect(body.data.status).toBe("running");
  });

  it("C2 — returns 404 when brand not found", async () => {
    mockBrand.findById.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    expect(res.status).toBe(404);
  });

  it("C3 — returns 404 when analysis not found", async () => {
    mockAnalysisStatus.findOne.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    expect(res.status).toBe(404);
  });

  it("C4 — returns 400 when analysis is already completed", async () => {
    mockAnalysisStatus.findOne.mockResolvedValue({
      ...FAILED_ANALYSIS,
      status: "completed",
    });

    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toMatch(/already completed/i);
  });

  it("C5 — returns 409 when analysis is already running", async () => {
    mockAnalysisStatus.findOne.mockResolvedValue({
      ...FAILED_ANALYSIS,
      status: "running",
    });

    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.message).toMatch(/already running/i);
  });

  it("C6 — returns 400 when analysis is cancelled (cannot resume)", async () => {
    mockAnalysisStatus.findOne.mockResolvedValue({
      ...FAILED_ANALYSIS,
      status: "cancelled",
    });

    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    expect(res.status).toBe(400);
  });

  it("C7 — returns 400 for invalid/missing request body fields", async () => {
    const res = await POST(
      makeRequest({ userId: "" }), // missing analysisId
      makeContext()
    );

    expect(res.status).toBe(400);
  });

  it("C8 — response includes creditsCharged: 0 (resume is free)", async () => {
    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.creditsCharged).toBe(0);
  });

  it("C9 — returns 400 for invalid brandId format", async () => {
    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext("not-a-valid-objectid")
    );

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// ─── E: Resume — pair-state resets ───────────────────────────────────────
// ---------------------------------------------------------------------------

describe("E — Resume pair-state resets", () => {
  beforeEach(resetMocks);

  it("E1 — failed pairs are reset to pending before workflow is re-triggered", async () => {
    await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    const updateManyCall = (mockAnalysisPair.updateMany as jest.Mock).mock.calls[0];
    expect(updateManyCall[0].status.$in).toContain("failed");
    expect(updateManyCall[1].$set.status).toBe("pending");
  });

  it("E2 — AnalysisStatus is reset to 'running' before workflow is re-triggered", async () => {
    await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    const statusUpdateCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls[0];
    expect(statusUpdateCall[1].$set.status).toBe("running");
  });

  it("E3 — completed_tasks count is preserved from already-finished pairs", async () => {
    mockAnalysisPair.countDocuments.mockResolvedValue(3);

    await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    const statusUpdateCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls[0];
    expect(statusUpdateCall[1].$set["progress.completed_tasks"]).toBe(3);
  });

  it("E4 — pairs stuck in 'running' state (from a crash) are also reset to pending", async () => {
    await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    const updateManyFilter = (mockAnalysisPair.updateMany as jest.Mock).mock.calls[0][0];
    // Both "failed" AND "running" should be reset
    expect(updateManyFilter.status.$in).toContain("failed");
    expect(updateManyFilter.status.$in).toContain("running");
  });

  it("E5 — error_message is cleared from AnalysisStatus on resume", async () => {
    await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    const statusUpdateCall = (mockAnalysisStatus.updateOne as jest.Mock).mock.calls[0];
    expect(statusUpdateCall[1].$unset).toHaveProperty("error_message");
  });
});

// ---------------------------------------------------------------------------
// ─── G: Credit regression — no charges on resume ─────────────────────────
// ---------------------------------------------------------------------------

describe("G — Credit regression (no charges on resume)", () => {
  beforeEach(resetMocks);

  it("G1 — CreditService.deductCredits is never called during resume", async () => {
    await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    expect(mockCreditService.deductCredits).not.toHaveBeenCalled();
  });

  it("G2 — CreditService.addCredits is never called during resume", async () => {
    await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );

    expect(mockCreditService.addCredits).not.toHaveBeenCalled();
  });

  it("G3 — creditsCharged in response is exactly 0", async () => {
    const res = await POST(
      makeRequest({ userId: USER_ID, analysisId: ANALYSIS_ID }),
      makeContext()
    );
    const body = await res.json();

    expect(body.data.creditsCharged).toBe(0);
  });
});
