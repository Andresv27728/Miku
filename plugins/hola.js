const holaCommand = {
  name: "hola",
  category: "general",
  description: "El bot te saluda.",

  async execute({ sock, msg }) {
    // Obtener el nombre del usuario
    const senderName = msg.pushName || "usuario";
    const greeting = `¡Hola, ${senderName}! ¿En qué puedo ayudarte hoy? Escribe \`menu\` para ver mis comandos.`;
    await sock.sendMessage(msg.key.remoteJid, { text: greeting }, { quoted: msg });
  }
};

export default holaCommand;
