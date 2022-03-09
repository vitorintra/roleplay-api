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
    const groupFactory = await GroupFactory.merge({ master: user.id }).create();

    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
    };

    const {
      body: { group },
    } = await supertest(baseUrl)
      .patch(`/groups/${groupFactory.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(200);

    assert.exists(group, "group undefined");
    assert.equal(group.id, group.id);
    assert.equal(group.name, payload.name);
    assert.equal(group.description, payload.description);
    assert.equal(group.schedule, payload.location);
    assert.equal(group.chronic, payload.chronic);
    assert.equal(group.master, user.id);
  });

  test("it should return 404 when providing an unexisting group id", async (assert) => {
    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
    };

    const { body } = await supertest(baseUrl)
      .patch(`/groups/123`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(404);

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

  test("it should remove the master of the group", async (assert) => {
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

  test("it should remove a group", async (assert) => {
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
      .delete(`/groups/${group.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    const emptyGroup = await Database.query().from("groups").where("id", group.id);
    assert.isEmpty(emptyGroup);

    const players = await Database.query().from("groups_users");
    assert.isEmpty(players);
  });

  test("it should return 404 when providing an unexisting group for deletion", async (assert) => {
    const {
      body: { code, status },
    } = await supertest(baseUrl)
      .delete("/groups/1")
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(404);

    assert.equal(code, "BAD_REQUEST");
    assert.equal(status, 404);
  });

  test("it should return all groups when no query is provided to list groups", async (assert) => {
    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    const {
      body: {
        group: { name, description, schedule, location, chronic, master, players },
      },
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    const {
      body: { groups },
    } = await supertest(baseUrl)
      .get("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Groups
    assert.exists(groups, "Groups undefined");
    assert.equal(groups.length, 1);

    // First group
    assert.equal(groups[0].id, group.id);
    assert.equal(groups[0].name, name);
    assert.equal(groups[0].description, description);
    assert.equal(groups[0].schedule, schedule);
    assert.equal(groups[0].location, location);
    assert.equal(groups[0].chronic, chronic);
    assert.equal(groups[0].master, master);

    // First group master
    assert.exists(groups[0].masterUser, "Master undefined");
    assert.equal(groups[0].masterUser.id, user.id);
    assert.equal(groups[0].masterUser.username, user.username);

    // Players
    assert.isNotEmpty(groups[0].players, "Empty players");

    // First player
    assert.equal(players[0].id, user.id);
    assert.equal(players[0].email, user.email);
    assert.equal(players[0].username, user.username);
  });

  test("it should return no groups by user id", async (assert) => {
    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    const {
      body: { groups },
    } = await supertest(baseUrl)
      .get("/groups?user=123")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    assert.exists(groups, "Groups undefined");
    assert.equal(groups.length, 0);
  });

  test("it should return all groups by user id", async (assert) => {
    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    const {
      body: {
        group: { name, description, schedule, location, chronic, master, players },
      },
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    const {
      body: { groups },
    } = await supertest(baseUrl)
      .get(`/groups?user=${user.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Groups
    assert.exists(groups, "Groups undefined");
    assert.equal(groups.length, 1);

    // First group
    assert.equal(groups[0].id, group.id);
    assert.equal(groups[0].name, name);
    assert.equal(groups[0].description, description);
    assert.equal(groups[0].schedule, schedule);
    assert.equal(groups[0].location, location);
    assert.equal(groups[0].chronic, chronic);
    assert.equal(groups[0].master, master);

    // First group master
    assert.exists(groups[0].masterUser, "Master undefined");
    assert.equal(groups[0].masterUser.id, user.id);
    assert.equal(groups[0].masterUser.username, user.username);

    // Players
    assert.isNotEmpty(groups[0].players, "Empty players");

    // First player
    assert.equal(players[0].id, user.id);
    assert.equal(players[0].email, user.email);
    assert.equal(players[0].username, user.username);
  });

  test("it should return all groups by user id and name", async (assert) => {
    const payload = {
      name: "test",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    const {
      body: {
        group: { name, description, schedule, location, chronic, master, players },
      },
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ...payload, name: "123", description: "123" });

    const {
      body: { groups },
    } = await supertest(baseUrl)
      .get(`/groups?user=${user.id}&text=es`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Groups
    assert.exists(groups, "Groups undefined");
    assert.equal(groups.length, 1);

    // First group
    assert.equal(groups[0].id, group.id);
    assert.equal(groups[0].name, name);
    assert.equal(groups[0].description, description);
    assert.equal(groups[0].schedule, schedule);
    assert.equal(groups[0].location, location);
    assert.equal(groups[0].chronic, chronic);
    assert.equal(groups[0].master, master);

    // First group master
    assert.exists(groups[0].masterUser, "Master undefined");
    assert.equal(groups[0].masterUser.id, user.id);
    assert.equal(groups[0].masterUser.username, user.username);

    // Players
    assert.isNotEmpty(groups[0].players, "Empty players");

    // First player
    assert.equal(players[0].id, user.id);
    assert.equal(players[0].email, user.email);
    assert.equal(players[0].username, user.username);
  });

  test("it should return all groups by user id and description", async (assert) => {
    const payload = {
      name: "123",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    const {
      body: {
        group: { name, description, schedule, location, chronic, master, players },
      },
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ...payload, name: "123", description: "123" });

    const {
      body: { groups },
    } = await supertest(baseUrl)
      .get(`/groups?user=${user.id}&text=es`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Groups
    assert.exists(groups, "Groups undefined");
    assert.equal(groups.length, 1);

    // First group
    assert.equal(groups[0].id, group.id);
    assert.equal(groups[0].name, name);
    assert.equal(groups[0].description, description);
    assert.equal(groups[0].schedule, schedule);
    assert.equal(groups[0].location, location);
    assert.equal(groups[0].chronic, chronic);
    assert.equal(groups[0].master, master);

    // First group master
    assert.exists(groups[0].masterUser, "Master undefined");
    assert.equal(groups[0].masterUser.id, user.id);
    assert.equal(groups[0].masterUser.username, user.username);

    // Players
    assert.isNotEmpty(groups[0].players, "Empty players");

    // First player
    assert.equal(players[0].id, user.id);
    assert.equal(players[0].email, user.email);
    assert.equal(players[0].username, user.username);
  });

  test("it should return all groups by name", async (assert) => {
    const payload = {
      name: "test",
      description: "123",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    const {
      body: {
        group: { name, description, schedule, location, chronic, master, players },
      },
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ...payload, name: "123", description: "123" });

    const {
      body: { groups },
    } = await supertest(baseUrl)
      .get(`/groups?text=es`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Groups
    assert.exists(groups, "Groups undefined");
    assert.equal(groups.length, 1);

    // First group
    assert.equal(groups[0].id, group.id);
    assert.equal(groups[0].name, name);
    assert.equal(groups[0].description, description);
    assert.equal(groups[0].schedule, schedule);
    assert.equal(groups[0].location, location);
    assert.equal(groups[0].chronic, chronic);
    assert.equal(groups[0].master, master);

    // First group master
    assert.exists(groups[0].masterUser, "Master undefined");
    assert.equal(groups[0].masterUser.id, user.id);
    assert.equal(groups[0].masterUser.username, user.username);

    // Players
    assert.isNotEmpty(groups[0].players, "Empty players");

    // First player
    assert.equal(players[0].id, user.id);
    assert.equal(players[0].email, user.email);
    assert.equal(players[0].username, user.username);
  });

  test("it should return all groups by description", async (assert) => {
    const payload = {
      name: "123",
      description: "test",
      schedule: "test",
      location: "test",
      chronic: "test",
      master: user.id,
    };

    const {
      body: {
        group: { name, description, schedule, location, chronic, master, players },
      },
      body: { group },
    } = await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload);

    await supertest(baseUrl)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ...payload, name: "123", description: "123" });

    const {
      body: { groups },
    } = await supertest(baseUrl)
      .get(`/groups?text=es`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Groups
    assert.exists(groups, "Groups undefined");
    assert.equal(groups.length, 1);

    // First group
    assert.equal(groups[0].id, group.id);
    assert.equal(groups[0].name, name);
    assert.equal(groups[0].description, description);
    assert.equal(groups[0].schedule, schedule);
    assert.equal(groups[0].location, location);
    assert.equal(groups[0].chronic, chronic);
    assert.equal(groups[0].master, master);

    // First group master
    assert.exists(groups[0].masterUser, "Master undefined");
    assert.equal(groups[0].masterUser.id, user.id);
    assert.equal(groups[0].masterUser.username, user.username);

    // Players
    assert.isNotEmpty(groups[0].players, "Empty players");

    // First player
    assert.equal(players[0].id, user.id);
    assert.equal(players[0].email, user.email);
    assert.equal(players[0].username, user.username);
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
