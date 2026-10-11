import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { alertTone, buildAlerts, computeMetrics, num } from "@/lib/poultry";
import type { DailyRecord, Flock, HealthEvent } from "@/lib/poultry";

export const Route = createFileRoute("/_authenticated/flocks/$flockId")({
  head: () => ({
    meta: [
      { title: "Flock detail — PoultryPulse" },
      { name: "description", content: "Daily records, performance metrics, health log and alerts for one flock." },
      { property: "og:title", content: "Flock detail — PoultryPulse" },
      { property: "og:description", content: "Daily records and performance for a poultry batch." },
    ],
  }),
  component: FlockDetail,
});

const emptyRecord = {
  record_date: new Date().toISOString().slice(0, 10),
  mortality: "0",
  culls: "0",
  feed_kg: "0",
  water_litres: "0",
  eggs_collected: "0",
  avg_weight_g: "",
  temperature_c: "",
  humidity_pct: "",
  notes: "",
};

function FlockDetail() {
  const { flockId } = useParams({ from: "/_authenticated/flocks/$flockId" });
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyRecord);
  const [event, setEvent] = useState({ event_date: emptyRecord.record_date, event_type: "vaccination", title: "", details: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["flock", flockId],
    queryFn: async () => {
      const [f, r, h] = await Promise.all([
        supabase.from("flocks").select("*").eq("id", flockId).maybeSingle(),
        supabase.from("daily_records").select("*").eq("flock_id", flockId).order("record_date", { ascending: true }),
        supabase.from("health_events").select("*").eq("flock_id", flockId).order("event_date", { ascending: false }),
      ]);
      if (f.error) throw f.error;
      return {
        flock: f.data as unknown as Flock | null,
        records: (r.data ?? []) as unknown as DailyRecord[],
        events: (h.data ?? []) as unknown as HealthEvent[],
      };
    },
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const losses = Number(form.mortality || 0) + Number(form.culls || 0);
      const { error } = await supabase.from("daily_records").insert({
        user_id: u.user!.id,
        flock_id: flockId,
        record_date: form.record_date,
        mortality: Number(form.mortality || 0),
        culls: Number(form.culls || 0),
        feed_kg: Number(form.feed_kg || 0),
        water_litres: Number(form.water_litres || 0),
        eggs_collected: Number(form.eggs_collected || 0),
        avg_weight_g: form.avg_weight_g ? Number(form.avg_weight_g) : null,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
        humidity_pct: form.humidity_pct ? Number(form.humidity_pct) : null,
        notes: form.notes || null,
      } as never);
      if (error) throw error;
      if (losses > 0 && data?.flock) {
        await supabase
          .from("flocks")
          .update({ current_count: Math.max(0, data.flock.current_count - losses) } as never)
          .eq("id", flockId);
      }
    },
    onSuccess: () => {
      toast.success("Daily record saved");
      setForm({ ...emptyRecord, record_date: form.record_date });
      qc.invalidateQueries({ queryKey: ["flock", flockId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("health_events").insert({
        user_id: u.user!.id,
        flock_id: flockId,
        event_date: event.event_date,
        event_type: event.event_type,
        title: event.title,
        details: event.details || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Health event logged");
      setEvent({ ...event, title: "", details: "" });
      qc.invalidateQueries({ queryKey: ["flock", flockId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const flock = data?.flock;
  if (!flock) return <p className="text-muted-foreground">Flock not found.</p>;

  const records = data?.records ?? [];
  const events = data?.events ?? [];
  const m = computeMetrics(flock, records);
  const alerts = buildAlerts(flock, records);
  const chart = records.map((r) => ({
    date: r.record_date,
    losses: num(r.mortality) + num(r.culls),
    feed: num(r.feed_kg),
    water: num(r.water_litres),
  }));

  const kpis = [
    { label: "Birds alive", value: flock.current_count.toLocaleString() },
    { label: "Mortality rate", value: `${m.mortalityRate.toFixed(1)}%` },
    { label: "Feed used", value: `${m.totalFeed.toFixed(0)} kg` },
    { label: "FCR", value: m.fcr ? m.fcr.toFixed(2) : "—" },
    { label: "Avg daily gain", value: m.adg ? `${m.adg.toFixed(1)} g` : "—" },
    { label: flock.bird_type === "layer" ? "Lay rate" : "Eggs", value: flock.bird_type === "layer" ? `${m.layingPct.toFixed(0)}%` : m.totalEggs.toLocaleString() },
  ];

  const field = (key: keyof typeof emptyRecord, label: string, type = "number") => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        step="any"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">{flock.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {flock.bird_type}
          {flock.breed ? ` · ${flock.breed}` : ""}
          {flock.house_name ? ` · ${flock.house_name}` : ""} · placed {flock.start_date}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xl font-semibold">{k.value}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </section>

      {alerts.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2">
          {alerts.map((a) => (
            <div key={a.id} className={`rounded-xl border p-4 text-sm ${alertTone[a.level]}`}>
              <p className="font-semibold">{a.title}</p>
              <p className="mt-1 opacity-90">{a.message}</p>
            </div>
          ))}
        </section>
      )}

      <Tabs defaultValue="record">
        <TabsList>
          <TabsTrigger value="record">Add record</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="health">Health log</TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-6">
          <form
            className="rounded-2xl border bg-card p-6 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              addRecord.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {field("record_date", "Date", "date")}
              {field("mortality", "Deaths")}
              {field("culls", "Culls")}
              {field("feed_kg", "Feed used (kg)")}
              {field("water_litres", "Water used (L)")}
              {field("eggs_collected", "Eggs collected")}
              {field("avg_weight_g", "Avg bird weight (g)")}
              {field("temperature_c", "House temp (°C)")}
              {field("humidity_pct", "Humidity (%)")}
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="notes">Observations</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button type="submit" className="mt-5" disabled={addRecord.isPending}>
              {addRecord.isPending && <Loader2 className="size-4 animate-spin" />} Save record
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Losses, feed and water</h2>
            {chart.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No records yet.</p>
            ) : (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
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
                    <Area type="monotone" dataKey="losses" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="feed" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="water" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["Date", "Deaths", "Culls", "Feed kg", "Water L", "Eggs", "Weight g", "Temp", "RH"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">{r.record_date}</td>
                    <td className="px-4 py-2">{r.mortality}</td>
                    <td className="px-4 py-2">{r.culls}</td>
                    <td className="px-4 py-2">{num(r.feed_kg).toFixed(1)}</td>
                    <td className="px-4 py-2">{num(r.water_litres).toFixed(1)}</td>
                    <td className="px-4 py-2">{r.eggs_collected}</td>
                    <td className="px-4 py-2">{r.avg_weight_g ?? "—"}</td>
                    <td className="px-4 py-2">{r.temperature_c ?? "—"}</td>
                    <td className="px-4 py-2">{r.humidity_pct ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="health" className="mt-6 space-y-6">
          <form
            className="rounded-2xl border bg-card p-6 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              addEvent.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edate">Date</Label>
                <Input
                  id="edate"
                  type="date"
                  value={event.event_date}
                  onChange={(e) => setEvent({ ...event, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="etype">Type</Label>
                <select
                  id="etype"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={event.event_type}
                  onChange={(e) => setEvent({ ...event, event_type: e.target.value })}
                >
                  {["vaccination", "medication", "treatment", "observation"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="etitle">Title</Label>
                <Input id="etitle" required value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="edetails">Details</Label>
              <Textarea id="edetails" value={event.details} onChange={(e) => setEvent({ ...event, details: e.target.value })} />
            </div>
            <Button type="submit" className="mt-5" disabled={addEvent.isPending}>
              {addEvent.isPending && <Loader2 className="size-4 animate-spin" />} Log event
            </Button>
          </form>

          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No health events recorded.</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{ev.title}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {ev.event_type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ev.event_date}</p>
                  {ev.details && <p className="mt-2 text-sm text-muted-foreground">{ev.details}</p>}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
