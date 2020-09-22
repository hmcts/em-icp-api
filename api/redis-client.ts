import { Logger } from "@hmcts/nodejs-logging";
import { PresenterUpdate, Session } from "./model/interfaces";
import { client } from "./redis";

export class RedisClient {

  logger = Logger.getLogger("redis-client");

  async getSession(caseId: string): Promise<Session> {
    try {
      const session = await client.hgetall(caseId);
      if (!session) {
        throw Error("session not found");
      }
      return session;
    } catch (err) {
      this.logger.error(err);
    }
  }

  async getLock(caseId: string): Promise<void> {
    try {
      await client.watch(caseId);
    } catch (watchError) {
      this.logger.error("Error watching caseId: ", watchError);
      throw watchError;
    }
  }

  async onJoin(session: Session, participants: unknown): Promise<void> {
    try {
      await client.multi()
        .hset(session.caseId, "participants", JSON.stringify(participants))
        .hset(session.caseId, "presenterId", session.presenterId)
        .hset(session.caseId, "presenterName", session.presenterName)
        .exec();
    } catch (err) {
      this.logger.error("Error executing changes in Redis: ", err);
    }
  }

  async updatePresenter(change: PresenterUpdate):Promise<void> {
    try {
      await client.multi()
        .hset(change.caseId, "presenterId", change.presenterId)
        .hset(change.caseId, "presenterName", change.presenterName)
        .exec();
    } catch(err) {
      this.logger.error("Error executing changes in Redis: ", err);
    }
  }

  async updateParticipants(caseId: string, participants: unknown):Promise<void> {
    try {
      await client.multi()
        .hset(caseId, "participants", JSON.stringify(participants))
        .exec();
    } catch (err) {
      this.logger.error("Error executing changes in Redis: ", err);
    }
  }
}
