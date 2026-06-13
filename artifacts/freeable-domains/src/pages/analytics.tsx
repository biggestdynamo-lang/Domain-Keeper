import { useState } from "react";
import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, Globe, Zap, Clock, AlertTriangle } from "lucide-react";

const PERIODS = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
] as const;

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data, isLoading } = useGetAnalyticsSummary(
    { period },
    { query: { enabled: true, queryKey: getGetAnalyticsSummaryQueryKey({ period }) } }
  );

  const stats = data ? [
    { label: "Total Requests", value: data.totalRequests.toLocaleString(), icon: TrendingUp, color: "text-blue-400" },
    { label: "Unique Visitors", value: data.uniqueVisitors.toLocaleString(), icon: Globe, color: "text-purple-400" },
    { label: "Bandwidth", value: `${data.totalBandwidthGb.toFixed(1)} GB`, icon: Zap, color: "text-green-400" },
    { label: "Avg Build Time", value: data.avgBuildTimeSeconds != null ? `${data.avgBuildTimeSeconds.toFixed(1)}s` : "—", icon: Clock, color: "text-orange-400" },
    { label: "Error Rate", value: `${(data.errorRate * 100).toFixed(2)}%`, icon: AlertTriangle, color: "text-red-400" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-analytics-title">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform-wide performance metrics</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {PERIODS.map(p => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriod(p.value)}
              data-testid={`button-period-${p.value}`}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />) :
          stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4" data-testid={`card-analytics-${s.label.toLowerCase().replace(/ /g, "-")}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground leading-tight">{s.label}</span>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
      </div>

      {/* Requests chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium mb-4">Requests Over Time</h2>
        {isLoading ? <Skeleton className="h-48 rounded" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.timeSeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(210 100% 65%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(210 100% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(210 10% 65%)" }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(210 10% 65%)" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: "hsl(210 20% 98%)" }}
              />
              <Area type="monotone" dataKey="requests" stroke="hsl(210 100% 65%)" fill="url(#reqGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bandwidth + Deployments chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">Bandwidth (GB)</h2>
          {isLoading ? <Skeleton className="h-40 rounded" /> : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data?.timeSeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(280 100% 70%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(280 100% 70%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(210 10% 65%)" }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(210 10% 65%)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 6, fontSize: 12 }} />
                <Area type="monotone" dataKey="bandwidthGb" stroke="hsl(280 100% 70%)" fill="url(#bwGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">Daily Deployments</h2>
          {isLoading ? <Skeleton className="h-40 rounded" /> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.timeSeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(210 10% 65%)" }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(210 10% 65%)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(220 15% 7%)", border: "1px solid hsl(220 15% 15%)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="deployments" fill="hsl(142 76% 36%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top projects */}
      {data?.topProjects && data.topProjects.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium">Top Projects by Traffic</h2>
          </div>
          <div className="divide-y divide-border">
            {data.topProjects.map((p, i) => (
              <div key={p.projectId} className="px-5 py-3 flex items-center gap-4" data-testid={`row-top-project-${p.projectId}`}>
                <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.projectName}</p>
                  <p className="text-xs text-muted-foreground">{p.requests.toLocaleString()} requests · {p.bandwidthGb.toFixed(2)} GB</p>
                </div>
                <div className="w-32 bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full"
                    style={{ width: `${Math.min((p.requests / (data.topProjects[0]?.requests || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
