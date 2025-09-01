import { readUsersDb, writeUsersDb } from '../lib/database.js';

const slotsCommand = {
  name: "slots",
  category: "economia",
  description: "Juega a la máquina tragamonedas. Uso: slots <cantidad>",
  aliases: ["slot"],

  async execute({ sock, msg, args }) {
    const senderId = msg.sender;
    const usersDb = readUsersDb();
    const user = usersDb[senderId];

    if (!user) {
      return sock.sendMessage(msg.key.remoteJid, { text: "No estás registrado. Usa el comando `reg` para registrarte." }, { quoted: msg });
    }

    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, introduce una cantidad válida para apostar." }, { quoted: msg });
    }

    if (user.coins < bet) {
      return sock.sendMessage(msg.key.remoteJid, { text: `No tienes suficientes monedas para apostar. Saldo actual: ${user.coins}` }, { quoted: msg });
    }

    const emojis = ["🍒", "🍋", "🍊", "🍉", "🍇", "💎"];
    const results = [
      emojis[Math.floor(Math.random() * emojis.length)],
      emojis[Math.floor(Math.random() * emojis.length)],
      emojis[Math.floor(Math.random() * emojis.length)]
    ];

    const resultString = `[ ${results.join(" | ")} ]`;
    let winAmount = 0;
    let winMessage = "";

    if (results[0] === results[1] && results[1] === results[2]) {
      // 3 of a kind
      winAmount = bet * 10;
      winMessage = `¡JACKPOT! ¡Has ganado ${winAmount} coins! 🎉`;
    } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
      // 2 of a kind
      winAmount = bet * 2;
      winMessage = `¡Dos iguales! ¡Has ganado ${winAmount} coins!`;
    } else {
      // No win
      winAmount = -bet;
      winMessage = `¡Mala suerte! Has perdido ${bet} coins.`;
    }

    user.coins += winAmount;
    writeUsersDb(usersDb);

    const finalMessage = `🎰 *Tragamonedas* 🎰\n\n${resultString}\n\n${winMessage}\n\n*Nuevo saldo:* ${user.coins} coins`;
    await sock.sendMessage(msg.key.remoteJid, { text: finalMessage }, { quoted: msg });
  }
};

export default slotsCommand;
