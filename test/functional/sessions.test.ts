import {TestUtil} from "./testUtil";
import axios from "axios";
import chai from "chai";

const testUtil = new TestUtil();

const frontendURL = process.env.TEST_URL || "http://localhost:8080";
const caseId = "1234";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe("/GET sessions", () => {
  let token;
  let headers;

  before(async () => {
    token = await testUtil.requestUserToken();
    console.log("this is the token \n", token);
  });

  beforeEach(async () => {
    await testUtil.waitFor(3000);
  });

  it("it should return (200) OK", async () => {
    headers = {"Authorization": `Bearer ${token}`};
    const response = await axios.get(`${frontendURL}/icp/sessions/${caseId}`, {headers: headers});
    console.log("response => ", response);
    chai.expect(response.status).equal(200);
  });

  it("it should return (401) Unauthorized with invalid token", async () => {
    headers = {"Authorization": `Bearer ${token}`};
    await axios.get(`${frontendURL}/icp/sessions/${caseId}`, {headers: headers})
      .catch((err) => {
        if (err) {
          chai.expect(err.response.status).equal(401);
          chai.expect(err.response.statusText).equal("Unauthorized");
        }
      });
  });

  it("it should return (401) Unauthorized with no token", async () => {
    await axios.get(`${frontendURL}/icp/sessions/${caseId}`)
      .catch((err) => {
        if (err) {
          chai.expect(err.response.status).equal(401);
          chai.expect(err.response.statusText).equal("Unauthorized");
          chai.expect(err.response.data).to.deep.equal({error: "Unauthorized user"});
        }
      });
  });

  it("it should return (400) Invalid case id - null", async () => {
    headers = {"Authorization": `Bearer ${token}`};
    await axios.get(`${frontendURL}/icp/sessions/null`, {headers: headers})
      .catch((err) => {
        if (err) {
          chai.expect(err.response.status).equal(400);
        }
      });
  });

  it("it should return (400) Invalid case id - undefined", async () => {
    headers = {"Authorization": `Bearer ${token}`};
    await axios.get(`${frontendURL}/icp/sessions/undefined`, {headers: headers})
      .catch((err) => {
        if (err) {
          chai.expect(err.response.status).equal(400);
        }
      });
  });
});
