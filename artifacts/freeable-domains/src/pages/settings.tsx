import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield, Bell, Key, User } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const { toast } = useToast();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform preferences and account configuration</p>
      </div>

      {/* Account */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Account</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
            ME
          </div>
          <div>
            <p className="font-medium">Developer</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">Free Plan</Badge>
              <span className="text-xs text-muted-foreground">No signup required</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Display Name</Label>
            <Input defaultValue="Developer" className="h-8 text-sm" data-testid="input-display-name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email (optional)</Label>
            <Input placeholder="you@example.com" className="h-8 text-sm" data-testid="input-email" />
          </div>
        </div>
        <Button size="sm" onClick={() => toast({ title: "Settings saved" })} data-testid="button-save-account">Save changes</Button>
      </div>

      {/* Nameservers */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Nameservers</h2>
        </div>
        <p className="text-xs text-muted-foreground">Use these nameservers when configuring external domains.</p>
        <div className="space-y-2">
          {["ns1.freeable.local", "ns2.freeable.local", "ns3.freeable.local", "ns4.freeable.local"].map((ns, i) => (
            <div key={ns} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">NS{i + 1}</span>
              <code className="flex-1 text-xs bg-muted rounded px-3 py-1.5 font-mono">{ns}</code>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">API Access</h2>
        </div>
        <p className="text-xs text-muted-foreground">Use the REST API to manage projects, domains, and deployments programmatically.</p>
        <div className="space-y-1.5">
          <Label className="text-xs">API Endpoint</Label>
          <code className="block w-full text-xs bg-muted rounded px-3 py-2 font-mono">https://freeable.local/api</code>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => toast({ title: "API token generated" })} data-testid="button-generate-api-token">Generate Token</Button>
          <Button size="sm" variant="ghost" data-testid="button-view-api-docs">View API Docs</Button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Preferences</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Deployment notifications</p>
            <p className="text-xs text-muted-foreground">Get notified when deployments complete or fail</p>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} data-testid="switch-notifications" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Usage analytics</p>
            <p className="text-xs text-muted-foreground">Allow platform to track anonymous usage for improvements</p>
          </div>
          <Switch checked={analytics} onCheckedChange={setAnalytics} data-testid="switch-analytics" />
        </div>
      </div>
    </div>
  );
}
