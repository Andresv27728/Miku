const botCommand = {
  name: "bot",
  category: "general",
  description: "Muestra información sobre el bot.",

  async execute({ sock, msg, config }) {
    const botInfo = `*Nombre del Bot:* ${config.botName}\n*Creador:* ${config.ownerName}\n*Librería:* Baileys v6.7.2\n*Estado:* En línea`;
    await sock.sendMessage(msg.key.remoteJid, { text: botInfo }, { quoted: msg });
  }
};

export default botCommand;
