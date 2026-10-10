import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Eye, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel, EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { SourceBadge } from "@/components/app/badges";
import { REPORT_TYPES, reportService, type ReportSummary, type ReportType } from "@/services/reportService";
import type { Report } from "@/types";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — CropSense AI" }, { name: "description", content: "Weekly, monthly and comparison crop-health reports." }] }),
  component: Reports,
});

function Reports() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reports"], queryFn: reportService.list });
  const [busy, setBusy] = useState<ReportType | null>(null);
  const [view, setView] = useState<Report | null>(null);

  async function gen(t: ReportType) {
    setBusy(t);
    try { const r = await reportService.generate(t); qc.invalidateQueries({ queryKey: ["reports"] }); setView(r); } catch { toast.error("Could not generate report"); }
    setBusy(null);
  }

  return (
    <>
      <PageHeader title="Reports" description="Summaries built from your stored analyses." />
      <div className="grid gap-4 md:grid-cols-3">
        {REPORT_TYPES.map((r) => (
          <div key={r.type} className="rounded-md border bg-card p-4">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-medium">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
            <Button className="mt-4" size="sm" onClick={() => gen(r.type)} disabled={busy !== null}>{busy === r.type && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Generate</Button>
          </div>
        ))}
      </div>
      <Panel title="Generated reports" className="mt-4">
        {q.isLoading ? <TableSkeleton rows={3} /> : q.error ? <ErrorState onRetry={() => q.refetch()} /> : q.data?.length ? (
          <ul className="divide-y">
            {q.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">{r.title}<SourceBadge source={r.source} /></div>
                  <div className="font-mono text-xs text-muted-foreground">{r.period_start} → {r.period_end}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setView(r)}><Eye className="h-3.5 w-3.5" /> View</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setView(r); setTimeout(() => window.print(), 300); }} title="PDF rendering will move to the backend; uses the browser print dialog for now"><Download className="h-3.5 w-3.5" /> Export PDF</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Delete report" onClick={async () => { await reportService.remove(r.id); qc.invalidateQueries({ queryKey: ["reports"] }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No reports yet" description="Generate a report above." />}
      </Panel>
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          {view && <ReportView r={view} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportView({ r }: { r: Report }) {
  const s = r.summary as unknown as ReportSummary;
  return (
    <>
      <DialogHeader><DialogTitle>{r.title}</DialogTitle></DialogHeader>
      <p className="font-mono text-xs text-muted-foreground">{r.period_start} → {r.period_end}</p>
      {s.demo_records > 0 && <p className="rounded-md border border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-xs">Includes {s.demo_records} demo record(s) with mock vision values.</p>}
      <div className="grid grid-cols-3 gap-2">
        {[["Analyses", s.total], ["Completed", s.completed], ["Healthy", s.healthy], ["Attention", s.attention], ["High stress", s.high_stress], ["Avg affected", s.avg_affected_area != null ? `${s.avg_affected_area}%` : "—"]].map(([k, v]) => (
          <div key={k} className="rounded-md border p-2"><div className="text-xs text-muted-foreground">{k}</div><div className="font-mono text-lg">{v}</div></div>
        ))}
      </div>
      {s.fields?.length > 0 && (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Field</th><th>Analyses</th><th className="text-right">Avg affected</th></tr></thead>
          <tbody>{s.fields.map((f) => <tr key={f.name} className="border-t"><td className="py-1.5">{f.name}</td><td>{f.analyses}</td><td className="text-right font-mono">{f.avg_affected ?? "—"}%</td></tr>)}</tbody>
        </table>
      )}
    </>
  );
}
