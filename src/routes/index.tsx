import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight, BellRing, ChevronLeft, ChevronRight, Facebook, Feather,
  Instagram, Linkedin, LineChart, ShieldCheck, Twitter,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import hero1 from "@/assets/poultry-hero-1.jpg";
import hero2 from "@/assets/poultry-hero-2.jpg";
import hero3 from "@/assets/poultry-hero-3.jpg";
import hero4 from "@/assets/poultry-hero-4.jpg";
import hero5 from "@/assets/poultry-hero-5.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PoultryPulse — Smart Poultry Monitoring" },
      { name: "description", content: "Track flock mortality, feed, water and egg production, with clear performance trends and early warnings." },
      { property: "og:title", content: "PoultryPulse — Smart Poultry Monitoring" },
      { property: "og:description", content: "Digital flock records, performance trends and early-warning alerts for poultry farms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: LineChart, title: "Live performance metrics", body: "Mortality, feed conversion, daily weight gain and lay percentage calculated from daily entries." },
  { icon: BellRing, title: "Early-warning alerts", body: "Rules flag mortality spikes, falling feed or water intake and unsafe house conditions before losses grow." },
  { icon: ShieldCheck, title: "Private by design", body: "Every record is protected at the database level, so each farm's operational data remains private." },
];

const SLIDES = [
  { src: hero1, alt: "Healthy broiler chickens in a modern poultry house", label: "Flock health" },
  { src: hero2, alt: "Free-range chickens grazing on green pasture", label: "Better welfare" },
  { src: hero3, alt: "Layer hens and eggs in a clean production house", label: "Egg production" },
  { src: hero4, alt: "Farm manager reviewing a healthy poultry flock", label: "Daily oversight" },
  { src: hero5, alt: "Aerial view of a modern poultry farm at sunrise", label: "Farm performance" },
];

