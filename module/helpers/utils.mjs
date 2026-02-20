const { fields } = foundry.applications;

/**
 *
 * @param {number} diceCategory The dice category
 * @param {number} tierOfPower The tier of power used to multiply the number of dice, 1 by default.
 * @param {number} diceNumber The base number of dice to create, 1 by default.
 * @returns {string} A string representing the extra dice to add to a roll, formatted for FoundryVTT dice rolls (e.g. "2d10+1d6").
 */
export function createExtraDiceByCategory(
  diceCategory,
  tierOfPower = 1,
  diceNumber = 1
) {
  if (diceCategory === 0 || diceNumber === 0) return "";

  const diceCategoryList = {
    0: "",
    1: "d4",
    2: "d6",
    3: "d8",
  };

  const diceCategoryNumber = diceCategory % 4;

  const extraDiceCategory = diceCategoryList[diceCategoryNumber];

  const numberOfTens = Math.floor(diceCategory / 4);

  if (numberOfTens !== 0)
    var extraDiceD10 = `${numberOfTens * diceNumber * tierOfPower}d10`;

  if (extraDiceCategory !== "")
    var extraDiceOthers = `${diceNumber * tierOfPower}${extraDiceCategory}`;

  const extraDice = [extraDiceD10, extraDiceOthers].filter(Boolean).join("+");

  return extraDice;
}

/**
 * This will handle a combat roll, crit and botches included.
 * @param {*} actor The actor
 * @param {String} roll The roll used for FoundryVTT
 * @param {String} label Label of the roll, which will become `${label} Roll (${critTarget}+) from ${actor.name}!`
 * @param {Object} critInfo The Critical Target and Dice, which will be used for handling the critical dice
 */
export async function doCombatRoll(actor, roll, label, critInfo) {

  const { criticalDice, critTarget, naturalResultMod } = critInfo;

  var diceRoll = new Roll(roll, actor.getRollData());

  await diceRoll.evaluate();

  var baseDieResult = diceRoll.terms[0].results[0].result;

  var baseDieResultWithNatMod = Math.max(
    Math.min(baseDieResult + naturalResultMod, 10),
    1
  );

  var totalNatIncrease = baseDieResultWithNatMod - baseDieResult;

  var diceTotal = diceRoll.total + totalNatIncrease;

  var isCrit = baseDieResultWithNatMod >= critTarget;

  var isBotch = baseDieResultWithNatMod == 1;

  var rollLabel = `${label} Roll (${critTarget}+) from ${actor.name}!`;

  await diceRoll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: rollLabel,
    rollMode: game.settings.get("core", "rollMode"),
  });

  const totalRollAutomated = game.settings.get(
    "dragon-ball-universe",
    "automateNatMod"
  );

  if (totalNatIncrease != 0 && totalRollAutomated) {
    var natIncreaseLabel = `Natural Result Updated Roll!`;

    var natRoll = new Roll(`${diceTotal}`, actor.getRollData());

    await natRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: natIncreaseLabel,
      rollMode: game.settings.get("core", "rollMode"),
    });
  }

  const critAutomated = game.settings.get(
    "dragon-ball-universe",
    "automateCrit"
  );

  const botchAutomated = game.settings.get(
    "dragon-ball-universe",
    "automateBotch"
  );

  if (isCrit && critAutomated) {
    var critLabel = `The roll was a crit! Adding Critical Dice`;

    var criticalDiceRoll = new Roll(
      `${diceTotal}+${criticalDice}`,
      actor.getRollData()
    );

    await criticalDiceRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: critLabel,
      rollMode: game.settings.get("core", "rollMode"),
    });
  }

  if (isBotch && botchAutomated) {
    var botchLabel = `The roll was a botch... Reducing total roll`;

    var botchDiceRoll = new Roll(
      `${diceTotal}-${actor.system.baseTierOfPower * 2}`,
      actor.getRollData()
    );

    await botchDiceRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: botchLabel,
      rollMode: game.settings.get("core", "rollMode"),
    });
  }
}

