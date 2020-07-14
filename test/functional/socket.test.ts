import { TestUtil } from "./testUtil";
import chai from "chai";

const actions = require("../../api/model/actions");
const io = require("socket.io-client");
const testUtil = new TestUtil();

describe("Socket io functional tests", () => {
  const baseUrl = process.env.TEST_URL || "http://localhost:8080";
  const username = "b@a.com";
  const password = "4590fgvhbfgbDdffm3lk4j";

  let icpSession;
  let socket;

  beforeEach(async () => {
    await testUtil.createNewUser(username, password);
    const token = await testUtil.requestUserToken(username, password);

    icpSession = await testUtil.createIcpSession(token, "1234");

    socket = io.connect(baseUrl, {
      path: "/icp/socket.io",
      secure: false,
      rejectUnauthorized: false,
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  });

  afterEach(() => {
    socket.disconnect();
    socket.close();
  });

  it("connect to web socket server", (done) => {
    socket.on("connect", () => {
      chai.expect(socket.connected).equal(true);

      done();
    });
  });

  it("join web socket icp session and trigger CLIENT_JOINED event", (done) => {
    socket.on(actions.CLIENT_JOINED, (data) => {
      chai.expect(data.client.id).equal(socket.id);
      chai.expect(data.client.username).equal("John Smith");
      chai.expect(data.presenter.id).equal("");
      chai.expect(data.presenter.username).equal("");

      done();
    });
    socket.emit("join", icpSession);
  });

  it("join web socket icp session and trigger NEW_PARTICIPANT_JOINED event", (done) => {
    socket.on(actions.NEW_PARTICIPANT_JOINED, () => {
      done();
    });
    socket.emit("join", icpSession);
  });

  it("join web socket icp session and trigger PARTICIPANTS_UPDATED event", (done) => {
    socket.on(actions.PARTICIPANTS_UPDATED, (data) => {
      const id = socket.id;
      chai.expect(data[id]).equal("John Smith");
      done();
    });
    socket.emit("join", icpSession);
  });

  it("emit disconnecting event and listen for CLIENT_DISCONNECTED event", (done) => {
    socket.on(actions.CLIENT_DISCONNECTED, () => {
      done();
    });
    socket.emit("disconnecting");
  });
});
