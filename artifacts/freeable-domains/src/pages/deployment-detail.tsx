import { useRoute, Link } from "wouter";
import { useGetDeployment, useGetDeploymentLogs, useRollbackDeployment, getGetDeploymentQueryKey, getGetDeploymentLogsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { CheckCircle2, XCircle, Clock, ArrowLeft, RotateCcw, GitCommit, Zap } from "lucide-react";
import { SimulatedVisitButton } from "@/components/simulated-visit";

const STAGES = ["clone", "install", "build", "deploy", "verify"] as const;
const TERMINAL = ["ready", "failed", "cancelled", "rolled_back"];

interface LogEntry {
  id: number;
  deploymentId: number;
  stage: string;
  level: string;
  message: string;
  timestamp: string;
}

function StageStatus({ stage, logs, activeStatus }: { stage: string; logs: LogEntry[]; activeStatus: string }) {
  const stageLogs = logs.filter(l => l.stage === stage);
  const hasError = stageLogs.some(l => l.level === "error");
  const hasLogs = stageLogs.length > 0;

  const stageIndex = STAGES.indexOf(stage as typeof STAGES[number]);
  const activeIndex = ["cloning", "installing", "building", "deploying", "verifying", "ready"].findIndex(s => s === activeStatus + (activeStatus === "clone" ? "ing" : "") || activeStatus === s);

  if (!hasLogs) {
    return <div className="w-3 h-3 rounded-full bg-muted border border-border" />;
  }
  if (hasError) return <XCircle className="w-4 h-4 text-red-400" />;

  const statusMap: Record<string, number> = { cloning: 0, installing: 1, building: 2, deploying: 3, ready: 4 };
  const currentStageIdx = statusMap[activeStatus] ?? -1;

  if (!TERMINAL.includes(activeStatus) && stageIndex === currentStageIdx) {
    return <Clock className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: "2s" }} />;
  }
  return <CheckCircle2 className="w-4 h-4 text-green-400" />;
}

function levelColor(level: string) {
  switch (level) {
    case "error": return "text-red-400";
    case "warn": return "text-yellow-400";
    case "success": return "text-green-400";
    case "debug": return "text-muted-foreground";
    default: return "text-foreground";
  }
}

