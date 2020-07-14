import { Server, Socket } from "socket.io";
import { redisClient as redis } from "./api/redis";
import { IdamClient } from "./api/security/idam-client";

const { Logger } = require("@hmcts/nodejs-logging");
const actions = require("./api/model/actions");
const socketio = require("socket.io");

const logger = Logger.getLogger("socket");
const idam = new IdamClient();

const socket = (server: Server) => {
  const io = socketio(server, { "origins": "*:*" , path: "/icp/socket.io" } );

  io.use((client: Socket, next) => {
    idam.verifyToken(client.request.headers["authorization"])
      .then(() => {
        next();
      }).catch((err => {
        logger.error(err);
        client.disconnect();
        next(err);
      }));
  }).on("connection", (client: Socket) => {
    logger.info("SocketIO client connecting...");

    client.on("join", (data) => {
      redis.hgetall(data.caseId, (error: string, session) => {
        if (error || !session) {
          logger.error(error);
          throw error;
        }

        client.join(data.sessionId);
        redis.watch(data.caseId, (watchError) => {
          if (watchError) {
            logger.error("Error watching caseId: ", watchError);
            throw watchError;
          }

          const participants = session.participants ? JSON.parse(session.participants) : {};
          participants[client.id] = data.username;
          redis.multi()
            .hset(data.caseId, "participants", JSON.stringify(participants))
            .exec((execError) => {
              if (execError) {
                logger.error("Error executing changes in Redis: ", execError);
                throw execError;
              }
            });


          if (io.sockets.adapter.rooms[session.sessionId].length === 1) {
            session.presenterName = "";
            session.presenterId = "";
            redis.multi()
              .hset(session.caseId, "presenterId", "")
              .hset(session.caseId, "presenterName", "")
              .exec((execError) => {
                if (execError) {
                  logger.error("Error executing changes in Redis: ", execError);
                  throw execError;
                }
              });
          }

          io.to(client.id).emit(actions.CLIENT_JOINED,
            {
              client: {id: client.id, username: data.username},
              presenter: {id: session.presenterId, username: session.presenterName},
              participants: participants,
            });

          io.to(session.sessionId).emit(actions.NEW_PARTICIPANT_JOINED, {id: client.id, username: data.username});
        });
      });
    });

    client.on(actions.UPDATE_SCREEN, (screen) => {
      io.in(screen.sessionId).emit(actions.SCREEN_UPDATED, screen.body);
    });

    client.on(actions.UPDATE_PRESENTER, (change) => {
      redis.watch(change.caseId, (watchError) => {
        if (watchError) {
          logger.error("Error watching caseId: ", watchError);
          throw watchError;
        }

        redis.multi()
          .hset(change.caseId, "presenterId", change.presenterId)
          .hset(change.caseId, "presenterName", change.presenterName)
          .exec((execError) => {
            if (execError) {
              logger.error("Error executing changes in Redis: ", execError);
              throw execError;
            }
          });
      });

      io.in(change.sessionId).emit(actions.PRESENTER_UPDATED, {id: change.presenterId, username: change.presenterName});
    });

    client.on("leave", () => {
      client.disconnect();
    });

    client.on("disconnecting", () => {
      Object.keys(client.rooms)
        .forEach(room => {
          io.in(room).emit(actions.CLIENT_DISCONNECTED, client.id);
        });
      client.leave(client.id);

      logger.info("SocketIO client disconnecting");
    });
  });
};

module.exports = socket;
