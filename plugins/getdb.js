import fs from 'fs';
import path from 'path';

const getDbCommand = {
  name: "getdb",
  category: "propietario",
  description: "Envía un archivo de la base de datos. Uso: getdb [groups.json|blocked.json]",

  async execute({ sock, msg, args, config }) {
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];

    if (!config.ownerNumbers.includes(senderNumber)) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Este comando solo puede ser utilizado por el propietario del bot." }, { quoted: msg });
    }

    const fileName = args[0];
    if (!fileName) {
      return sock.sendMessage(senderJid, { text: "Por favor, especifica qué archivo de la base de datos quieres. (ej. `groups.json`)" });
    }

    const dbPath = path.resolve(`./database/${fileName}`);

    if (fs.existsSync(dbPath)) {
      try {
        await sock.sendMessage(senderJid, {
          document: { url: dbPath },
          fileName: fileName,
          mimetype: 'application/json'
        });
      } catch (e) {
        console.error("Error enviando el archivo de DB:", e);
        await sock.sendMessage(senderJid, { text: "Ocurrió un error al enviar el archivo." });
      }
    } else {
      await sock.sendMessage(senderJid, { text: `El archivo de base de datos '${fileName}' no existe.` });
    }
  }
};

export default getDbCommand;
