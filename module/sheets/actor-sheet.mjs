import { rollCheckDialog } from "../dice.mjs";

/**
 * Actor sheet for Arianrhod RPG 2E characters and enemies.
 * @extends {ActorSheet}
 */
export class ArianrhodActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["arianrhod2e", "sheet", "actor"],
      width: 680,
      height: 720,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "abilities",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/arianrhod2e/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);

    context.system = actorData.system;
    context.flags = actorData.flags;
    context.config = CONFIG.ARIANRHOD;

    // Prepare ability data with labels
    if (context.system.abilities) {
      for (const [key, ability] of Object.entries(context.system.abilities)) {
        ability.label = game.i18n.localize(
          CONFIG.ARIANRHOD.abilities[key] ?? key
        );
        ability.abbr = game.i18n.localize(
          CONFIG.ARIANRHOD.abilityAbbreviations[key] ?? key
        );
      }
    }

    // Categorize items for character sheets
    if (this.actor.type === "character") {
      context.weapons = this.actor.items.filter((i) => i.type === "weapon");
      context.armors = this.actor.items.filter((i) => i.type === "armor");
      context.accessories = this.actor.items.filter(
        (i) => i.type === "accessory"
      );
      context.skills = this.actor.items.filter((i) => i.type === "skill");
      context.items = this.actor.items.filter((i) => i.type === "item");

      // Enrich biography HTML
      context.enrichedBiography = await TextEditor.enrichHTML(
        context.system.biography,
        { async: true }
      );
    }

    // Prepare enemy data
    if (this.actor.type === "enemy") {
      context.skills = this.actor.items.filter((i) => i.type === "skill");
      context.items = this.actor.items.filter(
        (i) => i.type !== "skill"
      );

      context.enrichedDescription = await TextEditor.enrichHTML(
        context.system.description,
        { async: true }
      );
    }

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Rollable ability checks
    html.find(".rollable").click(this._onRoll.bind(this));

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Item controls
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-equip").click(this._onItemEquip.bind(this));

    // Post item to chat
    html.find(".item-post").click(this._onItemPost.bind(this));
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.rollType === "ability") {
      const abilityKey = dataset.ability;
      const ability = this.actor.system.abilities[abilityKey];
      const label = game.i18n.localize(
        CONFIG.ARIANRHOD.abilities[abilityKey] ?? abilityKey
      );

      const maxFate =
        this.actor.type === "character"
          ? this.actor.system.fate.value
          : 0;

      await rollCheckDialog({
        title: `${label} チェック`,
        modifier: ability.bonus,
        maxFate: maxFate,
        label: `${label} チェック`,
        actor: this.actor,
      });
    }
  }

  /**
   * Handle creating a new owned Item.
   * @param {Event} event
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const type = element.dataset.type;
    const name = game.i18n.localize(`ARIANRHOD.${type.charAt(0).toUpperCase() + type.slice(1)}`);

    const itemData = {
      name: `${game.i18n.localize("ARIANRHOD.ItemCreate")} ${name}`,
      type: type,
      system: {},
    };

    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle editing an owned Item.
   * @param {Event} event
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    item.sheet.render(true);
  }

  /**
   * Handle deleting an owned Item.
   * @param {Event} event
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    await item.delete();
  }

  /**
   * Handle toggling equipment status.
   * @param {Event} event
   */
  async _onItemEquip(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    await item.update({ "system.equipped": !item.system.equipped });
  }

  /**
   * Handle posting an item's details to chat.
   * @param {Event} event
   */
  async _onItemPost(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    await item.postToChat();
  }
}
