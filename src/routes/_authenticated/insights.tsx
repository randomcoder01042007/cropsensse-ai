import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { HealthBadge } from "@/components/app/badges";
import { cn } from "@/lib/utils";

type Tab = "agent" | "anomalies" | "recommendations";
export const Route = createFileRoute("/_authenticated/insights")({
  validateSearch: (s: Record<string, unknown>): { tab: Tab } => ({ tab: s.tab === "anomalies" || s.tab === "recommendations" ? s.tab : "agent" }),
  head: () => ({ meta: [{ title: "AI Insights — CropSense AI" }, { name: "description", content: "Agent activity, visual anomalies and recommendations across fields." }] }),
  component: Insights,
});

const sevCls = (s: string) => (s === "high" ? "text-destructive" : s === "attention" ? "text-warning-foreground" : "text-primary");

function Insights() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const actions = useQuery({ queryKey: ["all-actions"], queryFn: async () => (await supabase.from("agent_actions").select("*, analyses(crop_type, source, fields(name))").order("created_at", { ascending: false }).limit(60)).data ?? [] });
  const anomalies = useQuery({ queryKey: ["anomalies"], queryFn: async () => (await supabase.from("analyses").select("*, fields(name)").in("health_status", ["attention", "high_stress"]).order("created_at", { ascending: false }).limit(50)).data ?? [] });
  const recs = useQuery({ queryKey: ["all-recs"], queryFn: async () => (await supabase.from("recommendations").select("*, fields(name)").order("created_at", { ascending: false }).limit(60)).data ?? [] });
  const priority = (anomalies.data ?? []).filter((a) => a.health_status === "high_stress");

  return (
    <>
      <PageHeader eyebrow="AI & Insights" title="AI Insights" description="Derived from stored analyses. Nothing here is generated without an underlying analysis record." />
      {priority.length > 0 && (
        <Panel title="Priority alerts" className="mb-4">
          <ul className="space-y-2">{priority.slice(0, 3).map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm"><span>{a.fields?.name ?? "Unassigned"} · {a.crop_type} · {a.affected_area}% affected</span><Link to="/analyses/$id" params={{ id: a.id }} className="text-primary hover:underline">Review</Link></li>
          ))}</ul>
        </Panel>
      )}
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList><TabsTrigger value="agent">Agent Activity</TabsTrigger><TabsTrigger value="anomalies">Anomalies</TabsTrigger><TabsTrigger value="recommendations">Recommendations</TabsTrigger></TabsList>
        <TabsContent value="agent" className="mt-4">
          <Panel>
            {actions.isLoading ? <TableSkeleton /> : actions.error ? <ErrorState onRetry={() => actions.refetch()} /> : actions.data?.length ? (
              <ul className="divide-y">{actions.data.map((e) => (
                <li key={e.id} className="flex gap-3 py-3">
                  {e.actor === "agent" ? <Bot className="mt-0.5 h-4 w-4 text-primary" /> : <Eye className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{e.action}</span><span className="font-mono text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>{e.analyses?.source === "demo" && <span className="font-mono text-[10px] text-warning-foreground">DEMO</span>}</div>
                    <p className="text-sm text-muted-foreground">{e.description}</p>
                  </div>
                  <Link to="/analyses/$id" params={{ id: e.analysis_id }} className="text-sm text-primary hover:underline">Open</Link>
                </li>))}</ul>
            ) : <EmptyState title="No agent activity yet" />}
          </Panel>
        </TabsContent>
        <TabsContent value="anomalies" className="mt-4">
          <Panel>
            {anomalies.isLoading ? <TableSkeleton /> : anomalies.data?.length ? (
              <ul className="divide-y">{anomalies.data.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div><div className="font-medium">Visual anomaly · {a.fields?.name ?? "Unassigned"}</div><div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()} · {a.suspicious_region_count} region(s), {a.affected_area}% affected</div></div>
                  <div className="flex items-center gap-3"><HealthBadge status={a.health_status} /><Link to="/analyses/$id" params={{ id: a.id }} className="text-primary hover:underline">Inspect</Link></div>
                </li>))}</ul>
            ) : <EmptyState title="No visual anomalies" description="Analyses flagged for attention appear here." />}
          </Panel>
        </TabsContent>
        <TabsContent value="recommendations" className="mt-4">
          {recs.isLoading ? <TableSkeleton /> : recs.data?.length ? (
            <div className="grid gap-3 md:grid-cols-2">{recs.data.map((r) => (
              <div key={r.id} className="rounded-md border bg-card p-4">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{r.title}</h3><span className={cn("font-mono text-[11px] uppercase", sevCls(r.severity))}>{r.severity}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} · {r.fields?.name ?? "Unassigned"}</p>
                <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
                {r.next_step && <p className="mt-2 text-sm"><span className="font-medium">Next step:</span> {r.next_step}</p>}
              </div>))}</div>
          ) : <EmptyState title="No recommendations yet" />}
        </TabsContent>
      </Tabs>
    </>
  );
}
