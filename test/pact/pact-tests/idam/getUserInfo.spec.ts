"use strict";

import { expect } from "chai";
const { PactTestSetup } = require("../settings/provider.mock");
const { Matchers } = require("@pact-foundation/pact");
const { somethingLike } = Matchers;
const pactSetUp = new PactTestSetup({ provider: "idamApi_oidc", port: 8000});
const { getUserInfo } = require("../../pactUtil");

describe("IDAM API user details", () => {
  const RESPONSE_BODY = {
    "uid": somethingLike("1111-2222-3333-4567"),
    "sub": somethingLike("caseofficer@fake.hmcts.net"),
    "givenName": somethingLike("Case"),
    "familyName": somethingLike("Officer"),
    "IDAM_ADMIN_USER": somethingLike("string"),
    "roles": somethingLike([
      somethingLike("caseworker"),
    ]),
  };

  describe("get /o/userinfo", () => {
    const jwt = "some-access-token";

    before(async () => {
      await pactSetUp.provider.setup();
      const interaction = {
        state: "userinfo is requested",
        uponReceiving: "a request for that user",
        withRequest: {
          method: "GET",
          path: "/o/userinfo",
          headers: {
            Authorization: "Bearer some-access-token",
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: RESPONSE_BODY,
        },
      };
      pactSetUp.provider.addInteraction(interaction);
    });
    it("returns the correct response", async () => {
      const taskUrl = `${pactSetUp.provider.mockService.baseUrl}`;
      const response: Promise<any> = getUserInfo(taskUrl, jwt);

      response.then((Response) => {
        const dto: IdamGetInfoResponseDto = <IdamGetInfoResponseDto>Response.body;
        assertResponses(dto);
      }).then(() => {
        pactSetUp.provider.verify();
        pactSetUp.provider.finalize();
        });
      });
    });
});

export interface IdamGetInfoResponseDto {
  uid: string;
  sub: string;
  givenName: string;
  familyName: string;
  IDAM_ADMIN_USER: string;
  roles: string[];
}

function assertResponses(dto: IdamGetInfoResponseDto) {
  expect(dto.uid).to.be.equal("1111-2222-3333-4567");
  expect(dto.sub).to.be.equal("caseofficer@fake.hmcts.net");
  expect(dto.givenName).to.be.equal("Case");
  expect(dto.familyName).to.be.equal("Officer");
  expect(dto.roles[0]).to.be.equal("caseworker");
}