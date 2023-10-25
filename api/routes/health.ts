import { client as redis } from "../redis";
import * as express from "express";

import * as healthcheck from "@hmcts/nodejs-healthcheck";
export const router = express.Router();

const healthCheckConfig = {
  checks: {
  },
};

healthcheck.addTo(router, healthCheckConfig);

module.exports = router;

//     redis: healthcheck.raw(() => {
//       return redis.status === "ready" ? healthcheck.up() : healthcheck.down();
//     }),
