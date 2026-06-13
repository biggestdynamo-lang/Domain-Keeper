import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Copy, Check, Zap, Lock, RefreshCw } from "lucide-react";

// Legacy fake deployment domains that don't resolve in DNS —
// new deployments use the app's own real domain instead.
function isLegacyFakeUrl(url: string) {
  return url.includes(".freeable.live") ||
    url.includes(".freeable") ||
    url.includes(".bot.net") ||
    url.includes(".zapto.org") ||
    url.includes(".ai.net") ||
    url.includes(".love") ||
    url.includes(".free.net") ||
    url.includes(".0.com") ||
    url.includes(".qwerty") ||
    url.includes(".live") && !url.includes(window.location.hostname);
}

interface SimulatedVisitButtonProps {
  url: string;
  size?: "sm" | "default";
  variant?: "link" | "outline" | "ghost";
  className?: string;
  label?: string;
  testId?: string;
}

export function SimulatedVisitButton({ url, size = "sm", variant = "ghost", className = "", label = "Visit", testId }: SimulatedVisitButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isReal = !isLegacyFakeUrl(url);
  const fullUrl = url.startsWith("/") ? `${window.location.origin}${url}` : url;

  const copy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Real URL (new-style /preview/deployment-N on our own domain) — open directly
  if (isReal) {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
        <Button variant={variant} size={size} className={`gap-1.5 ${className}`} data-testid={testId}>
          <ExternalLink className="w-3.5 h-3.5" />
          {label}
        </Button>
      </a>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`gap-1.5 ${className}`}
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        data-testid={testId}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Simulated Deployment Preview
            </DialogTitle>
          </DialogHeader>

          {/* Fake browser chrome */}
          <div className="mx-5 mt-4 rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/60 px-3 py-2 flex items-center gap-2 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex items-center gap-1.5 bg-background/80 rounded px-2 py-1 text-[11px] text-muted-foreground font-mono border border-border/50">
                <Lock className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                <span className="truncate">{url}</span>
              </div>
              <RefreshCw className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </div>

            {/* "Page body" */}
            <div className="bg-[hsl(220,15%,6%)] p-8 text-center space-y-3 min-h-[140px] flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Your app is live here</p>
                <p className="text-xs text-muted-foreground mt-0.5">Freeable Domains · Simulated Environment</p>
              </div>
              <div className="flex gap-2 mt-1">
                <div className="h-1.5 w-24 bg-muted rounded-full" />
                <div className="h-1.5 w-16 bg-muted/60 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="h-1.5 w-16 bg-muted/40 rounded-full" />
                <div className="h-1.5 w-20 bg-muted/60 rounded-full" />
                <div className="h-1.5 w-10 bg-muted/30 rounded-full" />
              </div>
            </div>
          </div>

          {/* URL + copy */}
          <div className="px-5 mt-3 flex items-center gap-2">
            <code className="flex-1 text-[11px] bg-muted/40 border border-border rounded px-2 py-1.5 truncate text-muted-foreground font-mono">
              {url}
            </code>
            <Button variant="outline" size="sm" className="gap-1.5 px-2.5 h-7 text-xs flex-shrink-0" onClick={copy}>
              {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
            </Button>
          </div>

          <p className="px-5 pb-5 mt-2 text-[11px] text-muted-foreground leading-relaxed">
            This is a simulated hosting platform — deployment URLs are illustrative. In a real deployment, your app would be live and accessible at this address.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
