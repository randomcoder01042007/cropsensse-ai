import type { AgentDecision, AgentInput } from "@/types";

/**
 * Agent abstraction. A model-backed provider can implement `AgentProvider`
 * (configured through AGENT_PROVIDER on the server). Until then the
 * deterministic rule policy below is used and labelled as `engine: "rules"` —
 * it does not reason, it applies transparent thresholds.
 */
export interface AgentProvider {
  readonly name: string;
  decide(input: AgentInput, stage: "initial" | "after_region_analysis"): Promise<AgentDecision>;
}

export const rulesAgent: AgentProvider = {
  name: "Rule-based policy (demo)",
  async decide({ vision, previous, diagnosis }, stage) {
    const q = vision.image_quality.score;
    const affected = vision.measurements["affected_area"]?.value ?? null;
    const high = vision.regions.filter((r) => r.severity === "high");
    const recs: AgentDecision["recommendations"] = [];

    if (q != null && q < 55) {
      return {
        engine: "rules",
        action: "REQUEST_NEW_IMAGE",
        rationale: `Image quality score ${q} is below the 55 threshold; measurements would be unreliable.`,
        recommendations: [
          { title: "Additional image recommended", reason: "Image quality is too low for a reliable visual assessment.", next_step: "Capture a sharper image in even daylight and re-run the analysis.", severity: "attention" },
        ],
      };
    }

    if (diagnosis && (diagnosis.status === "uncertain" || diagnosis.status === "crop_mismatch")) {
      const rationale = diagnosis.message ?? (diagnosis.status === "uncertain" ? "The disease model could not reach a confident result." : "The image does not appear to match the selected crop.");
      return {
        engine: "rules",
        action: "REQUEST_NEW_IMAGE",
        rationale,
        recommendations: [
          { title: "Additional image recommended", reason: rationale, next_step: "Capture one leaf filling the frame, in focus, in daylight, on a plain background.", severity: "attention" },
        ],
      };
    }

    if (stage === "initial" && vision.regions.length > 0) {
      return {
        engine: "rules",
        action: "REQUEST_REGION_ANALYSIS",
        rationale: `${vision.regions.length} suspicious region(s) found; requesting focused analysis on each before assessing.`,
        target_region_ids: vision.regions.map((r) => r.id),
        recommendations: [],
      };
    }

    if (q != null && q < 70)
      recs.push({ title: "Image quality may affect reliability", reason: `Quality score ${q} is below the recommended 70.`, next_step: "Consider re-capturing with less motion or better lighting.", severity: "info" });
    if (vision.regions.length > 0)
      recs.push({ title: "Visual anomaly requires attention", reason: `${vision.regions.length} region(s) show visual stress patterns covering ${affected ?? "?"}% of the image.`, next_step: "Inspect the highlighted regions in the field.", severity: high.length ? "high" : "attention" });
    if (previous)
      recs.push({ title: "Compare with previous field analysis", reason: "A previous analysis exists for this field.", next_step: "Open the field page to review the trend over time.", severity: "info" });
    else
      recs.push({ title: "Establish a baseline", reason: "No earlier analysis exists for this field.", next_step: "Repeat the analysis in 7 days to track change.", severity: "info" });

    if (diagnosis?.status === "identified") {
      if (diagnosis.is_healthy) {
        recs.unshift({ title: "No disease detected", reason: "The disease model classified this leaf as healthy.", next_step: "Keep monitoring the field regularly.", severity: "info" });
        return {
          engine: "rules",
          action: "FINAL_ASSESSMENT",
          rationale: "Disease model classified the leaf as healthy (AI suggestion, confirm with an expert).",
          assessment: { health: "healthy", summary: "No disease detected in the analysed image. AI suggestion, confirm with an expert." },
          recommendations: recs,
        };
      }
      if (diagnosis.disease) {
        const dHealth = affected != null && affected >= 12 ? "high_stress" : "attention";
        const mgmt = diagnosis.management?.[0];
        recs.unshift({
          title: diagnosis.disease,
          reason: diagnosis.cause ?? "Identified by the disease model.",
          next_step: mgmt ?? "Confirm with a local agriculture expert.",
          severity: dHealth === "high_stress" ? "high" : "attention",
        });
        return {
          engine: "rules",
          action: "FINAL_ASSESSMENT",
          rationale: `Disease model identified ${diagnosis.disease} (AI suggestion, confirm with an expert).`,
          assessment: { health: dHealth, summary: `${diagnosis.disease} detected. AI suggestion, confirm with an expert.` },
          recommendations: recs,
        };
      }
    }

    const health = affected == null ? "unknown" : affected >= 12 ? "high_stress" : affected >= 3 ? "attention" : "healthy";
    const needsHuman = affected != null && affected >= 20;
    return {
      engine: "rules",
      action: needsHuman ? "HUMAN_REVIEW" : "FINAL_ASSESSMENT",
      rationale: needsHuman
        ? `Affected area ${affected}% exceeds 20%; flagging for human agronomist review.`
        : `Affected area ${affected ?? "n/a"}% after region analysis; issuing visual assessment.`,
      assessment: {
        health,
        summary:
          health === "healthy"
            ? "No significant visual stress detected in the analysed image."
            : health === "attention"
              ? "Localised visual stress detected. Attention recommended; this is a visual assessment, not a diagnosis."
              : "Widespread visual stress detected. Field inspection is strongly recommended; this is a visual assessment, not a diagnosis.",
      },
      recommendations: recs,
    };
  },
};

export const agentService = { provider: rulesAgent };
