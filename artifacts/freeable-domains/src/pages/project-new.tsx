import { useState } from "react";
import { useLocation } from "wouter";
import { useDetectFramework, useImportFromGithub, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Search, Zap, ArrowRight, CheckCircle2, Code2 } from "lucide-react";

const EXAMPLE_REPOS = [
  "https://github.com/vercel/next.js",
  "https://github.com/vitejs/vite",
  "https://github.com/sveltejs/kit",
  "https://github.com/withastro/astro",
];

export default function ProjectNewPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [detected, setDetected] = useState<any>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const detectMutation = useDetectFramework();
  const importMutation = useImportFromGithub();

  function handleDetect(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    detectMutation.mutate(
      { data: { repoUrl: repoUrl.trim() } },
      { onSuccess: (result) => setDetected(result) }
    );
  }

  function handleImport() {
    if (!repoUrl.trim()) return;
    importMutation.mutate(
      { data: { repoUrl: repoUrl.trim() } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Import started", description: `Deploying ${result.project.name}...` });
          setLocation(`/projects/${result.project.id}`);
        },
        onError: () => toast({ title: "Import failed", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-new-project-title">Import from GitHub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste a GitHub repository URL. We detect the framework and deploy automatically.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        <form onSubmit={handleDetect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repoUrl">GitHub Repository URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="repoUrl"
                  className="pl-9"
                  placeholder="https://github.com/user/repository"
                  value={repoUrl}
                  onChange={e => { setRepoUrl(e.target.value); setDetected(null); }}
                  data-testid="input-repo-url"
                />
              </div>
              <Button type="submit" variant="outline" disabled={!repoUrl.trim() || detectMutation.isPending} data-testid="button-detect-framework">
                {detectMutation.isPending ? "Detecting..." : <><Search className="w-4 h-4 mr-1.5" /> Detect</>}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Examples:</span>
            {EXAMPLE_REPOS.map(url => (
              <button
                key={url}
                type="button"
                onClick={() => { setRepoUrl(url); setDetected(null); }}
                className="text-xs text-primary hover:underline"
                data-testid={`button-example-repo-${url.split("/").pop()}`}
              >
                {url.split("/").slice(-2).join("/")}
              </button>
            ))}
          </div>
        </form>

        {detected && (
          <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">Framework detected</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Framework", detected.framework ?? "Unknown"],
                ["Language", detected.language ?? "Unknown"],
                ["Package Manager", detected.packageManager ?? "npm"],
                ["Build Command", detected.buildCommand ?? "npm run build"],
                ["Output Dir", detected.outputDir ?? "dist"],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5 w-fit">{value}</span>
                </div>
              ))}
            </div>
            {detected.detectedFiles?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                {detected.detectedFiles.map((f: string) => (
                  <Badge key={f} variant="secondary" className="text-xs font-mono">{f}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Build pipeline preview */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium mb-4">Build pipeline</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {["Clone", "Install", "Build", "Deploy", "Verify"].map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-muted text-muted-foreground">{stage}</span>
              {i < 4 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={() => setLocation("/projects")}
          data-testid="button-cancel-import"
        >
          Cancel
        </Button>
        <Button
          disabled={!repoUrl.trim() || importMutation.isPending}
          onClick={handleImport}
          className="gap-2"
          data-testid="button-import-deploy"
        >
          <Zap className="w-4 h-4" />
          {importMutation.isPending ? "Importing..." : "Import & Deploy"}
        </Button>
      </div>
    </div>
  );
}
