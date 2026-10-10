import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, EmptyState, ErrorState } from "@/components/app/states";
import { HealthBadge, SourceBadge, StatusBadge } from "@/components/app/badges";
import { fieldService } from "@/services/fieldService";
import { FieldDialog } from "./fields.index";

export const Route = createFileRoute("/_authenticated/fields/$id")({
  head: () => ({ meta: [{ title: "Field detail — CropSense AI" }, { name: "description", content: "Field status, trend and analysis history." }] }),
  component: FieldDetail,
});

function FieldDetail() {
  const { id } = Route.useParams();
  const field = useQuery({ queryKey: ["field", id], queryFn: () => fieldService.get(id) });
  const analyses = useQuery({ queryKey: ["field-analyses", id], queryFn: () => fieldService.analyses(id) });
  const [edit, setEdit] = useState(false);

  if (field.isLoading) return <Skeleton className="h-64 w-full" />;
  if (field.error || !field.data) return <ErrorState title="Field not found" onRetry={() => field.refetch()} />;
  const f = field.data;
  const list = analyses.data ?? [];
  const done = list.filter((a) => a.status === "completed");
  const latest = done[0];
  const trend = [...done].reverse().map((a) => ({ d: new Date(a.created_at).toLocaleDateString(), affected: a.affected_area, coverage: a.vegetation_coverage }));
  const alerts = done.filter((a) => a.health_status === "attention" || a.health_status === "high_stress").slice(0, 5);

  return (
    <>
      <Link to="/fields" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Fields</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{f.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{f.location || "No location"} · {f.primary_crop || "No crop"} · {f.area_hectares ?? "—"} ha</p>
        </div>
        <div className="flex gap-2"><HealthBadge status={f.health_status} /><SourceBadge source={f.source} /><Button size="sm" variant="outline" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><Button size="sm" asChild><Link to="/analyze">New analysis</Link></Button></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Latest analysis">
          {latest ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(latest.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Affected area</span><span className="font-mono">{latest.affected_area ?? "—"}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Coverage</span><span className="font-mono">{latest.vegetation_coverage ?? "—"}%</span></div>
              <Link to="/analyses/$id" params={{ id: latest.id }} className="block pt-2 text-primary hover:underline">Open result</Link>
            </div>
          ) : <p className="text-sm text-muted-foreground">No completed analysis yet.</p>}
        </Panel>
        <Panel title="Historical trend" className="lg:col-span-2">
          {trend.length > 1 ? (
            <div className="h-52"><ResponsiveContainer><LineChart data={trend} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
              <Line dataKey="coverage" name="Vegetation %" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line dataKey="affected" name="Affected %" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer></div>
          ) : <p className="text-sm text-muted-foreground">At least two completed analyses are needed to show a trend.</p>}
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Recent alerts">
          {alerts.length ? <ul className="space-y-2">{alerts.map((a) => <li key={a.id}><Link to="/analyses/$id" params={{ id: a.id }} className="flex items-center justify-between text-sm hover:underline"><span>{new Date(a.created_at).toLocaleDateString()}</span><HealthBadge status={a.health_status} /></Link></li>)}</ul> : <p className="text-sm text-muted-foreground">No alerts.</p>}
        </Panel>
        <Panel title="Analysis history" className="lg:col-span-2">
          {list.length ? (
            <ul className="divide-y">{list.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-tabular text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                <span className="flex items-center gap-2">{a.status === "completed" ? <HealthBadge status={a.health_status} /> : <StatusBadge status={a.status} />}<SourceBadge source={a.source} /><Link to="/analyses/$id" params={{ id: a.id }} className="text-primary hover:underline">View</Link></span>
              </li>))}</ul>
          ) : <EmptyState title="No analyses for this field" />}
        </Panel>
      </div>
      <FieldDialog open={edit} onOpenChange={setEdit} field={f} />
    </>
  );
}
