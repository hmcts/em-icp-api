// import { TestUtil } from "./testUtil";
// import chai from "chai";

// import { Actions } from "../../api/model/actions";
// const io = require("socket.io-client");

// describe("Socket io functional tests", () => {
//   const baseUrl = process.env.TEST_URL || "http://localhost:8080";

//   let clientInfo, socket, token: string;

//   before(async () => {
//     token = await TestUtil.requestUserToken();
//     const icpSession = await TestUtil.createIcpSession(token, "1234");
//     clientInfo = { username: icpSession.username, ...icpSession.session };
//   });

//   beforeEach(async () => {
//     socket = io.connect(baseUrl, {
//       path: "/icp/socket.io",
//       secure: false,
//       rejectUnauthorized: false,
//       extraHeaders: { "Authorization": `Bearer ${token}` },
//     });
//   });

//   afterEach(() => {
//     socket.disconnect();
//     socket.close();
//   });

//   it("connect to web socket server", (done) => {
//     socket.on("connect", () => {
//       chai.expect(socket.connected).equal(true);
//       done();
//     });
//   });

//   it("join web socket icp session and trigger CLIENT_JOINED event", (done) => {
//     socket.on(Actions.CLIENT_JOINED, (data) => {
//       chai.expect(data.client.id).equal(socket.id);
//       chai.expect(data.client.username).equal("John Smith");
//       chai.expect(data.presenter.id).equal("");
//       chai.expect(data.presenter.username).equal("");

//       done();
//     });
//     socket.emit("join", clientInfo);
//   });

//   it("join web socket icp session and trigger NEW_PARTICIPANT_JOINED event", (done) => {
//     socket.on(Actions.NEW_PARTICIPANT_JOINED, () => {
//       done();
//     });
//     socket.emit("join", clientInfo);
//   });

//   it("join web socket icp session and trigger PARTICIPANTS_UPDATED event", (done) => {
//     socket.on(Actions.PARTICIPANTS_UPDATED, (data) => {
//       const id = socket.id;
//       chai.expect(data[id]).equal("John Smith");
//       done();
//     });
//     socket.emit("join", clientInfo);
//   });

//   it("emit disconnecting event and listen for CLIENT_DISCONNECTED event", (done) => {
//     socket.on("disconnect", () => done());
//     socket.emit("leave");
//   });
// });
