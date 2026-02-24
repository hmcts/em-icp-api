import Axios, { AxiosInstance } from "axios";
import { totp } from "otplib";

const config = require("config");
const { Logger } = require("@hmcts/nodejs-logging");

/**
 * Service-to-service client for obtaining a service auth token.
 */
export class S2SClient {
  private readonly http: AxiosInstance;
  private readonly logger = Logger.getLogger("s2s-client");

  constructor() {
    this.http = Axios.create({
      baseURL: config.s2s.url,
    });
  }

  public async getServiceToken(): Promise<string> {
    try {
      const oneTimePassword = totp.generate(config.s2s.secret);
      const response = await this.http.post("/lease", {
        microservice: config.s2s.microservice,
        oneTimePassword,
      });
      return response.data;
    } catch (e) {
      this.logger.error("S2S Client: Error encountered when requesting service token");
      this.logger.error(e);
      throw e;
    }
  }
}
