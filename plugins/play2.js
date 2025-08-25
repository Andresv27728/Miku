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
    let waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `Buscando "${query}"...` }, { quoted: msg });

    try {
      const searchResult = await yts(query);
      const video = searchResult.videos[0];

      if (!video) {
        await sock.sendMessage(msg.key.remoteJid, { text: "No se encontraron resultados para tu búsqueda." }, { edit: waitingMsg.key });
        return;
      }

      const videoUrl = video.url;
      const caption = `*${video.title}*\n*Autor:* ${video.author.name}`;

      // Mensaje mejorado
      await sock.sendMessage(msg.key.remoteJid, { text: `Procesando video... (Esto puede tardar hasta 90 segundos)` }, { edit: waitingMsg.key });

      // Llamar a la API con timeout
      const apiUrl = `${config.api.ytmp4}?url=${videoUrl}`;
      const response = await axios.get(apiUrl, {
        responseType: 'json',
        timeout: 90000 // 90 segundos de timeout
      });
      const downloadUrl = response.data.resultado.url;

      if (!downloadUrl) {
        throw new Error("La API no devolvió una URL de descarga válida.");
      }

      await sock.sendMessage(msg.key.remoteJid, { text: `Enviando video a WhatsApp...` }, { quoted: msg });

      // Enviar el archivo de video
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          video: { url: downloadUrl },
          mimetype: 'video/mp4',
          caption: caption
        },
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en el comando play2:", error.message);
      // Manejo de error específico para timeout
      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(msg.key.remoteJid, { text: "El servidor de descargas tardó demasiado en responder. Por favor, intenta de nuevo más tarde." }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: "Ocurrió un error al procesar tu solicitud de video. La API podría estar fallando." }, { quoted: msg });
      }
    }
  }
};

export default play2Command;
