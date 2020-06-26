import * as bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import express from "express";
import * as path from "path";
import { RouterFinder } from "./router/routerFinder";
import { HttpError } from "./httpError";
import csrf from "csurf";
import * as propertiesVolume from "@hmcts/properties-volume";
import { swaggerDocument } from "./swagger";

const appInsights = require("applicationinsights");
const swaggerUi = require("swagger-ui-express");
const config = require("config");
const { Express, Logger } = require("@hmcts/nodejs-logging");
const { setupDev } = require("./development");
const healthcheck = require("./routes/health");
const helmet = require("helmet");
const noCache = require("nocache");
const rateLimit = require("express-rate-limit");

const redisImport = config.redis.import;
const Redis = require(redisImport);

const env = process.env.NODE_ENV || "development";
const developmentMode = env === "development";

propertiesVolume.addTo(config);

const REDIS_PASSWORD = config.secrets ? config.secrets["em-icp"]["redis-password"] : undefined;
const APP_INSIGHTS_KEY = config.secrets ? config.secrets["em-icp"]["AppInsightsInstrumentationKey"] : undefined;

const logger = Logger.getLogger("app");

export const app = express();
app.locals.ENV = env;

const limiter = rateLimit({
  windowMs: config.rateLimit.time,
  max: config.rateLimit.max,
});

app.use(limiter);

const tlsOptions = {
  password: REDIS_PASSWORD,
  tls: true,
};
const redisOptions = config.redis.useTLS === "true" ? tlsOptions : {};
export const redisClient = new Redis(config.redis.port, config.redis.host, redisOptions);

redisClient.on("ready", () => {
  console.log("Redis is ready");
});

redisClient.on("error", (err: { message: string; }) => {
  console.log("Error in Redis: ", err.message);
});

app.use(Express.accessLogger());

if (APP_INSIGHTS_KEY) {
  appInsights.setup(APP_INSIGHTS_KEY)
    .setAutoCollectConsole(true, true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .setSendLiveMetrics(true)
    .start();
  appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = "em-icp";
}

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(noCache());
app.use(helmet());
app.use(helmet.xssFilter({setOnOldIE: true}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-cache, max-age=0, must-revalidate, no-store",
  );
  next();
});

app.use("/", RouterFinder.findAll(path.join(__dirname, "routes")));
setupDev(app, developmentMode);

app.use((req, res) => {
  res.status(404);
  res.send("not-found");
});

app.use((err: HttpError, req: express.Request, res: express.Response) => {
  logger.error(`${err.stack || err}`);

  res.locals.message = err.message;
  res.locals.error = env === "development" ? err : {};
  res.status(err.status || 500);
  res.send("error");
});

if (config.app.useCSRFProtection === "true") {
  app.use(csrf(), (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
}

app.use("/health", healthcheck);
