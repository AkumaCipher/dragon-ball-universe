export default class DragonBallUniverseActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["DRAGON_BALL_UNIVERSE.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.health = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 60,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 60 }),
    });
    schema.ki = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 50,
        min: 0,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 50 }),
    });

    schema.capacityRate = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 20,
        min: 0,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 20 }),
    });
    schema.biography = new fields.HTMLField();

    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, max: 30, initial: 1, min: 1 }),
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(
      Object.keys(CONFIG.DRAGON_BALL_UNIVERSE.abilities).reduce(
        (obj, ability) => {
          obj[ability] = new fields.SchemaField({
            value: new fields.NumberField({
              ...requiredInteger,
              initial: 1,
              min: 0,
            }),
          });
          return obj;
        },
        {}
      )
    );

    return schema;
  }

  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Calculate the modifier using d10 rules.
      this.abilities[key].mod = this.abilities[key].value;
      // Handle ability label localization.
      this.abilities[key].label =
        game.i18n.localize(CONFIG.DRAGON_BALL_UNIVERSE.abilities[key]) ?? key;
    }
    
  }

  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.abilities) {
      for (let [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;

    return data;
  }
}
