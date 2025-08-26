import yts from 'yt-search';
import axios from 'axios';

const play2Command = {
  name: "play2",
  category: "descargas",
  description: "Busca y descarga una canción en formato de video (MP4).",

  async execute({ sock, msg, args, config }) {
    if (args.length === 0) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona el nombre de un video. Ejemplo: `play2 Never Gonna Give You Up`" }, { quoted: msg });
      return;
    }

    const query = args.join(' ');
    console.log(`[play2.js] Iniciando búsqueda para: "${query}"`);
    let waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `Buscando "${query}"...` }, { quoted: msg });

    try {
      const searchResult = await yts(query);
      const video = searchResult.videos[0];

      if (!video) {
        console.log("[play2.js] No se encontraron resultados en yt-search.");
        await sock.sendMessage(msg.key.remoteJid, { text: "No se encontraron resultados para tu búsqueda." }, { edit: waitingMsg.key });
        return;
      }
      console.log(`[play2.js] Video encontrado: ${video.title} (${video.url})`);

      const videoUrl = video.url;
      const caption = `*${video.title}*\n*Autor:* ${video.author.name}`;

      await sock.sendMessage(msg.key.remoteJid, { text: `Procesando video... (Esto puede tardar)` }, { edit: waitingMsg.key });

      const apiUrl = `${config.api.ytmp4}?url=${videoUrl}`;
      console.log(`[play2.js] Llamando a la API de video: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        responseType: 'json',
        timeout: 120000 // 2 minutos de timeout
      });

      console.log("[play2.js] Respuesta de la API recibida. Datos:", JSON.stringify(response.data, null, 2));

      const downloadUrl = response.data?.resultado?.url;

      if (!downloadUrl) {
        console.log("[play2.js] La API no devolvió una URL de descarga válida en la respuesta.");
        throw new Error("La API no devolvió una URL de descarga válida.");
      }
      console.log(`[play2.js] URL de descarga obtenida: ${downloadUrl}`);

      await sock.sendMessage(msg.key.remoteJid, { text: `Enviando video a WhatsApp...` }, { quoted: msg });

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          video: { url: downloadUrl },
          mimetype: 'video/mp4',
          caption: caption
        },
        { quoted: msg }
      );
      console.log("[play2.js] Envío de video a WhatsApp completado.");

    } catch (error) {
      console.error("[play2.js] Ha ocurrido un error:", error);
      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(msg.key.remoteJid, { text: "El servidor de descargas tardó demasiado en responder. Intenta de nuevo." }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error al procesar la solicitud. Detalles: ${error.message}` }, { quoted: msg });
      }
    }
  }
};

export default play2Command;
