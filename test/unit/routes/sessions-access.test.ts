import sinon from "sinon";
import express from "express";
import request from "supertest";
import { IdamClient } from "../../../api/security/idam-client";
import { CaseDataClient } from "../../../api/security/case-data-client";
import { ClientTokenResponse, WebPubSubServiceClient } from "@azure/web-pubsub";
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
    const clientTokenResponse: ClientTokenResponse = {
      token: "token",
      baseUrl: "https://example.test",
      url: "https://example.test?access_token=token",
    };
    sandbox.stub(WebPubSubServiceClient.prototype, "getClientAccessToken").resolves(clientTokenResponse);
    type RedisHGetAllCallback = (err: Error | null, result: Record<string, string> | null) => void;
    sandbox
      .stub(redis as unknown as { hgetall: (key: string, cb: RedisHGetAllCallback) => unknown }, "hgetall")
      .callsFake((key: string, cb: RedisHGetAllCallback) => {
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
