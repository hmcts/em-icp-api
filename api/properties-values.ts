import * as propertiesVolume from "@hmcts/properties-volume";
import config from "config";
import { get, set } from "lodash";

export class PropertiesVolume {

  enableFor(): void {
    propertiesVolume.addTo(config);
    console.log(`config before:${JSON.stringify(config)}`);
    this.setSecret("secrets.em-icp.em-icp-web-pubsub-primary-connection-string", "webpubsub.connectionstring");
    console.log(`config after:${JSON.stringify(config)}`);
  }

  private setSecret(fromPath: string, toPath: string): void {
    if (config.has(fromPath)) {
      set(config, toPath, get(config, fromPath));
    }
  }
}
