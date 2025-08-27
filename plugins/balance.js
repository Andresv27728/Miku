import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('./database/users.json');

// Función para leer la base de datos de usuarios
function readUsersDb() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

const balanceCommand = {
  name: "balance",
  category: "economia",
  description: "Muestra tu saldo de monedas.",
  aliases: ["bal", "coins"],

  async execute({ sock, msg }) {
    const senderId = msg.sender;
    const usersDb = readUsersDb();

    const user = usersDb[senderId];

    if (!user) {
      return sock.sendMessage(msg.key.remoteJid, { text: "No estás registrado. Usa el comando `reg` para registrarte." }, { quoted: msg });
    }

    const balanceMessage = `*💰 Tu Saldo 💰*\n\n` +
                           `*Usuario:* ${user.name}\n` +
                           `*Monedas:* ${user.coins} coins`;

    await sock.sendMessage(msg.key.remoteJid, { text: balanceMessage }, { quoted: msg });
  }
};

export default balanceCommand;
