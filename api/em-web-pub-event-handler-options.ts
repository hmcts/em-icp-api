import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { ConnectedRequest, ConnectRequest, ConnectResponseHandler, DisconnectedRequest, UserEventRequest, UserEventResponseHandler, WebPubSubEventHandlerOptions } from "@azure/web-pubsub-express";
import { Actions } from "./model/actions";
import { PresenterUpdate } from "model/interfaces";
import { RedisClient } from "./redis-client";
import { TelemetryClient } from "applicationinsights";

const redisClient = new RedisClient();

export class EmWebPubEventHandlerOptions implements WebPubSubEventHandlerOptions {

  private client: WebPubSubServiceClient;
  private appInsightClient: TelemetryClient;

  constructor(connectionString: string, appInsightClient: TelemetryClient) {
    this.client = new WebPubSubServiceClient(connectionString, "Hub");
    this.appInsightClient = appInsightClient;
  }

  handleConnect = async (connectRequest: ConnectRequest, connectResponse: ConnectResponseHandler) => {
    this.appInsightClient.trackTrace({ message: "handleConnect" });
    connectResponse.success();
  };

  handleUserEvent = async (userEventRequest: UserEventRequest, userEventResponse: UserEventResponseHandler) => {
    if (userEventRequest.context.eventName === Actions.SESSION_JOIN) {
      const data = userEventRequest.data as { caseId: string, sessionsId: string, username: string, documentId: string };
      this.appInsightClient.trackEvent({ name: Actions.SESSION_JOIN, properties: { customProperty: data } });
      await this.onJoin(data, userEventRequest.context.connectionId);
    }
    else if (userEventRequest.context.eventName === Actions.UPDATE_PRESENTER) {
      const change = userEventRequest.data as PresenterUpdate;
      this.appInsightClient.trackEvent({ name: Actions.UPDATE_PRESENTER, properties: { customProperty: change } });
      await this.onUpdatePresenter(change);
    }
    else if (userEventRequest.context.eventName === Actions.UPDATE_SCREEN) {
      const screen = userEventRequest.data as { caseId: string, body: unknown, documentId: string };
      this.appInsightClient.trackEvent({ name: Actions.UPDATE_SCREEN, properties: { customProperty: screen } });
      await this.onUpdateScreen(screen);
    }
    else if (userEventRequest.context.eventName === Actions.REMOVE_PARTICIPANT) {
      const data = userEventRequest.data as { connectionId: string, caseId: string, documentId: string };
      this.appInsightClient.trackEvent({ name: Actions.REMOVE_PARTICIPANT, properties: { customProperty: data } });
      await this.onRemoveParticant(userEventRequest.context.connectionId, data.caseId, data.documentId);
    }
    else if (userEventRequest.context.eventName === Actions.SESSION_LEAVE) {
      const data = userEventRequest.data as { connectionId: string, caseId: string, documentId: string };
      this.appInsightClient.trackEvent({ name: Actions.SESSION_LEAVE, properties: { customProperty: data } });
      await this.onRemoveParticant(userEventRequest.context.connectionId, data.caseId, data.documentId);
    }

    userEventResponse.success();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onConnected = async (connectedRequest: ConnectedRequest) => {
    this.appInsightClient.trackTrace({ message: "onConnected" });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDisconnected = (disconnectedRequest: DisconnectedRequest) => {
    this.appInsightClient.trackTrace({ message: "onDisconnected" });
  };

  async onJoin(data: { caseId: string, sessionsId: string, username: string, documentId: string }, connectionId: string): Promise<void> {
    const sessionId = redisClient.getSessionId(data.caseId, data.documentId);
    const session = await redisClient.getSession(sessionId);


    const groupClient = this.client.group(sessionId);

    await groupClient.addConnection(connectionId);

    await redisClient.getLock(sessionId);

    const participants = session.participants ? JSON.parse(session.participants) : {};
    participants[connectionId] = data.username;

    await this.checkIfConnectionExistAndRemove(participants);

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

  private async checkIfConnectionExistAndRemove(participants: unknown) {
    const participantsConnectionIds = Object.keys(participants);

    for (const connectionId of participantsConnectionIds) {
      const exists = await this.client.connectionExists(connectionId);
      if (!exists) {
        delete participants[connectionId];
      }
    }

    return participants;
  }

  async onUpdatePresenter(change: PresenterUpdate): Promise<void> {
    const sessionId = redisClient.getSessionId(change.caseId, change.documentId);
    await redisClient.getLock(sessionId);
    await redisClient.updatePresenter(change);
    const groupClient = this.client.group(sessionId);

    await groupClient.sendToAll({
      eventName: Actions.PRESENTER_UPDATED, data: { id: change.presenterId, username: change.presenterName },
    });
  }

  async onUpdateScreen(screen: { caseId: string, documentId: string, body: unknown }): Promise<void> {
    const sessionId = redisClient.getSessionId(screen.caseId, screen.documentId);
    const groupClient = this.client.group(sessionId);
    groupClient.sendToAll({ eventName: Actions.SCREEN_UPDATED, data: screen.body });
  }

  async onRemoveParticant(connectionId: string, caseId: string, documentId: string): Promise<void> {
    const sessionId = redisClient.getSessionId(caseId, documentId);
    const groupClient = this.client.group(sessionId);

    const session = await redisClient.getSession(sessionId);

    await redisClient.getLock(sessionId);

    const participants = session.participants ? JSON.parse(session.participants) : {};

    this.checkIfConnectionExistAndRemove(participants);

    if (Object.prototype.hasOwnProperty.call(participants, connectionId)) {
      delete participants[connectionId];
    }

    await groupClient.removeConnection(connectionId);
    this.client.removeConnectionFromAllGroups(connectionId);

    await redisClient.updateParticipants(sessionId, participants);
    groupClient.sendToAll({ eventName: Actions.PARTICIPANTS_UPDATED, data: participants });
  }
}
