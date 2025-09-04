import { createExtraDiceByCategory } from "../helpers/utils.mjs";

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

    schema.thresholdChecks = new fields.SchemaField({
      bruised: new fields.BooleanField(),
      injured: new fields.BooleanField(),
      critical: new fields.BooleanField()
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

    this._prepareCommonExtraDice(systemData); // Preparing ToP Extra Dice, Greater Dice, and Critical Dice

    this._prepareResourcesData(systemData, abilities, level); // Preparing Health, Ki, Capacity Rate

    this._prepareAptitudesData(systemData, abilities); // Preparing Aptitudes and related rules

    this._prepareHealthThresholdData(systemData); // Preparing Health Threshold Data and Penalties

    this._prepareCombatRollsData(systemData, abilities); // Preparing Combat Rolls

    this._prepareMiscData(systemData, level); // Preparing Surges, Stress Bonus, and other miscellaneous rules
  }

  _prepareCommonExtraDice(systemData) {

    /* Declare the extra dice category for ToP extra Dice, Greater Dice, and Critical Dice for combat rolls */

    const tierOfPowerExtraDiceCategory = systemData.currentTierOfPower - 1;

    const greaterDiceCategory = systemData.currentTierOfPower; // The Greater Dice Category.

    const criticalDiceCategory = systemData.currentTierOfPower + 1; // The Critical Dice Category.

    systemData.combatRollsExtraDiceCategory = {
      tierOfPower: {
        all: tierOfPowerExtraDiceCategory,
        strike: tierOfPowerExtraDiceCategory,
        dodge: tierOfPowerExtraDiceCategory,
        wound: tierOfPowerExtraDiceCategory
      },
      greaterDice: {
        all: greaterDiceCategory,
        strike: greaterDiceCategory,
        dodge: greaterDiceCategory,
        wound: greaterDiceCategory
      },
      criticalDice: {
        all: criticalDiceCategory,
        strike: criticalDiceCategory,
        dodge: criticalDiceCategory,
        wound: criticalDiceCategory
      }
    };

    systemData.tierOfPowerExtraDiceAmount = 1; // The amount of times the ToP Extra Dice is applied to the roll.

    systemData.greaterDiceAmount = 1; // The amount of times the Greater Dice is applied to the roll.

    systemData.criticalDiceAmount = 1; // The amount of times the Critical Dice is applied to the roll.

    // Create the extra dice objects for each combat roll.
    systemData.tierOfPowerExtraDice = {
      all: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.tierOfPower.all, 1, systemData.tierOfPowerExtraDiceAmount),
      strike: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.tierOfPower.strike, 1, systemData.tierOfPowerExtraDiceAmount),
      dodge: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.tierOfPower.dodge, 1, systemData.tierOfPowerExtraDiceAmount),
      wound: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.tierOfPower.wound, 1, systemData.tierOfPowerExtraDiceAmount),
    };

    systemData.greaterDice = {
      all: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.greaterDice.all, 1, systemData.greaterDiceAmount),
      strike: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.greaterDice.strike, 1, systemData.greaterDiceAmount),
      dodge: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.greaterDice.strike, 1, systemData.greaterDiceAmount),
      wound: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.greaterDice.strike, 1, systemData.greaterDiceAmount),
    };

    systemData.criticalDice = {
      all: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.criticalDice.all, 1, systemData.criticalDiceAmount),
      strike: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.criticalDice.strike, 1, systemData.criticalDiceAmount),
      dodge: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.criticalDice.strike, 1, systemData.criticalDiceAmount),
      wound: createExtraDiceByCategory(systemData.combatRollsExtraDiceCategory.criticalDice.strike, 1, systemData.criticalDiceAmount),
    };

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

    const superStackAmount = Math.clamp(
      Math.floor((abilities.fo.value - abilities.ag.value) / 5),
      0,
      3
    );

    const superStackDiceCategory = superStackAmount;

    const superStackDice = createExtraDiceByCategory(
      superStackDiceCategory,
      systemData.currentTierOfPower
    );

    const superStackStrikePenalty = superStackAmount;

    const superStackDodgePenalty = superStackAmount;

    const superStackSoakBonus = superStackAmount;

    systemData.superStack = {
      amount: superStackAmount,
      dice: superStackDice,
      strikePenalty: superStackStrikePenalty,
      dodgePenalty: superStackDodgePenalty,
      soakBonus: superStackSoakBonus,
    }

    // Tenacity aptitudes

    systemData.soak = Math.max(abilities.te.mod, 1 * systemData.currentTierOfPower)
      + (systemData.superStack.soakBonus * systemData.currentTierOfPower);

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

  _prepareHealthThresholdData(systemData) {
    // Declare health thresholds variables

    // Calculate the current Health Threshold as a numerical value (0 = Healthy, 1 = Bruised, etc)
    systemData.healthThresholdNum = systemData.health.value < Math.round(systemData.health.max / 2) ?
      (systemData.health.value < Math.round(systemData.health.max / 4) ?
        (systemData.health.value < Math.round(systemData.health.max / 10) ? 3 : 2) : 1) : 0;

    // Declare the current Health Threshold
    switch (systemData.healthThresholdNum) {
      case 3:
        systemData.currentHealthThreshold = 'critical';
        break;
      case 2:
        systemData.currentHealthThreshold = 'injured';
        break;
      case 1:
        systemData.currentHealthThreshold = 'bruised';
        break;
      case 0:
        systemData.currentHealthThreshold = 'healthy';
        break;
    }

    systemData.healthThresholdLabelPath = `DRAGON_BALL_UNIVERSE.Actor.base.FIELDS.healthThreshold.${systemData.currentHealthThreshold}.label`;

    // Declare which health threshold penalty is on depending on whether the actor is below said threshold and passed the steadfast check 
    systemData.bruisedHealthThresholdPenalty = Math.max((systemData.health.value < Math.round(systemData.health.max / 2) ? 1 : 0) - (systemData.thresholdChecks.bruised ? 1 : 0), 0);
    systemData.injuredHealthThresholdPenalty = Math.max((systemData.health.value < Math.round(systemData.health.max / 4) ? 1 : 0) - (systemData.thresholdChecks.injured ? 1 : 0), 0);
    systemData.criticalHealthThresholdPenalty = Math.max((systemData.health.value < Math.round(systemData.health.max / 10) ? 1 : 0) - (systemData.thresholdChecks.critical ? 1 : 0), 0);

    // Final threshold penalty (Without the bT Multiplication)
    systemData.thresholdPenalty = systemData.bruisedHealthThresholdPenalty + systemData.injuredHealthThresholdPenalty + systemData.criticalHealthThresholdPenalty;
  }

  _prepareCombatRollsData(systemData, abilities) {
    /* Declare combat rolls */

    // Declare modifier used for each type of wound (Which can be modified by effects such as the 'Magic Warrior' talent)
    systemData.physicalWoundMod = "fo";

    systemData.energyWoundMod = "fo";

    systemData.magicWoundMod = "ma";

    // Wound, Strike, and Dodge bonuses and penalties
    const woundAllPenalty = (systemData.thresholdPenalty * systemData.baseTierOfPower);

    const physicalWound = abilities[systemData.physicalWoundMod].mod;
    const woundPhysicalBonus = 0;
    const woundPhysicalPenalty = woundAllPenalty;
    const totalPhysicalWound = Math.max((physicalWound + woundPhysicalBonus - woundPhysicalPenalty), 0);

    const energyWound = abilities[systemData.energyWoundMod].mod;
    const woundEnergyBonus = 0;
    const woundEnergyPenalty = woundAllPenalty;
    const totalEnergyWound = Math.max((energyWound + woundEnergyBonus - woundEnergyPenalty), 0);

    const magicWound = abilities[systemData.magicWoundMod].mod;
    const woundMagicBonus = 0;
    const woundMagicPenalty = woundAllPenalty;
    const totalMagicWound = Math.max((magicWound + woundMagicBonus - woundMagicPenalty), 0);

    const maxWound = Math.max(physicalWound, energyWound, magicWound);

    const strike = systemData.haste + systemData.awareness;
    const strikeBonus = 0;
    const strikePenalty = (systemData.superStack.strikePenalty * systemData.currentTierOfPower) + (systemData.thresholdPenalty * systemData.baseTierOfPower);
    const totalStrike = Math.max(strike + strikeBonus - strikePenalty, 0);

    const dodge = systemData.defenseValue;
    const dodgeBonus = 0;
    const dodgePenalty = (systemData.superStack.dodgePenalty * systemData.currentTierOfPower) + (systemData.thresholdPenalty * systemData.baseTierOfPower);
    const totalDodge = Math.max(dodge + dodgeBonus - dodgePenalty, 0);

    // Final combat rolls object with the final values
    systemData.combatRolls = {
      wound: {
        physicalWound: {
          value: totalPhysicalWound,
          critTarget: 10
        },

        energyWound: {
          value: totalEnergyWound,
          critTarget: 10
        },

        magicWound: {
          value: totalMagicWound,
          critTarget: 10
        },

        maxWound: maxWound,
      },
      strike: {
        value: totalStrike,
        critTarget: 10
      },
      dodge: {
        value: totalDodge,
        critTarget: 10
      },
    }

  }

  _prepareMiscData(systemData, level) {
    // Surges

    systemData.tierOfPowerForSurges = systemData.currentTierOfPower; // + any temporary modifiers from effects, most notably the talent 'Never Surrender'.

    const healingSurgeDice = `${createExtraDiceByCategory(8, systemData.tierOfPowerForSurges)}+${systemData.surgency}`; // 2d10(T) + Surgency

    const powerSurgeKiRestored = Math.floor(systemData.ki.max / 4) + systemData.surgency; // A fourth of max Ki, rounded down, plus the character's Surgency.

    const powerSurgeCapacityRestored = Math.floor(systemData.capacityRate.max / 4); // A fourth of max Capacity Rate, rounded down.

    systemData.surge = {
      healingSurgeDice: healingSurgeDice,
      powerSurgeKiRestored: powerSurgeKiRestored,
      powerSurgeCapacityRestored: powerSurgeCapacityRestored,
    };

    // Stress Bonus
    systemData.stressBonus = level + systemData.determination + 1; // Level + Determination Bonus + 1 - Threshold Penalties

    systemData.stressBonus = Math.max(systemData.stressBonus - systemData.thresholdPenalty, 0)

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

    if (this.combatRolls) {
      for (let [k, v] of Object.entries(this.combatRolls)) {
        data[k] = foundry.utils.deepClone(v.value);
      }
    }

    // Copy Tier of Power info to top level for easy access in rolls
    data["T"] = foundry.utils.deepClone(this.currentTierOfPower);

    data["bT"] = foundry.utils.deepClone(this.baseTierOfPower);

    data.lvl = this.attributes.level.value;

    return data;
  }
}