export default function DeploymentDetailPage() {
  const [, params] = useRoute("/deployments/:id");
  const deploymentId = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logBoxRef = useRef<HTMLDivElement>(null);

  const { data: deployment, isLoading } = useGetDeployment(deploymentId, {
    query: { enabled: !!deploymentId, queryKey: getGetDeploymentQueryKey(deploymentId) },
  });

  const isActive = !!deployment && !TERMINAL.includes(deployment.status);

  // Static logs for completed deployments
  const { data: staticLogs = [] } = useGetDeploymentLogs(deploymentId, {
    query: {
      enabled: !!deploymentId && !isActive,
      queryKey: getGetDeploymentLogsQueryKey(deploymentId),
    },
  });

  // Streamed logs for active deployments
  const [streamedLogs, setStreamedLogs] = useState<LogEntry[]>([]);
  const [streamStatus, setStreamStatus] = useState<string>("");
  const [streamDone, setStreamDone] = useState(false);

  useEffect(() => {
    if (!deploymentId || !deployment) return;
    if (TERMINAL.includes(deployment.status)) return;

    // Reset stream state for this deployment
    setStreamedLogs([]);
    setStreamDone(false);
    setStreamStatus(deployment.status);

    const es = new EventSource(`/api/deployments/${deploymentId}/logs/stream`);

    es.addEventListener("log", (e) => {
      const log: LogEntry = JSON.parse(e.data);
      setStreamedLogs(prev => {
        if (prev.some(l => l.id === log.id)) return prev;
        return [...prev, log];
      });
    });

    es.addEventListener("status", (e) => {
      const { status } = JSON.parse(e.data);
      setStreamStatus(status);
      // Refresh the deployment data so header/badges update
      queryClient.invalidateQueries({ queryKey: getGetDeploymentQueryKey(deploymentId) });
    });

    es.addEventListener("done", () => {
      setStreamDone(true);
      es.close();
    });

    es.onerror = () => {
      setStreamDone(true);
      es.close();
    };

    return () => es.close();
  }, [deploymentId, deployment?.status]);

  // Auto-scroll log box to bottom as new lines arrive
  useEffect(() => {
    const box = logBoxRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [streamedLogs, staticLogs]);

  const rollback = useRollbackDeployment();

  function handleRollback() {
    rollback.mutate({ id: deploymentId }, {
      onSuccess: () => toast({ title: "Rollback triggered", description: "A new deployment is starting." }),
    });
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );

  if (!deployment) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Deployment not found.</p>
      <Link href="/deployments"><Button variant="ghost" className="mt-4">Back</Button></Link>
    </div>
  );

  const logs: LogEntry[] = isActive ? streamedLogs : (staticLogs as LogEntry[]);
  const displayStatus = isActive ? (streamStatus || deployment.status) : deployment.status;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${deployment.projectId}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 h-7">
            <ArrowLeft className="w-3.5 h-3.5" />Back
          </Button>
        </Link>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">Deployment #{deployment.id}</span>
      </div>

      {/* Header card */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full border ${
                displayStatus === "ready" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                displayStatus === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              }`}>{displayStatus}</span>
              {deployment.isProduction && <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">production</span>}
              {isActive && !streamDone && (
                <span className="flex items-center gap-1.5 text-xs text-yellow-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            {deployment.commitMessage && <p className="font-medium mt-2">{deployment.commitMessage}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>{formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}</span>
              {deployment.commitSha && <span className="flex items-center gap-1"><GitCommit className="w-3 h-3" />{deployment.commitSha.slice(0, 7)}</span>}
              <span>{deployment.branch}</span>
              {deployment.buildDurationSeconds && <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{deployment.buildDurationSeconds.toFixed(0)}s</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {deployment.url && (
              <SimulatedVisitButton url={deployment.url} variant="outline" size="sm" className="gap-1.5" testId="button-visit-deployment" />
            )}
            {deployment.status === "ready" && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleRollback} disabled={rollback.isPending} data-testid="button-rollback">
                <RotateCcw className={`w-3.5 h-3.5 ${rollback.isPending ? "animate-spin" : ""}`} />
                {rollback.isPending ? "Rolling back…" : "Rollback"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium mb-4">Build Pipeline</h3>
        <div className="flex items-center gap-2 mb-5">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <StageStatus stage={stage} logs={logs} activeStatus={displayStatus} />
                <span className="text-xs capitalize text-muted-foreground">{stage}</span>
              </div>
              {i < STAGES.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Log output */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive && !streamDone ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
          <h3 className="text-sm font-medium">Build Output</h3>
          <span className="text-xs text-muted-foreground ml-auto">{logs.length} lines</span>
        </div>
        <div
          ref={logBoxRef}
          className="bg-black/50 font-mono text-xs p-4 max-h-96 overflow-y-auto space-y-0.5"
          data-testid="container-build-logs"
        >
          {logs.length === 0 ? (
            <p className="text-muted-foreground">
              {isActive ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-3 bg-muted-foreground animate-pulse" />
                  Connecting to build pipeline...
                </span>
              ) : "No logs available."}
            </p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="text-muted-foreground flex-shrink-0 select-none">{format(new Date(log.timestamp), "HH:mm:ss")}</span>
                <span className="text-muted-foreground flex-shrink-0 w-14">[{log.stage}]</span>
                <span className={levelColor(log.level)}>{log.message}</span>
              </div>
            ))
          )}
          {isActive && !streamDone && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <span className="inline-block w-1.5 h-3 bg-muted-foreground/50 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
