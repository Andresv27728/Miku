import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('./database/groupSettings.json');

function readSettingsDb() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function writeSettingsDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error escribiendo en la base de datos de ajustes:", error);
  }
}

const delprefixCommand = {
  name: "delprefix",
  category: "grupos",
  description: "Elimina el prefijo de comandos configurado para este grupo.",

  async execute({ sock, msg }) {
    const from = msg.key.remoteJid;

    if (!from.endsWith('@g.us')) {
      return sock.sendMessage(from, { text: "Este comando solo se puede usar en grupos." }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(from);
      const senderIsAdmin = metadata.participants.find(p => p.id === (msg.key.participant || msg.key.remoteJid))?.admin;
      if (!senderIsAdmin) {
        return sock.sendMessage(from, { text: "No tienes permisos de administrador." }, { quoted: msg });
      }
    } catch (e) {
      return sock.sendMessage(from, { text: "Ocurrió un error al verificar tus permisos." }, { quoted: msg });
    }

    const settings = readSettingsDb();

    if (settings[from] && settings[from].prefix) {
      delete settings[from].prefix;
      writeSettingsDb(settings);
      await sock.sendMessage(from, { text: "✅ Prefijo eliminado. El bot ahora responderá a comandos sin prefijo en este grupo." }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: "Este grupo no tiene ningún prefijo configurado." }, { quoted: msg });
    }
  }
};

export default delprefixCommand;
