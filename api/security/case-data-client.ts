import Axios, { AxiosError, AxiosInstance } from "axios";

const config = require("config");
const { Logger } = require("@hmcts/nodejs-logging");

/**
 * CCD Case Data Store client for verifying a user's access to a case.
 */
export class CaseDataClient {
  private static readonly METADATA_FIELD_ACCESS_PROCESS_ID = "[ACCESS_PROCESS]";
  private static readonly METADATA_FIELD_ACCESS_GRANTED_ID = "[ACCESS_GRANTED]";
  private static readonly NON_STANDARD_USER_ACCESS_TYPES = ["CHALLENGED", "SPECIFIC"];
  private static readonly BASIC_USER_ACCESS_TYPES = "BASIC";

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
      const response = await this.http.get(`/data/internal/cases/${caseId}`, { headers });
      return this.hasStandardAccess(response.data);
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

  private hasStandardAccess(caseData: { metadataFields?: Array<{ id?: string; value?: string }> }): boolean {
    const metadataFields = caseData?.metadataFields;
    if (!Array.isArray(metadataFields)) {
      return true;
    }

    const accessProcess = metadataFields.find(
      (metadataField) => metadataField.id === CaseDataClient.METADATA_FIELD_ACCESS_PROCESS_ID
    );
    const accessGranted = metadataFields.find(
      (metadataField) => metadataField.id === CaseDataClient.METADATA_FIELD_ACCESS_GRANTED_ID
    );

    const accessGrantedValue = accessGranted?.value;
    const isAccessGranted = accessGrantedValue
      ? accessGrantedValue !== CaseDataClient.BASIC_USER_ACCESS_TYPES
      : false;
    const userAccessType = accessProcess?.value ?? null;

    if (isAccessGranted) {
      return true;
    }

    if (!userAccessType) {
      return true;
    }

    return CaseDataClient.NON_STANDARD_USER_ACCESS_TYPES.indexOf(userAccessType) === -1;
  }
}
