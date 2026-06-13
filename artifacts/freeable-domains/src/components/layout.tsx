import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Box, 
  Activity, 
  Globe, 
  Server, 
  BarChart, 
  Settings, 
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Box },
  { href: "/deployments", label: "Deployments", icon: Activity },
  { href: "/domains", label: "Domains", icon: Globe },
  { href: "/infrastructure", label: "Infrastructure", icon: Server },
  { href: "/analytics", label: "Analytics", icon: BarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-foreground dark">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground">
            FD
          </div>
          <span className="font-bold tracking-tight">Freeable Domains</span>
        </div>
        <div className="p-4">
          <Button asChild className="w-full justify-start gap-2" variant="default">
            <Link href="/projects/new">
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </Button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
              ME
            </div>
            <div className="text-sm">
              <p className="font-medium leading-none">Developer</p>
              <p className="text-muted-foreground text-xs">Pro Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 md:px-6 bg-card sticky top-0 z-10">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <Link href="/domains/search">
              <Button variant="outline" size="sm" className="gap-2">
                <Globe className="w-4 h-4" />
                Register Domain
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
