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

const prefixCommand = {
  name: "prefijo",
  category: "grupos",
  description: "Establece un prefijo para los comandos en este grupo.",
  aliases: ["prefix"],

  async execute({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const newPrefix = args[0];

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

    if (!newPrefix) {
        const settings = readSettingsDb();
        const currentPrefix = settings[from]?.prefix;
        const message = currentPrefix
            ? `El prefijo actual de este grupo es: \`${currentPrefix}\`. Usa \`prefijo <nuevo_prefijo>\` para cambiarlo o \`prefijo off\` para quitarlo.`
            : "Este grupo no tiene un prefijo. El bot responde a comandos directos. Usa `prefijo <nuevo_prefijo>` para establecer uno.";
        return sock.sendMessage(from, { text: message }, { quoted: msg });
    }

    const settings = readSettingsDb();
    if (!settings[from]) {
      settings[from] = {};
    }

    if (newPrefix.toLowerCase() === 'off' || newPrefix.toLowerCase() === 'ninguno') {
      delete settings[from].prefix;
      await sock.sendMessage(from, { text: "✅ Prefijo eliminado. El bot ahora responderá a comandos sin prefijo en este grupo." }, { quoted: msg });
    } else {
      // Limitar el prefijo a un solo carácter que no sea alfanumérico
      if (newPrefix.length > 1 || /^[a-zA-Z0-9]+$/.test(newPrefix)) {
        return sock.sendMessage(from, { text: "El prefijo debe ser un único símbolo (ej. `.` `!` `#` `$`)" }, { quoted: msg });
      }
      settings[from].prefix = newPrefix;
      await sock.sendMessage(from, { text: `✅ Prefijo establecido a: \`${newPrefix}\`` }, { quoted: msg });
    }

    writeSettingsDb(settings);
  }
};

export default prefixCommand;
