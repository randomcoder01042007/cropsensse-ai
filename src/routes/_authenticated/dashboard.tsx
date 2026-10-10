import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ImageIcon, Leaf, Map, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, Panel, EmptyState, ErrorState } from "@/components/app/states";
import { AnalysisTable } from "@/components/app/AnalysisTable";
import { listAnalyses } from "@/services/analysisService";
import { fieldService, createDemoFields } from "@/services/fieldService";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — CropSense AI" }, { name: "description", content: "Field health overview and recent crop analyses." }] }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const qc = useQueryClient();
  const analyses = useQuery({ queryKey: ["analyses"], queryFn: () => listAnalyses() });
  const fields = useQuery({ queryKey: ["fields"], queryFn: fieldService.list });
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const stats = useMemo(() => {
    const a = analyses.data ?? [];
    const done = a.filter((x) => x.status === "completed");
    const weekAgo = Date.now() - 7 * 864e5;
    return {
      fields: fields.data?.length ?? 0,
      images: a.length,
      imagesWeek: a.filter((x) => +new Date(x.created_at) > weekAgo).length,
      healthy: done.filter((x) => x.health_status === "healthy").length,
      alerts: done.filter((x) => x.health_status === "attention" || x.health_status === "high_stress").length,
      demo: a.some((x) => x.source === "demo"),
      done,
    };
  }, [analyses.data, fields.data]);

  const series = useMemo(() => {
    const days: Record<string, { day: string; Healthy: number; Attention: number; "High stress": number }> = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      days[d] = { day: d.slice(5), Healthy: 0, Attention: 0, "High stress": 0 };
    }
    for (const x of stats.done) {
      const d = days[x.created_at.slice(0, 10)];
      if (!d) continue;
      if (x.health_status === "healthy") d.Healthy++;
      else if (x.health_status === "attention") d.Attention++;
      else if (x.health_status === "high_stress") d["High stress"]++;
    }
    return Object.values(days);
  }, [stats.done, range]);

  const dist = useMemo(() => {
    const f = fields.data ?? [];
    return [
      { name: "Healthy", value: f.filter((x) => x.health_status === "healthy").length, color: "var(--chart-1)" },
      { name: "Attention", value: f.filter((x) => x.health_status === "attention").length, color: "var(--chart-2)" },
      { name: "High stress", value: f.filter((x) => x.health_status === "high_stress").length, color: "var(--chart-3)" },
      { name: "Not assessed", value: f.filter((x) => x.health_status === "unknown").length, color: "var(--chart-5)" },
    ].filter((d) => d.value > 0);
  }, [fields.data]);

  const loading = analyses.isLoading || fields.isLoading;
  if (analyses.error || fields.error) return <ErrorState message="We couldn't load your dashboard. Check your connection." onRetry={() => { analyses.refetch(); fields.refetch(); }} />;

  return (
    <>
      <PageHeader
        title={greeting()}
        description="Monitor your fields and review recent crop analysis."
        actions={<Button asChild><Link to="/analyze"><Plus className="h-4 w-4" /> New Analysis</Link></Button>}
      />
      {stats.demo && (
        <p className="mb-4 rounded-md border border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          Some records below were produced in demo mode with mock vision values. They are tagged “Demo” throughout.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Fields Monitored", v: stats.fields, icon: Map, d: "Fields in your workspace", t: null },
          { label: "Images Analyzed", v: stats.images, icon: ImageIcon, d: "All-time uploads", t: `+${stats.imagesWeek} this week` },
          { label: "Healthy Areas", v: stats.healthy, icon: Leaf, d: "Analyses assessed healthy", t: stats.done.length ? `${Math.round((stats.healthy / stats.done.length) * 100)}% of completed` : null },
          { label: "Visual Alerts", v: stats.alerts, icon: AlertTriangle, d: "Attention or high stress", t: null },
        ].map((m) => (
          <div key={m.label} className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <div className="mt-2 font-tabular text-3xl font-semibold">{m.v}</div>}
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{m.d}</span>
              {m.t && <span className="text-primary">{m.t}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel
          title="Crop Health Overview"
          actions={
            <div className="flex rounded-md border p-0.5 text-xs">
              {([7, 30, 90] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`rounded-sm px-2 py-0.5 ${range === r ? "bg-accent font-medium" : "text-muted-foreground"}`}>{r}D</button>
              ))}
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }} />
                <Area type="monotone" dataKey="Healthy" stackId="1" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} />
                <Area type="monotone" dataKey="Attention" stackId="1" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="High stress" stackId="1" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Field Health Distribution">
          {dist.length ? (
            <div className="flex h-64 flex-col">
              <div className="flex-1">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dist} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                      {dist.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="grid grid-cols-2 gap-1 text-xs">
                {dist.map((d) => <li key={d.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />{d.name} · {d.value}</li>)}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="No fields yet"
              description="Add a field, or load three demo fields to explore."
              action={<Button size="sm" variant="outline" onClick={async () => { try { await createDemoFields(); qc.invalidateQueries({ queryKey: ["fields"] }); toast.success("Demo fields added"); } catch { toast.error("Could not add demo fields"); } }}>Load demo fields</Button>}
            />
          )}
        </Panel>
      </div>

      <Panel title="Recent Analysis" className="mt-4" actions={<Link to="/history" className="text-xs text-primary hover:underline">View all</Link>}>
        {loading ? <Skeleton className="h-40 w-full" /> : analyses.data?.length ? (
          <AnalysisTable rows={analyses.data.slice(0, 6)} showImage />
        ) : (
          <EmptyState title="No analyses yet" description="Upload your first crop image to see computer-vision results here." action={<Button asChild size="sm"><Link to="/analyze">Start Analysis</Link></Button>} />
        )}
      </Panel>
    </>
  );
}
