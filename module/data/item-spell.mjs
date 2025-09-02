import DragonBallUniverseItemBase from './base-item.mjs';

export default class DragonBallUniverseSpell extends DragonBallUniverseItemBase {
  static LOCALIZATION_PREFIXES = [
    'DRAGON_BALL_UNIVERSE.Item.base',
    'DRAGON_BALL_UNIVERSE.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 0,
      max: 9,
    });

    return schema;
  }
}
