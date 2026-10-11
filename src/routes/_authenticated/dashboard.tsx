import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Bird, CalendarDays, Droplets, Egg, Loader2, Skull, TrendingUp, Wheat } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildAlerts, computeMetrics, num, alertTone } from "@/lib/poultry";
import type { DailyRecord, Flock } from "@/lib/poultry";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PoultryPulse" },
      { name: "description", content: "Flock performance overview, production trends and early-warning alerts." },
      { property: "og:title", content: "Dashboard — PoultryPulse" },
      { property: "og:description", content: "Live poultry farm performance and alerts." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [flocksRes, recordsRes] = await Promise.all([
        supabase.from("flocks").select("*").order("created_at", { ascending: false }),
        supabase.from("daily_records").select("*").order("record_date", { ascending: true }),
      ]);
      if (flocksRes.error) throw flocksRes.error;
      if (recordsRes.error) throw recordsRes.error;
      return {
        flocks: (flocksRes.data ?? []) as unknown as Flock[],
        records: (recordsRes.data ?? []) as unknown as DailyRecord[],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const flocks = data?.flocks ?? [];
  const records = data?.records ?? [];
  const active = flocks.filter((f) => f.status === "active");
  const alerts = active.flatMap((f) => buildAlerts(f, records.filter((r) => r.flock_id === f.id)));

  const birds = active.reduce((s, f) => s + f.current_count, 0);
  const totals = records.reduce(
    (acc, r) => ({
      mortality: acc.mortality + num(r.mortality) + num(r.culls),
      feed: acc.feed + num(r.feed_kg),
      water: acc.water + num(r.water_litres),
      eggs: acc.eggs + num(r.eggs_collected),
    }),
    { mortality: 0, feed: 0, water: 0, eggs: 0 },
  );

  const byDate = new Map<string, { date: string; mortality: number; feed: number; eggs: number }>();
  for (const r of records) {
    const row = byDate.get(r.record_date) ?? { date: r.record_date, mortality: 0, feed: 0, eggs: 0 };
    row.mortality += num(r.mortality) + num(r.culls);
    row.feed += num(r.feed_kg);
    row.eggs += num(r.eggs_collected);
    byDate.set(r.record_date, row);
  }
  const chart = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  const stats = [
    { label: "Active birds", value: birds.toLocaleString(), icon: Bird },
    { label: "Total losses", value: totals.mortality.toLocaleString(), icon: Skull },
    { label: "Feed used (kg)", value: totals.feed.toFixed(0), icon: Wheat },
    { label: "Water used (L)", value: totals.water.toFixed(0), icon: Droplets },
    { label: "Eggs collected", value: totals.eggs.toLocaleString(), icon: Egg },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><span className="size-2 animate-pulse rounded-full bg-success" /> Live farm intelligence</p>
          <h1 className="text-3xl font-bold md:text-4xl">Farm overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} active flock{active.length === 1 ? "" : "s"} · {records.length} daily records
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/flocks">Manage flocks <ArrowRight /></Link>
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s, index) => (
          <div key={s.label} className="group rounded-lg border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <div className="flex items-start justify-between"><span className="flex size-10 items-center justify-center rounded-md bg-secondary text-primary"><s.icon className="size-5" /></span><span className="text-xs font-semibold text-muted-foreground">0{index + 1}</span></div>
            <p className="mt-5 text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs font-medium uppercase text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm lg:col-span-2 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Production trends</h2><p className="mt-1 text-xs text-muted-foreground">Losses, feed use and eggs across the latest records</p></div><span className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground"><CalendarDays className="size-4" /> Last 30 days</span></div>
          {chart.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No daily records yet — add one from a flock page.
            </p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Line type="monotone" dataKey="mortality" name="Losses" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="feed" name="Feed (kg)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="eggs" name="Eggs" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm md:p-6">
          <h2 className="flex items-center justify-between gap-2 text-lg font-bold">
            <span className="flex items-center gap-2"><AlertTriangle className="size-5 text-warning" /> Alert centre</span><span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{alerts.length}</span>
          </h2>
          <div className="mt-4 space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No warnings. Your flocks look steady.</p>
            ) : (
              alerts.slice(0, 8).map((a) => (
                <Link
                  key={a.id}
                  to="/flocks/$flockId"
                  params={{ flockId: a.flockId }}
                  className={`block rounded-md border p-3 text-sm transition-transform hover:translate-x-1 ${alertTone[a.level]}`}
                >
                  <p className="font-semibold">{a.title}</p>
                  <p className="mt-1 opacity-90">{a.message}</p>
                  <p className="mt-1 text-xs opacity-70">{a.flockName}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((f) => {
          const m = computeMetrics(f, records.filter((r) => r.flock_id === f.id));
          return (
            <Link
              key={f.id}
              to="/flocks/$flockId"
              params={{ flockId: f.id }}
              className="group rounded-lg border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-md bg-secondary text-primary"><Bird className="size-5" /></span><TrendingUp className="size-4 text-success" /></div>
              <p className="mt-4 font-display text-lg font-semibold">{f.name}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {f.bird_type} · {f.current_count} birds
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Mortality</dt>
                  <dd className="font-semibold">{m.mortalityRate.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">FCR</dt>
                  <dd className="font-semibold">{m.fcr ? m.fcr.toFixed(2) : "—"}</dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
