import { startBot, subBots } from '../index.js';
import fs from 'fs';

const serbotCommand = {
  name: "serbot",
  category: "propietario",
  description: "Te convierte en un sub-bot, dándote una sesión propia.",

  async execute({ sock, msg, config }) {
    // Solo el propietario puede crear sub-bots
    const senderId = msg.sender;
    const senderNumber = senderId.split('@')[0];
    if (!config.ownerNumbers.includes(senderNumber)) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Este comando es solo para el propietario del bot." }, { quoted: msg });
    }

    const sessionOwnerJid = msg.key.remoteJid; // El que pide ser bot

    // Verificar si ya es un sub-bot
    if (subBots.has(sessionOwnerJid)) {
      return sock.sendMessage(sessionOwnerJid, { text: "Ya tienes una sesión de sub-bot activa." }, { quoted: msg });
    }

    // Verificar si ya existe una carpeta de sesión
    const sessionPath = `./jadibots/${sessionOwnerJid}`;
    if (fs.existsSync(sessionPath)) {
        // Podríamos intentar reconectar, pero por ahora es más simple pedir que la borren.
        return sock.sendMessage(sessionOwnerJid, { text: "Parece que tienes una sesión antigua. Usa `deletesesion` primero." }, { quoted: msg });
    }

    // Crear la carpeta de jadibots si no existe
    if (!fs.existsSync('./jadibots')) {
      fs.mkdirSync('./jadibots');
    }

    await sock.sendMessage(sessionOwnerJid, { text: "Iniciando tu sesión de sub-bot... Preparando el código QR." }, { quoted: msg });

    // Iniciar la nueva instancia de bot
    // Pasamos el socket principal (sock) y el mensaje (msg) para que pueda enviar el QR de vuelta
    startBot(sessionOwnerJid, sock, msg);
  }
};

export default serbotCommand;