/**
 * This method prepares all important data for a Combat Roll, to avoid repetition in other methods.
 * @param {*} actorSystem
 * @param {String} combatRoll A string representing the Combat Roll, so either 'strike', 'dodge', or 'wound'
 * @returns A JSON Object containing the important values
 */
export function prepareRollData(actorSystem, combatRoll) {
  var topExtraDiceCategory =
    actorSystem.combatRollsExtraDiceCategory.tierOfPower[combatRoll];
  var greaterDiceCategory =
    actorSystem.combatRollsExtraDiceCategory.greaterDice[combatRoll];
  var criticalDiceCategory =
    actorSystem.combatRollsExtraDiceCategory.criticalDice[combatRoll];

  var topExtraDiceAmount = actorSystem.tierOfPowerExtraDiceAmount;
  var greaterDiceAmount = actorSystem.greaterDiceAmount;
  var criticalDiceAmount = actorSystem.criticalDiceAmount;
  var extraDice = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };
  return {
    topExtraDiceCategory,
    topExtraDiceAmount,
    greaterDiceCategory,
    greaterDiceAmount,
    criticalDiceCategory,
    criticalDiceAmount,
    extraDice,
  };
}

/**
 * This prepares the prompt that will be shown upon trying to do a Combat Roll without the shift key,
 * while still having the choice to add on top of that content before creating a DialogV2 Instance.
 * @param {String} combatRoll
 * @returns An html string called content, which serves as the base of the Dialog
 */
