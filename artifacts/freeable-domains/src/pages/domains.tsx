import { Link } from "wouter";
import { useListDomains, useDeleteDomain, getListDomainsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Globe, Plus, Trash2, Shield, RefreshCw, ExternalLink } from "lucide-react";

function statusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "pending": case "transferring": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "expired": case "suspended": return "bg-red-500/10 text-red-400 border-red-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function DomainsPage() {
  const { data: domains, isLoading } = useListDomains();
  const deleteDomain = useDeleteDomain();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleDelete(id: number, fullDomain: string) {
    if (!confirm(`Delete domain "${fullDomain}"?`)) return;
    deleteDomain.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDomainsQueryKey() });
        toast({ title: "Domain deleted", description: `"${fullDomain}" has been removed.` });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-domains-title">Domains</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {domains?.length ?? 0} registered domain{domains?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/domains/search">
          <Button size="sm" className="gap-1.5" data-testid="button-register-new-domain">
            <Plus className="w-3.5 h-3.5" />Register Domain
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : domains?.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-1">No domains registered</p>
          <p className="text-sm text-muted-foreground mb-5">Get a free custom domain — .live, .freeable, .ai.net and more.</p>
          <Link href="/domains/search">
            <Button data-testid="button-search-domains">Search domains</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {domains?.map(d => (
            <div key={d.id} className="bg-card border border-border rounded-lg p-5 hover:border-border/60 transition-colors" data-testid={`card-domain-${d.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/domains/${d.id}`}>
                        <span className="font-semibold font-mono hover:text-primary transition-colors cursor-pointer" data-testid={`text-domain-${d.id}`}>{d.fullDomain}</span>
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(d.status)}`}>{d.status}</span>
                      {d.sslEnabled && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <Shield className="w-3 h-3" />SSL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {d.projectName && (
                        <Link href={`/projects/${d.projectId}`}>
                          <span className="text-primary hover:underline">{d.projectName}</span>
                        </Link>
                      )}
                      <span>Expires {format(new Date(d.expiresAt), "MMM d, yyyy")}</span>
                      {d.autoRenew && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />Auto-renew</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/domains/${d.id}`}>
                    <Button variant="outline" size="sm" className="text-xs h-7" data-testid={`button-manage-domain-${d.id}`}>Manage</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(d.id, d.fullDomain)}
                    data-testid={`button-delete-domain-${d.id}`}
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
