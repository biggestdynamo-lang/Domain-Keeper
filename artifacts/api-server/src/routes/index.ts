import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import deploymentsRouter from "./deployments";
import domainsRouter from "./domains";
import dnsRouter from "./dns";
import envRouter from "./env";
import githubRouter from "./github";
import analyticsRouter from "./analytics";
import webhooksRouter from "./webhooks";
import activityRouter from "./activity";
import ipAddressesRouter from "./ip-addresses";
import configRouter from "./config";
import internalRouter from "./internal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(deploymentsRouter);
router.use(domainsRouter);
router.use(dnsRouter);
router.use(envRouter);
router.use(githubRouter);
router.use(analyticsRouter);
router.use(webhooksRouter);
router.use(activityRouter);
router.use(ipAddressesRouter);
router.use(configRouter);
router.use(internalRouter);

export default router;
