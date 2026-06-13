import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetProject, useGetProjectSummary, useListDeployments, useListDomains,
  useListEnvVars, useCreateDeployment, useCreateEnvVar, useDeleteEnvVar,
  useUpdateProject, getListDeploymentsQueryKey, getListEnvVarsQueryKey,
  getGetProjectQueryKey, getGetProjectSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Zap, Globe, KeyRound, Activity, Settings, GitBranch, ExternalLink, Plus, Trash2, Eye, EyeOff, BarChart } from "lucide-react";

function statusDot(status: string) {
  switch (status) {
    case "active": case "ready": return "bg-green-500";
    case "building": case "deploying": case "cloning": case "installing": case "queued": return "bg-yellow-500 animate-pulse";
    case "failed": return "bg-red-500";
    default: return "bg-muted-foreground";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "ready": case "active": return "text-green-400";
    case "building": case "deploying": case "cloning": case "installing": case "queued": return "text-yellow-400";
    case "failed": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: summary } = useGetProjectSummary(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectSummaryQueryKey(projectId) },
  });
  const { data: deployments, isLoading: deploymentsLoading } = useListDeployments(projectId, {
    query: { enabled: !!projectId, queryKey: getListDeploymentsQueryKey(projectId) },
  });
  const { data: envVars, isLoading: envLoading } = useListEnvVars(projectId, {
    query: { enabled: !!projectId, queryKey: getListEnvVarsQueryKey(projectId) },
  });

  const createDeployment = useCreateDeployment();
  const createEnvVar = useCreateEnvVar();
  const deleteEnvVar = useDeleteEnvVar();

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newScope, setNewScope] = useState<"all" | "build" | "runtime">("all");
  const [newEncrypted, setNewEncrypted] = useState(false);
  const [revealedVars, setRevealedVars] = useState<Set<number>>(new Set());

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found.</p>
        <Link href="/projects"><Button variant="ghost" className="mt-4">Back to projects</Button></Link>
      </div>
    );
  }

  function handleDeploy() {
    createDeployment.mutate(
      { id: projectId, data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDeploymentsQueryKey(projectId) });
          toast({ title: "Deployment triggered", description: "Build pipeline started." });
        },
      }
    );
  }

  function handleAddEnvVar(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    createEnvVar.mutate(
      { id: projectId, data: { key: newKey.trim(), value: newValue, encrypted: newEncrypted, scope: newScope } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEnvVarsQueryKey(projectId) });
          setNewKey(""); setNewValue(""); setNewEncrypted(false); setNewScope("all");
          toast({ title: "Variable added" });
        },
      }
    );
  }

  function handleDeleteEnvVar(id: number) {
    deleteEnvVar.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEnvVarsQueryKey(projectId) });
        toast({ title: "Variable removed" });
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0">
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" data-testid="text-project-detail-name">{project.name}</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusDot(project.status)}`} />
                <span className={`text-xs font-medium ${statusColor(project.status)}`}>{project.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {project.framework && <span className="text-xs text-muted-foreground">{project.framework}</span>}
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <GitBranch className="w-3 h-3" />{project.branch}
                </a>
              )}
              {project.deploymentUrl && (
                <a href={project.deploymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" />{project.deploymentUrl}
                </a>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={handleDeploy} disabled={createDeployment.isPending} data-testid="button-deploy">
          <Zap className="w-3.5 h-3.5" />
          {createDeployment.isPending ? "Deploying..." : "Deploy"}
        </Button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Deployments", value: summary.deploymentCount },
            { label: "Success rate", value: summary.deploymentCount > 0 ? `${Math.round(summary.successfulDeployments / summary.deploymentCount * 100)}%` : "—" },
            { label: "Avg build time", value: summary.avgBuildTimeSeconds > 0 ? `${summary.avgBuildTimeSeconds.toFixed(0)}s` : "—" },
            { label: "Env vars", value: summary.envVarCount },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="deployments">
        <TabsList>
          <TabsTrigger value="deployments" className="gap-1.5"><Activity className="w-3.5 h-3.5" />Deployments</TabsTrigger>
          <TabsTrigger value="env" className="gap-1.5"><KeyRound className="w-3.5 h-3.5" />Env Vars</TabsTrigger>
          <TabsTrigger value="domains" className="gap-1.5"><Globe className="w-3.5 h-3.5" />Domains</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-3.5 h-3.5" />Settings</TabsTrigger>
        </TabsList>

        {/* Deployments tab */}
        <TabsContent value="deployments" className="mt-4 space-y-3">
          {deploymentsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
          ) : deployments?.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-10 text-center">
              <p className="text-muted-foreground text-sm mb-3">No deployments yet.</p>
              <Button size="sm" onClick={handleDeploy} data-testid="button-first-deploy">Trigger Deploy</Button>
            </div>
          ) : (
            deployments?.map(d => (
              <Link key={d.id} href={`/deployments/${d.id}`}>
                <div className="bg-card border border-border rounded-lg px-5 py-4 flex items-center justify-between hover:border-border/60 transition-colors cursor-pointer" data-testid={`row-deploy-${d.id}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        d.status === "ready" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        d.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>{d.status}</span>
                      {d.commitMessage && <span className="text-sm truncate max-w-xs">{d.commitMessage}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })} · {d.branch} · {d.triggeredBy}
                      {d.buildDurationSeconds && ` · ${d.buildDurationSeconds.toFixed(0)}s`}
                    </p>
                  </div>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />Visit
                    </a>
                  )}
                </div>
              </Link>
            ))
          )}
        </TabsContent>

        {/* Env Vars tab */}
        <TabsContent value="env" className="mt-4 space-y-4">
          <form onSubmit={handleAddEnvVar} className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-medium">Add Variable</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="env-key" className="text-xs">Key</Label>
                <Input id="env-key" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="DATABASE_URL" className="font-mono text-xs h-8" data-testid="input-env-key" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-value" className="text-xs">Value</Label>
                <Input id="env-value" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="postgres://..." className="font-mono text-xs h-8" type={newEncrypted ? "password" : "text"} data-testid="input-env-value" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <Label className="text-xs">Scope</Label>
                <Select value={newScope} onValueChange={(v: any) => setNewScope(v)}>
                  <SelectTrigger className="h-8 w-28 text-xs" data-testid="select-env-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="build">Build</SelectItem>
                    <SelectItem value="runtime">Runtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={newEncrypted} onCheckedChange={setNewEncrypted} id="env-encrypted" data-testid="switch-env-encrypted" />
                <Label htmlFor="env-encrypted" className="text-xs">Encrypted</Label>
              </div>
              <Button type="submit" size="sm" className="mt-4 gap-1.5 ml-auto" disabled={!newKey.trim() || createEnvVar.isPending} data-testid="button-add-env-var">
                <Plus className="w-3.5 h-3.5" />Add
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {envLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />) :
              envVars?.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No environment variables set.</div>
              ) : (
                envVars?.map(v => (
                  <div key={v.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3" data-testid={`row-env-${v.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-medium">{v.key}</code>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">{v.scope}</span>
                        {v.encrypted && <span className="text-xs text-yellow-400 px-1.5 py-0.5 bg-yellow-500/10 rounded border border-yellow-500/20">encrypted</span>}
                      </div>
                      <code className="text-xs text-muted-foreground font-mono mt-0.5 block">
                        {revealedVars.has(v.id) ? v.value : v.value.startsWith("••") ? v.value : v.value.slice(0, 20) + (v.value.length > 20 ? "..." : "")}
                      </code>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRevealedVars(prev => { const s = new Set(prev); s.has(v.id) ? s.delete(v.id) : s.add(v.id); return s; })}>
                        {revealedVars.has(v.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEnvVar(v.id)} data-testid={`button-delete-env-${v.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
          </div>
        </TabsContent>

        {/* Domains tab */}
        <TabsContent value="domains" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Attach a domain to this project</p>
            <Link href="/domains/search">
              <Button size="sm" data-testid="button-register-domain-for-project">Register a domain</Button>
            </Link>
          </div>
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-medium">Project Settings</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {[
                { label: "Framework", value: project.framework ?? "—" },
                { label: "Build command", value: project.buildCommand ?? "—" },
                { label: "Output directory", value: project.outputDir ?? "—" },
                { label: "Branch", value: project.branch },
                { label: "Created", value: formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{s.label}</span>
                  <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{s.value}</code>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
