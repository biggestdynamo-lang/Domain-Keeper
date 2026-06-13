import { useRoute, Link } from "wouter";
import { useGetDeployment, getGetDeploymentQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCommit, Zap, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DeploymentPreviewPage() {
  const [, params] = useRoute("/preview/deployment/:id");
  const deploymentId = Number(params?.id);

  const { data: deployment, isLoading } = useGetDeployment(deploymentId, {
    query: { enabled: !!deploymentId, queryKey: getGetDeploymentQueryKey(deploymentId) },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mock deployed app content */}
      <div className="flex-1 flex flex-col">
        {/* Mock nav */}
        <div className="bg-[hsl(220,15%,5%)] border-b border-white/5 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-5 h-5 rounded bg-primary/80" />
            <div className="hidden sm:flex gap-5">
              {["Home", "About", "Work", "Contact"].map(item => (
                <div key={item} className="text-sm text-white/70 cursor-default">{item}</div>
              ))}
            </div>
          </div>
          <div className="h-7 w-20 bg-primary/70 rounded-md" />
        </div>

        {/* Mock hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center space-y-6 bg-gradient-to-b from-[hsl(220,15%,5%)] to-background">
          {isLoading ? (
            <div className="space-y-3 w-full max-w-lg">
              <Skeleton className="h-10 w-3/4 mx-auto" />
              <Skeleton className="h-5 w-1/2 mx-auto" />
              <Skeleton className="h-5 w-2/3 mx-auto" />
            </div>
          ) : (
            <>
              <div className="space-y-3 max-w-xl">
                <h1 className="text-4xl font-bold text-white leading-tight">
                  {deployment?.commitMessage ?? "Your app is live"}
                </h1>
                <p className="text-base text-white/50 leading-relaxed">
                  Deployed from <span className="text-white/70">{deployment?.branch ?? "main"}</span>
                  {deployment?.commitSha && (
                    <> · commit <span className="font-mono text-primary/80">{deployment.commitSha.slice(0, 7)}</span></>
                  )}
                  {deployment?.createdAt && (
                    <> · {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-28 bg-primary rounded-md" />
                <div className="h-10 w-24 bg-white/10 rounded-md border border-white/10" />
              </div>
            </>
          )}
        </div>

        {/* Mock content blocks */}
        <div className="bg-background px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
              {["Feature A", "Feature B", "Feature C"].map((f, i) => (
                <div key={f} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <div className={`w-9 h-9 rounded-lg ${["bg-blue-500/20", "bg-purple-500/20", "bg-green-500/20"][i]} flex items-center justify-center`}>
                    <div className={`w-4 h-4 rounded ${["bg-blue-500", "bg-purple-500", "bg-green-500"][i]}`} />
                  </div>
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-muted/60 rounded w-full" />
                    <div className="h-2.5 bg-muted/40 rounded w-5/6" />
                    <div className="h-2.5 bg-muted/30 rounded w-4/6" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[0, 1].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="h-36 bg-muted/30" />
                  <div className="p-4 space-y-2">
                    <div className="h-3.5 bg-muted rounded w-2/3" />
                    <div className="h-2.5 bg-muted/60 rounded w-full" />
                    <div className="h-2.5 bg-muted/40 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-card border-t border-border px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Zap className="w-3 h-3 text-primary" />
            Hosted on <span className="text-foreground font-medium">Freeable Domains</span>
            {deployment && (
              <span className="ml-1 flex items-center gap-1">
                · <GitCommit className="w-3 h-3" />
                <Link href={`/deployments/${deployment.id}`} className="hover:underline">
                  View deployment
                </Link>
                · <ExternalLink className="w-3 h-3" />
                <a href={window.location.href} className="font-mono">{window.location.hostname}</a>
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
