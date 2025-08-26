import { startBot, subBots } from '../index.js';
import fs from 'fs';

const serbotCommand = {
  name: "serbot",
  category: "subbots",
  description: "Conecta este número como un sub-bot usando un código de emparejamiento.",

  async execute({ sock, msg, config }) {
    // Por seguridad, solo el propietario del bot principal puede autorizarse a sí mismo como sub-bot.
    // Esto se puede cambiar a un sistema de lista blanca en el futuro.
    const senderId = msg.sender;
    const senderNumber = senderId.split('@')[0];
    if (!config.ownerNumbers.includes(senderNumber)) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Actualmente, solo el propietario principal puede crear sub-bots." }, { quoted: msg });
    }

    // El comando no debe funcionar en grupos
    if (msg.key.remoteJid.endsWith('@g.us')) {
        return sock.sendMessage(msg.key.remoteJid, { text: "Este comando solo se puede usar en el chat privado del bot." }, { quoted: msg });
    }

    const sessionOwnerJid = msg.sender;

    if (subBots.has(sessionOwnerJid)) {
      return sock.sendMessage(sessionOwnerJid, { text: "Ya tienes una sesión de sub-bot activa. Usa `deletesesion` para eliminarla primero." });
    }

    const sessionPath = `./jadibots/${sessionOwnerJid}`;
    if (fs.existsSync(sessionPath)) {
        return sock.sendMessage(sessionOwnerJid, { text: "Parece que tienes una sesión antigua. Usa `deletesesion` primero." });
    }

    if (!fs.existsSync('./jadibots')) {
      fs.mkdirSync('./jadibots');
    }

    await sock.sendMessage(sessionOwnerJid, { text: "Iniciando tu sesión de sub-bot... Recibirás un código de emparejamiento." });

    // Iniciar la nueva instancia de bot, pasando 'true' para isSubBot y el mensaje para responder.
    // El 'sock' que se pasa aquí es el del bot principal, que se usará para enviar el código.
    startBot(sessionOwnerJid, true, msg);
  }
};

export default serbotCommand;
