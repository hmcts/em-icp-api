import sinon from "sinon";
import express from "express";
import request from "supertest";
import { IdamClient } from "../../../api/security/idam-client";
import { CaseDataClient } from "../../../api/security/case-data-client";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { client as redis } from "../../../api/redis";

describe("GET /icp/sessions/:caseId/:documentId access control", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("returns 403 when the user lacks case access", async () => {
    sandbox.stub(IdamClient.prototype, "verifyToken").resolves();
    sandbox.stub(IdamClient.prototype, "getUserInfo").resolves({
      sub: "sub",
      uid: "uid",
      roles: [],
      name: "Test User",
      given_name: "Test",
      family_name: "User",
    });
    sandbox.stub(CaseDataClient.prototype, "hasCaseAccess").resolves(false);
    sandbox.stub(WebPubSubServiceClient.prototype, "getClientAccessToken").resolves({ token: "token" } as any);
    sandbox.stub(redis as any, "hgetall").callsFake((key: string, cb: any) => {
      cb(null, null);
      return null;
    });

    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sessionsRouter = require("../../../api/routes/sessions");
    app.use("/", sessionsRouter);

    await request(app)
      .get("/icp/sessions/1234/5678")
      .set("Authorization", "Bearer token")
      .expect(403);
  });
});
