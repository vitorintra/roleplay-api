import Group from "App/Models/Group";
import User from "App/Models/User";
import { DateTime } from "luxon";
import { BaseModel, belongsTo, BelongsTo, column } from "@ioc:Adonis/Lucid/Orm";

export default class GroupRequest extends BaseModel {
  public static table = "groups_requests";

  @column({ isPrimary: true })
  public id: number;

  @column({ columnName: "user_id", serializeAs: "userId" })
  public userId: number;

  @column({ serializeAs: "groupId" })
  public groupId: number;

  @column()
  public status: "PENDING" | "ACCEPTED";

  @belongsTo(() => User, {
    foreignKey: "userId",
  })
  public user: BelongsTo<typeof User>;

  @belongsTo(() => Group, {
    foreignKey: "groupId",
  })
  public group: BelongsTo<typeof Group>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
