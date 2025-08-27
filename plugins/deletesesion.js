import fs from 'fs';
import path from 'path';

const jadi = 'jadibots';

const deleteSessionCommand = {
  name: "deletesesion",
  category: "subbots",
  description: "Elimina una sesión de sub-bot por número.",
  aliases: ["stopbot"],

  async execute({ sock, msg, args, config }) {
    const senderId = msg.sender;
    const senderNumber = senderId.split('@')[0];
    const isOwner = config.ownerNumbers.includes(senderNumber);

    if (!isOwner) {
      return sock.sendMessage(msg.key.remoteJid, { text: "No tienes permiso para eliminar sesiones de sub-bot." }, { quoted: msg });
    }

    const targetPhoneNumber = args[0]?.replace(/[^0-9]/g, '');
    if (!targetPhoneNumber) {
        return sock.sendMessage(msg.key.remoteJid, { text: "Uso: `deletesesion <número>`" }, { quoted: msg });
    }

    const id = targetPhoneNumber;
    const sessionPath = path.join(`./${jadi}/`, id);

    if (!fs.existsSync(sessionPath)) {
      return sock.sendMessage(msg.key.remoteJid, { text: `No se encontró una sesión para el número ${id}.` }, { quoted: msg });
    }

    // Buscar la conexión del sub-bot en el array global
    if (global.conns) {
      const subBotConnection = global.conns.find(c => c.user?.id.startsWith(id));
      if (subBotConnection) {
        try {
          await subBotConnection.logout("Sesión eliminada por el propietario.");
        } catch (e) {
          console.error("Sub-bot ya desconectado, procediendo a borrar archivos.", e);
        }
        // Eliminar del array global
        global.conns = global.conns.filter(c => !c.user?.id.startsWith(id));
      }
    }

    // Borrar la carpeta de la sesión
    fs.rmSync(sessionPath, { recursive: true, force: true });

    await sock.sendMessage(msg.key.remoteJid, { text: `✅ La sesión del sub-bot para ${id} ha sido eliminada.` }, { quoted: msg });
  }
};

export default deleteSessionCommand;
