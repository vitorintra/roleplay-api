import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import BadRequest from "App/Exceptions/BadRequestException";
import Group from "App/Models/Group";
import CreateGroup from "App/Validators/CreateGroupValidator";

export default class GroupsController {
  public async index({ request, response }: HttpContextContract) {
    const { ["user"]: userId, text } = request.qs();

    const groups = await this.filterByQueryString(userId, text);

    return response.ok({ groups });
  }

  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroup);
    const group = await Group.create(groupPayload);

    await group.related("players").attach([groupPayload.master]);
    await group.load("players");

    return response.created({ group });
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const id = request.param("id");
    const payload = request.all();
    const group = await Group.findOrFail(id);

    await bouncer.authorize("updateGroup", group);

    const updatedGroup = await group.merge(payload).save();

    return response.ok({ group: updatedGroup });
  }

  public async removePlayer({ request, response }: HttpContextContract) {
    const groupId = request.param("groupId") as number;
    const playerId = +request.param("playerId");

    const group = await Group.findOrFail(groupId);

    if (playerId === group.master) throw new BadRequest("cannot remove master from group", 400);

    await group.related("players").detach([playerId]);

    return response.ok({});
  }

  public async destroy({ request, response, bouncer }: HttpContextContract) {
    const id = request.param("id");
    const group = await Group.findOrFail(id);

    await bouncer.authorize("deleteGroup", group);

    await group.delete();
    return response.ok({});
  }

  private filterByQueryString(userId: number, text: string) {
    if (userId && text) return this.filterByUserAndText(userId, text);
    if (userId && !text) return this.filterByUser(userId);
    if (!userId && text) return this.filterByText(text);
    return this.all();
  }

  private all() {
    return Group.query().preload("players").preload("masterUser");
  }

  private filterByUser(userId: number) {
    return Group.query()
      .preload("players")
      .preload("masterUser")
      .whereHas("players", (query) => {
        query.where("id", userId);
      });
  }

  private filterByText(text: string) {
    return Group.query()
      .preload("players")
      .preload("masterUser")

      .where("name", "LIKE", `%${text}%`)
      .orWhere("description", "LIKE", `%${text}%`);
  }

  private filterByUserAndText(userId: number, text: string) {
    return Group.query()
      .preload("players")
      .preload("masterUser")
      .whereHas("players", (query) => {
        query.where("id", userId);
      })
      .where("name", "LIKE", `%${text}%`)
      .orWhere("description", "LIKE", `%${text}%`);
  }
}
