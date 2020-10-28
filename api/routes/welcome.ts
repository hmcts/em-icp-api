import { client as redis } from "../redis";
import * as express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await redis.hgetall("random-case-id");
    return res.status(200).send("Welcome to ICP backend API");
  } catch (err) {
    console.log("it came to the error")
    res.statusMessage = "Error accessing data from Redis";
    return res.status(500).send({ error: err });
  }
});

module.exports = router;
