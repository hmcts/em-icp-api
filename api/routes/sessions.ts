import * as express from "express";
import { v4 as uuidv4 } from "uuid";
import { UserInfo, Session } from "../model/interfaces";
import { client as redis } from "../redis";
import { IdamClient } from "../security/idam-client";
import { WebPubSubServiceClient } from "@azure/web-pubsub";

const { Logger } = require("@hmcts/nodejs-logging");
const router = express.Router();
const idam = new IdamClient();
// const logger = Logger.getLogger("sessions");

router.get("/icp/sessions/:caseId", async (req, res) => {
  const token = req.header("Authorization");
  // if (!token) {
  //   logger.error("No Authorization header found");
  //   return res.status(401).send({error: "Unauthorized user"});
  // }

  // try {
  //   await idam.verifyToken(token);
  // } catch (e) {
  //   logger.error("Error when attempting to verify Auth token");
  //   logger.error(e);
  //   return res.status(401).send({ error: e });
  // }

  //const userInfo: UserInfo = await idam.getUserInfo(token);
  const username = "Munish";//userInfo.name;
  const caseId: string = req.params.caseId;

  if (!caseId || caseId === "null" || caseId === "undefined") {
    res.statusMessage = "Invalid case id";
    return res.status(400).send();
  }
  const service = new WebPubSubServiceClient("Endpoint=https://em-ped-api-webpubsub-aat.webpubsub.azure.com;AccessKey=IGqOSD5XcEKV6dMnt1Ib5FvFMW8UhNcXyp6LMLUoJSU=;Version=1.0;", "Hub");
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
