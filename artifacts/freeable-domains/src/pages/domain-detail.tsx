import { useRoute, Link } from "wouter";
import {
  useGetDomain, useListDnsRecords, useCreateDnsRecord, useDeleteDnsRecord,
  getGetDomainQueryKey, getListDnsRecordsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Shield, Globe, RefreshCw, Plus, Trash2, Server, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useGetConfig } from "@workspace/api-client-react";

const DNS_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA", "PTR", "ALIAS"] as const;

export default function DomainDetailPage() {
  const [, params] = useRoute("/domains/:id");
  const domainId = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config } = useGetConfig();

  const { data: domain, isLoading } = useGetDomain(domainId, {
    query: { enabled: !!domainId, queryKey: getGetDomainQueryKey(domainId) },
  });
  const { data: dnsRecords, isLoading: dnsLoading } = useListDnsRecords(domainId, {
    query: { enabled: !!domainId, queryKey: getListDnsRecordsQueryKey(domainId) },
  });

  const createRecord = useCreateDnsRecord();
  const deleteRecord = useDeleteDnsRecord();

  const [type, setType] = useState<string>("A");
  const [name, setName] = useState("@");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("3600");

  function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    createRecord.mutate(
      { id: domainId, data: { type: type as any, name, value, ttl: Number(ttl) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDnsRecordsQueryKey(domainId) });
          setValue(""); setName("@");
          toast({ title: "DNS record added" });
        },
      }
    );
  }

  function handleDeleteRecord(id: number) {
    deleteRecord.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDnsRecordsQueryKey(domainId) });
        toast({ title: "Record deleted" });
      },
    });
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );

  if (!domain) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Domain not found.</p>
      <Link href="/domains"><Button variant="ghost" className="mt-4">Back</Button></Link>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/domains">
          <Button variant="ghost" size="sm" className="gap-1.5 h-7"><ArrowLeft className="w-3.5 h-3.5" />Domains</Button>
        </Link>
      </div>

      {/* Domain overview */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono" data-testid="text-domain-detail-name">{domain.fullDomain}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
              <span className={`px-2 py-0.5 rounded-full border font-medium ${
                domain.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                domain.status === "expired" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              }`}>{domain.status}</span>
              {domain.sslEnabled && <span className="flex items-center gap-1 text-green-400"><Shield className="w-3 h-3" />SSL Active</span>}
              {domain.autoRenew && <span className="flex items-center gap-1 text-muted-foreground"><RefreshCw className="w-3 h-3" />Auto-renew</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "Registered", value: format(new Date(domain.registeredAt), "MMM d, yyyy") },
            { label: "Expires", value: format(new Date(domain.expiresAt), "MMM d, yyyy") },
            { label: "Project", value: domain.projectName ?? "—" },
            { label: "TLD", value: domain.tld },
            { label: "Nameservers", value: "ns1.freeable.local" },
            { label: "Registry", value: "Freeable Registry" },
          ].map(s => (
            <div key={s.label} className="bg-muted/40 rounded p-2.5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-medium mt-0.5 text-xs">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* DNS Manager */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">DNS Records</h2>
          <span className="text-xs text-muted-foreground ml-auto">{dnsRecords?.length ?? 0} records</span>
        </div>

        {/* Cloudflare sync status notice */}
        {config !== undefined && (
          <div className={`px-5 py-3 flex items-start gap-2.5 text-xs border-b border-border ${
            config.cloudflareEnabled
              ? "bg-green-500/5 text-green-400"
              : "bg-yellow-500/5 text-yellow-500"
          }`}>
            {config.cloudflareEnabled ? (
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            )}
            <span>
              {config.cloudflareEnabled
                ? "Cloudflare DNS sync is active — changes are propagated to your Cloudflare zone."
                : <>
                    Cloudflare DNS sync is not configured — records are saved locally only.{" "}
                    Set <code className="font-mono bg-yellow-500/10 px-1 rounded">CLOUDFLARE_API_TOKEN</code> and{" "}
                    <code className="font-mono bg-yellow-500/10 px-1 rounded">CLOUDFLARE_ZONE_ID</code> to enable real DNS propagation.
                  </>
              }
            </span>
          </div>
        )}

        {/* Add record form */}
        <form onSubmit={handleAddRecord} className="p-4 border-b border-border bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-dns-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DNS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="@" className="h-8 text-xs font-mono" data-testid="input-dns-name" />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-xs">Value</Label>
              <Input value={value} onChange={e => setValue(e.target.value)} placeholder="1.2.3.4" className="h-8 text-xs font-mono" data-testid="input-dns-value" />
            </div>
            <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={!value.trim() || createRecord.isPending} data-testid="button-add-dns-record">
              <Plus className="w-3.5 h-3.5" />Add
            </Button>
          </div>
        </form>

        {/* Records table */}
        <div className="divide-y divide-border">
          {dnsLoading ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3"><Skeleton className="h-4 w-full" /></div>
          )) : dnsRecords?.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No DNS records.</div>
          ) : (
            dnsRecords?.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3 text-xs" data-testid={`row-dns-${r.id}`}>
                <span className="w-14 font-mono font-bold text-primary">{r.type}</span>
                <span className="font-mono w-20 text-muted-foreground truncate">{r.name}</span>
                <span className="font-mono flex-1 truncate">{r.value}</span>
                <span className="text-muted-foreground w-16 text-right">{r.ttl}s</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => handleDeleteRecord(r.id)}
                  data-testid={`button-delete-dns-${r.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
