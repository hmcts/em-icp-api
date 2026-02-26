import Axios, { AxiosError, AxiosInstance } from "axios";
import { S2SClient } from "./s2s-client";

const config = require("config");
const { Logger } = require("@hmcts/nodejs-logging");

/**
 * CCD Case Data Store client for verifying a user's access to a case.
 */
export class CaseDataClient {
  private readonly http: AxiosInstance;
  private readonly s2sClient: S2SClient;
  private readonly logger = Logger.getLogger("case-data-client");

  constructor() {
    this.http = Axios.create({
      baseURL: config.ccd.url,
    });
    this.s2sClient = new S2SClient();
  }

  public async hasCaseAccess(userToken: string, caseId: string): Promise<boolean> {
    const serviceToken = await this.s2sClient.getServiceToken();
    const headers = {
      "Authorization": userToken,
      "ServiceAuthorization": serviceToken,
    };

    try {
      await this.http.get(`/cases/${caseId}`, { headers });
      return true;
    } catch (error) {
      const status = Axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403 || status === 404) {
        return false;
      }
      this.logger.error("Case Data Client: Error encountered when verifying case access");
      this.logger.error(error as AxiosError);
      throw error;
    }
  }
}
