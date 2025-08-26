import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('./database/antilink.json');

// Función para leer la base de datos
function readDb() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Función para escribir en la base de datos
function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error escribiendo en la base de datos de antilink:", error);
  }
}

const antilinkCommand = {
  name: "antilink",
  category: "grupos",
  description: "Activa o desactiva la eliminación de enlaces de invitación a otros grupos.",

  async execute({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const option = args[0]?.toLowerCase();

    if (!from.endsWith('@g.us')) {
      return sock.sendMessage(from, { text: "Este comando solo se puede usar en grupos." }, { quoted: msg });
    }

    try {
      const metadata = await sock.groupMetadata(from);
      const senderIsAdmin = metadata.participants.find(p => p.id === msg.sender)?.admin;
      if (!senderIsAdmin) {
        return sock.sendMessage(from, { text: "No tienes permisos de administrador para usar este comando." }, { quoted: msg });
      }
    } catch (e) {
      return sock.sendMessage(from, { text: "Ocurrió un error al verificar tus permisos." }, { quoted: msg });
    }

    if (option !== 'on' && option !== 'off') {
      return sock.sendMessage(from, { text: "Opción no válida. Usa `antilink on` o `antilink off`." }, { quoted: msg });
    }

    const db = readDb();
    if (option === 'on') {
      db[from] = { enabled: true };
      writeDb(db);
      await sock.sendMessage(from, { text: "✅ El Anti-Link ha sido activado." }, { quoted: msg });
    } else {
      if (db[from]) {
        delete db[from];
        writeDb(db);
      }
      await sock.sendMessage(from, { text: "❌ El Anti-Link ha sido desactivado." }, { quoted: msg });
    }
  }
};

export default antilinkCommand;
