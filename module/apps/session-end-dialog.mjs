/**
 * Session End Dialog - GM tool for distributing rewards at the end of a session.
 * Allows awarding experience, purchasing connections, and guild contributions.
 *
 * Rules reference (p.197-198, p.211):
 * - Connection purchases: 1 GP each
 * - Guild contribution: up to [PC level] GP
 * - General skill purchase: 5 GP per level
 */
export class SessionEndDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(options = {}) {
    super(options);
    this._distributions = new Map();
  }

  static DEFAULT_OPTIONS = {
    id: "session-end-dialog",
    classes: ["arianrhod2e", "dialog", "session-end"],
    tag: "form",
    window: {
      title: "ARIANRHOD.SessionEnd",
      resizable: true,
    },
    position: {
      width: 600,
      height: 500,
    },
    actions: {
      applyAll: SessionEndDialog.#onApplyAll,
      setAllGP: SessionEndDialog.#onSetAllGP,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/session-end-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.SessionEnd");
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
      experience: a.system.experience ?? 0,
      currency: a.system.currency ?? 0,
    }));
    context.hasPCs = context.pcs.length > 0;

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Enforce guild contribution max per row
    const rows = html.querySelectorAll(".session-pc-row");
    for (const row of rows) {
      const guildInput = row.querySelector('[name="guildContrib"]');
      if (guildInput) {
        guildInput.addEventListener("change", (event) => {
          const max = parseInt(guildInput.max) || 0;
          const val = parseInt(event.target.value) || 0;
          if (val > max) guildInput.value = max;
          if (val < 0) guildInput.value = 0;
        });
      }
    }
  }

  /**
   * Set the same GP value for all PC rows.
   */
  static #onSetAllGP(event, target) {
    const form = this.element;
    const quickInput = form.querySelector(".quick-gp-input");
    const gpValue = parseInt(quickInput?.value) || 0;

    const gpInputs = form.querySelectorAll('.session-pc-row [name="gp"]');
    for (const input of gpInputs) {
      input.value = gpValue;
    }
  }

  /**
   * Apply all distributions and post a chat summary.
   */
  static async #onApplyAll(event, target) {
    event.preventDefault();
    const form = this.element;
    const results = [];

    // Collect all PC data from form inputs
    const pcElements = form.querySelectorAll(".session-pc-row");
    for (const row of pcElements) {
      const actorId = row.dataset.actorId;
      const actor = game.actors.get(actorId);
      if (!actor) continue;

      const gp = parseInt(row.querySelector('[name="gp"]').value) || 0;
      const connections = parseInt(row.querySelector('[name="connections"]').value) || 0;
      const guildContrib = parseInt(row.querySelector('[name="guildContrib"]').value) || 0;

      if (gp === 0 && connections === 0 && guildContrib === 0) continue;

      const updates = {};

      // Award experience points
      if (gp > 0) {
        updates["system.experience"] = (actor.system.experience ?? 0) + gp;
      }

      // Add empty connection slots
      if (connections > 0) {
        const currentConnections = [...(actor.system.connections ?? [])];
        for (let i = 0; i < connections; i++) {
          currentConnections.push({ name: "", relation: "", place: "", info: "" });
        }
        updates["system.connections"] = currentConnections;
        // Deduct gold for connections (1G each)
        updates["system.currency"] = Math.max(0, (actor.system.currency ?? 0) - connections);
      }

      // Guild contribution deducts gold from PC
      if (guildContrib > 0) {
        updates["system.currency"] = Math.max(
          0,
          (updates["system.currency"] ?? actor.system.currency ?? 0) - guildContrib
        );
      }

      await actor.update(updates);
      results.push({ name: actor.name, gp, connections, guildContrib });
    }

    // Add guild contribution gold to the guild actor
    const totalGuildContrib = results.reduce((sum, r) => sum + r.guildContrib, 0);
    if (totalGuildContrib > 0) {
      const guild = game.actors.find(a => a.type === "guild");
      if (guild) {
        await guild.update({ "system.gold": (guild.system.gold ?? 0) + totalGuildContrib });
      }
    }

    // Post chat summary
    if (results.length > 0) {
      let content = `<div class="ar-session-end-summary">`;
      content += `<h3><i class="fas fa-flag-checkered"></i> ${game.i18n.localize("ARIANRHOD.SessionEndSummary")}</h3>`;
      content += `<ul>`;
      for (const r of results) {
        content += `<li><b>${r.name}</b>: `;
        const parts = [];
        if (r.gp > 0) parts.push(`${game.i18n.localize("ARIANRHOD.Experience")} +${r.gp}`);
        if (r.connections > 0) parts.push(`${game.i18n.localize("ARIANRHOD.TabConnections")} +${r.connections}`);
        if (r.guildContrib > 0)
          parts.push(`${game.i18n.localize("ARIANRHOD.GuildContribution")} ${r.guildContrib}G`);
        content += parts.join(", ");
        content += `</li>`;
      }
      content += `</ul></div>`;

      await ChatMessage.create({
        content,
        speaker: { alias: game.i18n.localize("ARIANRHOD.SystemName") },
      });
    }

    // Reset guild support uses for all guilds
    for (const guild of game.actors.filter(a => a.type === "guild")) {
      if (guild.system.supportUses?.length > 0) {
        await guild.update({ "system.supportUses": [] });
      }
    }

    ui.notifications.info(game.i18n.localize("ARIANRHOD.SessionEndApplied"));
    this.close();
  }
}
