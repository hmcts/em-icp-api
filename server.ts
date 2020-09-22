#!/usr/bin/env node
import { Server } from "http";
import { Logger } from "@hmcts/nodejs-logging";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import { app } from "./app";
import { SocketIO } from "./socket";


const logger = Logger.getLogger("server");
const port: number = parseInt(process.env.PORT, 10) || 8080;
let server: Server;

if (app.locals.ENV === "development") {
  const sslDirectory = path.join(__dirname, "resources", "localhost-ssl");

  const sslOptions = {
    cert: fs.readFileSync(path.join(sslDirectory, "localhost.crt")),
    key: fs.readFileSync(path.join(sslDirectory, "localhost.key")),
  };

  server = https.createServer(sslOptions, app);
  server.listen(port, () => {
    logger.info(`Application started: https://localhost:${port}`);
  });
} else {
  server = app.listen(port, () => {
    logger.info(`Application started: http://localhost:${port}`);
  });
}

SocketIO.start(server);
