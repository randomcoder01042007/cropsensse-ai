import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ReportType = "weekly" | "monthly" | "comparison";
export const REPORT_TYPES: { type: ReportType; title: string; days: number; description: string }[] = [
  { type: "weekly", title: "Weekly Crop Health Report", days: 7, description: "All analyses and alerts from the last 7 days." },
  { type: "monthly", title: "Monthly Field Report", days: 30, description: "Per-field health summary for the last 30 days." },
  { type: "comparison", title: "Field Comparison", days: 90, description: "Compare affected area and coverage across fields." },
];

export const reportService = {
  async list() {
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  /** Aggregates from stored analyses. PDF rendering is delegated to the backend (POST /api/reports) later. */
  async generate(type: ReportType) {
    const def = REPORT_TYPES.find((r) => r.type === type)!;
    const end = new Date();
    const start = new Date(Date.now() - def.days * 86400000);
    const { data: rows, error } = await supabase
      .from("analyses")
      .select("id, status, source, health_status, affected_area, vegetation_coverage, field_id, fields(name)")
      .gte("created_at", start.toISOString());
    if (error) throw error;
    const completed = rows.filter((r) => r.status === "completed");
    const avg = (k: "affected_area" | "vegetation_coverage") => {
      const v = completed.map((r) => r[k]).filter((x): x is number => x != null);
      return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
    };
    const byField: Record<string, { name: string; count: number; affected: number[] }> = {};
    for (const r of completed) {
      const key = r.field_id ?? "none";
      byField[key] ??= { name: r.fields?.name ?? "Unassigned", count: 0, affected: [] };
      byField[key].count++;
      if (r.affected_area != null) byField[key].affected.push(r.affected_area);
    }
    const summary = {
      total: rows.length,
      completed: completed.length,
      demo_records: rows.filter((r) => r.source === "demo").length,
      healthy: completed.filter((r) => r.health_status === "healthy").length,
      attention: completed.filter((r) => r.health_status === "attention").length,
      high_stress: completed.filter((r) => r.health_status === "high_stress").length,
      avg_affected_area: avg("affected_area"),
      avg_vegetation_coverage: avg("vegetation_coverage"),
      fields: Object.values(byField).map((f) => ({
        name: f.name,
        analyses: f.count,
        avg_affected: f.affected.length ? Math.round((f.affected.reduce((a, b) => a + b, 0) / f.affected.length) * 10) / 10 : null,
      })),
    };
    const { data, error: e2 } = await supabase
      .from("reports")
      .insert({
        report_type: type,
        title: def.title,
        period_start: start.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
        summary: summary as unknown as Json,
        source: summary.demo_records > 0 ? "demo" : "backend",
      })
      .select()
      .single();
    if (e2) throw e2;
    await supabase.from("notifications").insert({ kind: "report", title: `${def.title} generated`, link: "/reports" });
    return data;
  },
  async remove(id: string) {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) throw error;
  },
};

export type ReportSummary = {
  total: number; completed: number; demo_records: number; healthy: number; attention: number; high_stress: number;
  avg_affected_area: number | null; avg_vegetation_coverage: number | null;
  fields: { name: string; analyses: number; avg_affected: number | null }[];
};
