import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListIpAddresses,
  useCreateIpAddress,
  useAssignIpAddress,
  useReleaseIpAddress,
  useDeleteIpAddress,
  useListDomains,
  getListIpAddressesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Network,
  Plus,
  Trash2,
  Link2,
  Link2Off,
  Globe,
  Shield,
  ChevronDown,
} from "lucide-react";

const REGION_LABELS: Record<string, string> = {
  "us-east-1": "US East",
  "us-west-2": "US West",
  "eu-west-1": "EU West",
  "ap-northeast-1": "AP Tokyo",
  "ap-southeast-1": "AP Singapore",
};

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-500/10 text-green-400 border-green-500/20",
  assigned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  reserved: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function IpAddressesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: ips, isLoading } = useListIpAddresses();
  const { data: domains } = useListDomains();
  const createIp = useCreateIpAddress();
  const assignIp = useAssignIpAddress();
  const releaseIp = useReleaseIpAddress();
  const deleteIp = useDeleteIpAddress();

  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newRegion, setNewRegion] = useState("us-east-1");
  const [newType, setNewType] = useState<"shared" | "dedicated">("shared");

  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");

  const ipList = Array.isArray(ips) ? ips : [];
  const domainList = Array.isArray(domains) ? domains : [];
  const availableDomains = domainList.filter(d => !ipList.some(ip => ip.domainId === d.id));

  const stats = {
    total: ipList.length,
    available: ipList.filter(ip => ip.status === "available").length,
    assigned: ipList.filter(ip => ip.status === "assigned").length,
    reserved: ipList.filter(ip => ip.status === "reserved").length,
  };

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListIpAddressesQueryKey() });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.trim()) return;
    createIp.mutate(
      { data: { address: newAddress.trim(), label: newLabel.trim() || undefined, region: newRegion, type: newType } },
      {
        onSuccess: () => {
          toast({ title: "IP added", description: `${newAddress} added to pool.` });
          setNewAddress(""); setNewLabel(""); setShowAdd(false);
          invalidate();
        },
        onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed to add IP", variant: "destructive" }),
      }
    );
  }

  function handleAssign(ipId: number) {
    if (!selectedDomainId) return;
    assignIp.mutate(
      { id: ipId, data: { domainId: Number(selectedDomainId) } },
      {
        onSuccess: () => {
          toast({ title: "IP assigned" });
          setAssigningId(null); setSelectedDomainId("");
          invalidate();
        },
        onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed to assign", variant: "destructive" }),
      }
    );
  }

  function handleRelease(ipId: number, address: string) {
    releaseIp.mutate({ id: ipId }, {
      onSuccess: () => { toast({ title: "IP released", description: `${address} is now available.` }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed to release", variant: "destructive" }),
    });
  }

  function handleDelete(ipId: number, address: string) {
    deleteIp.mutate({ id: ipId }, {
      onSuccess: () => { toast({ title: "IP removed", description: `${address} removed from pool.` }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed to delete", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IP Addresses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your IP pool and assign addresses to domains</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setShowAdd(v => !v)}>
          <Plus className="w-4 h-4" /> Add IP
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total IPs", value: stats.total, color: "text-foreground" },
          { label: "Available", value: stats.available, color: "text-green-400" },
          { label: "Assigned", value: stats.assigned, color: "text-blue-400" },
          { label: "Reserved", value: stats.reserved, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Add IP form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-sm">Add IP to Pool</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">IP Address *</label>
              <Input
                placeholder="e.g. 203.0.113.1"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                className="font-mono h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Label (optional)</label>
              <Input
                placeholder="e.g. Primary US East"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Region</label>
              <select
                value={newRegion}
                onChange={e => setNewRegion(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(REGION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v} ({k})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as "shared" | "dedicated")}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="shared">Shared</option>
                <option value="dedicated">Dedicated</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createIp.isPending}>
              {createIp.isPending ? "Adding…" : "Add IP"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* IP Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Network className="w-4 h-4 text-muted-foreground" /> IP Pool
          </h2>
          <span className="text-xs text-muted-foreground">{ipList.length} address{ipList.length !== 1 ? "es" : ""}</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4"><Skeleton className="h-12 w-full" /></div>
            ))}
          </div>
        ) : ipList.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Network className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No IP addresses in pool yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add IP" to add your first address.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ipList.map(ip => (
              <div key={ip.id} className="px-5 py-4">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* IP info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Network className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm">{ip.address}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[ip.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {ip.status}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                          {ip.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {ip.label && <span className="text-xs text-muted-foreground">{ip.label}</span>}
                        <span className="text-xs text-muted-foreground">{REGION_LABELS[ip.region] ?? ip.region}</span>
                        {ip.status === "assigned" && ip.domainName && (
                          <span className="text-xs text-blue-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" />{ip.domainName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {ip.status === "available" && (
                      <>
                        {assigningId === ip.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedDomainId}
                              onChange={e => setSelectedDomainId(e.target.value)}
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs min-w-32"
                            >
                              <option value="">Select domain…</option>
                              {availableDomains.map(d => (
                                <option key={d.id} value={d.id}>{d.fullDomain}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              className="h-8 text-xs px-3"
                              disabled={!selectedDomainId || assignIp.isPending}
                              onClick={() => handleAssign(ip.id)}
                            >
                              Assign
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs px-3"
                              onClick={() => { setAssigningId(null); setSelectedDomainId(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => { setAssigningId(ip.id); setSelectedDomainId(""); }}
                          >
                            <Link2 className="w-3 h-3" /> Assign
                          </Button>
                        )}
                      </>
                    )}

                    {ip.status === "assigned" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        disabled={releaseIp.isPending}
                        onClick={() => handleRelease(ip.id, ip.address)}
                      >
                        <Link2Off className="w-3 h-3" /> Release
                      </Button>
                    )}

                    {ip.status !== "assigned" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                        disabled={deleteIp.isPending}
                        onClick={() => handleDelete(ip.id, ip.address)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Assignment info */}
                {ip.status === "assigned" && ip.assignedAt && (
                  <div className="mt-2 ml-12 text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Assigned {new Date(ip.assignedAt).toLocaleDateString()} · A record updated automatically
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-sm mb-3">How IP assignment works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Plus, title: "1. Add to pool", desc: "Add IPv4 addresses to your managed IP pool with a region and type." },
            { icon: Link2, title: "2. Assign to domain", desc: "Pick a registered domain. The A record is updated automatically to point to the new IP." },
            { icon: Shield, title: "3. SSL & routing", desc: "SSL certificates and reverse proxy rules are applied within minutes." },
          ].map(step => (
            <div key={step.title} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <step.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
