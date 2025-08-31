import axios from 'axios';

const facebookCommand = {
  name: "facebook",
  category: "descargas",
  description: "Descarga un video de Facebook desde un enlace.",
  aliases: ["fb", "fbdl"],

  async execute({ sock, msg, args }) {
    const url = args[0];
    const fbRegex = /https?:\/\/(www\.)?(facebook\.com|fb\.watch)\/[^\s]+/i;

    if (!url || !fbRegex.test(url)) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona un enlace válido de Facebook." }, { quoted: msg });
    }

    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `🌊 Procesando tu video...` }, { quoted: msg });

    try {
      const apiUrl = `https://suhas-bro-api.vercel.app/download/fbdown?url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl);
      const result = response.data;

      // La estructura de la respuesta es desconocida, intentamos adivinar.
      // Comprobamos propiedades comunes para un enlace de descarga.
      const downloadUrl = result.url || result.link || result.download || result.data || result.result;

      if (!downloadUrl || typeof downloadUrl !== 'string') {
        console.error("Respuesta de la API no contenía una URL válida:", result);
        throw new Error("La API no devolvió una URL de descarga válida.");
      }

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          video: { url: downloadUrl },
          caption: `✨ ¡Aquí tienes tu video de Facebook!`,
          mimetype: 'video/mp4'
        },
        { quoted: msg }
      );

      await sock.sendMessage(msg.key.remoteJid, { text: `✅ ¡Video enviado!`, edit: waitingMsg.key });

    } catch (error) {
      console.error("Error en el comando facebook (suhas-bro-api):", error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Ocurrió un error. La API podría estar fallando o el enlace es inválido.`, edit: waitingMsg.key });
    }
  }
};

export default facebookCommand;
