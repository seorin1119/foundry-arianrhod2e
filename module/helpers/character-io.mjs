/**
 * Character Import/Export functionality for Arianrhod RPG 2E.
 * Exports character data as JSON and imports characters from JSON files.
 */

const EXPORT_FORMAT_VERSION = 1;

/**
 * Export an actor's data as a downloadable JSON file.
 * Includes actor name, image, system data, and all owned items.
 * @param {Actor} actor - The actor to export
 */
export function exportCharacter(actor) {
  const exportData = {
    formatVersion: EXPORT_FORMAT_VERSION,
    systemVersion: game.system.version,
    systemId: game.system.id,
    exportedAt: new Date().toISOString(),
    actor: {
      name: actor.name,
      type: actor.type,
      img: actor.img,
      system: actor.system.toObject(),
    },
    items: actor.items.map(item => ({
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system.toObject(),
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const filename = `${actor.name.replace(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龠]/gi, "_")}_${actor.type}.json`;

  // Create a download link and trigger it
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  ui.notifications.info(game.i18n.format("ARIANRHOD.ExportSuccess", { name: actor.name }));
}

/**
 * Import a character from a JSON file.
 * Opens a file picker, validates the data, and creates a new actor.
 */
export async function importCharacter() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return resolve(null);

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const actor = await _processImport(data);
        resolve(actor);
      } catch (err) {
        console.error("Arianrhod 2E | Import failed:", err);
        ui.notifications.error(game.i18n.localize("ARIANRHOD.ImportFailed"));
        resolve(null);
      }
    });

    input.click();
  });
}

/**
 * Process imported JSON data and create an actor.
 * @param {object} data - The parsed JSON export data
 * @returns {Actor|null} The created actor, or null on failure
 * @private
 */
async function _processImport(data) {
  // Validate format
  if (!data.actor || !data.systemId) {
    ui.notifications.error(game.i18n.localize("ARIANRHOD.ImportInvalidFormat"));
    return null;
  }

  // Validate system ID
  if (data.systemId !== game.system.id) {
    ui.notifications.error(game.i18n.localize("ARIANRHOD.ImportWrongSystem"));
    return null;
  }

  // Check system version compatibility (warn if major version differs)
  if (data.systemVersion) {
    const importMajor = data.systemVersion.split(".")[0];
    const currentMajor = game.system.version.split(".")[0];
    if (importMajor !== currentMajor) {
      ui.notifications.warn(
        game.i18n.format("ARIANRHOD.ImportVersionMismatch", {
          imported: data.systemVersion,
          current: game.system.version,
        })
      );
    }
  }

  // Validate actor type
  const validTypes = ["character", "enemy"];
  if (!validTypes.includes(data.actor.type)) {
    ui.notifications.error(game.i18n.localize("ARIANRHOD.ImportInvalidType"));
    return null;
  }

  // Create the actor
  const actorData = {
    name: data.actor.name,
    type: data.actor.type,
    img: data.actor.img || "icons/svg/mystery-man.svg",
    system: data.actor.system,
  };

  const actor = await Actor.create(actorData);
  if (!actor) {
    ui.notifications.error(game.i18n.localize("ARIANRHOD.ImportFailed"));
    return null;
  }

  // Create items on the actor
  if (data.items?.length) {
    const itemsData = data.items.map(item => ({
      name: item.name,
      type: item.type,
      img: item.img || undefined,
      system: item.system,
    }));
    await actor.createEmbeddedDocuments("Item", itemsData);
  }

  ui.notifications.info(game.i18n.format("ARIANRHOD.ImportSuccess", { name: actor.name }));
  // Open the imported actor's sheet
  actor.sheet.render(true);
  return actor;
}
