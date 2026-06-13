import { db, activityEventsTable } from "@workspace/db";

type ActivityType =
  | "deployment_triggered"
  | "deployment_ready"
  | "deployment_failed"
  | "webhook_received"
  | "domain_attached"
  | "domain_detached"
  | "env_var_added"
  | "env_var_deleted";

export async function logActivity(opts: {
  projectId: number;
  type: ActivityType;
  title: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(activityEventsTable).values({
      projectId: opts.projectId,
      type: opts.type,
      title: opts.title,
      detail: opts.detail ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    // Non-fatal: activity logging should never break the main request
  }
}
