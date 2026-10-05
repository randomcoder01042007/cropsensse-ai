import type { AnalysisMode, VisionRegion, VisionResult } from "@/types";
import { requestVisionAnalysis } from "@/lib/system.functions";

/**
 * Vision adapter boundary. The real implementation talks to the Python/FastAPI
 * OpenCV 5 service; the demo adapter generates clearly-labelled mock values so
 * the full product flow can be demonstrated before the service is deployed.
 */
export interface VisionAdapter {
  readonly kind: "backend" | "demo";
  analyze(input: { analysisId: string; imageUrl: string; mode: AnalysisMode }): Promise<VisionResult>;
  analyzeRegions(input: { analysisId: string; imageUrl: string; regions: VisionRegion[] }): Promise<VisionRegion[]>;
}

export class VisionUnavailableError extends Error {
  constructor(message = "Vision engine unavailable") {
    super(message);
  }
}

export const httpVisionAdapter: VisionAdapter = {
  kind: "backend",
  async analyze({ analysisId, imageUrl, mode }) {
    const res = await requestVisionAnalysis({ data: { analysisId, imageUrl, mode } });
    if (!res.ok) throw new VisionUnavailableError(res.error);
    return res.result;
  },
  async analyzeRegions({ regions }) {
    // Region re-analysis endpoint (POST /api/vision/regions) is part of the contract;
    // until the service implements it we return the regions unchanged rather than invent values.
    return regions;
  },
};

/* ---------------- Demo adapter (mock values, never presented as real) ---------------- */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

function blob(r: () => number, cx: number, cy: number, rx: number, ry: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const k = 0.75 + r() * 0.35;
    pts.push([round(cx + Math.cos(a) * rx * k, 3), round(cy + Math.sin(a) * ry * k, 3)]);
  }
  return pts;
}

export const demoVisionAdapter: VisionAdapter = {
  kind: "demo",
  async analyze({ analysisId, mode }) {
    const r = seeded(analysisId);
    const count = mode === "detailed" ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3);
    const regions: VisionRegion[] = Array.from({ length: count }, (_, i) => {
      const w = 0.12 + r() * 0.14;
      const h = 0.12 + r() * 0.16;
      const x = 0.08 + r() * (0.84 - w);
      const y = 0.1 + r() * (0.8 - h);
      const area = round(1.5 + r() * 7);
      return {
        id: `R${i + 1}`,
        label: `Region R${i + 1}`,
        bbox: { x: round(x, 3), y: round(y, 3), w: round(w, 3), h: round(h, 3) },
        contour: blob(r, x + w / 2, y + h / 2, w / 2, h / 2),
        area_percent: area,
        severity: area > 6 ? "high" : "attention",
      };
    });
    const affected = round(regions.reduce((s, x) => s + (x.area_percent ?? 0), 0));
    const quality = round(62 + r() * 34);
    return {
      analysis_id: analysisId,
      image_quality: { score: quality, status: quality < 70 ? "low" : "ok", issues: quality < 70 ? ["Motion blur detected"] : [] },
      vegetation: { coverage_percent: round(68 + r() * 24) },
      regions,
      measurements: {
        vegetation_coverage: { label: "Vegetation coverage", value: round(68 + r() * 24), unit: "%" },
        affected_area: { label: "Affected area", value: affected, unit: "%" },
        mean_exg: { label: "Mean excess-green index", value: round(0.18 + r() * 0.2, 3) },
        chlorosis_ratio: { label: "Yellow-pixel ratio", value: round(2 + r() * 9), unit: "%" },
        sharpness: { label: "Laplacian variance (sharpness)", value: round(80 + r() * 260, 0) },
        brightness: { label: "Mean brightness", value: round(110 + r() * 60, 0), unit: "/255" },
      },
      processed_image_url: null,
      confidence: null,
    };
  },
  async analyzeRegions({ regions, analysisId }) {
    const r = seeded(analysisId + ":regions");
    return regions.map((reg) => ({ ...reg, area_percent: reg.area_percent != null ? round(reg.area_percent * (0.85 + r() * 0.2)) : null }));
  },
};
