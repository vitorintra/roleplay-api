import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import BadRequest from "App/Exceptions/BadRequestException";
import Group from "App/Models/Group";
import GroupRequest from "App/Models/GroupRequest";

export default class GroupRequestsController {
  public async index({ request, response }: HttpContextContract) {
    const { master } = request.qs();

    if (!master) throw new BadRequest("the master query is not provided", 422);

    const groupRequests = await GroupRequest.query()
      .select("id", "groupId", "userId", "status")
      .preload("group", (query) => {
        query.select("name", "master");
      })
      .preload("user", (query) => {
        query.select("username");
      })
      .whereHas("group", (query) => {
        query.where("master", Number(master));
      })
      .where("status", "PENDING");

    return response.ok({ groupRequests });
  }

  public async store({ request, response, auth }: HttpContextContract) {
    const groupId = request.param("groupId") as number;
    const userId = auth.user!.id;

    const existingRequest = await GroupRequest.query()
      .where("group_id", groupId)
      .andWhere("user_id", userId)
      .first();

    if (existingRequest) throw new BadRequest("the request already exists", 409);

    const userAlreadyInGroup = await Group.query()
      .whereHas("players", (query) => {
        query.where("id", userId);
      })
      .andWhere("id", groupId)
      .first();

    if (userAlreadyInGroup) throw new BadRequest("user is already in group", 422);

    const groupRequest = await GroupRequest.create({ groupId, userId });
    await groupRequest.refresh();
    return response.created({ groupRequest });
  }
}
