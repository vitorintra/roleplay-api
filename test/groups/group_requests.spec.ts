import { GroupFactory, UserFactory } from "Database/factories";
import Database from "@ioc:Adonis/Lucid/Database";
import test from "japa";
import supertest from "supertest";
import User from "App/Models/User";
import GroupRequest from "App/Models/GroupRequest";

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;

let authToken: string;
let user: User;

test.group("Group Requests", (group) => {
  test("it should create a group request", async (assert) => {
    const { id } = await UserFactory.create();
    const group = await GroupFactory.merge({ master: id }).create();

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(201);

    assert.exists(body.groupRequest, "Group undefined");
    assert.equal(body.groupRequest.userId, user.id);
    assert.equal(body.groupRequest.groupId, group.id);
    assert.equal(body.groupRequest.status, "PENDING");
  });

  test("it should reutn 409 when a request alredy exists", async (assert) => {
    const { id } = await UserFactory.create();
    const group = await GroupFactory.merge({ master: id }).create();

    await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(409);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 409);
  });

  test("it should return 422 when user is already in group", async (assert) => {
    const groupPayload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    const {
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(groupPayload);

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(422);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 422);
  });

  test("it should return a group requests list", async (assert) => {
    const master = await UserFactory.create();
    const group = await GroupFactory.merge({ master: master.id }).create();

    const {
      body: { groupRequest },
    } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    const {
      body: { groupRequests },
    } = await supertest(baseUrl)
      .get(`/groups/${group.id}/requests?master=${master.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    assert.exists(groupRequests, "groupRequests undefined");
    assert.equal(groupRequests.length, 1);
    assert.equal(groupRequests[0].id, groupRequest.id);
    assert.equal(groupRequests[0].userId, groupRequest.userId);
    assert.equal(groupRequests[0].groupId, groupRequest.groupId);
    assert.equal(groupRequests[0].status, groupRequest.status);
    assert.equal(groupRequests[0].group.name, group.name);
    assert.equal(groupRequests[0].user.username, user.username);
    assert.equal(groupRequests[0].group.master, master.id);
  });

  test("it should return an empty list when master has no group requests", async (assert) => {
    const master = await UserFactory.create();
    const group = await GroupFactory.merge({ master: master.id }).create();

    await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    const {
      body: { groupRequests },
    } = await supertest(baseUrl)
      .get(`/groups/${group.id}/requests?master=${user.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    assert.exists(groupRequests, "groupRequests undefined");
    assert.equal(groupRequests.length, 0);
  });

  test("it should return 422 when master is not provided", async (assert) => {
    const master = await UserFactory.create();
    const group = await GroupFactory.merge({ master: master.id }).create();

    const { body } = await supertest(baseUrl)
      .get(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(422);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 422);
  });

  test("it should accept a group request", async (assert) => {
    const group = await GroupFactory.merge({ master: user.id }).create();

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    const response = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests/${body.groupRequest.id}/accept`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    assert.exists(response.body.groupRequest, "GroupRequest undefined");
    assert.equal(response.body.groupRequest.userId, user.id);
    assert.equal(response.body.groupRequest.groupId, group.id);
    assert.equal(response.body.groupRequest.status, "ACCEPTED");

    await group.load("players");
    assert.isNotEmpty(group.players);
    assert.equal(group.players.length, 1);
    assert.equal(group.players[0].id, user.id);
  });

  test("it should return 404 when providing an unexisting group request", async (assert) => {
    const master = await UserFactory.create();
    const group = await GroupFactory.merge({ master: master.id }).create();

    await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    const response = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests/123/accept`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);

    assert.equal(response.body.code, "BAD_REQUEST");
    assert.equal(response.body.status, 404);
  });

  test("it should reject a group request", async (assert) => {
    const group = await GroupFactory.merge({ master: user.id }).create();

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    await supertest(baseUrl)
      .delete(`/groups/${group.id}/requests/${body.groupRequest.id}/`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    const groupRequest = await GroupRequest.find(body.groupRequest.id);
    assert.isNull(groupRequest);
  });

  test("it should return 404 when providing an unexisting group for rejection", async (assert) => {
    const master = await UserFactory.create();
    const group = await GroupFactory.merge({ master: master.id }).create();

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    const response = await supertest(baseUrl)
      .delete(`/groups/123/requests/${body.groupRequest.id}/`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);

    assert.equal(response.body.code, "BAD_REQUEST");
    assert.equal(response.body.status, 404);
  });

  test("it should return 404 when providing an unexisting group request for rejection", async (assert) => {
    const master = await UserFactory.create();
    const group = await GroupFactory.merge({ master: master.id }).create();

    await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});

    const response = await supertest(baseUrl)
      .delete(`/groups/${group.id}/requests/123/`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);

    assert.equal(response.body.code, "BAD_REQUEST");
    assert.equal(response.body.status, 404);
  });

  group.before(async () => {
    const plainPassword = "test";
    const newUser = await UserFactory.merge({ password: plainPassword }).create();

    const {
      body: {
        token: { token },
      },
    } = await supertest(baseUrl)
      .post("/sessions")
      .send({ email: newUser.email, password: plainPassword })
      .expect(201);

    authToken = token;
    user = newUser;
  });

  group.after(async () => {
    await supertest(baseUrl).delete("/sessions").set("Authorization", `Bearer ${authToken}`);
  });

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction();
  });

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction();
  });
});
