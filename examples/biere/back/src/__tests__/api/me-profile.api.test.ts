import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID } from "@/database/seed.constants";

const ME_PROFILE_PATH = "/api/v1/me/profile";
const profilePath = (userId: number): string => `/api/v1/users/${userId}/profile`;

describe("me profile API", () => {
  let app: INestApplication;

  const readProfile = (userId: number): request.Test =>
    request(app.getHttpServer()).get(profilePath(userId)).set(USER_ID_HEADER_NAME, String(userId));

  const update = (userId: number, body: object): request.Test =>
    request(app.getHttpServer()).put(ME_PROFILE_PATH).set(USER_ID_HEADER_NAME, String(userId)).send(body);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).put(ME_PROFILE_PATH).send({ displayName: "Alice B", avatar: "foam" });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 before 400 when the header is missing and the body is invalid", async () => {
    const response = await request(app.getHttpServer()).put(ME_PROFILE_PATH).send({ displayName: "A", avatar: "beer" });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it.each([
    ["a name of 1 character", { displayName: "a", avatar: "foam" }],
    ["a name of 1 character between spaces", { displayName: "  a  ", avatar: "foam" }],
    ["a name of 25 characters", { displayName: "a".repeat(25), avatar: "foam" }],
    ["a name of 25 characters between spaces", { displayName: ` ${"a".repeat(25)} `, avatar: "foam" }],
    ["a blank name", { displayName: "   ", avatar: "foam" }],
    ["a missing name", { avatar: "foam" }],
    ["a missing avatar", { displayName: "Alice B" }],
    ["an avatar outside the list", { displayName: "Alice B", avatar: "beer" }],
    ["an unknown field", { displayName: "Alice B", avatar: "foam", avatarColor: "#000000" }],
    ["an empty body", {}],
  ])("answers 400 and changes nothing for %s", async (_label, body) => {
    const before = await readProfile(ALICE_USER_ID);

    const response = await update(ALICE_USER_ID, body);
    const after = await readProfile(ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).not.toBe("");
    expect(after.body).toEqual(before.body);
  });

  it("replaces the trimmed name and the avatar of Alice, answers her whole profile and reads back the same", async () => {
    const before = await readProfile(ALICE_USER_ID);

    const response = await update(ALICE_USER_ID, { displayName: "  Alice B  ", avatar: "foam" });
    const after = await readProfile(ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ ...before.body, displayName: "Alice B", avatar: "foam", isMe: true });
    expect(after.body).toEqual(response.body);
  });

  it("leaves the profile of another user untouched", async () => {
    const response = await readProfile(BOB_USER_ID);

    expect(response.body).toMatchObject({ id: BOB_USER_ID, displayName: "Bob", avatar: "malt" });
  });

  it.each([
    ["2 characters", "ab"],
    ["24 characters", "a".repeat(24)],
    ["24 characters between spaces", ` ${"a".repeat(24)} `],
  ])("accepts a name of %s", async (_label, displayName) => {
    const response = await update(ALICE_USER_ID, { displayName, avatar: "hop" });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toMatchObject({ displayName: displayName.trim(), avatar: "hop", isMe: true });
  });

  it("accepts a name already worn by another user", async () => {
    const response = await update(ALICE_USER_ID, { displayName: "Bob", avatar: "malt" });
    const bob = await readProfile(BOB_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toMatchObject({ id: ALICE_USER_ID, displayName: "Bob", avatar: "malt", isMe: true });
    expect(bob.body).toMatchObject({ id: BOB_USER_ID, displayName: "Bob", avatar: "malt" });
  });
});
