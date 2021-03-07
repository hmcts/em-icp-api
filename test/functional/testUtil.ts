import axios from "axios";
import * as propertiesVolume from "@hmcts/properties-volume";
import {Session} from "../../api/model/interfaces";

const config = require("config");
const url = require("url");
const frontendURL = process.env.TEST_URL || "http://localhost:8080";
const idamUrl = process.env.IDAM_API_BASE_URL || "http://localhost:5000";
// const username = "icpFTestUser@em.com";
// const password = "4590fgvhbfgbDdffm3lk4j";

propertiesVolume.addTo(config);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export class TestUtil {

  async createIcpSession(token: string, caseId: string): Promise<{ username: string, session: Session }> {
    const headers = {"Authorization": `Bearer ${token}`};
    try {
      const response = await axios.get(`${frontendURL}/icp/sessions/${caseId}`, {headers: headers});
      return response.data;
    } catch (err) {
      console.log("error creating new icp session", err.message);
      throw err;
    }
  }

  async createNewUser(): Promise<void> {
    console.log(`idamUrl==> ${idamUrl}`);
    console.log(`frontendURL==> ${frontendURL}`);

    await axios.delete(`${idamUrl}/testing-support/accounts/icpFTestUser@em.com`)
      .catch(() => console.log("User could not be found"));
    const userInfo = {
      "email": "icpFTestUser@em.com",
      "password": "4590fgvhbfgbDdffm3lk4j",
      "forename": "John",
      "surname": "Smith",
      "roles": [
        {
          "code": "caseworker",
        },
      ],
      "userGroup": {
        "code": "caseworker",
      },
    };

    try {
      await axios.post(`${idamUrl}/testing-support/accounts`, userInfo).catch(err => console.log(err));

      const userDetails = await axios.get(`${idamUrl}/testing-support/accounts/icpFTestUser@em.com`).catch(err => console.log(err));
      console.log("username==>icpFTestUser@em.com");
      console.log(`userDetails from Idam==>${userDetails}`);

    } catch (err) {
      console.log("error creating new user", err);
      throw err;
    }
  }

  async requestUserToken(): Promise<string> {
    await this.createNewUser();
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const params = new url.URLSearchParams();
    params.append("scope", "openid roles profile");
    params.append("grant_type", "password");
    params.append("redirect_uri", process.env.IDAM_WEBSHOW_WHITELIST || "http://localhost:8080/oauth2redirect");
    params.append("client_id", "webshow");
    params.append("client_secret", process.env.FUNCTIONAL_TEST_CLIENT_OAUTH_SECRET || "AAAAAAAAAAAAAAAA");
    params.append("username", "icpFTestUser@em.com");
    params.append("password", "4590fgvhbfgbDdffm3lk4j");
    try {
      const response = await axios.post(`${idamUrl}/o/token`, params, {headers});
      return response.data["access_token"];
    } catch (err) {
      console.log("error fetching token");
      throw err;
    }
  }

  async waitFor(time: number): Promise<void> {
    return new Promise(res => setTimeout(res, time));
  }
}
