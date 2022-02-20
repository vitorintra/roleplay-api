import Mail from "@ioc:Adonis/Addons/Mail";
import Database from "@ioc:Adonis/Lucid/Database";
import { UserFactory } from "Database/factories";
import test from "japa";
import supertest from "supertest";

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;

test.group("Password", (group) => {
  test("it should send an email with forgot password instructions", async (assert) => {
    const { email, username } = await UserFactory.create();

    Mail.trap((message) => {
      assert.deepEqual(message.to, [{ address: email }]);
      assert.deepEqual(message.from, { address: "no-reply@roleplay.com" });
      assert.equal(message.subject, "Roleplay: Recuperação de Senha");
      assert.include(message.html!, username);
    });

    await supertest(baseUrl)
      .post("/forgot-password")
      .send({
        email: email,
        resetPasswordUrl: "url",
      })
      .expect(204);

    Mail.restore();
  });

  test
    .only("it should create a reset password token", async (assert) => {
      const user = await UserFactory.create();

      await supertest(baseUrl)
        .post("/forgot-password")
        .send({
          email: user.email,
          resetPasswordUrl: "url",
        })
        .expect(204);

      const tokens = await user.related("tokens").query();

      assert.isNotEmpty(tokens);
    })
    .timeout(0);

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction();
  });
  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction();
  });
});
