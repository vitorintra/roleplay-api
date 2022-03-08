import Database from "@ioc:Adonis/Lucid/Database";
import Group from "App/Models/Group";
import User from "App/Models/User";
import { GroupFactory, UserFactory } from "Database/factories";
import test from "japa";
import supertest from "supertest";

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;

let authToken = "";
let user = {} as User;

test.group("Group", (group) => {
  test("it should create a group", async (assert) => {
    const { id } = await UserFactory.create();

    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: id,
    };

    const {
      body: {
        group: { name, description, schedule, location, chronic, master, players },
      },
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    assert.exists(group, "Group undefined");
    assert.equal(name, payload.name);
    assert.equal(description, payload.description);
    assert.equal(schedule, payload.schedule);
    assert.equal(location, payload.location);
    assert.equal(chronic, payload.chronic);
    assert.equal(master, payload.master);

    assert.exists(players, "Players undefined");
    assert.equal(players.length, 1);
    assert.equal(players[0].id, master);
  });

  test("it should return 422 when data is not provided", async (assert) => {
    const {
      body: { status, code },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(422);

    assert.equal(code, "BAD_REQUEST");
    assert.equal(status, 422);
  });

  test("it should update a group", async (assert) => {
    const master = await UserFactory.create();
    const groupFactory = await GroupFactory.merge({ master: master.id }).create();

    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
    };

    const {
      body: { group },
    } = await supertest(baseUrl).patch(`/groups/${groupFactory.id}`).send(payload).expect(200);

    assert.exists(group, "group undefined");
    assert.equal(group.id, group.id);
    assert.equal(group.name, payload.name);
    assert.equal(group.description, payload.description);
    assert.equal(group.schedule, payload.location);
    assert.equal(group.chronic, payload.chronic);
    assert.equal(group.master, master.id);
  });

  test("it should return 404 when providing an unexisting group id", async (assert) => {
    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
    };

    const { body } = await supertest(baseUrl).patch(`/groups/123`).send(payload).expect(404);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 404);
  });

  test("it should remove user from group", async (assert) => {
    const group = await GroupFactory.merge({ master: user.id }).create();

    const plainPassword = "test";
    const newUser = await UserFactory.merge({ password: plainPassword }).create();

    const {
      body: {
        token: { token },
      },
    } = await supertest(baseUrl)
      .post("/sessions")
      .send({ email: newUser.email, password: plainPassword });

    const playerAuthToken = token;

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .set("Authorization", `Bearer ${playerAuthToken}`)
      .send({});

    await supertest(baseUrl)
      .post(`/groups/${group.id}/requests/${body.groupRequest.id}/accept`)
      .set("Authorization", `Bearer ${authToken}`);

    await supertest(baseUrl)
      .delete(`/groups/${group.id}/players/${newUser.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    await group.load("players");
    assert.isEmpty(group.players);
  });

  test.only("it should remove the master of the group", async (assert) => {
    const payload = {
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
      .send(payload);

    await supertest(baseUrl)
      .delete(`/groups/${group.id}/players/${user.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(400);

    const groupModel = await Group.findOrFail(group.id);

    await groupModel.load("players");
    assert.isNotEmpty(groupModel.players);
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
