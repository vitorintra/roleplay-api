import Mail from "@ioc:Adonis/Addons/Mail";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import User from "App/Models/User";
import ForgotPassword from "App/Validators/ForgotPasswordValidator";
import { randomBytes } from "crypto";
import { promisify } from "util";

export default class PasswordsController {
  public async forgotPassword({ request, response }: HttpContextContract) {
    const { email, resetPasswordUrl } = await request.validate(ForgotPassword);
    const user = await User.findByOrFail("email", email);

    const random = await promisify(randomBytes)(24);
    const token = random.toString("hex");

    await user.related("tokens").updateOrCreate(
      { userId: user.id },
      {
        token,
      }
    );

    const resetPasswordUrlWithToken = `${resetPasswordUrl}?token=${token}`;

    await Mail.send((message) => {
      message
        .from("no-reply@roleplay.com")
        .to(email)
        .subject("Roleplay: Recuperação de Senha")
        .htmlView("email/forgotpassword", {
          productName: "Roleplay",
          name: user.username,
          resetPasswordUrl: resetPasswordUrlWithToken,
        });
    });

    return response.noContent();
  }

  public async resetPassword({ request, response }: HttpContextContract) {
    const { token, password } = request.only(["token", "password"]);

    const userByToken = await User.query()
      .whereHas("tokens", (query) => {
        query.where("token", token);
      })
      .firstOrFail();

    userByToken.password = password;
    await userByToken.save();

    return response.noContent();
  }
}
