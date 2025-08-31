import fg from 'api-dylux';

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
      const result = await fg.fbdl(url);

      if (!result || !result.data || result.data.length === 0) {
        throw new Error("No se encontraron resultados válidos en la respuesta de la API.");
      }

      // El usuario mencionó que la URL está en result.data[0].url
      // Pero la estructura de api-dylux puede variar, a menudo hay 'hd' y 'sd'
      const downloadUrl = result.data[0]?.hd || result.data[0]?.sd || result.data[0]?.url;

      if (!downloadUrl) {
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
      console.error("Error en el comando facebook (api-dylux):", error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Ocurrió un error. La API podría estar fallando o el enlace es inválido.`, edit: waitingMsg.key });
    }
  }
};

export default facebookCommand;
