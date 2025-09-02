import DragonBallUniverseActorBase from "./base-actor.mjs";

export default class DragonBallUniverseCharacter extends DragonBallUniverseActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "DRAGON_BALL_UNIVERSE.Actor.Character",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    return schema;
  }
}
