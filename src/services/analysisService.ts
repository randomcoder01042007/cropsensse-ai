import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  PIPELINE_STEPS,
  type Analysis,
  type AnalysisMode,
  type PipelineStep,
  type PipelineStepKey,
  type StepState,
  type VisionResult,
} from "@/types";
import { demoVisionAdapter, httpVisionAdapter, VisionUnavailableError, type VisionAdapter } from "./visionService";
import { agentService } from "./agentService";
import { getUserId } from "./authService";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"] as const;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function validateUpload(file: File | null | undefined): string | null {
  if (!file) return "Please choose an image or video to analyse.";
  if (file.size === 0) return "The selected file is empty.";
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type))
    return "Unsupported file type. Use JPG, PNG, WEBP or MP4.";
  const limit = file.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) return `File is too large. Maximum is ${Math.round(limit / 1024 / 1024)} MB.`;
  return null;
}

const initialPipeline = (): PipelineStep[] => PIPELINE_STEPS.map((s) => ({ ...s, state: "pending" as StepState }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function listAnalyses(limit = 200) {
  const { data, error } = await supabase
    .from("analyses")
    .select("*, fields(name), analysis_images(storage_path, kind, mime_type), analysis_diagnoses(disease, status)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getAnalysis(id: string) {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "*, fields(id, name, location), analysis_images(*), analysis_regions(*), analysis_measurements(*), agent_actions(*), recommendations(*), analysis_diagnoses(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export type AnalysisDetail = NonNullable<Awaited<ReturnType<typeof getAnalysis>>>;

export async function signedUrl(path: string, bucket = "uploads") {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function createAnalysis(input: {
  file: File;
  fieldId: string | null;
  cropType: string;
  mode: AnalysisMode;
  notes: string;
  demo: boolean;
}) {
  const err = validateUpload(input.file);
  if (err) throw new Error(err);
  const userId = await getUserId();

  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert({
      field_id: input.fieldId,
      crop_type: input.cropType,
      mode: input.mode,
      notes: input.notes || null,
      status: "processing",
      source: input.demo ? "demo" : "backend",
      pipeline: initialPipeline() as unknown as Json,
    })
    .select()
    .single();
  if (error) throw error;

  const ext = input.file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${analysis.id}/original.${ext}`;
  const up = await supabase.storage.from("uploads").upload(path, input.file, { contentType: input.file.type, upsert: true });
  if (up.error) {
    await supabase.from("analyses").update({ status: "failed", error_message: "Upload failed: " + up.error.message }).eq("id", analysis.id);
    throw new Error("Upload failed. Please check your connection and retry.");
  }
  await supabase.from("analysis_images").insert({
    analysis_id: analysis.id,
    kind: input.file.type.startsWith("video/") ? "original_video" : "original",
    storage_path: path,
    mime_type: input.file.type,
    size_bytes: input.file.size,
  });

  // Fire-and-forget pipeline; the result page polls for progress.
  void runPipeline(analysis, path, input.file, input.demo ? demoVisionAdapter : httpVisionAdapter);
  return analysis;
}

/** Reads the picked file in the browser and returns it as base64 (no data: prefix). */
async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

async function runPipeline(analysis: Analysis, path: string, file: File, adapter: VisionAdapter) {
  const steps = initialPipeline();
  const id = analysis.id;
  const demo = adapter.kind === "demo";
  const pace = demo ? 900 : 0;

  const set = async (key: PipelineStepKey, state: StepState, detail?: string) => {
    const s = steps.find((x) => x.key === key)!;
    s.state = state;
    s.at = new Date().toISOString();
    if (detail) s.detail = detail;
    await supabase.from("analyses").update({ pipeline: steps as unknown as Json }).eq("id", id);
  };
  const step = async (key: PipelineStepKey, detail?: string) => {
    await set(key, "processing");
    await sleep(pace);
    await set(key, "completed", detail);
  };
  let actionSeq = 0;
  const log = (actor: string, action: string, description: string, status = "completed") =>
    supabase.from("agent_actions").insert({ analysis_id: id, seq: ++actionSeq, actor, action, description, status });

  try {
    await step("upload", `${(file.size / 1024 / 1024).toFixed(2)} MB ${file.type}`);
    const imageUrl = await signedUrl(path);
    if (!imageUrl) throw new Error("Could not create a secure link to the uploaded file.");

    await set("quality", "processing");
    let vision: VisionResult;
    try {
      // Send the image bytes straight to the OpenCV service so it never has to download from storage.
      const imageBase64 = !demo && file.type.startsWith("image/") ? await fileToBase64(file) : undefined;
      vision = await adapter.analyze({ analysisId: id, imageUrl, mode: analysis.mode as AnalysisMode, crop: analysis.crop_type, ...(imageBase64 ? { imageBase64 } : {}) });
    } catch (e) {
      if (e instanceof VisionUnavailableError) {
        await set("quality", "failed", "Vision engine unavailable");
        await supabase
          .from("analyses")
          .update({
            status: "vision_unavailable",
            error_message: "Your image was uploaded, but computer-vision processing is currently unavailable.",
          })
          .eq("id", id);
        await notify("analysis_failed", "Vision engine unavailable", `/analyses/${id}`);
        return;
      }
      throw e;
    }
    await sleep(pace);
    await set("quality", "completed", vision.image_quality.score != null ? `Score ${vision.image_quality.score}` : "No score returned");
    await step("preprocess", "Resize, denoise, colour normalisation");
    await step("segmentation", vision.vegetation.coverage_percent != null ? `${vision.vegetation.coverage_percent}% vegetation` : undefined);
    await step("regions", `${vision.regions.length} suspicious region(s)`);
    await step("measurements", `${Object.keys(vision.measurements).length} measurements`);
    await log("vision", "OpenCV 5 analysed image", `${demo ? "[Demo] " : ""}Segmented vegetation and found ${vision.regions.length} suspicious region(s).`);
    if (vision.regions.length) await log("vision", "Suspicious visual region detected", vision.regions.map((r) => `${r.id} (${r.area_percent ?? "?"}%)`).join(", "));

    // Agent loop: perception → decision → action → new perception → result
    await set("agent", "processing");
    const { data: prev } = analysis.field_id
      ? await supabase
          .from("analyses")
          .select("id, affected_area, vegetation_coverage, created_at")
          .eq("field_id", analysis.field_id)
          .eq("status", "completed")
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };
    const agent = agentService.provider;
    const agentInput = { vision, image: { mime: file.type, size: file.size }, previous: prev, diagnosis: demo ? null : (vision.diagnosis ?? null) };
    let decision = await agent.decide(agentInput, "initial");
    await sleep(pace);
    await log("agent", "Agent evaluated region", decision.rationale);
    await set("agent", "completed", decision.action);

    if (decision.action === "REQUEST_REGION_ANALYSIS") {
      await log("agent", "Agent requested additional analysis", `REQUEST_REGION_ANALYSIS → ${decision.target_region_ids?.join(", ")}`);
      await set("additional", "processing");
      vision.regions = await adapter.analyzeRegions({ analysisId: id, imageUrl, regions: vision.regions });
      await sleep(pace);
      await log("vision", "OpenCV analysed selected region", `${demo ? "[Demo] " : ""}Focused analysis on ${vision.regions.length} region(s).`);
      await set("additional", "completed");
      decision = await agent.decide(agentInput, "after_region_analysis");
    } else {
      await set("additional", "skipped", "Not requested by agent");
    }

    await set("final", "processing");
    await sleep(pace);
    await log("agent", decision.action === "HUMAN_REVIEW" ? "Agent requested human review" : decision.action === "REQUEST_NEW_IMAGE" ? "Agent requested new image" : "Agent generated final assessment", decision.rationale);

    const affected = vision.measurements["affected_area"]?.value ?? null;
    if (vision.regions.length)
      await supabase.from("analysis_regions").insert(
        vision.regions.map((r) => ({
          analysis_id: id,
          label: r.label,
          x: r.bbox.x, y: r.bbox.y, w: r.bbox.w, h: r.bbox.h,
          contour: (r.contour ?? null) as unknown as Json,
          area_percent: r.area_percent,
          severity: r.severity,
          reanalyzed: decision.action !== "REQUEST_NEW_IMAGE",
        })),
      );
    const ms = Object.entries(vision.measurements);
    if (ms.length)
      await supabase.from("analysis_measurements").insert(ms.map(([key, m]) => ({ analysis_id: id, key, label: m.label, value: m.value, unit: m.unit ?? null })));
    if (!demo && vision.diagnosis) {
      try {
        const d = vision.diagnosis;
        const { error: dErr } = await supabase.from("analysis_diagnoses").insert({
          analysis_id: id,
          status: d.status,
          crop: d.crop ?? null,
          disease: d.disease ?? null,
          is_healthy: d.is_healthy ?? null,
          cause: d.cause ?? null,
          message: d.message ?? null,
          disclaimer: d.disclaimer ?? null,
          confidence: d.confidence ?? null,
          symptoms: (d.symptoms ?? []) as unknown as Json,
          prevention: (d.prevention ?? []) as unknown as Json,
          management: (d.management ?? []) as unknown as Json,
          other_possibilities: (d.possible_matches ?? d.other_possibilities ?? []) as unknown as Json,
          looks_like: (d.looks_like ?? null) as unknown as Json,
        });
        if (dErr) console.error("diagnosis storage failed", dErr);
      } catch (e) {
        console.error("diagnosis storage failed", e);
      }
    }
    if (decision.recommendations.length)
      await supabase.from("recommendations").insert(
        decision.recommendations.map((r) => ({ analysis_id: id, field_id: analysis.field_id, title: r.title, reason: r.reason, next_step: r.next_step, severity: r.severity })),
      );

    const health = decision.assessment?.health ?? "unknown";
    await set("final", "completed", health);
    await supabase
      .from("analyses")
      .update({
        status: "completed",
        image_quality_score: vision.image_quality.score,
        vegetation_coverage: vision.vegetation.coverage_percent,
        affected_area: affected,
        suspicious_region_count: vision.regions.length,
        confidence: vision.confidence ?? null,
        health_status: health,
        agent_decision: decision.action,
        final_assessment: decision.assessment?.summary ?? decision.rationale,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (analysis.field_id && health !== "unknown") await supabase.from("fields").update({ health_status: health }).eq("id", analysis.field_id);
    if (vision.processed_image_url)
      await supabase.from("analysis_images").insert({ analysis_id: id, kind: "processed_url", storage_path: vision.processed_image_url });
    await notify(vision.regions.length ? "anomaly" : "completed", vision.regions.length ? "Visual anomaly detected" : "New analysis completed", `/analyses/${id}`);
  } catch (e) {
    console.error(e);
    const current = steps.find((s) => s.state === "processing");
    if (current) await set(current.key, "failed");
    await supabase.from("analyses").update({ status: "failed", error_message: e instanceof Error ? e.message : "Analysis failed" }).eq("id", id);
    await notify("analysis_failed", "Analysis failed", `/analyses/${id}`);
  }
}

async function notify(kind: string, title: string, link: string) {
  await supabase.from("notifications").insert({ kind, title, link });
}

export function pipelineOf(a: Pick<Analysis, "pipeline">): PipelineStep[] {
  const p = a.pipeline as unknown as PipelineStep[] | null;
  return Array.isArray(p) && p.length ? p : initialPipeline();
}