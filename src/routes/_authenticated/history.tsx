import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { AnalysisTable } from "@/components/app/AnalysisTable";
import { listAnalyses } from "@/services/analysisService";

export const Route = createFileRoute("/_authenticated/history")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof s["q"] === "string" ? s["q"] : undefined }),
  head: () => ({ meta: [{ title: "Analysis History — CropSense AI" }, { name: "description", content: "Search and filter all crop analyses." }] }),
  component: HistoryPage,
});

const PAGE = 10;

function HistoryPage() {
  const search = Route.useSearch();
  const q = useQuery({ queryKey: ["analyses"], queryFn: () => listAnalyses(1000) });
  const [text, setText] = useState(search.q ?? "");
  const [field, setField] = useState("all");
  const [crop, setCrop] = useState("all");
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState("all");
  const [from, setFrom] = useState("");
  const [sort, setSort] = useState<"new" | "old" | "affected">("new");
  const [page, setPage] = useState(0);

  const rows = q.data ?? [];
  const fieldsOpts = [...new Set(rows.map((r) => r.fields?.name).filter(Boolean))] as string[];
  const cropOpts = [...new Set(rows.map((r) => r.crop_type))];

  const filtered = useMemo(() => {
    const t = text.toLowerCase();
    let out = rows.filter((r) =>
      (!t || [r.crop_type, r.fields?.name, r.agent_decision, r.id].some((v) => v?.toLowerCase().includes(t))) &&
      (field === "all" || r.fields?.name === field) &&
      (crop === "all" || r.crop_type === crop) &&
      (status === "all" || (status === r.status) || status === r.health_status) &&
      (mode === "all" || r.mode === mode) &&
      (!from || r.created_at >= from),
    );
    out = [...out].sort((a, b) => sort === "affected" ? (b.affected_area ?? -1) - (a.affected_area ?? -1) : sort === "old" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
    return out;
  }, [rows, text, field, crop, status, mode, from, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const view = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const reset = () => setPage(0);

  return (
    <>
      <PageHeader title="Analysis History" description="Every analysis in your workspace." actions={<Button asChild><Link to="/analyze">New Analysis</Link></Button>} />
      <Panel>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          <Input className="lg:col-span-2" placeholder="Search…" value={text} onChange={(e) => { setText(e.target.value); reset(); }} aria-label="Search analyses" />
          <F value={field} set={(v) => { setField(v); reset(); }} label="Field" opts={fieldsOpts} />
          <F value={crop} set={(v) => { setCrop(v); reset(); }} label="Crop" opts={cropOpts} />
          <F value={status} set={(v) => { setStatus(v); reset(); }} label="Status" opts={["completed", "processing", "failed", "vision_unavailable", "healthy", "attention", "high_stress"]} />
          <F value={mode} set={(v) => { setMode(v); reset(); }} label="Type" opts={["standard", "detailed"]} />
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} aria-label="From date" />
        </div>
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} result(s)</span>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="new">Newest first</SelectItem><SelectItem value="old">Oldest first</SelectItem><SelectItem value="affected">Most affected area</SelectItem></SelectContent>
          </Select>
        </div>
        {q.isLoading ? <TableSkeleton /> : q.error ? <ErrorState message="Could not load history." onRetry={() => q.refetch()} /> : view.length ? (
          <>
            <AnalysisTable rows={view} />
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="font-tabular text-muted-foreground">{page + 1} / {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </>
        ) : <EmptyState title={rows.length ? "No matches" : "No analyses yet"} description={rows.length ? "Try different filters." : "Run your first analysis to build history."} />}
      </Panel>
    </>
  );
}

function F({ value, set, label, opts }: { value: string; set: (v: string) => void; label: string; opts: string[] }) {
  return (
    <Select value={value} onValueChange={set}>
      <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {opts.map((o) => <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
