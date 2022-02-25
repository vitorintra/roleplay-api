import Database from "@ioc:Adonis/Lucid/Database";
import User from "App/Models/User";
import { UserFactory } from "Database/factories";
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
