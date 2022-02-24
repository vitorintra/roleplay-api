import User from "App/Models/User";
import { DateTime } from "luxon";
import { BaseModel, BelongsTo, belongsTo, column } from "@ioc:Adonis/Lucid/Orm";

export default class Group extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public name: string;

  @column()
  public description: string;

  @column()
  public chronic: string;

  @column()
  public schedule: number;

  @column()
  public location: number;

  @column()
  public master: number;

  @belongsTo(() => User, {
    foreignKey: "master",
  })
  public masterUser: BelongsTo<typeof User>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}