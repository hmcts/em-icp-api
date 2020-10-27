import { client as redis } from "../redis";
import * as express from "express";

const router = express.Router();

router.get("/", async (req, res) => {

  await redis.hgetall("random-case-id", (err, session) => {
    if (err) {
      res.statusMessage = "Error accessing data from Redis";
      return res.status(500).send({ error: err });
    }
    return res.status(200).send("Welcome to ICP backend API");
  });
});

module.exports = router;
