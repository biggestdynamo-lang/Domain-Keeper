import { useState, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetProject, useGetProjectSummary, useListDeployments, useListDomains,
  useListEnvVars, useCreateDeployment, useCreateEnvVar, useDeleteEnvVar,
  useUpdateProject, useGetProjectWebhook, useTriggerGithubWebhook,
  useAttachDomainToProject, useDetachDomainFromProject,
  getListDeploymentsQueryKey, getListEnvVarsQueryKey, getListDomainsQueryKey,
  getGetProjectQueryKey, getGetProjectSummaryQueryKey, getGetProjectWebhookQueryKey
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
import { Zap, Globe, KeyRound, Activity, Settings, GitBranch, ExternalLink, Plus, Trash2, Eye, EyeOff, BarChart, Copy, Check, Webhook, GitCommit, RefreshCw, ChevronDown, Shield, Unlink } from "lucide-react";

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

interface DomainCardProps {
  domain: { id: number; fullDomain: string; status: string; sslEnabled: boolean; tld: string; name: string };
  deployTarget: string;
  onDetach: () => void;
  detaching: boolean;
}

function DomainCard({ domain, deployTarget, onDetach, detaching }: DomainCardProps) {
  const [showDns, setShowDns] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTarget = () => {
    navigator.clipboard.writeText(deployTarget);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{domain.fullDomain}</span>
            <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 text-[10px] h-4 px-1.5">
              {domain.status}
            </Badge>
            {domain.sslEnabled && (
              <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10 text-[10px] h-4 px-1.5 gap-0.5">
                <Shield className="w-2.5 h-2.5" />SSL
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">→ {deployTarget}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setShowDns(v => !v)}
          >
            DNS <ChevronDown className={`w-3 h-3 transition-transform ${showDns ? "rotate-180" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
            onClick={onDetach}
            disabled={detaching}
            data-testid={`button-detach-domain-${domain.id}`}
          >
            <Unlink className="w-3 h-3" />Detach
          </Button>
        </div>
      </div>

      {showDns && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-medium">DNS Configuration</p>
          <p className="text-xs text-muted-foreground">
            Add a CNAME record in your DNS provider pointing{" "}
            <code className="text-primary bg-primary/10 px-1 rounded text-[11px]">{domain.fullDomain}</code>{" "}
            to your deployment:
          </p>
          <div className="rounded-md bg-background border border-border overflow-hidden text-[11px] font-mono">
            <div className="grid grid-cols-4 gap-2 px-3 py-1.5 bg-muted/50 text-muted-foreground font-sans text-[10px] uppercase tracking-wide">
              <span>Type</span><span>Name</span><span className="col-span-2">Value</span>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 py-2 items-center">
              <span className="text-yellow-400">CNAME</span>
              <span className="text-blue-400">@</span>
              <span className="col-span-2 text-green-400 truncate">{deployTarget}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 py-2 items-center border-t border-border">
              <span className="text-yellow-400">CNAME</span>
              <span className="text-blue-400">www</span>
              <span className="col-span-2 text-green-400 truncate">{deployTarget}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <code className="flex-1 text-[11px] bg-background border border-border rounded px-2 py-1.5 text-muted-foreground truncate">{deployTarget}</code>
            <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs flex-shrink-0" onClick={copyTarget}>
              {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">DNS propagation usually takes 1–24 hours. SSL is provisioned automatically.</p>
        </div>
      )}
    </div>
  );
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
  const triggerWebhook = useTriggerGithubWebhook();
  const attachDomain = useAttachDomainToProject();
  const detachDomain = useDetachDomainFromProject();

  const { data: allDomains = [] } = useListDomains({
    query: { enabled: !!projectId, queryKey: getListDomainsQueryKey() },
  });

  const { data: webhookInfo, refetch: refetchWebhook } = useGetProjectWebhook(projectId, {
    query: { enabled: false, queryKey: getGetProjectWebhookQueryKey(projectId) },
  });

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newScope, setNewScope] = useState<"all" | "build" | "runtime">("all");
  const [newEncrypted, setNewEncrypted] = useState(false);
  const [revealedVars, setRevealedVars] = useState<Set<number>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");

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
              <div
                key={d.id}
                className="bg-card border border-border rounded-lg px-5 py-4 flex items-center justify-between hover:border-border/60 transition-colors cursor-pointer"
                onClick={() => setLocation(`/deployments/${d.id}`)}
                data-testid={`row-deploy-${d.id}`}
              >
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
        <TabsContent value="domains" className="mt-4 space-y-4">
          {/* Attached domains */}
          {(() => {
            const attached = allDomains.filter(d => d.projectId === projectId);
            const unattached = allDomains.filter(d => !d.projectId);
            const deployTarget = project.deploymentUrl ?? `deployment-latest.freeable.live`;

            return (
              <>
                {attached.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-8 text-center space-y-2">
                    <Globe className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No domains attached</p>
                    <p className="text-xs text-muted-foreground">Attach a registered domain to serve traffic for this project.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attached.map(domain => (
                      <DomainCard
                        key={domain.id}
                        domain={domain}
                        deployTarget={deployTarget}
                        onDetach={() => {
                          detachDomain.mutate({ id: domain.id }, {
                            onSuccess: () => {
                              queryClient.invalidateQueries({ queryKey: getListDomainsQueryKey() });
                              toast({ title: "Domain detached" });
                            },
                          });
                        }}
                        detaching={detachDomain.isPending}
                      />
                    ))}
                  </div>
                )}

                {/* Attach existing domain */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <h3 className="text-sm font-medium">Attach a registered domain</h3>
                  {unattached.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      All your domains are already attached to projects, or you haven't registered any yet.{" "}
                      <Link href="/domains/search" className="text-primary hover:underline">Register one free</Link>.
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                        <SelectTrigger className="flex-1 h-8 text-xs" data-testid="select-domain-to-attach">
                          <SelectValue placeholder="Pick a domain…" />
                        </SelectTrigger>
                        <SelectContent>
                          {unattached.map(d => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.fullDomain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="gap-1.5 flex-shrink-0"
                        disabled={!selectedDomainId || attachDomain.isPending}
                        onClick={() => {
                          if (!selectedDomainId) return;
                          attachDomain.mutate(
                            { id: Number(selectedDomainId), data: { projectId } },
                            {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: getListDomainsQueryKey() });
                                setSelectedDomainId("");
                                toast({ title: "Domain attached", description: "DNS config is ready below." });
                              },
                            }
                          );
                        }}
                        data-testid="button-attach-domain"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {attachDomain.isPending ? "Attaching…" : "Attach"}
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <Link href="/domains/search">
                    <Button variant="outline" size="sm" className="gap-1.5 w-full" data-testid="button-register-new-domain">
                      <Plus className="w-3.5 h-3.5" />Register a new free domain
                    </Button>
                  </Link>
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* Build settings */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-medium">Build Settings</h3>
            <div className="grid grid-cols-1 gap-0 text-sm">
              {[
                { label: "Framework", value: project.framework ?? "—" },
                { label: "Build command", value: project.buildCommand ?? "—" },
                { label: "Output directory", value: project.outputDir ?? "—" },
                { label: "Branch", value: project.branch },
                { label: "Created", value: formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{s.label}</span>
                  <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{s.value}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Webhook section */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-primary" />
                <h3 className="font-medium">GitHub Webhook</h3>
              </div>
              {!webhookInfo && (
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => refetchWebhook()} data-testid="button-reveal-webhook">
                  Show webhook URL
                </Button>
              )}
            </div>

            {!webhookInfo ? (
              <p className="text-sm text-muted-foreground">
                Auto-deploy on every <code className="bg-muted px-1 py-0.5 rounded text-xs">git push</code>. Click "Show webhook URL" to generate your endpoint.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Webhook URL */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Add this URL in your GitHub repo under <strong>Settings → Webhooks → Add webhook</strong>. Set content type to <code className="bg-muted px-1 py-0.5 rounded">application/json</code> and select <strong>Push events</strong>.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted border border-border rounded px-3 py-2 truncate text-muted-foreground">
                      {webhookInfo.webhookUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookInfo.webhookUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      data-testid="button-copy-webhook-url"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUrl ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>

                {/* Test button */}
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={triggerWebhook.isPending}
                    onClick={() => {
                      triggerWebhook.mutate(
                        {
                          token: webhookInfo.token,
                          data: {
                            ref: `refs/heads/${project.branch}`,
                            head_commit: { id: Math.random().toString(16).slice(2).padEnd(40, "0"), message: "chore: test webhook push" },
                            pusher: { name: "you" },
                          },
                        },
                        {
                          onSuccess: (result) => {
                            refetchWebhook();
                            toast({ title: "Test push sent", description: `Deployment #${result.deploymentId} triggered.` });
                          },
                        }
                      );
                    }}
                    data-testid="button-test-webhook"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${triggerWebhook.isPending ? "animate-spin" : ""}`} />
                    {triggerWebhook.isPending ? "Sending..." : "Send test push"}
                  </Button>
                  <span className="text-xs text-muted-foreground">Simulates a GitHub push to trigger a deployment</span>
                </div>

                {/* Recent events */}
                {webhookInfo.events.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Push Events</p>
                    <div className="space-y-1.5">
                      {webhookInfo.events.map(event => (
                        <div key={event.id} className="bg-muted/40 border border-border rounded-lg px-4 py-3 flex items-start gap-3">
                          <GitCommit className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-mono text-primary">{event.ref.replace("refs/heads/", "")}</code>
                              {event.commitSha && <code className="text-xs font-mono text-muted-foreground">{event.commitSha.slice(0, 7)}</code>}
                              {event.pusher && <span className="text-xs text-muted-foreground">by {event.pusher}</span>}
                            </div>
                            {event.commitMessage && <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.commitMessage}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {event.deploymentId && (
                              <button
                                className="text-xs text-primary hover:underline"
                                onClick={() => setLocation(`/deployments/${event.deploymentId}`)}
                              >
                                #{event.deploymentId}
                              </button>
                            )}
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(event.receivedAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {webhookInfo.events.length === 0 && (
                  <p className="text-xs text-muted-foreground">No push events received yet. Send a test push above or configure your GitHub repo.</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
