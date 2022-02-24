import Database from "@ioc:Adonis/Lucid/Database";
import { UserFactory } from "Database/factories";
import test from "japa";
import Hash from "@ioc:Adonis/Core/Hash";
import supertest from "supertest";
import User from "App/Models/User";

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;
let authToken = "";
let user = {} as User;

test.group("User", (group) => {
  test("it should create an user", async (assert) => {
    const userPayload = {
      email: "test@test.com",
      username: "test",
      password: "test",
      avatar: "https://iamges.com/image/1",
    };

    const { body } = await supertest(baseUrl).post("/users").send(userPayload).expect(201);

    assert.exists(body.user, "User undefined");
    assert.exists(body.user.id, "Id undefined");
    assert.equal(body.user.email, userPayload.email);
    assert.equal(body.user.username, userPayload.username);
    assert.notExists(body.user.password, "Password defined");
  });

  test("it should return 409 when email is alredy in use", async (assert) => {
    const { email } = await UserFactory.create();

    const { body } = await supertest(baseUrl)
      .post("/users")
      .send({ email, username: "test", password: "test" })
      .expect(409);

    assert.exists(body.message);
    assert.exists(body.code);
    assert.exists(body.status);
    assert.include(body.message, "email");
    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 409);
  });

  test("it should return 409 when username is alredy in use", async (assert) => {
    const { username } = await UserFactory.create();

    const { body } = await supertest(baseUrl)
      .post("/users")
      .send({ email: "test@test.com", username, password: "test" })
      .expect(409);

    assert.exists(body.message);
    assert.exists(body.code);
    assert.exists(body.status);
    assert.include(body.message, "username");
    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 409);
  });

  test("it should return 422 when required data is not provided", async (assert) => {
    const { body } = await supertest(baseUrl).post("/users").send({}).expect(422);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 422);
  });

  test("it should return 422 when providing an invalid email", async (assert) => {
    const { body } = await supertest(baseUrl)
      .post("/users")
      .send({
        email: "test@",
        password: "test",
        username: "test",
      })
      .expect(422);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 422);
  });

  test("it should return 422 when providing an invalid password", async (assert) => {
    const { body } = await supertest(baseUrl)
      .post("/users")
      .send({
        email: "test@test.com",
        password: "123",
        username: "test",
      })
      .expect(422);

    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 422);
  });

  test("it should update an user", async (assert) => {
    const { password, id } = user;

    const email = "test@test.com";
    const avatar = "http://github.com/vitorim.png";

    const { body } = await supertest(baseUrl)
      .put(`/users/${id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        email,
        avatar,
        password,
      })
      .expect(200);

    assert.exists(body.user, "user undefined");
    assert.equal(body.user.email, email);
    assert.equal(body.user.avatar, avatar);
    assert.equal(body.user.id, id);
  });

  test("it should update the password of the user", async (assert) => {
    const password = "test";

    const { body } = await supertest(baseUrl)
      .put(`/users/${user.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        email: user.email,
        avatar: user.avatar,
        password,
      })
      .expect(200);

    assert.exists(body.user, "user undefined");
    assert.equal(body.user.id, user.id);

    await user.refresh();
    assert.isTrue(await Hash.verify(user.password, password));
  });

  test("it should return 422 when required data is not provided", async (assert) => {
    const { id } = await UserFactory.create();

    const { body } = await supertest(baseUrl)
      .put(`/users/${id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({})
      .expect(422);
    assert.equal(body.code, "BAD_REQUEST");
    assert.equal(body.status, 422);
  });

  test("it should return 422 when providing an invalid email", async (assert) => {
    const { id, password, avatar } = await UserFactory.create();

    const {
      body: { code, status },
    } = await supertest(baseUrl)
      .put(`/users/${id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        password,
        email: "test",
        avatar,
      })
      .expect(422);

    assert.equal(code, "BAD_REQUEST");
    assert.equal(status, 422);
  });

  test("it should return 422 when providing an invalid password", async (assert) => {
    const { id, email, avatar } = await UserFactory.create();

    const {
      body: { code, status },
    } = await supertest(baseUrl)
      .put(`/users/${id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        email,
        avatar,
        password: "tes",
      })
      .expect(422);

    assert.equal(code, "BAD_REQUEST");
    assert.equal(status, 422);
  });

  test("it should return 422 when providing an invalid avatar", async (assert) => {
    const { id, email, password } = await UserFactory.create();

    const {
      body: { code, status },
    } = await supertest(baseUrl)
      .put(`/users/${id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        email,
        password,
        avatar: "test",
      })
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

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction();
  });

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction();
  });
});
