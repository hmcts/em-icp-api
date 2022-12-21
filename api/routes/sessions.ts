import * as express from "express";
import { v4 as uuidv4 } from "uuid";
import { UserInfo, Session } from "../model/interfaces";
import { client as redis } from "../redis";
import { IdamClient } from "../security/idam-client";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { Logger } from "@hmcts/nodejs-logging";


const config = require("config");
const router = express.Router();
const idam = new IdamClient();
const logger = Logger.getLogger("sessions");
const primaryConnectionstring = config.secrets ? config.secrets["em-icp"]["em-icp-web-pubsub-primary-connection-string"] : undefined;

router.get("/icp/sessions/:caseId", async (req, res) => {
  const token = req.header("Authorization");
  // if (!token) {
  //   logger.error("No Authorization header found");
  //   return res.status(401).send({ error: "Unauthorized user" });
  // }

  // try {
  //   await idam.verifyToken(token);
  // } catch (e) {
  //   logger.error("Error when attempting to verify Auth token");
  //   logger.error(e);
  //   return res.status(401).send({ error: e });
  // }

  // const userInfo: UserInfo = await idam.getUserInfo(token);
  const username = "Munish";//userInfo.name;
  const caseId: string = req.params.caseId;

  if (!caseId || caseId === "null" || caseId === "undefined") {
    res.statusMessage = "Invalid case id";
    return res.status(400).send();
  }

  logger.info({
    message: `primary connectionstring: ${primaryConnectionstring}`,
  });
  const service = new WebPubSubServiceClient(primaryConnectionstring, "Hub");
  const accessToken = await service.getClientAccessToken({ userId: username, roles: [`webpubsub.joinLeaveGroup.${caseId}`, `webpubsub.sendToGroup.${caseId}`] });
  const today = new Date().toDateString();

  await redis.hgetall(caseId, (err, session: Session) => {
    if (err) {
      res.statusMessage = "Error accessing data from Redis";
      return res.status(500).send({ error: err });
    }

    if (!session || session.dateOfHearing !== today) {
      const newSession: Session = {
        sessionId: uuidv4(),
        caseId: caseId,
        dateOfHearing: today,
        presenterId: "",
        presenterName: "",
        participants: "",
        connectionUrl: accessToken.url,
      };
      redis.hmset(caseId, newSession);
      return res.send({ username, session: newSession });
    } else if (session.dateOfHearing === today) {
      session.connectionUrl = accessToken.url;
      return res.send({ username, session });
    }
  });
});

module.exports = router;
