import { logger } from "./logger";

export const cloudflareEnabled =
  !!process.env.CLOUDFLARE_API_TOKEN && !!process.env.CLOUDFLARE_ZONE_ID;

const CF_BASE = "https://api.cloudflare.com/client/v4";

type CFDnsType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "SRV" | "CAA" | "PTR";

interface CFRecord {
  type: CFDnsType;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied: false;
}

interface CFResponse<T> {
  success: boolean;
  result: T;
  errors: Array<{ message: string }>;
}

interface CFDnsRecord {
  id: string;
}

function headers(): Record<string, string> {
  return {
    "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function zoneUrl(path: string) {
  return `${CF_BASE}/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records${path}`;
}

export async function cfCreateRecord(opts: {
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number | null;
}): Promise<string | null> {
  if (!cloudflareEnabled) return null;
  try {
    const body: CFRecord = {
      type: opts.type as CFDnsType,
      name: opts.name,
      content: opts.value,
      ttl: opts.ttl,
      proxied: false,
    };
    if (opts.priority != null) body.priority = opts.priority;

    const res = await fetch(zoneUrl(""), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as CFResponse<CFDnsRecord>;
    if (!json.success) {
      logger.warn({ errors: json.errors }, "Cloudflare create failed");
      return null;
    }
    return json.result.id;
  } catch (err) {
    logger.warn({ err }, "Cloudflare create error");
    return null;
  }
}

export async function cfUpdateRecord(
  cloudflareRecordId: string,
  opts: { type?: string; name?: string; value?: string; ttl?: number; priority?: number | null }
): Promise<void> {
  if (!cloudflareEnabled) return;
  try {
    const body: Partial<CFRecord> = { proxied: false };
    if (opts.type) body.type = opts.type as CFDnsType;
    if (opts.name) body.name = opts.name;
    if (opts.value) body.content = opts.value;
    if (opts.ttl != null) body.ttl = opts.ttl;
    if (opts.priority != null) body.priority = opts.priority;

    const res = await fetch(zoneUrl(`/${cloudflareRecordId}`), {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as CFResponse<CFDnsRecord>;
    if (!json.success) {
      logger.warn({ errors: json.errors, cloudflareRecordId }, "Cloudflare update failed");
    }
  } catch (err) {
    logger.warn({ err, cloudflareRecordId }, "Cloudflare update error");
  }
}

export async function cfDeleteRecord(cloudflareRecordId: string): Promise<void> {
  if (!cloudflareEnabled) return;
  try {
    const res = await fetch(zoneUrl(`/${cloudflareRecordId}`), {
      method: "DELETE",
      headers: headers(),
    });
    const json = (await res.json()) as CFResponse<{ id: string }>;
    if (!json.success) {
      logger.warn({ errors: json.errors, cloudflareRecordId }, "Cloudflare delete failed");
    }
  } catch (err) {
    logger.warn({ err, cloudflareRecordId }, "Cloudflare delete error");
  }
}
