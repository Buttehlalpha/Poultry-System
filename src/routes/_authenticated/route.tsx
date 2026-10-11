import { Link, Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { BarChart3, Bird, Feather, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/flocks", label: "Flocks", icon: Bird },
] as const;

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground md:flex">
        <div>
          <Link to="/dashboard" className="mb-8 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Feather className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">PoultryPulse</span>
          </Link>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(item.to)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className="justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </aside>

      <header className="flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2 font-display font-semibold">
          <Feather className="size-5 text-sidebar-primary" /> PoultryPulse
        </Link>
        <Button aria-label={open ? "Close menu" : "Open menu"} variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>
      {open && (
        <div className="space-y-1 bg-sidebar px-4 pb-4 text-sidebar-foreground md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          <Button variant="ghost" onClick={signOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      )}

      <main className="min-w-0 flex-1 bg-muted/35 px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
