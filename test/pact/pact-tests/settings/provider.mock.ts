"use strict";

const path = require("path");
const { Pact } = require("@pact-foundation/pact");

export interface PactTestSetupConfig {
  provider: string;
  port: number;
}

export class PactTestSetup {

  provider: typeof Pact;
  port: number;

  constructor(config: PactTestSetupConfig) {
    this.provider = new Pact({
      consumer: "em_icpApi",
      dir: path.resolve(process.cwd(), "test/pact/pacts"),
      log: path.resolve(process.cwd(), "test/pact/logs", "mockserver-integration.log"),
      logLevel: "info",
      pactfileWriteMode: "merge",
      port: this.port,
      provider: config.provider,
      spec: 2,
    });
  }
}