export async function prepareCombatRollPrompt(combatRoll, woundType = "") {
  var content = `<h2 style='text-align:center;'>${combatRoll} Roll Customisation</h2>`;

  var bonusInput = fields.createTextInput({
    name: "bonus",
    value: 0,
  });

  var bonusGroup = fields.createFormGroup({
    input: bonusInput,
    label: "Any modifiers?",
  });

  content += `<section class='grid grid-2col'> <div><span data-tooltip='You can use (T) and (bT) modifiers, like this: "2+2(T)-1(bT)"'>${bonusGroup.outerHTML}</span>`;

  var topDiceAgainInput = fields.createNumberInput({
    name: "topDiceAgain",
    value: 0,
  });

  var topDiceAgainGroup = fields.createFormGroup({
    input: topDiceAgainInput,
    label: "Add. ToP Dice",
  });

  var greaterDiceAgainInput = fields.createNumberInput({
    name: "greaterDiceAgain",
    value: 0,
  });

  var greaterDiceAgainGroup = fields.createFormGroup({
    input: greaterDiceAgainInput,
    label: "Add. Greater Dice",
  });

  var superStackAgainInput = fields.createNumberInput({
    name: "superStackAgain",
    value: 0,
  });

  var superStackAgainGroup = fields.createFormGroup({
    input: superStackAgainInput,
    label: "Add. Super Stack",
  });

  var natModInput = fields.createNumberInput({
    name: "natMod",
    value: 0,
  });

  var natModGroup = fields.createFormGroup({
    input: natModInput,
    label: "Base Die -/+?",
  });

  content += ` <br><span data-tooltip='This applies ToP Dice X more times'>${topDiceAgainGroup.outerHTML}</span><br> <span data-tooltip='This applies Greater Dice X more times'>${greaterDiceAgainGroup.outerHTML}</span> <br> <span data-tooltip='This will declare a Natural Increase or Decrease on the Base Die.'>${natModGroup.outerHTML}</span>`;

  if (combatRoll == "Wound" && !woundType.includes("magic"))
    content += `<br> <span data-tooltip='This applies Super Stack Dice X more times'>${superStackAgainGroup.outerHTML}</span>`;

  content += `</div>`;

  var extraD4Input = fields.createNumberInput({
    name: "extraD4",
    value: 0,
  });

  var extraD4Group = fields.createFormGroup({
    input: extraD4Input,
    label: "N° of Extra D4?",
  });

  var extraD6Input = fields.createNumberInput({
    name: "extraD6",
    value: 0,
  });

  var extraD6Group = fields.createFormGroup({
    input: extraD6Input,
    label: "N° of Extra D6?",
  });

  var extraD8Input = fields.createNumberInput({
    name: "extraD8",
    value: 0,
  });

  var extraD8Group = fields.createFormGroup({
    input: extraD8Input,
    label: "N° of Extra D8?",
  });

  var extraD10Input = fields.createNumberInput({
    name: "extraD10",
    value: 0,
  });

  var extraD10Group = fields.createFormGroup({
    input: extraD10Input,
    label: "N° of Extra D10?",
  });

  var superStackCatInput = fields.createNumberInput({
    name: "superStackCat",
    value: 0,
  });

  var superStackCatGroup = fields.createFormGroup({
    input: superStackCatInput,
    label: "Super Stack Cat.",
  });

  content += ` <div>${extraD4Group.outerHTML} <br>${extraD6Group.outerHTML}<br> ${extraD8Group.outerHTML}<br> ${extraD10Group.outerHTML}`;

  if (combatRoll == "Wound" && !woundType.includes("magic"))
    content += `<br> ${superStackCatGroup.outerHTML}`;

  content += `</div></section>`;

  var topDiceCatInput = fields.createNumberInput({
    name: "topDiceCat",
    value: 0,
  });

  var topDiceCatGroup = fields.createFormGroup({
    input: topDiceCatInput,
    label: "Top Dice Cat. Increase",
  });

  var greaterDiceCatInput = fields.createNumberInput({
    name: "greaterDiceCat",
    value: 0,
  });

  var greaterDiceCatGroup = fields.createFormGroup({
    input: greaterDiceCatInput,
    label: "Top Dice Cat. Increase",
  });

  var criticalDiceCatInput = fields.createNumberInput({
    name: "criticalDiceCat",
    value: 0,
  });

  var criticalDiceCatGroup = fields.createFormGroup({
    input: criticalDiceCatInput,
    label: "Critical Dice Cat. Increase",
  });

  var criticalTargetInput = fields.createNumberInput({
    name: "criticalTarget",
    value: 0,
  });

  var criticalTargetGroup = fields.createFormGroup({
    input: criticalTargetInput,
    label: "Critical Target Modifier",
  });

  content += ` <div>${topDiceCatGroup.outerHTML}<br>${greaterDiceCatGroup.outerHTML}<br>${criticalDiceCatGroup.outerHTML}<br>${criticalTargetGroup.outerHTML}</div>`;

  return content;
}

/**
 * This functions has the purpose of checking if a value is correctly formulated, and then parsing it to "translate" (T) and (bT) multiplications.
 * @param {String} value The value going to be verified and parsed.
 * @param {*} systemData The actor's data
 * @returns The parsed value as a Number.
 */
export function valueParser(value, systemData) {
  if (value == "" || value == "0") return 0;

  var total = 0;

  value = value.replace(/\s+/g, "");

  value = value
    .replaceAll("+-", "+")
    .replaceAll("-+", "-")
    .replaceAll("++", "+")
    .replaceAll("--", "-")
    .replaceAll("((", "(")
    .replaceAll("))", ")");

  // console.log(`Idiot proofed Value : ${value}`);

  var correctString = /^([0-9]+|\(T\)|\(bT\)|[+-])+$/.test(value);

  // console.log(`Is the string in a correct format ? : ${correctString}`);

  if (correctString) {
    value = value.replaceAll("(T)", "*systemData.currentTierOfPower");

    value = value.replaceAll("(bT)", "*systemData.baseTierOfPower");

    // console.log(`Parsed Value : ${value}`);

    total += eval(value);
  } else
    console.error(`The value is not correctly written.\n Value : ${value}`);

  // console.log(`Total : ${total}`);

  return total;
}
