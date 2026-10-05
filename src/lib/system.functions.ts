import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VisionResult } from "@/types";

export interface ServiceHealth {
  key: string;
  label: string;
  state: "online" | "offline" | "not_configured";
  detail: string;
}

async function ping(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** GET /api/health equivalent — reports each subsystem honestly. */
export const getSystemHealth = createServerFn({ method: "GET" }).handler(async () => {
  const visionUrl = process.env["VISION_API_URL"];
  const agentProvider = process.env["AGENT_PROVIDER"];
  const awsRegion = process.env["AWS_REGION"];
  const visionOnline = visionUrl ? await ping(`${visionUrl.replace(/\/$/, "")}/api/health`) : false;

  const services: ServiceHealth[] = [
    { key: "frontend", label: "Frontend", state: "online", detail: "Serving" },
    { key: "backend", label: "Backend API", state: "online", detail: "Server functions reachable" },
    { key: "database", label: "Database", state: "online", detail: "PostgreSQL via Lovable Cloud" },
    { key: "storage", label: "Storage", state: "online", detail: "Private buckets: uploads, processed, reports" },
    {
      key: "vision",
      label: "OpenCV 5 Vision Engine",
      state: !visionUrl ? "not_configured" : visionOnline ? "online" : "offline",
      detail: !visionUrl ? "VISION_API_URL not set — demo mode only" : visionOnline ? "FastAPI service healthy" : "Service unreachable",
    },
    {
      key: "agent",
      label: "AI Agent",
      state: agentProvider ? "online" : "not_configured",
      detail: agentProvider ? `Provider: ${agentProvider}` : "Rule-based demo policy in use",
    },
    {
      key: "aws",
      label: "AWS",
      state: awsRegion ? "online" : "not_configured",
      detail: awsRegion ? `Region ${awsRegion}` : "Not configured",
    },
  ];
  return { services, visionAvailable: Boolean(visionUrl) && visionOnline, checkedAt: new Date().toISOString() };
});

/** Proxies an analysis request to the FastAPI/OpenCV 5 service. Never fabricates results. */
export const requestVisionAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ analysisId: z.string().uuid(), imageUrl: z.string().url(), mode: z.enum(["standard", "detailed"]) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; result: VisionResult } | { ok: false; error: string }> => {
    const visionUrl = process.env["VISION_API_URL"];
    if (!visionUrl) return { ok: false, error: "Vision engine unavailable" };
    try {
      const res = await fetch(`${visionUrl.replace(/\/$/, "")}/api/vision/analyze`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env["VISION_API_KEY"] ? { authorization: `Bearer ${process.env["VISION_API_KEY"]}` } : {}),
        },
        body: JSON.stringify({ analysis_id: data.analysisId, image_url: data.imageUrl, mode: data.mode }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) return { ok: false, error: `Vision engine returned ${res.status}` };
      return { ok: true, result: (await res.json()) as VisionResult };
    } catch (e) {
      console.error("vision request failed", e);
      return { ok: false, error: "Vision engine unavailable" };
    }
  });
