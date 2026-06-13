import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Search, Globe, Zap, Shield, Code2, ChevronRight, Server, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const TLD_EXAMPLES = [".live", ".freeable", ".qwerty", ".ai.net", ".love", ".bot.net", ".zapto.org", ".0.com", ".free.net"];

const FEATURES = [
  { icon: Globe, title: "Free Custom Domains", desc: "Register domains across 9 custom TLDs at zero cost — forever. No credit card required." },
  { icon: Zap, title: "GitHub Import & Deploy", desc: "Paste a GitHub URL. We detect your framework, build your app, and deploy in under 60 seconds." },
  { icon: Shield, title: "Auto SSL & DNS", desc: "Every domain gets automatic HTTPS and a full DNS manager with A, CNAME, TXT, MX support." },
  { icon: Code2, title: "Environment Variables", desc: "Manage build and runtime secrets securely. Encrypted variables, scoped to build or runtime." },
  { icon: Server, title: "Infrastructure Dashboard", desc: "Real-time view of your servers, containers, bandwidth, and deployment health across all regions." },
  { icon: Globe, title: "Domain Registry", desc: "Full WHOIS simulation, domain transfer, renewal, and audit logging built in." },
];

const USER_FLOW = [
  { step: "1", text: "Search for your domain — e.g. myapp.live" },
  { step: "2", text: "Register it instantly, no payment needed" },
  { step: "3", text: "Paste your GitHub repo URL" },
  { step: "4", text: "We detect React, Next.js, Vue, Python & more" },
  { step: "5", text: "Build pipeline runs: Clone → Install → Build → Deploy" },
  { step: "6", text: "Your site is live at https://myapp.live" },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/domains/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark flex flex-col">
      {/* Nav */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
            FD
          </div>
          <span className="font-bold text-lg tracking-tight">Freeable Domains</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/domains" className="hover:text-foreground transition-colors">Domains</Link>
          <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
          <Link href="/infrastructure" className="hover:text-foreground transition-colors">Infrastructure</Link>
        </nav>
        <Link href="/dashboard">
          <Button size="sm" data-testid="nav-dashboard-btn">Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        <Badge variant="secondary" className="mb-6 text-xs font-medium tracking-wide px-3 py-1">
          GitHub + Vercel + Namecheap — all free
        </Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-none">
          Your domain.<br />
          <span className="text-primary">Your deploy.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10">
          Register free custom-TLD domains, import from GitHub, and deploy instantly. No credit card. No billing. Ever.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full max-w-xl flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10 h-12 text-base"
              placeholder="Search a domain — e.g. myapp.live"
              value={query}
              onChange={e => setQuery(e.target.value)}
              data-testid="input-domain-search"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-6" data-testid="button-search-domain">
            Search
          </Button>
        </form>

        {/* TLD tags */}
        <div className="flex flex-wrap gap-2 justify-center mb-16">
          {TLD_EXAMPLES.map(tld => (
            <button
              key={tld}
              onClick={() => setLocation(`/domains/search?q=example${tld}`)}
              className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              data-testid={`tld-example-${tld}`}
            >
              {tld}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-12 text-center">
          {[["9", "Free TLDs"], ["0", "Cost"], ["60s", "Deploy time"]].map(([val, label]) => (
            <div key={label}>
              <p className="text-3xl font-bold text-primary">{val}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything in one platform</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">No patchwork of separate tools. Domain registry, DNS manager, CI/CD pipeline, and hosting — unified.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
                <f.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="border-t border-border py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">From zero to deployed</h2>
          <p className="text-muted-foreground text-center mb-12">Six steps. Under two minutes.</p>
          <div className="space-y-3">
            {USER_FLOW.map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-card border border-border rounded-lg px-5 py-4">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.step}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed pt-1">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/domains/search">
              <Button size="lg" className="gap-2" data-testid="button-get-started">
                Register your domain <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/projects/new">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-import-github">
                Import from GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        <p>Freeable Domains — open-source hosting platform. No fees, no billing, no gatekeeping.</p>
      </footer>
    </div>
  );
}
