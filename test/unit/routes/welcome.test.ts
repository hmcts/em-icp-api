import chai from "chai";
import chaiHttp from "chai-http";
import { IdamClient } from "../../../api/security/idam-client";
import { app } from "../../../app";
import { client } from "../../../api/redis";

const sinon = require("sinon");

chai.use(chaiHttp);

describe("/GET welcome message", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    const today = new Date().toDateString();
    client.hmset("1234", { caseId: "1234", dateOfHearing: today, sessionId: "sessionId" });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("it should return (200) OK for the same session", (done) => {
    sandbox.stub(IdamClient.prototype, "verifyToken").returns(Promise.resolve());
    sandbox.stub(IdamClient.prototype, "getUserInfo")
      .returns(Promise.resolve({ name: "Test User" }));

    setTimeout(() => {
      chai.request(app)
        .get("/")
        .set("Authorization", "Token")
        .end((err, res) => {
          chai.expect(res.text).to.equal("Welcome to ICP backend API");
          chai.expect(res.status).to.equal(200);
          done();
        });
    });
  });
});
