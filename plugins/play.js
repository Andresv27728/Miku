import youtubedl from 'youtube-dl-exec';
import yts from 'yt-search';

const playCommand = {
  name: "play",
  category: "descargas",
  description: "Busca y descarga una canción en formato de audio (MP3).",

  async execute({ sock, msg, args }) {
    if (args.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona el nombre de una canción." }, { quoted: msg });
    }

    const query = args.join(' ');
    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `🎶 Buscando y procesando "${query}"...` }, { quoted: msg });

    try {
      // Usar yt-search para obtener el título correcto y la miniatura
      const searchResults = await yts(query);
      if (!searchResults.videos.length) {
        throw new Error("No se encontraron resultados para tu búsqueda.");
      }
      const videoInfo = searchResults.videos[0];
      const videoTitle = videoInfo.title;

      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Encontrado: *${videoTitle}*.\n\n⬇️ Descargando audio...` }, { edit: waitingMsg.key });

      // Usar youtube-dl-exec para descargar el audio
      const audioUrl = await youtubedl(videoInfo.url, {
        "get-url": true,
        "format": "bestaudio/best",
      });

      if (!audioUrl) {
        throw new Error("No se pudo obtener el enlace de descarga del audio.");
      }

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg'
        },
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en el comando play:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error al procesar la solicitud de audio. Inténtalo de nuevo.`, edit: waitingMsg.key });
    }
  }
};

export default playCommand;
