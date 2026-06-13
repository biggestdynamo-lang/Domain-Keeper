import { logger } from "./logger";

export interface BuildJobPayload {
  deploymentId: number;
  projectId: number;
  repoUrl?: string | null;
  branch?: string | null;
  buildCommand?: string | null;
  framework?: string | null;
  packageManager?: string | null;
}

/**
 * Dispatch a build job.
 *
 * - If `WORKER_URL` is set: POST the job to the real worker (fire-and-forget).
 *   The worker handles all stages and calls back via /api/internal/deployments.
 * - Otherwise: fall back to the simulation. Awaits the simulation when running
 *   inside a serverless function (process is frozen after response), and runs
 *   it fire-and-forget in long-lived server mode.
 */
export async function dispatchBuild(
  job: BuildJobPayload,
  simulateFn: () => Promise<void>,
  isServerless: boolean
): Promise<void> {
  const workerUrl = process.env.WORKER_URL?.replace(/\/$/, "");

  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/build`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": process.env.WORKER_SECRET ?? "",
        },
        body: JSON.stringify({
          deploymentId: job.deploymentId,
          projectId: job.projectId,
          repoUrl: job.repoUrl ?? "",
          branch: job.branch ?? "main",
          buildCommand: job.buildCommand ?? "npm run build",
          framework: job.framework ?? "Unknown",
          packageManager: job.packageManager ?? "npm",
        }),
      });

      if (res.ok) return; // Worker accepted (202) — build proceeds asynchronously

      logger.warn({ status: res.status, deploymentId: job.deploymentId }, "Worker rejected build job; falling back to simulation");
    } catch (err) {
      logger.warn({ err, deploymentId: job.deploymentId }, "Worker dispatch error; falling back to simulation");
    }
  }

  // Fall back to simulation
  if (isServerless) {
    await simulateFn();
  } else {
    void simulateFn();
  }
}
