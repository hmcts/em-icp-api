import * as express from "express";
import { v4 as uuidv4 } from "uuid";
import { UserInfo, Session } from "../model/interfaces";
import { client as redis } from "../redis";
import { IdamClient } from "../security/idam-client";

const { Logger } = require("@hmcts/nodejs-logging");
const router = express.Router();
const idam = new IdamClient();
const logger = Logger.getLogger("sessions");

router.get("/icp/sessions/:caseId", async (req, res) => {
  const token = req.header("Authorization");
  if (!token) {
    logger.error("No Authorization header found");
    return res.status(401).send({error: "Unauthorized user"});
  }

  try {
    await idam.verifyToken(token);
  } catch (e) {
    logger.error("Error when attempting to verify Auth token");
    logger.error(e);
    return res.status(401).send({error: e});
  }

  const userInfo: UserInfo = await idam.getUserInfo(token);
  const username = userInfo.name;
  const caseId: string = req.params.caseId;

  if (!caseId || caseId === "null" || caseId === "undefined") {
    res.statusMessage = "Invalid case id";
    return res.status(400).send();
  }

  const today = new Date().toDateString();

  await redis.hgetall(caseId, (err, session) => {
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
      };
      redis.hmset(caseId, newSession);
      return res.send({ username, session: newSession });
    } else if (session.dateOfHearing === today) {
      return res.send({ username, session });
    }
  });
});

module.exports = router;
