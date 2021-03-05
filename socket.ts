import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { RedisClient } from "./api/redis-client";
import { IdamClient } from "./api/security/idam-client";
import { Logger } from "@hmcts/nodejs-logging";
import { Actions } from "./api/model/actions";
import { PresenterUpdate } from "./api/model/interfaces";
const socketio = require("socket.io");

let io: Server, ioClient: Socket;
const logger = Logger.getLogger("socket");
const redisClient = new RedisClient();

export class SocketIO {

  static start(server: HttpServer): void {
    io = socketio(server, { "origins": "*:*" , path: "/icp/socket.io" } );
    io.use(SocketIO.verifyIdamToken)
      .on("connection", SocketIO.addEventListeners);
  }

  static async verifyIdamToken(client: Socket, next: (err?: unknown) => void): Promise<void> {
    try {
      await new IdamClient().verifyToken(client.request.headers["authorization"]);
      next();
    } catch (err) {
      client.disconnect();
      next(err);
    }
  }

  static addEventListeners(client: Socket): void {
    ioClient = client;
    logger.info("SocketIO client connecting...");
    client.on("join", SocketIO.onJoin);
    client.on(Actions.UPDATE_SCREEN, SocketIO.onUpdateScreen);
    client.on(Actions.UPDATE_PRESENTER, SocketIO.onUpdatePresenter);
    client.on("leave", SocketIO.onLeave);
    client.on(Actions.REMOVE_PARTICIPANT, SocketIO.onRemoveParticipant);
    client.on("disconnecting", SocketIO.onDisconnection);
  }

  static async onJoin(data: { caseId: string, sessionId: string, username: string }): Promise<void> {
    const session = await redisClient.getSession(data.caseId);
    ioClient.join(data.sessionId);
    await redisClient.getLock(data.caseId);

    if (io.sockets.adapter.rooms[session.sessionId].length === 1) {
      session.presenterName = "";
      session.presenterId = "";
      session.participants = "";
    }

    const participants = session.participants ? JSON.parse(session.participants) : {};
    participants[ioClient.id] = data.username;
    await redisClient.onJoin(session, participants);

    io.to(ioClient.id).emit(Actions.CLIENT_JOINED, {
      client: { id: ioClient.id, username: data.username },
      presenter: { id: session.presenterId, username: session.presenterName },
    });

    io.to(session.sessionId).emit(Actions.PARTICIPANTS_UPDATED, participants);
    io.to(session.sessionId).emit(Actions.NEW_PARTICIPANT_JOINED);
  }

  static onUpdateScreen(screen: { sessionId: string, body: unknown }): void {
    io.in(screen.sessionId).emit(Actions.SCREEN_UPDATED, screen.body);
  }

  static async onUpdatePresenter(change: PresenterUpdate): Promise<void> {
    await redisClient.getLock(change.caseId);
    await redisClient.updatePresenter(change);
    io.in(change.sessionId)
      .emit(Actions.PRESENTER_UPDATED, { id: change.presenterId, username: change.presenterName });
  }

  static onLeave(): void {
    ioClient.disconnect();
    logger.info("SocketIO client disconnecting");
  }

  static async onRemoveParticipant(data: { caseId: string, participantId: string }): Promise<void> {
    const session = await redisClient.getSession(data.caseId);
    const participants = JSON.parse(session.participants);
    delete participants[data.participantId];

    await redisClient.updateParticipants(data.caseId, participants);
    io.to(session.sessionId)
      .emit(Actions.PARTICIPANTS_UPDATED, participants);
  }

  static onDisconnection(): void {
    Object.keys(ioClient.rooms)
      .forEach(room => io.in(room)
        .emit(Actions.CLIENT_DISCONNECTED, ioClient.id));
    ioClient.leave(ioClient.id);
    logger.info("SocketIO client disconnecting");
  }
}
