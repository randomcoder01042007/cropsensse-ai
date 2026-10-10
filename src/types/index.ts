import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Field = T["fields"]["Row"];
export type Crop = T["crops"]["Row"];
export type Analysis = T["analyses"]["Row"];
export type AnalysisImage = T["analysis_images"]["Row"];
export type AnalysisRegion = T["analysis_regions"]["Row"];
export type AnalysisMeasurement = T["analysis_measurements"]["Row"];
export type AgentActionRow = T["agent_actions"]["Row"];
export type Recommendation = T["recommendations"]["Row"];
export type Report = T["reports"]["Row"];
export type Notification = T["notifications"]["Row"];
export type AnalysisDiagnosis = T["analysis_diagnoses"]["Row"];

export type DataSource = Database["public"]["Enums"]["data_source"];
export type AnalysisStatus = Database["public"]["Enums"]["analysis_status"];
export type HealthStatus = Database["public"]["Enums"]["health_status"];
export type AnalysisMode = "standard" | "detailed";

export type StepState = "pending" | "processing" | "completed" | "failed" | "skipped";
export interface PipelineStep {
  key: PipelineStepKey;
  label: string;
  state: StepState;
  at?: string;
  detail?: string;
}
export type PipelineStepKey =
  | "upload"
  | "quality"
  | "preprocess"
  | "segmentation"
  | "regions"
  | "measurements"
  | "agent"
  | "additional"
  | "final";

export const PIPELINE_STEPS: { key: PipelineStepKey; label: string }[] = [
  { key: "upload", label: "Upload received" },
  { key: "quality", label: "Image quality check" },
  { key: "preprocess", label: "Preprocessing" },
  { key: "segmentation", label: "Vegetation segmentation" },
  { key: "regions", label: "Suspicious-region detection" },
  { key: "measurements", label: "OpenCV measurements" },
  { key: "agent", label: "Agent evaluation" },
  { key: "additional", label: "Additional analysis" },
  { key: "final", label: "Final assessment" },
];

/* ---------- Disease diagnosis contract (returned by the vision service) ---------- */
export type DiagnosisStatus = "identified" | "uncertain" | "crop_mismatch" | "crop_not_supported" | "model_not_loaded" | "error";
export interface DiagnosisCandidate { crop: string; disease: string; confidence: number }
export interface Diagnosis {
  status: DiagnosisStatus;
  message?: string;
  crop?: string;
  disease?: string;
  is_healthy?: boolean;
  cause?: string | null;
  confidence?: number;
  symptoms?: string[];
  prevention?: string[];
  management?: string[];
  other_possibilities?: DiagnosisCandidate[];
  possible_matches?: DiagnosisCandidate[];
  looks_like?: DiagnosisCandidate;
  disclaimer?: string;
}

/* ---------- OpenCV 5 vision service contract (POST /api/vision/analyze) ---------- */
export interface VisionRegion {
  id: string;
  label: string;
  /** normalised 0..1 bounding box */
  bbox: { x: number; y: number; w: number; h: number };
  /** normalised polygon points */
  contour?: [number, number][];
  area_percent: number | null;
  severity: "info" | "attention" | "high";
}
export interface VisionResult {
  analysis_id: string;
  image_quality: { score: number | null; status: "pending" | "ok" | "low" | "failed"; issues?: string[] };
  vegetation: { coverage_percent: number | null; mask_url?: string | null };
  regions: VisionRegion[];
  measurements: Record<string, { label: string; value: number | null; unit?: string }>;
  processed_image_url: string | null;
  confidence?: number | null;
  diagnosis?: Diagnosis | null;
}

/* ---------- AI agent contract ---------- */
export type AgentActionType =
  | "REQUEST_REGION_ANALYSIS"
  | "REQUEST_NEW_IMAGE"
  | "FINAL_ASSESSMENT"
  | "HUMAN_REVIEW";

export interface AgentInput {
  vision: VisionResult;
  image: { mime: string; size: number; width?: number; height?: number };
  field?: Pick<Field, "id" | "name" | "primary_crop"> | null;
  previous?: Pick<Analysis, "id" | "affected_area" | "vegetation_coverage" | "created_at"> | null;
  diagnosis?: Diagnosis | null;
}
export interface AgentDecision {
  action: AgentActionType;
  rationale: string;
  target_region_ids?: string[];
  assessment?: { health: HealthStatus; summary: string };
  recommendations: { title: string; reason: string; next_step: string; severity: "info" | "attention" | "high" }[];
  /** "rules" = deterministic demo policy, "model" = a connected model provider */
  engine: "rules" | "model";
}
