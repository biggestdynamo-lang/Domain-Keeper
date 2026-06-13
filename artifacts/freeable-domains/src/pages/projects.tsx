import { Link } from "wouter";
import { useListProjects, useDeleteProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, GitBranch, Globe, Trash2, ExternalLink, Box } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "building": case "deploying": return "secondary";
    case "failed": return "destructive";
    default: return "outline";
  }
}

function statusDot(status: string) {
  switch (status) {
    case "active": return "bg-green-500";
    case "building": case "deploying": case "cloning": case "installing": return "bg-yellow-500 animate-pulse";
    case "failed": return "bg-red-500";
    default: return "bg-muted-foreground";
  }
}

const FRAMEWORK_ICONS: Record<string, string> = {
  "Next.js": "N",
  "React (Vite)": "R",
  "Nuxt": "N",
  "Astro": "A",
  "SvelteKit": "S",
  "Vue": "V",
  "Angular": "A",
  "Express": "E",
  "FastAPI": "F",
  "Flask": "F",
};

export default function ProjectsPage() {
  const { data: projects, isLoading } = useListProjects();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete project "${name}"?`)) return;
    deleteProject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project deleted", description: `"${name}" has been removed.` });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-projects-title">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects?.length ?? 0} project{projects?.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/projects/new">
          <Button size="sm" className="gap-1.5" data-testid="button-new-project">
            <Plus className="w-3.5 h-3.5" /> New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5">
              <Skeleton className="h-5 w-48 mb-3" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center">
          <Box className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-1">No projects yet</p>
          <p className="text-sm text-muted-foreground mb-5">Import a GitHub repository to get started.</p>
          <Link href="/projects/new">
            <Button data-testid="button-create-first-project">Import from GitHub</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects?.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-lg p-5 hover:border-border/80 transition-colors" data-testid={`card-project-${p.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {FRAMEWORK_ICONS[p.framework ?? ""] ?? p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/projects/${p.id}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors" data-testid={`text-project-name-${p.id}`}>{p.name}</h3>
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusDot(p.status)}`} />
                        <span className="text-xs text-muted-foreground">{p.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {p.framework && (
                        <span className="text-xs text-muted-foreground">{p.framework}</span>
                      )}
                      {p.repoUrl && (
                        <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <GitBranch className="w-3 h-3" />{p.branch}
                        </a>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    {p.deploymentUrl && (
                      <a href={p.deploymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                        <Globe className="w-3 h-3" />{p.deploymentUrl}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/projects/${p.id}`}>
                    <Button variant="outline" size="sm" className="text-xs h-7" data-testid={`button-view-project-${p.id}`}>Manage</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(p.id, p.name)}
                    data-testid={`button-delete-project-${p.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
