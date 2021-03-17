import pact from "@pact-foundation/pact-node";
import * as git from "git-rev-sync";
import * as path from "path";

const config = require("config");
const publish = async (): Promise<void> => {
  try {

    const pactBroker = config.get("pact.brokerUrl") ?
      process.env.PACT_BROKER_FULL_URL : "http://localhost:80";

    const pactTag = git.branch() ?
      git.branch() : config.get("pact.branchName");

    const consumerVersion = git.short() ?
      git.short() : config.get("pact.consumerVersion");

    const certPath = path.resolve(__dirname, "../cer/ca-bundle.crt");
    process.env.SSL_CERT_FILE = certPath;

    const opts = {
      consumerVersion,
      pactBroker,
      pactBrokerPassword: "",
      pactBrokerUsername: "",
      pactFilesOrDirs: [
        path.resolve(__dirname, "../pacts/"),
      ],
      publishVerificationResult: true,
      tags: [pactTag],
    };

    await pact.publishPacts(opts);

    console.log("Pact contract publishing complete!");
    console.log("");
    console.log(`Head over to ${pactBroker}`);
    console.log("to see your published contracts.");

  } catch (e) {
    console.log("Pact contract publishing failed: ", e);
  }
};

(async () => {
  await publish();
})();
