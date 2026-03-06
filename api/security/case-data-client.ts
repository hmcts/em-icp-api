import Axios, { AxiosError, AxiosInstance } from "axios";

const config = require("config");
const { Logger } = require("@hmcts/nodejs-logging");

/**
 * CCD Case Data Store client for verifying a user's access to a case.
 */
export class CaseDataClient {
  private readonly http: AxiosInstance;
  private readonly logger = Logger.getLogger("case-data-client");

  constructor() {
    this.http = Axios.create({
      baseURL: config.ccd.url,
    });
  }

  public async hasCaseAccess(userToken: string, caseId: string): Promise<boolean> {
    const headers = {
      "Authorization": userToken,
      "Content-Type": "application/json",
      "experimental": "true",
    };

    try {
      await this.http.get(`/data/internal/cases/${caseId}`, { headers });
      return true;
    } catch (error) {
      const status = Axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401) {
        this.logger.error({
          message: "Case Data Client: Unauthorized when verifying case access",
          url: Axios.isAxiosError(error) ? error.config?.url : undefined,
          status,
        });
      }
      if (status === 403 || status === 404) {
        return false;
      }
      this.logger.error("Case Data Client: Error encountered when verifying case access");
      this.logger.error(error as AxiosError);
      throw error;
    }
  }
}
