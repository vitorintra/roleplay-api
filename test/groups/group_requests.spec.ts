import { GroupFactory, UserFactory } from "Database/factories";
import Database from "@ioc:Adonis/Lucid/Database";
import test from "japa";
import supertest from "supertest";
import User from "App/Models/User";

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

    console.log(body);

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

  test.only("it should return 422 when user is already in group", async (assert) => {
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
