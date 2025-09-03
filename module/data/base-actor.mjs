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

    this._prepareCharacterData(this);

    // console.log(this);

  }

  _prepareCharacterData(systemData) {

    const level = systemData.attributes.level.value;

    /* Calculate the Tier of Power */

    systemData.baseTierOfPower = Math.floor(level / 5) + 1;

    systemData.currentTierOfPower = systemData.baseTierOfPower; // + any temporary modifiers from effects, transformations, etc.

    const abilities = systemData.abilities;

    this._prepareResourcesData(systemData, abilities, level);

    this._prepareAptitudesData(systemData, abilities);

    this._prepareCombatRollsData(systemData, abilities);
  }

  _prepareResourcesData(systemData, abilities, level) {
    /* Calculate Life Modifier */

    // Each point of Tenacity adds 2 Life Points.
    const tenacityLifeModifier = abilities.te.value * 2 * level;

    // Each level after the first adds 12 Life Points.
    const levelLifeModifier = 12 * (level - 1);

    // Set the actor's max health to the base 60 + modifiers.
    systemData.health.max = 60 + tenacityLifeModifier + levelLifeModifier;

    /* Calculate Ki Points */

    const levelKiModifier = 12 * (level - 1);

    const baseKiPoints = 50 + levelKiModifier;

    const KiPointsBeforeMultiplier = baseKiPoints;

    const totalKiPoints = KiPointsBeforeMultiplier;

    systemData.ki.max = totalKiPoints;

    /* Calculate Capacity Rate */

    const levelCapacityRateModifier = 4 * (level - 1);

    systemData.capacityRate.max = 20 + levelCapacityRateModifier;
  }

  _prepareAptitudesData(systemData, abilities) {
    /* Declare aptitudes */

    // Agility aptitudes

    systemData.haste = Math.floor(abilities.ag.mod / 2);

    systemData.defenseValue = abilities.ag.mod;

    systemData.initiative = Math.floor(abilities.ag.value / 2);

    const normalSpeed = 2 + Math.floor(abilities.ag.mod / 2);

    const boostedSpeed = 2 + abilities.ag.mod;

    systemData.speed = { normalSpeed: normalSpeed, boostedSpeed: boostedSpeed };

    // Might aptitude

    systemData.might = Math.max(abilities.fo.mod, abilities.ma.mod);

    // Force aptitudes / rules

    systemData.surgency = abilities.fo.mod;

    systemData.superStackAmount = Math.clamp(
      Math.floor((abilities.fo.value - abilities.ag.value) / 5),
      0,
      3
    );

    // Tenacity aptitudes

    systemData.soak = Math.max(abilities.te.mod, 1 * systemData.currentTierOfPower);

    systemData.damageReduction = 0; // Placeholder for future DR rules

    // Scholarship aptitudes / rules

    systemData.giftedStudentSkillBonus = Math.clamp(
      Math.floor(abilities.sc.value / 4),
      0,
      2
    );

    systemData.giftedStudentTpImprovement = Math.clamp(
      Math.floor(abilities.sc.value / 4),
      0,
      2
    );

    // Insight aptitudes

    systemData.awareness = abilities.in.mod;

    // Personality aptitudes

    systemData.determination = Math.clamp(
      Math.floor(abilities.pe.value / 4),
      0,
      2
    );

    // Saving Throws
    systemData.savingThrows = {
      corporeal: abilities.te.value,
      cognitive: abilities.in.value,
      morale: abilities.pe.value,
      impulsive: abilities.ag.value,
    };
  }

  _prepareCombatRollsData(systemData, abilities) {
    /* Declare combat rolls */

    systemData.physicalWoundMod = "fo";

    systemData.energyWoundMod = "fo";

    systemData.magicWoundMod = "ma";

    const physicalWound = abilities[systemData.physicalWoundMod].mod;
    const energyWound = abilities[systemData.energyWoundMod].mod;
    const magicWound = abilities[systemData.magicWoundMod].mod;
    const maxWound = Math.max(physicalWound, energyWound, magicWound);

    systemData.combatRolls = {
      wound: {
        physicalWound: physicalWound,

        energyWound: energyWound,

        magicWound: magicWound,

        maxWound: maxWound,
      },
      strike: systemData.haste + systemData.awareness,
      dodge: systemData.defenseValue,
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
