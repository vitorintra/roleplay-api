import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

export default class GroupRequestsController {
  public async store({ request, response }: HttpContextContract) {
    return response.created();
  }
}
