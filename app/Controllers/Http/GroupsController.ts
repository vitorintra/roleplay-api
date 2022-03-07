import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Group from "App/Models/Group";
import CreateGroup from "App/Validators/CreateGroupValidator";

export default class GroupsController {
  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroup);
    const group = await Group.create(groupPayload);

    await group.related("players").attach([groupPayload.master]);
    await group.load("players");

    return response.created({ group });
  }

  public async patch({ request, response }: HttpContextContract) {
    const id = request.param("id");
    const payload = request.all();
    const group = await Group.findOrFail(id);
    const updatedGroup = await group.merge(payload).save();

    return response.ok({ group: updatedGroup });
  }
}
