import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Group from "App/Models/Group";

export default class GroupsController {
  public async store({ request, response }: HttpContextContract) {
    const group = await Group.create(request.all());
    return response.created({ group });
  }
}
