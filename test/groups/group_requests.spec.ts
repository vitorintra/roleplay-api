import { GroupFactory, UserFactory } from "Database/factories";
import Database from "@ioc:Adonis/Lucid/Database";
import test from "japa";
import supertest from "supertest";

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;

test.group("Group Requests", (group) => {
  test.only("it should create a group request", async (assert) => {
    const user = await UserFactory.create();
    const group = await GroupFactory.merge({ master: user.id }).create();

    const { body } = await supertest(baseUrl)
      .post(`/groups/${group.id}/requests`)
      .send({})
      .expect(201);

    assert.exists(body.groupRequest, "Group undefined");
    assert.equal(body.groupRequest.userId, user.id);
    assert.equal(body.groupRequest.groupId, group.id);
    assert.equal(body.groupRequest.status, "PENDING");
  });

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction();
  });

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction();
  });
});
