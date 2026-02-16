/**
 * Item Shop Dialog - GM tool for buying/selling equipment items.
 * Allows purchasing equipment from the library and selling character inventory.
 *
 * Rules reference (p.158-170):
 * - Equipment is purchased from shops using guild gold
 * - Sell price = 50% of original price
 * - Guild support "discount" gives 10% off purchases
 * - Guild support "gh_shop" gives +10% sell price
 */
export class ItemShopDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(options = {}) {
    super(options);
    this._activeTab = "weapon";
    this._searchTerm = "";
    this._mode = "buy"; // "buy" or "sell"
  }

  static DEFAULT_OPTIONS = {
    id: "item-shop-dialog",
    classes: ["arianrhod2e", "dialog", "item-shop"],
    tag: "form",
    window: {
      title: "ARIANRHOD.Shop",
      resizable: true,
    },
    position: {
      width: 680,
      height: 620,
    },
    actions: {
      switchTab: ItemShopDialog.#onSwitchTab,
      switchMode: ItemShopDialog.#onSwitchMode,
      buyItem: ItemShopDialog.#onBuyItem,
      sellItem: ItemShopDialog.#onSellItem,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/item-shop-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.Shop");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get all player-owned characters
    const pcs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    context.pcs = pcs.map(a => ({
      id: a.id,
      name: a.name,
      img: a.img,
      level: a.system.level ?? 1,
    }));
    context.hasPCs = context.pcs.length > 0;
    context.activeTab = this._activeTab;
    context.mode = this._mode;
    context.searchTerm = this._searchTerm;

    // Load equipment library
    const { equipmentLibrary } = await import("../helpers/equipment-library.mjs");
    const { getShopDiscount, getShopSellBonus, findGuildForActor } = await import("../helpers/guild-support-effects.mjs");

    // Get selected buyer for discount calculation
    const selectedBuyerId = this._selectedBuyer || context.pcs[0]?.id;
    const selectedBuyer = selectedBuyerId ? game.actors.get(selectedBuyerId) : null;
    const discount = selectedBuyer ? getShopDiscount(selectedBuyer) : 0;
    const sellBonus = selectedBuyer ? getShopSellBonus(selectedBuyer) : 0;
    const guild = selectedBuyer ? findGuildForActor(selectedBuyer) : null;

    context.discount = discount;
    context.sellBonus = sellBonus;
    context.guildGold = guild?.system?.gold ?? 0;
    context.guildName = guild?.name ?? "";
    context.hasGuild = !!guild;

    // Determine locale for item names
    const lang = game.i18n.lang;

    const getLocalizedName = (item) => {
      if (lang === "ko" && item.nameKo) return item.nameKo;
      if (lang === "en" && item.nameEn) return item.nameEn;
      return item.name; // Japanese default
    };

    const searchLower = this._searchTerm.toLowerCase();

    if (this._mode === "buy") {
      // Buy mode: show equipment library items filtered by tab
      let items = [];
      if (this._activeTab === "weapon") {
        items = equipmentLibrary.weapons.map(w => ({
          ...w, itemType: "weapon", displayName: getLocalizedName(w),
          discountPrice: discount > 0 ? Math.ceil(w.price * (100 - discount) / 100) : w.price,
        }));
      } else if (this._activeTab === "armor") {
        items = equipmentLibrary.armor.map(a => ({
          ...a, itemType: "armor", displayName: getLocalizedName(a),
          discountPrice: discount > 0 ? Math.ceil(a.price * (100 - discount) / 100) : a.price,
        }));
      } else if (this._activeTab === "accessory") {
        items = equipmentLibrary.accessories.map(a => ({
          ...a, itemType: "accessory", displayName: getLocalizedName(a),
          discountPrice: discount > 0 ? Math.ceil(a.price * (100 - discount) / 100) : a.price,
        }));
      } else if (this._activeTab === "item") {
        items = equipmentLibrary.items.map(i => ({
          ...i, itemType: "item", displayName: getLocalizedName(i),
          discountPrice: discount > 0 ? Math.ceil(i.price * (100 - discount) / 100) : i.price,
        }));
      }

      // Apply search filter
      if (searchLower) {
        items = items.filter(i =>
          i.displayName.toLowerCase().includes(searchLower) ||
          (i.name && i.name.toLowerCase().includes(searchLower)) ||
          (i.nameEn && i.nameEn.toLowerCase().includes(searchLower)) ||
          (i.nameKo && i.nameKo.toLowerCase().includes(searchLower))
        );
      }

      context.items = items;
      context.hasDiscount = discount > 0;
    } else {
      // Sell mode: show selected character's inventory
      const inventory = [];
      if (selectedBuyer) {
        for (const item of selectedBuyer.items) {
          if (!["weapon", "armor", "accessory", "item"].includes(item.type)) continue;
          if ((item.system.price ?? 0) <= 0) continue;
          const basePrice = item.system.price;
          let sellPrice = Math.floor(basePrice * 0.5);
          if (sellBonus > 0) {
            sellPrice = Math.min(basePrice, Math.floor(basePrice * (50 + sellBonus) / 100));
          }
          inventory.push({
            id: item.id,
            name: item.name,
            type: item.type,
            typeLabel: game.i18n.localize(`ARIANRHOD.${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`),
            price: basePrice,
            sellPrice,
            img: item.img,
            equipped: item.system.equipped ?? false,
          });
        }

        // Apply search filter
        if (searchLower) {
          const filtered = inventory.filter(i => i.name.toLowerCase().includes(searchLower));
          context.inventory = filtered;
        } else {
          context.inventory = inventory;
        }
      } else {
        context.inventory = [];
      }

      context.hasSellBonus = sellBonus > 0;
    }

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Highlight active tab
    html.querySelectorAll(".ar-shop-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === this._activeTab);
    });

    // Highlight active mode
    html.querySelectorAll(".ar-shop-mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === this._mode);
    });

    // Search input listener
    const searchInput = html.querySelector(".ar-shop-search");
    if (searchInput) {
      searchInput.value = this._searchTerm;
      searchInput.addEventListener("input", (event) => {
        this._searchTerm = event.target.value;
        this.render();
      });
    }

    // Buyer selector listener
    const buyerSelect = html.querySelector('[name="buyer"]');
    if (buyerSelect) {
      if (this._selectedBuyer) buyerSelect.value = this._selectedBuyer;
      buyerSelect.addEventListener("change", (event) => {
        this._selectedBuyer = event.target.value;
        this.render();
      });
    }
  }

  /**
   * Switch active category tab.
   */
  static #onSwitchTab(event, target) {
    const tab = target.dataset.tab;
    if (!tab) return;
    this._activeTab = tab;
    this._searchTerm = "";
    this.render();
  }

  /**
   * Switch between buy and sell mode.
   */
  static #onSwitchMode(event, target) {
    const mode = target.dataset.mode;
    if (!mode) return;
    this._mode = mode;
    this._searchTerm = "";
    this.render();
  }

  /**
   * Buy an item from the shop.
   */
  static async #onBuyItem(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const itemType = target.dataset.itemType;
    const buyerId = this.element.querySelector('[name="buyer"]')?.value;
    const buyer = game.actors.get(buyerId);
    if (!buyer) return;

    // Get item data from equipment library
    const { equipmentLibrary } = await import("../helpers/equipment-library.mjs");
    let sourceList;
    if (itemType === "weapon") sourceList = equipmentLibrary.weapons;
    else if (itemType === "armor") sourceList = equipmentLibrary.armor;
    else if (itemType === "accessory") sourceList = equipmentLibrary.accessories;
    else if (itemType === "item") sourceList = equipmentLibrary.items;
    else return;

    const item = sourceList.find(e => e.id === itemId);
    if (!item) return;

    // Calculate price with discount
    const { getShopDiscount, findGuildForActor } = await import("../helpers/guild-support-effects.mjs");
    const discount = getShopDiscount(buyer);
    const price = discount > 0 ? Math.ceil(item.price * (100 - discount) / 100) : item.price;

    // Deduct from guild gold
    const guild = findGuildForActor(buyer);
    if (!guild) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoGuild"));
      return;
    }
    if (guild.system.gold < price) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.InsufficientGold"));
      return;
    }

    await guild.update({ "system.gold": Math.max(0, guild.system.gold - price) });

    // Build item data based on type
    const lang = game.i18n.lang;
    const displayName = (lang === "ko" && item.nameKo) ? item.nameKo
      : (lang === "en" && item.nameEn) ? item.nameEn
      : item.name;

    let itemData;
    if (itemType === "weapon") {
      itemData = {
        name: displayName, type: "weapon",
        system: {
          weaponType: item.category ?? "",
          accuracy: item.accuracy ?? 0,
          attack: item.attack ?? 0,
          range: item.range ?? 0,
          weight: item.weight ?? 0,
          price: item.price,
          classRestriction: item.restriction ?? "",
        },
      };
    } else if (itemType === "armor") {
      itemData = {
        name: displayName, type: "armor",
        system: {
          armorType: item.category ?? "",
          physDef: item.physDef ?? 0,
          magDef: item.magDef ?? 0,
          evasion: item.evasion ?? 0,
          initiativeMod: item.initiativeMod ?? 0,
          movementMod: item.movementMod ?? 0,
          weight: item.weight ?? 0,
          price: item.price,
          classRestriction: item.restriction ?? "",
          slot: item.category ?? "body",
        },
      };
    } else if (itemType === "accessory") {
      itemData = {
        name: displayName, type: "accessory",
        system: {
          effect: item.effect ?? "",
          weight: item.weight ?? 0,
          price: item.price,
          classRestriction: item.restriction ?? "",
        },
      };
    } else if (itemType === "item") {
      itemData = {
        name: displayName, type: "item",
        system: {
          itemType: item.category ?? "",
          weight: item.weight ?? 0,
          price: item.price,
          effect: item.effect ?? "",
          consumable: item.consumable ?? false,
          quantity: 1,
        },
      };
      if (item.useEffect) {
        itemData.system.useEffect = { ...item.useEffect };
      }
    }

    await buyer.createEmbeddedDocuments("Item", [itemData]);

    // Chat notification
    const discountText = discount > 0
      ? ` <span class="ar-shop-discount-badge">${game.i18n.format("ARIANRHOD.DiscountApplied", { discount })}</span>`
      : "";
    await ChatMessage.create({
      content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-coins"></i> ${buyer.name}: ${displayName} ${game.i18n.localize("ARIANRHOD.Purchased")} (${price}G)${discountText}</div></div>`,
      speaker: ChatMessage.getSpeaker(),
    });

    ui.notifications.info(`${displayName} → ${buyer.name} (${price}G)`);
    this.render();
  }

  /**
   * Sell an item from character inventory.
   */
  static async #onSellItem(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const buyerId = this.element.querySelector('[name="buyer"]')?.value;
    const seller = game.actors.get(buyerId);
    if (!seller) return;

    const item = seller.items.get(itemId);
    if (!item) return;

    const { getShopSellBonus, findGuildForActor } = await import("../helpers/guild-support-effects.mjs");
    const sellBonus = getShopSellBonus(seller);
    const basePrice = item.system.price ?? 0;
    let sellPrice = Math.floor(basePrice * 0.5);
    if (sellBonus > 0) {
      sellPrice = Math.min(basePrice, Math.floor(basePrice * (50 + sellBonus) / 100));
    }

    const guild = findGuildForActor(seller);
    if (!guild) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoGuild"));
      return;
    }

    // Add gold to guild
    await guild.update({ "system.gold": (guild.system.gold ?? 0) + sellPrice });

    // Remove item from character
    const itemName = item.name;
    await item.delete();

    // Chat notification
    const bonusText = sellBonus > 0
      ? ` <span class="ar-shop-bonus-badge"><i class="fas fa-store"></i> +${sellBonus}%</span>`
      : "";
    await ChatMessage.create({
      content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-sell"><i class="fas fa-coins"></i> ${seller.name}: ${itemName} ${game.i18n.localize("ARIANRHOD.Sold")} (${sellPrice}G)${bonusText}</div></div>`,
      speaker: ChatMessage.getSpeaker(),
    });

    ui.notifications.info(`${itemName} ${game.i18n.localize("ARIANRHOD.Sold")} (${sellPrice}G)`);
    this.render();
  }
}
