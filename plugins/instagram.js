import axios from 'axios';

const instagramCommand = {
  name: "instagram",
  category: "descargas",
  description: "Descarga videos o reels de Instagram.",
  aliases: ["ig", "igdl"],

  async execute({ sock, msg, args }) {
    const url = args[0];
    const igRegex = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9\-_]+/;

    if (!url || !igRegex.test(url)) {
      return sock.sendMessage(msg.key.remoteJid, { text: "🐬 Por favor, ingresa un enlace válido de Instagram." }, { quoted: msg });
    }

    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: "🐬 Procesando tu enlace..." }, { quoted: msg });

    let res;
    try {
      res = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/instagram-dl?url=${encodeURIComponent(url)}`);
    } catch (e) {
      console.error("Error al llamar a la API de Instagram:", e);
      return sock.sendMessage(msg.key.remoteJid, { text: '🐬 Error al obtener datos. Verifica el enlace o intenta más tarde.' }, { quoted: msg, edit: waitingMsg.key });
    }

    const result = res.data;
    if (!result || !result.data || result.data.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: '🐬 No se encontraron resultados en la respuesta de la API.' }, { quoted: msg, edit: waitingMsg.key });
    }

    const videoData = result.data[0];
    const downloadUrl = videoData.dl_url;

    if (!downloadUrl) {
      return sock.sendMessage(msg.key.remoteJid, { text: '🪼 No se encontró un enlace de descarga válido.' }, { quoted: msg, edit: waitingMsg.key });
    }

    // Lógica de reintentos para el envío del video
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            video: { url: downloadUrl },
            caption: '🐬 ¡Aquí tienes tu video de Instagram!',
            mimetype: 'video/mp4'
          },
          { quoted: msg }
        );
        await sock.sendMessage(msg.key.remoteJid, { text: '✅ ¡Video enviado!', edit: waitingMsg.key });
        // Si el envío es exitoso, salimos del bucle
        return;
      } catch (e) {
        console.error(`Intento ${attempt} fallido al enviar video de Instagram:`, e);
        if (attempt === maxRetries) {
          // Si todos los intentos fallan
          await sock.sendMessage(msg.key.remoteJid, { text: '🐬 Error al enviar el video después de varios intentos.' }, { quoted: msg, edit: waitingMsg.key });
        } else {
          // Esperar 1 segundo antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
};

export default instagramCommand;
