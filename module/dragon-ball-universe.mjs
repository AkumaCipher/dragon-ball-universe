// Import document classes.
import { DragonBallUniverseActor } from "./documents/actor.mjs";
import { DragonBallUniverseItem } from "./documents/item.mjs";
// Import sheet classes.
import { DragonBallUniverseActorSheet } from "./sheets/actor-sheet.mjs";
import { DragonBallUniverseItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { DRAGON_BALL_UNIVERSE } from "./helpers/config.mjs";
// Import DataModel classes
import * as models from "./data/_module.mjs";

const collections = foundry.documents.collections;
const sheets = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.dragonballuniverse = {
  documents: {
    DragonBallUniverseActor,
    DragonBallUniverseItem,
  },
  applications: {
    DragonBallUniverseActorSheet,
    DragonBallUniverseItemSheet,
  },
  utils: {
    rollItemMacro,
  },
  models,
};

Hooks.once("init", function () {
  // Add custom constants for configuration.
  CONFIG.DRAGON_BALL_UNIVERSE = DRAGON_BALL_UNIVERSE;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d10 + @initiative",
    decimals: 2,
  };

  game.settings.register("dragon-ball-universe", "automateCrit", {
    name: "Automate Critical Rolls?",
    config: true,
    scope: "user",
    type: new foundry.data.fields.BooleanField(),
    default: true,
  });

  game.settings.register("dragon-ball-universe", "automateNatMod", {
    name: "Automate Nat Total Rolls?",
    hint: "If a natural increase/decrease to your Base Die would modify the total result, show said total result. ",
    config: true,
    scope: "user",
    type: new foundry.data.fields.BooleanField(),
    default: true,
  });

  game.settings.register("dragon-ball-universe", "automateBotch", {
    name: "Automate Botched Rolls?",
    config: true,
    scope: "user",
    type: new foundry.data.fields.BooleanField(),
    default: false,
  });

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = DragonBallUniverseActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.DragonBallUniverseCharacter,
  };
  CONFIG.Item.documentClass = DragonBallUniverseItem;
  CONFIG.Item.dataModels = {
    race: models.DragonBallUniverseRace,
    gear: models.DragonBallUniverseGear,
    feature: models.DragonBallUniverseFeature,
    spell: models.DragonBallUniverseSpell,
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  collections.Actors.unregisterSheet("core", sheets.ActorSheet);
  collections.Actors.registerSheet(
    "dragon-ball-universe",
    DragonBallUniverseActorSheet,
    {
      makeDefault: true,
      label: "DRAGON_BALL_UNIVERSE.SheetLabels.Actor",
    }
  );
  collections.Items.unregisterSheet("core", sheets.ItemSheet);
  collections.Items.registerSheet(
    "dragon-ball-universe",
    DragonBallUniverseItemSheet,
    {
      makeDefault: true,
      label: "DRAGON_BALL_UNIVERSE.SheetLabels.Item",
    }
  );
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("toLowerCase", function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("getSettingValue", function (str) {
  return game.settings.get("dragon-ball-universe", str);
});

Handlebars.registerHelper("array", function (...args) {
  return args.slice(0, -1); // drop the options hash
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createDocMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.dragonballuniverse.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "dragon-ball-universe.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
