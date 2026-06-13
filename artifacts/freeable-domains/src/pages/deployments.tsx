import { Link, useLocation } from "wouter";
import { useListProjects, useListDeployments, getListDeploymentsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity, GitCommit, Clock, ExternalLink } from "lucide-react";

function statusBadge(status: string) {
  switch (status) {
    case "ready": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "failed": case "cancelled": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "rolled_back": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default: return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  }
}

function AllDeployments() {
  const { data: projects } = useListProjects();
  // Use first project to show a global deployments view, or show empty
  if (!projects?.length) return (
    <div className="text-center py-16 text-muted-foreground text-sm">No projects yet. <Link href="/projects/new" className="text-primary hover:underline">Create one</Link>.</div>
  );
  return (
    <div className="space-y-6">
      {projects.map(project => (
        <ProjectDeployments key={project.id} projectId={project.id} projectName={project.name} />
      ))}
    </div>
  );
}

function ProjectDeployments({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { data: deployments, isLoading } = useListDeployments(projectId, {
    query: { enabled: true, queryKey: getListDeploymentsQueryKey(projectId) },
  });
  const [, setLocation] = useLocation();

  if (isLoading) return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
  );
  if (!deployments?.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Link href={`/projects/${projectId}`}>
          <h3 className="text-sm font-semibold hover:text-primary transition-colors">{projectName}</h3>
        </Link>
        <span className="text-xs text-muted-foreground">({deployments.length} deployment{deployments.length !== 1 ? "s" : ""})</span>
      </div>
      <div className="space-y-2">
        {deployments.slice(0, 5).map(d => (
          <div
            key={d.id}
            className="bg-card border border-border rounded-lg px-5 py-4 flex items-center gap-4 hover:border-border/60 transition-colors cursor-pointer"
            onClick={() => setLocation(`/deployments/${d.id}`)}
            data-testid={`row-deployment-${d.id}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge(d.status)}`}>{d.status}</span>
                {d.commitMessage && <span className="text-sm truncate max-w-sm">{d.commitMessage}</span>}
                {d.isProduction && <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">prod</span>}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</span>
                {d.commitSha && <span className="flex items-center gap-1"><GitCommit className="w-3 h-3" />{d.commitSha.slice(0, 7)}</span>}
                <span>{d.branch}</span>
                <span>{d.triggeredBy}</span>
                {d.buildDurationSeconds && <span>{d.buildDurationSeconds.toFixed(0)}s</span>}
              </div>
            </div>
            {d.url && (
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <ExternalLink className="w-3 h-3" />Visit
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeploymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-deployments-title">Deployments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All deployments across your projects</p>
      </div>
      <AllDeployments />
    </div>
  );
}
