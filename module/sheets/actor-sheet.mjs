import { prepareActiveEffectCategories } from "../helpers/effects.mjs";
import {
  createExtraDiceByCategory,
  doCombatRoll,
  prepareCombatRollPrompt,
  prepareRollData,
  valueParser,
} from "../helpers/utils.mjs";

const { api, sheets, fields, ux, apps } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class DragonBallUniverseActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dragon-ball-universe", "actor"],
    position: {
      width: 700,
      height: 700,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      strikeOrDodge: this._onStrikeOrDodge,
      wound: this._onWound,
      changeCustomKnowledge: this._onChangeCustomKnowledge,
      eraseCustomKnowledge: this._onEraseCustomKnowledge,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: ".draggable", dropSelector: null }],
    form: {
      submitOnChange: true,
    },
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dragon-ball-universe/templates/actor/header.hbs",
    },
    tabs: {
      // Foundry-provided generic template
      template: "templates/generic/tab-navigation.hbs",
    },
    attributes: {
      template: "systems/dragon-ball-universe/templates/actor/attributes.hbs",
      scrollable: [""],
    },
    skills: {
      template: "systems/dragon-ball-universe/templates/actor/skills.hbs",
      scrollable: [""],
    },
    transformations: {
      template:
        "systems/dragon-ball-universe/templates/actor/transformations.hbs",
      scrollable: [""],
    },
    information: {
      template: "systems/dragon-ball-universe/templates/actor/information.hbs",
      scrollable: [""],
    },
    gear: {
      template: "systems/dragon-ball-universe/templates/actor/gear.hbs",
      scrollable: [""],
    },
    combat: {
      template: "systems/dragon-ball-universe/templates/actor/combat.hbs",
      scrollable: [""],
    },
    effects: {
      template: "systems/dragon-ball-universe/templates/actor/effects.hbs",
      scrollable: [""],
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ["header", "tabs", "information"];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case "character":
        options.parts.push(
          "attributes",
          "skills",
          "combat",
          "transformations",
          "gear",
          "effects"
        );
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Output initialization
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      document: this.document,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Adding a pointer to CONFIG.DRAGON_BALL_UNIVERSE
      config: CONFIG.DRAGON_BALL_UNIVERSE,
      tabs: this._getTabs(options.parts),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
    };

    // Offloading context prep to a helper function
    this._prepareItems(context);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "attributes":
        context.tab = context.tabs[partId];
        break;
      case "skills":
        context.tab = context.tabs[partId];
        break;
      case "combat":
        context.tab = context.tabs[partId];
        break;
      case "transformations":
        context.tab = context.tabs[partId];
        context.enrichedTransformationInformation =
          await ux.TextEditor.enrichHTML(
            this.actor.system.transformationTabDescription,
            {
              // Whether to show secret blocks in the finished html
              secrets: this.document.isOwner,
              // Data to fill in for inline rolls
              rollData: this.actor.getRollData(),
              // Relative UUID resolution
              relativeTo: this.actor,
            }
          );
        break;
      case "gear":
        context.tab = context.tabs[partId];
        break;
      case "information":
        context.tab = context.tabs[partId];
        // Enrich information info for display
        // Enrichment turns text like `[[/r 1d10]]` into buttons
        context.enrichedInformation = await ux.TextEditor.enrichHTML(
          this.actor.system.information,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          }
        );
        break;
      case "effects":
        context.tab = context.tabs[partId];
        // Prepare active effects
        context.effects = prepareActiveEffectCategories(
          // A generator that returns all effects stored on the actor
          // as well as any items
          this.actor.allApplicableEffects()
        );
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = "primary";
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = "information";
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: "",
        group: tabGroup,
        // Matches tab property to
        id: "",
        // FontAwesome Icon, if you so choose
        icon: "",
        // Run through localization
        label: "DRAGON_BALL_UNIVERSE.Actor.Tabs.",
      };
      switch (partId) {
        case "header":
        case "tabs":
          return tabs;
        case "information":
          tab.id = "information";
          tab.label += "Information";
          break;
        case "attributes":
          tab.id = "attributes";
          tab.label += "Attributes";
          break;
        case "skills":
          tab.id = "skills";
          tab.label += "Skills";
          break;
        case "gear":
          tab.id = "gear";
          tab.label += "Gear";
          break;
        case "combat":
          tab.id = "combat";
          tab.label += "Combat";
          break;
        case "transformations":
          tab.id = "transformations";
          tab.label += "Transformations";
          break;
        case "effects":
          tab.id = "effects";
          tab.label += "Effects";
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    // You can just use `this.document.itemTypes` instead
    // if you don't need to subdivide a given type like
    // this sheet does with spells
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      // Append to gear.
      if (i.type === "gear") {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === "feature") {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === "spell") {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    for (const s of Object.values(spells)) {
      s.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    // Sort then assign
    context.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.features = features.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.spells = spells;
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    new ux.DragDrop.implementation({
      dragSelector: ".draggable",
      dropSelector: null,
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element);

    this.#disableOverrides();
    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.

    const currentHealthInput = this.element.querySelector(
      'input[name="system.health.value"]'
    );
    const currentKiInput = this.element.querySelector(
      'input[name="system.ki.value"]'
    );
    const currentCapacityInput = this.element.querySelector(
      'input[name="system.capacityRate.value"]'
    );

    const inputs = [currentHealthInput, currentKiInput, currentCapacityInput];

    for (let input of inputs) {
      input.addEventListener("change", (e) => {
        e.target.value = eval(e.target.value);
      });
    }
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this DragonBallUniverseActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new apps.FilePicker({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this DragonBallUniverseActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this DragonBallUniverseActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this DragonBallUniverseActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(event, target) {
    // Retrieve the configured document class for Item or ActiveEffect
    const docCls = getDocumentClass(target.dataset.documentClass);
    // Prepare the document creation data by initializing it a default name.
    const docData = {
      name: docCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (["action", "documentClass"].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      foundry.utils.setProperty(docData, dataKey, value);
    }

    // Finally, create the embedded document!
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this DragonBallUniverseActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /**
   * Handle clickable rolls.
   *
   * @this DragonBallUniverseActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    // Handle item rolls.
    switch (dataset.rollType) {
      case "item":
        const item = this._getEmbeddedDocument(target);
        if (item) return item.roll();
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label
        ? ` ${dataset.label} Roll from ${this.actor.name}!`
        : "";
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get("core", "rollMode"),
      });
      return roll;
    }
  }

  /**
   * This serves as the main method for rolling Strike and Dodge.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async _onStrikeOrDodge(event, target) {
    event.preventDefault();

    const dataset = target.dataset;

    const combatRoll = dataset.combatroll;

    const isShift = event.shiftKey;
    const actorSystem = this.actor.system;

    var {
      topExtraDiceCategory,
      topExtraDiceAmount,
      greaterDiceCategory,
      greaterDiceAmount,
      criticalDiceCategory,
      criticalDiceAmount,
      extraDice,
    } = prepareRollData(actorSystem, combatRoll);

    var critTarget = actorSystem.combatRolls[combatRoll].critTarget;

    var naturalResultMod = actorSystem.combatRolls[combatRoll].naturalResultMod;

    var combatRollBonus = actorSystem.combatRolls[combatRoll].value;

    // Prompt for Roll Bonuses

    if (isShift) {
      var combatRollLabel = combatRoll == "strike" ? "Strike" : "Dodge";
      var content = await prepareCombatRollPrompt(combatRollLabel);

      let data;

      data = await api.DialogV2.input({
        window: { title: `${combatRollLabel} Roll Customisation!` },
        content: content,
        position: {
          width: 800,
        },
        ok: {
          label: "Roll",
          icon: "fa-solid fa-dice-d6",
        },
        submit: (result) => {
          try {
            var bonus = valueParser(result.bonus, actorSystem);

            extraDice[1] += result.extraD4;
            extraDice[2] += result.extraD6;
            extraDice[3] += result.extraD8;
            extraDice[4] += result.extraD10;

            combatRollBonus += bonus;

            naturalResultMod += result.natMod;

            critTarget += result.criticalTarget;

            topExtraDiceCategory += result.topDiceCat;
            topExtraDiceAmount += result.topDiceAgain;
            greaterDiceCategory += result.greaterDiceCat;
            greaterDiceAmount += result.greaterDiceAgain;
            criticalDiceCategory += result.criticalDiceCat;
          } catch (error) {
            console.error(error);
            return;
          }
        },
      });
    }

    // Roll Creation

    var roll = "1d10";

    var topExtraDice = createExtraDiceByCategory(
      topExtraDiceCategory,
      1,
      topExtraDiceAmount
    );

    if (topExtraDice != "") roll += `+${topExtraDice}`;

    var greaterDice = createExtraDiceByCategory(
      greaterDiceCategory,
      1,
      greaterDiceAmount
    );

    if (greaterDice != "") roll += `+${greaterDice}`;

    Object.keys(extraDice).forEach(function (key) {
      if (extraDice[key] != 0) {
        var extraDiceToAdd = createExtraDiceByCategory(key, 1, extraDice[key]);

        roll += `+${extraDiceToAdd}`;
      }
    });

    roll += `+${combatRollBonus}`;

    var critInfo = {
      critTarget: Math.min(critTarget, 10),
      criticalDice: createExtraDiceByCategory(
        criticalDiceCategory,
        1,
        criticalDiceAmount
      ),
      naturalResultMod,
    };

    doCombatRoll(this.actor, roll, dataset.label, critInfo);
  }

  /**
   * This serves as the amin method for rolling all Wound Types.
   * @param {PointerEvent} event The originating click event
   * @param {HTMLElement} target The capturing HTML element which defined a [data-action]
   */
  static async _onWound(event, target) {
    event.preventDefault();

    const dataset = target.dataset;

    const woundType = dataset.woundtype;

    const isShift = event.shiftKey;
    const actorSystem = this.actor.system;

    var {
      topExtraDiceCategory,
      topExtraDiceAmount,
      greaterDiceCategory,
      greaterDiceAmount,
      criticalDiceCategory,
      criticalDiceAmount,
      extraDice,
    } = prepareRollData(actorSystem, "wound");

    var critTarget = actorSystem.combatRolls.wound[woundType].critTarget;

    var naturalResultMod =
      actorSystem.combatRolls.wound[woundType].naturalResultMod;

    var woundBonus = actorSystem.combatRolls.wound[woundType].value;

    var superStackDiceCategory = actorSystem.superStack.diceCat;

    var superStackDiceAmount = 1;

    // Prompt for Roll Bonuses

    if (isShift) {
      var content = await prepareCombatRollPrompt("Wound", woundType);

      let data = await api.DialogV2.input({
        window: { title: `Wound Roll Customisation!` },
        content: content,
        position: {
          width: 800,
        },
        ok: {
          label: "Roll",
          icon: "fa-solid fa-dice-d6",
        },
        submit: (result) => {
          try {
            var bonus = valueParser(result.bonus, actorSystem);

            extraDice[1] += result.extraD4;
            extraDice[2] += result.extraD6;
            extraDice[3] += result.extraD8;
            extraDice[4] += result.extraD10;

            woundBonus += bonus;

            naturalResultMod += result.natMod;

            critTarget += result.criticalTarget;

            topExtraDiceCategory += result.topDiceCat;
            topExtraDiceAmount += result.topDiceAgain;
            greaterDiceCategory += result.greaterDiceCat;
            greaterDiceAmount += result.greaterDiceAgain;
            criticalDiceCategory += result.criticalDiceCat;

            if (!woundType.includes("magic")) {
              // TODO Change this due to Super Stack Changes
              superStackDiceCategory += result.superStackCat;
              superStackDiceAmount += result.superStackAgain;
            }
          } catch (error) {
            console.error(error);
            return;
          }
        },
      });
    }

    // Roll Creation

    var roll = "1d10";

    var topExtraDice = createExtraDiceByCategory(
      topExtraDiceCategory,
      1,
      topExtraDiceAmount
    );

    if (topExtraDice != "") roll += `+${topExtraDice}`;

    var greaterDice = createExtraDiceByCategory(
      greaterDiceCategory,
      1,
      greaterDiceAmount
    );

    if (greaterDice != "") roll += `+${greaterDice}`;

    if (!woundType.includes("magic")) {
      var superStackDice = createExtraDiceByCategory(
        superStackDiceCategory,
        actorSystem.currentTierOfPower,
        superStackDiceAmount
      );

      if (superStackDice != "") roll += `+${superStackDice}`;
    }

    Object.keys(extraDice).forEach(function (key) {
      if (extraDice[key] != 0) {
        var extraDiceToAdd = createExtraDiceByCategory(key, 1, extraDice[key]);

        roll += `+${extraDiceToAdd}`;
      }
    });

    roll += `+${woundBonus}`;

    var critInfo = {
      critTarget: 10,
      criticalDice: createExtraDiceByCategory(
        criticalDiceCategory,
        1,
        criticalDiceAmount
      ),
      naturalResultMod,
    };

    doCombatRoll(this.actor, roll, dataset.label, critInfo);
  }

  static async _onChangeCustomKnowledge() {
    var customKnowledgeInput = fields.createTextInput({
      name: "customKnowledgeName",
      value: "Custom Name",
    });

    var customKnowledgeGroup = fields.createFormGroup({
      input: customKnowledgeInput,
      label: "Custom Knowledge Name?",
    });

    var content = `<div>${customKnowledgeGroup.outerHTML}</span>`;

    await api.DialogV2.input({
      window: { title: `Adding Custom Knowledge Skill!` },
      content: content,
      position: {
        width: 400,
      },
      ok: {
        label: "Save",
        icon: "fa-solid fa-floppy-disk",
      },
      submit: (result) => {
        try {
          this.document.update({
            "system.knowledgeCustom.name": result.customKnowledgeName,
          });
        } catch (error) {
          console.error(error);
          return;
        }
      },
    });
  }

  static async _onEraseCustomKnowledge() {
    this.document.update({
      "system.knowledgeCustom.name": "",
      "system.skills.knowledgeCustom.rank": 0,
    });
  }

  /** Helper Functions */

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
    const docRow = target.closest("li[data-document-class]");
    if (docRow.dataset.documentClass === "Item") {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === "ActiveEffect") {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn("Could not find document class");
  }

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ("link" in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = ux.TextEditor.getDragEventData(event);
    const item = this.item;
    const allowed = Hooks.call("dropItemSheetData", item, this, data);
    if (allowed === false) return;

    // Although you will find implmentations to all doc types here, it is important to keep
    // in mind that only Active Effects are "valid" for items.
    // Actors have items, but items do not have actors.
    // Items in items is not implemented on Foudry per default. If you need an implementation with that,
    // try to search how other systems do. Basically they will use the drag and drop, but they will store
    // the UUID of the item.
    // Folders can only contain Actors or Items. So, fall on the cases above.
    // We left them here so you can have an idea of how that would work, if you want to do some kind of
    // implementation for that.
    switch (data.type) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return this._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "Folder":
        return this._onDropFolder(event, data);
    }
  }

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass("ActiveEffect");
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor)
      return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest("[data-effect-id]");
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      )
        siblings.push(this._getEmbeddedDocument(el));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments("ActiveEffect", updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments("ActiveEffect", directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.isEditable) return false;

    const item = await fromUuid(data.uuid);

    const itemType = item.type;

    switch (itemType) {
      case "race":
        return this._onDropRace(item);
    }

    return;
  }

  /* -------------------------------------------- */

  /**
   * This enables me to automatically add the racial modifiers on a character sheet.
   * @param {Item} race The dropped race's data
   */
  async _onDropRace(race) {
    const raceData = race.system;

    const actorData = this.actor.system;

    // First step, the things that don't have a choice, so racial life modifier and saving throw proficiency change.
    this.document.update({
      "system.savingThrowProficiency": raceData.savingThrowProficiency,
      "system.racialLifeModifier": raceData.racialLifeModifier,
      "system.raceName": race.name,
    });

    // Second step, the attributes.
    var attributeIncreases = {
      firstAttribute: {
        value: raceData.attributeIncreases.firstAttribute,
        bonus: 2,
      },
      secondAttribute: {
        value: raceData.attributeIncreases.secondAttribute,
        bonus: 2,
      },
      thirdAttribute: {
        value: raceData.attributeIncreases.thirdAttribute,
        bonus: 1,
      },
    };

    var content = `<h2 style='text-align:center;'>Attribute Score Increases</h2>`;

    var attributeChoices = {};

    Object.keys(attributeIncreases).forEach(async (attributeIncrease) => {
      var attributeChosen = attributeIncreases[attributeIncrease].value;

      var attributeBonus = attributeIncreases[attributeIncrease].bonus;

      var attributeBonusLabel =
        attributeBonus == 2
          ? game.i18n.localize(
              "DRAGON_BALL_UNIVERSE.Item.Race.FIELDS.attributeIncreases.primaryAttribute.label"
            )
          : game.i18n.localize(
              "DRAGON_BALL_UNIVERSE.Item.Race.FIELDS.attributeIncreases.secondaryAttribute.label"
            );

      var attributeOptions = [];

      if (attributeChosen == "all") attributeChosen = "ag;fo;te;sc;in;ma;pe";

      if (attributeChosen.includes(";")) {
        var attributesChosen = attributeChosen.split(";");

        attributeOptions = [];

        for (let attribute of attributesChosen) {
          var attributeLabel = game.i18n.localize(
            CONFIG.DRAGON_BALL_UNIVERSE.abilities[attribute]
          );

          attributeOptions.push({
            label: attributeLabel,
            value: attribute,
          });
        }

        var selectInput = fields.createSelectInput({
          options: attributeOptions,
          name: attributeIncrease,
        });

        var selectGroup = fields.createFormGroup({
          input: selectInput,
          label: attributeBonusLabel,
        });

        content += `<div>${selectGroup.outerHTML}</div>`;
      } else {
        const textInput = fields.createTextInput({
          name: attributeIncrease,
          value: game.i18n.localize(
            CONFIG.DRAGON_BALL_UNIVERSE.abilities[attributeChosen]
          ),
          readonly: true,
        });

        const textGroup = fields.createFormGroup({
          input: textInput,
          label: attributeBonusLabel,
        });

        content += `<div>${textGroup.outerHTML}</div>`;

        attributeChoices[attributeIncrease] = attributeChosen;
      }
    });

    var attributeScoreIncreaseIncorrect = true;

    while (attributeScoreIncreaseIncorrect) {
      var data = await api.DialogV2.input({
        window: { title: `Attribute Score Increases!` },
        content: content,
        ok: {
          label: "Confirm?",
        },
      });

      if (data != null) {
        if (data.firstAttribute.length == 2)
          attributeChoices.firstAttribute = data.firstAttribute;

        if (data.secondAttribute.length == 2)
          attributeChoices.secondAttribute = data.secondAttribute;

        if (data.thirdAttribute.length == 2)
          attributeChoices.thirdAttribute = data.thirdAttribute;

        var attributeVerification = [
          attributeChoices.firstAttribute,
          attributeChoices.secondAttribute,
          attributeChoices.thirdAttribute,
        ];

        var attributeVerification = [...new Set(attributeVerification)];

        var hasDuplicates = attributeVerification.length != 3;

        var forceMagicVerification =
          attributeVerification.includes("fo") &&
          attributeVerification.includes("ma");

        var attributeScoreIncreaseIncorrect =
          forceMagicVerification || hasDuplicates ? true : false;

        if (!hasDuplicates && !forceMagicVerification) {
          var firstAttributePath = `system.abilities.${attributeChoices.firstAttribute}.value`;

          var secondAttributePath = `system.abilities.${attributeChoices.secondAttribute}.value`;

          var thirdAttributePath = `system.abilities.${attributeChoices.thirdAttribute}.value`;

          this.document.update({
            [firstAttributePath]:
              actorData.abilities[attributeChoices.firstAttribute].value + 2,
            [secondAttributePath]:
              actorData.abilities[attributeChoices.secondAttribute].value + 2,
            [thirdAttributePath]:
              actorData.abilities[attributeChoices.thirdAttribute].value + 1,
          });
        } else {
          if (hasDuplicates) {
            ui.notifications.error(
              `You cannot select the same Attribute Score more than once.`,
              {
                console: false,
              }
            );
          }

          if (forceMagicVerification) {
            ui.notifications.error(
              `You cannot select Force and Magic at the same time.`,
              {
                console: false,
              }
            );
          }
        }
      } else {
        var attributeScoreIncreaseIncorrect = false;
        ui.notifications.info(
          `You have not selected any Attribute Score to increase automatically.`,
          {
            console: false,
          }
        );
      }
    }

    ui.notifications.success(`${this.actor.name} is now a ${race.name}.`, {
      console: false,
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== "Item") return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.actor.createEmbeddedDocuments("Item", itemData);
  }

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (let k of Object.keys(overrides)) delete submitData[k];
    await this.document.update(submitData);
  }

  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) {
        input.disabled = true;
      }
    }
  }
}
