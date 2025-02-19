import { expect } from "chai";
import sinon from "sinon";
import { WebPubSubGroup, WebPubSubServiceClient } from "@azure/web-pubsub";
import { EmWebPubEventHandlerOptions } from "../../../api/em-web-pub-event-handler-options";
import { Actions } from "../../../api/model/actions";
import { RedisClient } from "../../../api/redis-client";
import { Session } from "../../../api/model/interfaces";
import { TelemetryClient } from "applicationinsights";


describe("EmWebPubEventHandlerOptions", () => {
  let redisClientStub: sinon.SinonStubbedInstance<RedisClient>;
  let webPubSubServiceClientStub: sinon.SinonStubbedInstance<WebPubSubServiceClient>;
  let emWebPubEventHandlerOptions: EmWebPubEventHandlerOptions;

  beforeEach(() => {
    redisClientStub = sinon.createStubInstance(RedisClient);
    webPubSubServiceClientStub = sinon.createStubInstance(WebPubSubServiceClient);
    emWebPubEventHandlerOptions = new EmWebPubEventHandlerOptions(webPubSubServiceClientStub, {} as unknown as TelemetryClient, redisClientStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should remove participant from session", async () => {
    const sessionId = "sessionId";
    const connectionId = "connectionId";
    const caseId = "caseId";
    const documentId = "documentId";
    const session = { participants: JSON.stringify({ [connectionId]: "username" }) };

    redisClientStub.getSessionId.returns(sessionId);
    redisClientStub.getSession.resolves(session as Session);
    redisClientStub.getLock.resolves();
    webPubSubServiceClientStub.group.returns({
      removeConnection: sinon.stub().resolves(),
      sendToAll: sinon.stub().resolves(),
    } as unknown as WebPubSubGroup);

    await emWebPubEventHandlerOptions.onRemoveParticant(connectionId, caseId, documentId);

    expect(redisClientStub.updateParticipants.calledOnce).to.be.true;
    expect(redisClientStub.updateParticipants.calledWith(sessionId, {})).to.be.true;
  });

  it("should remove connection from group", async () => {
    const sessionId = "sessionId";
    const connectionId = "connectionId";
    const caseId = "caseId";
    const documentId = "documentId";
    const session = { participants: JSON.stringify({ [connectionId]: "username" }) };

    redisClientStub.getSessionId.returns(sessionId);
    redisClientStub.getSession.resolves(session as Session);
    redisClientStub.getLock.resolves();
    const groupClientStub = {
      removeConnection: sinon.stub().resolves(),
      sendToAll: sinon.stub().resolves(),
    };
    webPubSubServiceClientStub.group.returns(groupClientStub as unknown as WebPubSubGroup);

    await emWebPubEventHandlerOptions.onRemoveParticant(connectionId, caseId, documentId);

    expect(groupClientStub.removeConnection.calledOnce).to.be.true;
    expect(groupClientStub.removeConnection.calledWith(connectionId)).to.be.true;
  });

  it("should send updated participants list to all clients", async () => {
    const sessionId = "sessionId";
    const connectionId = "connectionId";
    const caseId = "caseId";
    const documentId = "documentId";
    const session = { participants: JSON.stringify({ [connectionId]: "username" }) };

    redisClientStub.getSessionId.returns(sessionId);
    redisClientStub.getSession.resolves(session as Session);
    redisClientStub.getLock.resolves();
    const groupClientStub = {
      removeConnection: sinon.stub().resolves(),
      sendToAll: sinon.stub().resolves(),
    };
    webPubSubServiceClientStub.group.returns(groupClientStub as unknown as WebPubSubGroup);

    await emWebPubEventHandlerOptions.onRemoveParticant(connectionId, caseId, documentId);

    expect(groupClientStub.sendToAll.calledOnce).to.be.true;
    expect(groupClientStub.sendToAll.calledWith({ eventName: Actions.REMOVE_PARTICIPANT, data: {} })).to.be.true;
  });

  it("should handle connection existence check and remove non-existing connections", async () => {
    const participants = { "conn1": "user1", "conn2": "user2" };
    webPubSubServiceClientStub.connectionExists.withArgs("conn1").resolves(true);
    webPubSubServiceClientStub.connectionExists.withArgs("conn2").resolves(false);

    const result = await emWebPubEventHandlerOptions.checkIfConnectionExistAndRemove(participants);

    expect(result).to.deep.equal({ "conn1": "user1" });
  });

  it("should update presenter when connection is presenter", async () => {
    const session = { presenterId: "conn1", presenterName: "presenter", caseId: "caseId", documentId: "documentId" } as Session;
    const connectionId = "conn1";

    const updatePresenterStub = sinon.stub(emWebPubEventHandlerOptions, "onUpdatePresenter").resolves();

    emWebPubEventHandlerOptions.checkIfConnectionIsPrenseterAndRemove(connectionId, session);

    expect(updatePresenterStub.calledOnce).to.be.true;
    expect(updatePresenterStub.calledWith({ caseId: "caseId", documentId: "documentId", presenterId: "", presenterName: "" })).to.be.true;
  });
});