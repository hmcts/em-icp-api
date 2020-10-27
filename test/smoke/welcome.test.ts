import * as chai from "chai";
import axios from "axios";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const httpTimeout = 60000;
const frontendURL = process.env.TEST_URL || "http://localhost:8080";

describe("GET /", () => {

  it("should return 200 @smoke", async () => {
    const response = await axios.get(frontendURL);

    chai.expect(response.status).equals(200);
  }).timeout(httpTimeout);

  it("should return welcome message @smoke", async () => {
    const response = await axios.get(frontendURL);

    chai.expect(response.data).equals("Welcome to ICP backend API");
  }).timeout(httpTimeout);

});

