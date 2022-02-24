import Database from "@ioc:Adonis/Lucid/Database";
import { UserFactory } from "Database/factories";
import test from "japa";
import supertest from "supertest";

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;

test.group("Session", (group) => {
  test("it should authenticate an user", async (assert) => {
    const plainPassword = "test";
    const { email, id } = await UserFactory.merge({ password: plainPassword }).create();
    const { body } = await supertest(baseUrl)
      .post("/sessions")
      .send({ email, password: plainPassword })
      .expect(201);

    assert.isDefined(body.user, "User undefined");
    assert.equal(body.user.id, id);
  });

  test("it should return an api token when session is created", async (assert) => {
    const plainPassword = "test";
    const { email, id } = await UserFactory.merge({ password: plainPassword }).create();
    const { body } = await supertest(baseUrl)
      .post("/sessions")
      .send({ email, password: plainPassword })
      .expect(201);

    assert.isDefined(body.token, "Token undefined");
    assert.equal(body.user.id, id);
  });

  test("it should return 400 when credentials are not provided", async (assert) => {
    const { body } = await supertest(baseUrl).post("/sessions").send({}).expect(400);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 400);
  });

  test("it should return 400 when credentials are invalid", async (assert) => {
    const { email } = await UserFactory.create();
    const { body } = await supertest(baseUrl)
      .post("/sessions")
      .send({
        email,
        password: "test",
      })
      .expect(400);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 400);
    assert.equal(body.message, "invalid credentials");
  });

  test("it should return 200 when user sign out", async () => {
    const plainPassword = "test";
    const { email } = await UserFactory.merge({ password: plainPassword }).create();
    const {
      body: { token },
    } = await supertest(baseUrl)
      .post("/sessions")
      .send({ email, password: plainPassword })
      .expect(201);

    await supertest(baseUrl)
      .delete("/sessions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  test("it should revoke token when user signs out", async (assert) => {
    const plainPassword = "test";
    const { email } = await UserFactory.merge({ password: plainPassword }).create();
    const {
      body: { token },
    } = await supertest(baseUrl)
      .post("/sessions")
      .send({ email, password: plainPassword })
      .expect(201);

    await supertest(baseUrl)
      .delete("/sessions")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const queryToken = await Database.query().select("*").from("api_tokens").where("token", token);

    assert.isEmpty(queryToken);
  });

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction();
  });

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction();
  });
});
