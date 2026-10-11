export type Flock = {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  bird_type: string;
  house_name: string | null;
  initial_count: number;
  current_count: number;
  start_date: string;
  status: string;
  created_at: string;
};

export type DailyRecord = {
  id: string;
  flock_id: string;
  record_date: string;
  mortality: number;
  culls: number;
  feed_kg: number;
  water_litres: number;
  eggs_collected: number;
  avg_weight_g: number | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  notes: string | null;
};

export type HealthEvent = {
  id: string;
  flock_id: string;
  event_date: string;
  event_type: string;
  title: string;
  details: string | null;
  severity: string;
};

export type Alert = {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  message: string;
  flockId: string;
  flockName: string;
};

export const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

export function ageInDays(flock: Flock, on = new Date()) {
  const start = new Date(flock.start_date + "T00:00:00");
  return Math.max(0, Math.round((on.getTime() - start.getTime()) / 86_400_000));
}

export type FlockMetrics = {
  totalMortality: number;
  mortalityRate: number;
  totalFeed: number;
  totalWater: number;
  totalEggs: number;
  layingPct: number;
  fcr: number | null;
  latestWeight: number | null;
  adg: number | null;
  daysRecorded: number;
};

export function computeMetrics(flock: Flock, records: DailyRecord[]): FlockMetrics {
  const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));
  const totalMortality = sorted.reduce((s, r) => s + num(r.mortality) + num(r.culls), 0);
  const totalFeed = sorted.reduce((s, r) => s + num(r.feed_kg), 0);
  const totalWater = sorted.reduce((s, r) => s + num(r.water_litres), 0);
  const totalEggs = sorted.reduce((s, r) => s + num(r.eggs_collected), 0);
  const withWeight = sorted.filter((r) => r.avg_weight_g != null);
  const latestWeight = withWeight.length ? num(withWeight[withWeight.length - 1]!.avg_weight_g) : null;
  const liveWeightKg = (latestWeight ?? 0) * flock.current_count * 0.001;
  const age = ageInDays(flock);

  return {
    totalMortality,
    mortalityRate: flock.initial_count ? (totalMortality / flock.initial_count) * 100 : 0,
    totalFeed,
    totalWater,
    totalEggs,
    layingPct:
      flock.current_count && sorted.length ? (totalEggs / (flock.current_count * sorted.length)) * 100 : 0,
    fcr: liveWeightKg > 0 && totalFeed > 0 ? totalFeed / liveWeightKg : null,
    latestWeight,
    adg: latestWeight != null && age > 0 ? latestWeight / age : null,
    daysRecorded: sorted.length,
  };
}

/** Rule-based early-warning engine (see proposal §9). */
export function buildAlerts(flock: Flock, records: DailyRecord[]): Alert[] {
  const alerts: Alert[] = [];
  const sorted = [...records].sort((a, b) => b.record_date.localeCompare(a.record_date));
  const push = (level: Alert["level"], title: string, message: string, key: string) =>
    alerts.push({ id: `${flock.id}-${key}`, level, title, message, flockId: flock.id, flockName: flock.name });

  const last = sorted[0];
  const prev = sorted.slice(1, 4);
  const metrics = computeMetrics(flock, records);

  if (!last) {
    push("info", "No records yet", `Add the first daily record for ${flock.name}.`, "empty");
    return alerts;
  }

  const daysSince = Math.round((Date.now() - new Date(last.record_date + "T00:00:00").getTime()) / 86_400_000);
  if (daysSince >= 2) {
    push("warning", "Records out of date", `Last entry was ${daysSince} days ago.`, "stale");
  }

  const dailyDeaths = num(last.mortality) + num(last.culls);
  const dailyRate = flock.current_count ? (dailyDeaths / flock.current_count) * 100 : 0;
  if (dailyRate >= 1) {
    push("critical", "Mortality spike", `${dailyDeaths} birds lost on ${last.record_date} (${dailyRate.toFixed(2)}% of the flock in one day).`, "spike");
  } else if (dailyRate >= 0.5) {
    push("warning", "Mortality rising", `${dailyDeaths} birds lost on ${last.record_date}. Watch closely.`, "rising");
  }

  if (metrics.mortalityRate >= 8) {
    push("critical", "Cumulative mortality high", `${metrics.mortalityRate.toFixed(1)}% of the flock has been lost since placement.`, "cum");
  }

  if (prev.length >= 2) {
    const avgFeed = prev.reduce((s, r) => s + num(r.feed_kg), 0) / prev.length;
    const avgWater = prev.reduce((s, r) => s + num(r.water_litres), 0) / prev.length;
    if (avgFeed > 0 && num(last.feed_kg) < avgFeed * 0.8) {
      push("warning", "Feed intake dropped", `Feed is ${(100 - (num(last.feed_kg) / avgFeed) * 100).toFixed(0)}% below the recent average — an early sign of illness.`, "feed");
    }
    if (avgWater > 0 && num(last.water_litres) < avgWater * 0.8) {
      push("critical", "Water intake dropped", `Water use fell sharply versus the recent average. Check drinkers and flock health.`, "water");
    }
  }

  if (last.temperature_c != null) {
    const t = num(last.temperature_c);
    if (t >= 32) push("critical", "House too hot", `${t}°C recorded — heat stress risk. Improve ventilation.`, "hot");
    else if (t <= 18) push("warning", "House too cold", `${t}°C recorded — chilling risk for the flock.`, "cold");
  }
  if (last.humidity_pct != null) {
    const h = num(last.humidity_pct);
    if (h >= 75) push("warning", "Humidity high", `${h}% relative humidity — wet litter and ammonia risk.`, "hum");
  }

  if (flock.bird_type === "layer" && metrics.daysRecorded >= 3 && metrics.layingPct > 0 && metrics.layingPct < 55) {
    push("warning", "Laying below target", `Average lay rate is ${metrics.layingPct.toFixed(0)}%, below the 55% guideline.`, "lay");
  }

  return alerts;
}

export const alertTone: Record<Alert["level"], string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  warning: "border-warning/50 bg-warning/15 text-warning-foreground",
  info: "border-border bg-muted text-muted-foreground",
};

export const BIRD_TYPES = [
  { value: "broiler", label: "Broiler" },
  { value: "layer", label: "Layer" },
  { value: "cockerel", label: "Cockerel" },
  { value: "turkey", label: "Turkey" },
  { value: "noiler", label: "Noiler" },
];
