const adiosCommand = {
  name: "adios",
  category: "general",
  description: "El bot se despide.",

  async execute({ sock, msg }) {
    const senderName = msg.pushName || "usuario";
    const farewell = `¡Hasta luego, ${senderName}! Que tengas un buen día.`;
    await sock.sendMessage(msg.key.remoteJid, { text: farewell }, { quoted: msg });
  }
};

export default adiosCommand;
