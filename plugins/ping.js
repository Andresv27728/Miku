const pingCommand = {
  name: "ping",
  category: "general",
  description: "Comprueba la velocidad de respuesta del bot.",

  async execute({ sock, msg }) {
    const startTime = Date.now();
    // Enviamos un mensaje inicial para luego editarlo con la latencia.
    const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: "Calculando..." }, { quoted: msg });
    const endTime = Date.now();
    const latency = endTime - startTime;

    // Editamos el mensaje con el resultado.
    // Nota: La edición de mensajes puede no ser visible en todos los dispositivos de WhatsApp.
    await sock.sendMessage(msg.key.remoteJid, { text: `Pong! 🏓\nLatencia: ${latency} ms` }, { edit: sentMsg.key });
  }
};

export default pingCommand;
