import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BIRD_TYPES } from "@/lib/poultry";
import type { Flock } from "@/lib/poultry";

export const Route = createFileRoute("/_authenticated/flocks/")({
  head: () => ({
    meta: [
      { title: "Flocks — PoultryPulse" },
      { name: "description", content: "Create and manage poultry flock batches and their daily records." },
      { property: "og:title", content: "Flocks — PoultryPulse" },
      { property: "og:description", content: "Manage your poultry batches in one place." },
    ],
  }),
  component: FlocksPage,
});

function FlocksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    breed: "",
    bird_type: "broiler",
    house_name: "",
    initial_count: "0",
    start_date: new Date().toISOString().slice(0, 10),
  });

  const { data: flocks = [], isLoading } = useQuery({
    queryKey: ["flocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flocks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Flock[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const count = Number(form.initial_count) || 0;
      const { error } = await supabase.from("flocks").insert({
        user_id: userData.user!.id,
        name: form.name,
        breed: form.breed || null,
        bird_type: form.bird_type,
        house_name: form.house_name || null,
        initial_count: count,
        current_count: count,
        start_date: form.start_date,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Flock created");
      setOpen(false);
      setForm({ ...form, name: "", breed: "", house_name: "", initial_count: "0" });
      qc.invalidateQueries({ queryKey: ["flocks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Flocks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Each batch of birds you are raising.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New flock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a flock</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="fname">Batch name</Label>
                <Input id="fname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="btype">Bird type</Label>
                  <select
                    id="btype"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.bird_type}
                    onChange={(e) => setForm({ ...form, bird_type: e.target.value })}
                  >
                    {BIRD_TYPES.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Breed</Label>
                  <Input id="breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house">House / pen</Label>
                  <Input id="house" value={form.house_name} onChange={(e) => setForm({ ...form, house_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="count">Birds placed</Label>
                  <Input
                    id="count"
                    type="number"
                    min={0}
                    value={form.initial_count}
                    onChange={(e) => setForm({ ...form, initial_count: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="sdate">Placement date</Label>
                  <Input
                    id="sdate"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending && <Loader2 className="size-4 animate-spin" />} Create flock
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : flocks.length === 0 ? (
        <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No flocks yet. Create your first batch to start recording.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flocks.map((f) => (
            <Link
              key={f.id}
              to="/flocks/$flockId"
              params={{ flockId: f.id }}
              className="rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg font-semibold">{f.name}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{f.status}</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {f.bird_type}
                {f.breed ? ` · ${f.breed}` : ""}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                {f.current_count} of {f.initial_count} birds · placed {f.start_date}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
