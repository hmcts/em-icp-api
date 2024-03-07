import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { ConnectedRequest, ConnectRequest, ConnectResponseHandler, DisconnectedRequest, UserEventRequest, UserEventResponseHandler, WebPubSubEventHandlerOptions } from "@azure/web-pubsub-express";
import { Actions } from "./model/actions";
import { PresenterUpdate } from "model/interfaces";
import { RedisClient } from "./redis-client";

const redisClient = new RedisClient();

export class EmWebPubEventHandlerOptions implements WebPubSubEventHandlerOptions {

  private client: WebPubSubServiceClient;

  constructor(connectionString: string) {
    this.client = new WebPubSubServiceClient(connectionString, "Hub");
  }

  handleConnect = async (connectRequest: ConnectRequest, connectResponse: ConnectResponseHandler) => {
    console.log("handleConnect");
    connectResponse.success();
  };

  handleUserEvent = async (userEventRequest: UserEventRequest, userEventResponse: UserEventResponseHandler) => {
    console.log("handleUserEvent");
    if (userEventRequest.context.eventName === Actions.SESSION_JOIN) {
      const data = userEventRequest.data as { caseId: string, sessionsId: string, username: string };
      await this.onJoin(data, userEventRequest.context.connectionId);
    }
    else if (userEventRequest.context.eventName === Actions.UPDATE_PRESENTER) {
      const change = userEventRequest.data as PresenterUpdate;
      await this.onUpdatePresenter(change);
    }
    else if (userEventRequest.context.eventName === Actions.UPDATE_SCREEN) {
      const screen = userEventRequest.data as { caseId: string, body: unknown };
      await this.onUpdateScreen(screen);
    }

    userEventResponse.success();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onConnected = async (connectedRequest: ConnectedRequest) => {
    console.log("onConnected");
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDisconnected = (disconnectedRequest: DisconnectedRequest) => {
    console.log("onDisconnected");
  };

  async onJoin(data: { caseId: string, sessionsId: string, username: string }, connectionId: string): Promise<void> {
    const session = await redisClient.getSession(data.caseId);

    const groupClient = this.client.group(data.caseId);
    await groupClient.addConnection(connectionId);

    await redisClient.getLock(data.caseId);

    if (this.client.groupExists(data.caseId)) {
      session.presenterName = "";
      session.presenterId = "";
      session.participants = "";
    }

    const participants = session.participants ? JSON.parse(session.participants) : {};
    participants[connectionId] = data.username;
    await redisClient.onJoin(session, participants);

    await this.client.sendToConnection(connectionId, {
      eventName: Actions.CLIENT_JOINED, data: {
        client: { id: connectionId, username: data.username },
        presenter: { id: session.presenterId, username: session.presenterName },
      },
    });


    groupClient.sendToAll({ eventName: Actions.PARTICIPANTS_UPDATED, data: participants });
    groupClient.sendToAll({ eventName: Actions.NEW_PARTICIPANT_JOINED, data: null });
  }

  async onUpdatePresenter(change: PresenterUpdate): Promise<void> {
    await redisClient.getLock(change.caseId);
    await redisClient.updatePresenter(change);
    const groupClient = this.client.group(change.caseId);

    await groupClient.sendToAll({
      eventName: Actions.PRESENTER_UPDATED, data: { id: change.presenterId, username: change.presenterName },
    });
  }

  async onUpdateScreen(screen: { caseId: string, body: unknown }): Promise<void> {
    const groupClient = this.client.group(screen.caseId);
    groupClient.sendToAll({ eventName: Actions.SCREEN_UPDATED, data: screen.body });
  }
}
