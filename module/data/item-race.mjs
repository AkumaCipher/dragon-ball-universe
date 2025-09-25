import DragonBallUniverseItemBase from "./base-item.mjs";

export default class DragonBallUniverseRace extends DragonBallUniverseItemBase {
  static LOCALIZATION_PREFIXES = [
    "DRAGON_BALL_UNIVERSE.Item.base",
    "DRAGON_BALL_UNIVERSE.Item.Race",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.attributeIncreases = new fields.SchemaField({
      firstAttribute: new fields.StringField({
        required: true,
      }),
      secondAttribute: new fields.StringField({
        required: true,
      }),
      thirdAttribute: new fields.StringField({
        required: true,
      }),
    });

    schema.savingThrowProficiency = new fields.StringField({
      choices: ["corporeal", "impulsive", "morale", "cognitive"],
    });

    schema.racialLifeModifier = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
    });

    return schema;
  }
}
