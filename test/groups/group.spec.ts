import Database from "@ioc:Adonis/Lucid/Database";
import { UserFactory } from "Database/factories";
import test from "japa";
import supertest from "supertest";

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;

test.group("Group", (group) => {
  test.only("it should create a group", async (assert) => {
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
        group: { name, description, schedule, location, chronic, master },
      },
      body: { group },
    } = await supertest(baseUrl).post("/groups").send(payload).expect(201);

    assert.exists(group, "Group undefined");

    assert.equal(name, payload.name);
    assert.equal(description, payload.description);
    assert.equal(schedule, payload.schedule);
    assert.equal(location, payload.location);
    assert.equal(chronic, payload.chronic);
    assert.equal(master, payload.master);
  });

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction();
  });

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction();
  });
});