function Landing() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % SLIDES.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  const moveSlide = (direction: number) => {
    setActiveSlide((current) => (current + direction + SLIDES.length) % SLIDES.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-[680px] overflow-hidden bg-hero text-hero-foreground md:min-h-[760px]">
        <div className="absolute inset-0" aria-hidden="true">
          {SLIDES.map((slide, index) => (
            <img key={slide.src} src={slide.src} alt="" width={1920} height={1080}
              loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"}
              className={`hero-slide absolute inset-0 size-full object-cover ${index === activeSlide ? "hero-slide-active" : ""}`} />
          ))}
          <div className="absolute inset-0 bg-hero-overlay" />
        </div>

        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 font-display text-lg font-bold">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-glow"><Feather className="size-5" /></span>
            PoultryPulse
          </Link>
          <Button asChild variant="heroOutline"><Link to="/auth">Sign in <ArrowRight /></Link></Button>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[560px] max-w-5xl flex-col items-center justify-center px-5 pb-24 pt-14 text-center md:min-h-[630px]">
          <p className="hero-copy mb-6 inline-flex items-center gap-2 rounded-full border border-hero-foreground/20 bg-hero/35 px-4 py-2 text-xs font-semibold uppercase text-hero-muted backdrop-blur-md">
            <span className="size-2 animate-pulse rounded-full bg-success" /> Smart poultry monitoring system
          </p>
          <h1 className="hero-copy max-w-5xl text-5xl font-extrabold leading-[1.04] md:text-7xl lg:text-8xl">Poultry<span className="text-primary">Pulse</span></h1>
          <p className="hero-copy mt-6 max-w-2xl text-base leading-relaxed text-hero-muted md:text-xl">
            Know how every flock is performing. Turn daily mortality, feed, water and egg records into clear trends and early warnings.
          </p>
          <div className="hero-copy mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="xl"><Link to="/auth">Start monitoring <ArrowRight /></Link></Button>
            <Button asChild size="xl" variant="heroOutline"><Link to="/dashboard">View dashboard</Link></Button>
          </div>
        </div>

        <Button variant="heroGhost" size="icon" aria-label="Previous hero image" onClick={() => moveSlide(-1)} className="absolute bottom-8 left-5 z-20 md:bottom-1/2 md:left-8"><ChevronLeft /></Button>
        <Button variant="heroGhost" size="icon" aria-label="Next hero image" onClick={() => moveSlide(1)} className="absolute bottom-8 right-5 z-20 md:bottom-1/2 md:right-8"><ChevronRight /></Button>
        <div className="absolute bottom-9 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2" aria-label={`Slide ${activeSlide + 1} of ${SLIDES.length}: ${SLIDES[activeSlide]?.label ?? ""}`}>
          {SLIDES.map((slide, index) => <button key={slide.label} type="button" aria-label={`Show ${slide.label}`} onClick={() => setActiveSlide(index)} className={`hero-dot ${index === activeSlide ? "hero-dot-active" : ""}`} />)}
        </div>
      </section>

      <section id="features" className="bg-feature-band px-5 py-20 text-feature-foreground md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase text-primary">Farm intelligence</p>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Every daily record becomes a decision.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-feature-muted">A focused command centre for healthier birds, lower losses and consistent production.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <article key={feature.title} className="feature-card group border border-feature-border bg-feature-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 md:p-8">
                <span className="mb-7 flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><feature.icon className="size-6" /></span>
                <p className="mb-4 text-xs font-semibold text-feature-muted">0{index + 1}</p>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-feature-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-footer-border bg-footer px-5 py-16 text-footer-muted">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-b border-footer-border pb-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link to="/" className="flex items-center gap-3 text-lg font-bold text-footer-foreground"><span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Feather /></span>PoultryPulse</Link>
              <p className="mt-5 max-w-sm text-sm leading-relaxed">Practical flock intelligence for poultry farms that want stronger records, earlier warnings and confident decisions.</p>
              <div className="mt-6 flex gap-2">
                {[{ Icon: Facebook, label: "Facebook", href: "https://facebook.com" }, { Icon: Instagram, label: "Instagram", href: "https://instagram.com" }, { Icon: Twitter, label: "X", href: "https://x.com" }, { Icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" }].map(({ Icon, label, href }) => (
                  <Button key={label} asChild size="icon" variant="footer"><a href={href} target="_blank" rel="noreferrer" aria-label={label}><Icon /></a></Button>
                ))}
              </div>
            </div>
            <FooterLinks title="Platform" links={[{ label: "Dashboard", to: "/dashboard" }, { label: "Flocks", to: "/flocks" }, { label: "Create account", to: "/auth" }]} />
            <FooterLinks title="Explore" links={[{ label: "Features", href: "#features" }, { label: "Sign in", to: "/auth" }, { label: "Get started", to: "/auth" }]} />
            <div><h3 className="text-sm font-semibold text-footer-foreground">Contact</h3><ul className="mt-5 space-y-3 text-sm"><li><a className="transition-colors hover:text-primary" href="mailto:support@poultrypulse.app">support@poultrypulse.app</a></li><li>Lagos, Nigeria</li><li>Mon–Fri, 8:00–17:00</li></ul></div>
          </div>
          <div className="flex flex-col gap-3 pt-8 text-xs sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} PoultryPulse. All rights reserved.</p><p>Built for smarter poultry operations.</p></div>
        </div>
      </footer>
    </div>
  );
}

type FooterLink = { label: string; to?: "/dashboard" | "/flocks" | "/auth"; href?: string };

function FooterLinks({ title, links }: { title: string; links: FooterLink[] }) {
  return <div><h3 className="text-sm font-semibold text-footer-foreground">{title}</h3><ul className="mt-5 space-y-3 text-sm">{links.map((link) => <li key={link.label}>{link.to ? <Link className="transition-colors hover:text-primary" to={link.to}>{link.label}</Link> : <a className="transition-colors hover:text-primary" href={link.href}>{link.label}</a>}</li>)}</ul></div>;
}