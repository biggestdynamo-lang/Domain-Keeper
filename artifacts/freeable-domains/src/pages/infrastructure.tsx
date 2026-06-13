import { useGetInfrastructureStatus } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Server, Box, Globe, Zap, HardDrive, Wifi, Cpu, MemoryStick } from "lucide-react";

function statusDot(status: string) {
  if (status === "healthy") return "bg-green-500";
  if (status === "degraded") return "bg-yellow-500";
  return "bg-red-500";
}

const REGION_LABELS: Record<string, string> = {
  "us-east-1": "US East (N. Virginia)",
  "us-west-2": "US West (Oregon)",
  "eu-west-1": "Europe (Ireland)",
  "ap-northeast-1": "Asia Pacific (Tokyo)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
};

export default function InfrastructurePage() {
  const { data, isLoading } = useGetInfrastructureStatus();

  const metrics = data ? [
    { label: "CPU Usage", value: data.cpuUsagePercent, icon: Cpu, color: "text-blue-400" },
    { label: "Memory Usage", value: data.memoryUsagePercent, icon: MemoryStick, color: "text-purple-400" },
    { label: "Storage", value: (data.storageUsedGb / data.storageTotalGb) * 100, icon: HardDrive, color: "text-orange-400" },
    { label: "Bandwidth", value: Math.min((data.bandwidthUsedGb / 200) * 100, 100), icon: Wifi, color: "text-green-400" },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-infrastructure-title">Infrastructure</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Global server health and resource utilization</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : [
          { label: "Total Containers", value: data?.totalContainers ?? 0, sub: `${data?.runningContainers ?? 0} running`, icon: Box, color: "text-blue-400" },
          { label: "Domains", value: data?.totalDomains ?? 0, sub: "Registered", icon: Globe, color: "text-purple-400" },
          { label: "Deployments", value: data?.totalDeployments ?? 0, sub: "All time", icon: Zap, color: "text-green-400" },
          { label: "Storage Used", value: `${data?.storageUsedGb.toFixed(0)}GB`, sub: `of ${data?.storageTotalGb}GB`, icon: HardDrive, color: "text-orange-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4" data-testid={`card-infra-${s.label.toLowerCase().replace(/ /g, "-")}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Resource meters */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <h2 className="font-semibold text-sm">Resource Utilization</h2>
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />) :
          metrics.map(m => (
            <div key={m.label} className="space-y-1.5" data-testid={`meter-${m.label.toLowerCase().replace(/ /g, "-")}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><m.icon className={`w-3.5 h-3.5 ${m.color}`} />{m.label}</span>
                <span className="text-muted-foreground">{m.value.toFixed(1)}%</span>
              </div>
              <Progress value={m.value} className="h-1.5" />
            </div>
          ))}
      </div>

      {/* Server list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Server Nodes</h2>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-4"><Skeleton className="h-12 w-full" /></div>
          )) : data?.servers.map(server => (
            <div key={server.id} className="px-5 py-4 flex items-center gap-4" data-testid={`row-server-${server.id}`}>
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Server className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{server.id}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusDot(server.status)}`} />
                    <span className={`text-xs ${server.status === "healthy" ? "text-green-400" : server.status === "degraded" ? "text-yellow-400" : "text-red-400"}`}>{server.status}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{REGION_LABELS[server.region] ?? server.region} · {server.containers} containers · up {server.uptime}</p>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground flex-shrink-0">
                <div className="text-right">
                  <p className="font-medium">{server.cpuPercent}%</p>
                  <p className="text-xs">CPU</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{server.memoryPercent}%</p>
                  <p className="text-xs">RAM</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
