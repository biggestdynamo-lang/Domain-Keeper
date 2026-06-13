import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSearchDomains, useRegisterDomain, getListDomainsQueryKey, getSearchDomainsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle2, XCircle, Shield, Zap, Globe } from "lucide-react";

export default function DomainSearchPage() {
  const [location] = useLocation();
  const initialQ = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : "";
  const [query, setQuery] = useState(initialQ);
  const [searchQ, setSearchQ] = useState(initialQ);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const registerDomain = useRegisterDomain();

  const { data: results, isLoading } = useSearchDomains(
    { q: searchQ },
    { query: { enabled: searchQ.length > 0, queryKey: getSearchDomainsQueryKey({ q: searchQ }) } }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) setSearchQ(query.trim().split(".")[0]);
  }

  function handleRegister(name: string, tld: string, fullDomain: string) {
    registerDomain.mutate(
      { data: { name, tld } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDomainsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getSearchDomainsQueryKey({ q: searchQ }) });
          toast({ title: "Domain registered!", description: `${fullDomain} is now yours.` });
        },
        onError: (e: any) => toast({ title: "Registration failed", description: e?.message ?? "This domain may already be taken.", variant: "destructive" }),
      }
    );
  }

  const resultsArr = Array.isArray(results) ? results : [];
  const available = resultsArr.filter(r => r.available);
  const taken = resultsArr.filter(r => !r.available);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-domain-search-title">Domain Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search across 9 free TLDs — no payment required.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10 h-11"
            placeholder="Search a domain name — e.g. myapp, chatbot, webapp"
            value={query}
            onChange={e => setQuery(e.target.value)}
            data-testid="input-search-domain"
          />
        </div>
        <Button type="submit" className="h-11 px-6" data-testid="button-search">Search</Button>
      </form>

      {isLoading && searchQ && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      )}

      {resultsArr.length > 0 && (
        <div className="space-y-6">
          {available.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />{available.length} Available
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {available.map(r => (
                  <div key={r.fullDomain} className="bg-card border border-green-500/20 rounded-lg p-4 hover:border-green-500/40 transition-colors" data-testid={`card-domain-result-${r.fullDomain}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono font-semibold text-sm">{r.fullDomain}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />Available
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Shield className="w-3 h-3" />Free SSL
                          </span>
                        </div>
                        <p className="text-xs text-green-400 font-medium mt-1">FREE</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-3 h-7 text-xs gap-1.5"
                      onClick={() => handleRegister(r.name, r.tld, r.fullDomain)}
                      disabled={registerDomain.isPending}
                      data-testid={`button-register-${r.fullDomain}`}
                    >
                      <Zap className="w-3 h-3" />Register
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {taken.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" />{taken.length} Taken
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {taken.map(r => (
                  <div key={r.fullDomain} className="bg-card border border-border rounded-lg p-4 opacity-60" data-testid={`card-domain-taken-${r.fullDomain}`}>
                    <p className="font-mono font-semibold text-sm">{r.fullDomain}</p>
                    <span className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                      <XCircle className="w-3 h-3" />Taken
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!searchQ && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Enter a name above to check availability across all free TLDs.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {[".live", ".freeable", ".qwerty", ".ai.net", ".love", ".bot.net", ".zapto.org", ".0.com", ".free.net", ".ver"].map(tld => (
              <span key={tld} className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground">{tld}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
