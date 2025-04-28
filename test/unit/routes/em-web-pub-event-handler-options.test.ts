import { expect } from "chai";
import sinon from "sinon";
import { WebPubSubGroup, WebPubSubServiceClient } from "@azure/web-pubsub";
import { EmWebPubEventHandlerOptions } from "../../../api/em-web-pub-event-handler-options";
import { Actions } from "../../../api/model/actions";
import { RedisClient } from "../../../api/redis-client";
import { Session } from "../../../api/model/interfaces";
import { TelemetryClient } from "applicationinsights";
import { ConnectRequest, ConnectResponseHandler } from "@azure/web-pubsub-express";


describe("EmWebPubEventHandlerOptions", () => {
  let redisClientStub: sinon.SinonStubbedInstance<RedisClient>;
  let webPubSubServiceClientStub: sinon.SinonStubbedInstance<WebPubSubServiceClient>;
  let emWebPubEventHandlerOptions: EmWebPubEventHandlerOptions;
  let telemetryClientStub: sinon.SinonStubbedInstance<TelemetryClient>;

  beforeEach(() => {
    redisClientStub = sinon.createStubInstance(RedisClient);
    telemetryClientStub = {
      trackTrace: sinon.stub(),
      trackEvent: sinon.stub(),
      trackException: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<TelemetryClient>;
    
    webPubSubServiceClientStub = sinon.createStubInstance(WebPubSubServiceClient);
    emWebPubEventHandlerOptions = new EmWebPubEventHandlerOptions(webPubSubServiceClientStub, telemetryClientStub, redisClientStub);
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
    expect(groupClientStub.sendToAll.calledWith({ eventName: Actions.PARTICIPANTS_UPDATED, data: {} })).to.be.true;
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

  it("should reject connection when sessionId does not match roles", async () => {
    const connectRequest = {
      queries: {
        "sessionId": ["session123"],
      },
      claims: {
        "role": ["user-role-differentSession"],
      },
    } as unknown as ConnectRequest;
    
    // Create response handler with success and fail spies
    const successSpy = sinon.spy();
    const failSpy = sinon.spy();
    const connectResponse = {
      success: successSpy,
      fail: failSpy,
    } as unknown as ConnectResponseHandler;

    await emWebPubEventHandlerOptions.handleConnect(connectRequest, connectResponse);
    
    expect(failSpy.calledOnce).to.be.true;
    expect(failSpy.calledWith(401, "User not authorized to access sessionId session123")).to.be.true;
    
    expect(successSpy.called).to.be.false;
    
    expect(telemetryClientStub.trackTrace.calledWith({ message: "handleConnect failed" })).to.be.true;
  });

  it("should accept connection when sessionId matches roles", async () => {
    const sessionId = "validSession123";
    const connectRequest = {
      queries: {
        "sessionId": [sessionId],
      },
      claims: {
        "role": ["some-role", `user-role-${sessionId}`],
      },
    } as unknown as ConnectRequest;
    
    const successSpy = sinon.spy();
    const failSpy = sinon.spy();
    const connectResponse = {
      success: successSpy,
      fail: failSpy,
    } as unknown as ConnectResponseHandler;
    
    await emWebPubEventHandlerOptions.handleConnect(connectRequest, connectResponse);
    
    expect(successSpy.calledOnce).to.be.true;
    expect(failSpy.called).to.be.false;
    
    expect(telemetryClientStub.trackTrace.calledWith({ message: "handleConnect" })).to.be.true;
  });
});