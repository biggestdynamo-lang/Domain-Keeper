import { Link } from "wouter";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Activity, Globe, Box, Zap, TrendingUp, Plus } from "lucide-react";

function statusColor(status: string) {
  switch (status) {
    case "ready": case "active": return "bg-green-500/15 text-green-400 border-green-500/20";
    case "building": case "deploying": case "cloning": case "installing": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
    case "failed": case "stopped": return "bg-red-500/15 text-red-400 border-red-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardSummary();

  const stats = [
    { label: "Projects", value: data?.totalProjects ?? 0, icon: Box, color: "text-blue-400" },
    { label: "Active Deployments", value: data?.activeDeployments ?? 0, icon: Activity, color: "text-green-400" },
    { label: "Registered Domains", value: data?.registeredDomains ?? 0, icon: Globe, color: "text-purple-400" },
    { label: "Bandwidth (GB)", value: data?.totalBandwidthGb?.toFixed(1) ?? "0", icon: TrendingUp, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview and recent activity</p>
        </div>
        <div className="flex gap-2">
          <Link href="/domains/search">
            <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-register-domain">
              <Globe className="w-3.5 h-3.5" /> Register Domain
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button size="sm" className="gap-1.5" data-testid="button-new-project">
              <Plus className="w-3.5 h-3.5" /> New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-5" data-testid={`card-stat-${stat.label.toLowerCase().replace(/ /g, "-")}`}>
            {isLoading ? (
              <Skeleton className="h-10 w-20 mb-2" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Recent Projects</h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 ml-auto" />
                </div>
              ))
            ) : data?.recentProjects?.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No projects yet. <Link href="/projects/new" className="text-primary hover:underline">Create one</Link>
              </div>
            ) : (
              data?.recentProjects?.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="px-5 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer" data-testid={`row-project-${p.id}`}>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.framework ?? "Unknown framework"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Recent Deployments</h2>
            <Link href="/deployments">
              <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-14 ml-auto" />
                </div>
              ))
            ) : data?.recentDeployments?.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No deployments yet.</div>
            ) : (
              data?.recentDeployments?.map(d => (
                <Link key={d.id} href={`/deployments/${d.id}`}>
                  <div className="px-5 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer" data-testid={`row-deployment-${d.id}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.projectName ?? `Project #${d.projectId}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })} · {d.branch}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ml-3 flex-shrink-0 ${statusColor(d.status)}`}>
                      {d.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Deployments today", value: data?.deploymentsToday ?? 0, suffix: "deploys", icon: Zap },
          { label: "Success rate", value: data ? `${(data.successRate * 100).toFixed(1)}%` : "—", icon: TrendingUp },
          { label: "Total bandwidth", value: data ? `${data.totalBandwidthGb.toFixed(1)} GB` : "—", icon: Activity },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-lg px-5 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {isLoading ? <Skeleton className="h-5 w-16 mt-1" /> : <p className="font-bold mt-0.5">{item.value}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
