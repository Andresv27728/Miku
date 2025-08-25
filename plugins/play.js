import yts from 'yt-search';

const playCommand = {
  name: "play",
  category: "descargas",
  description: "Busca una canción en YouTube y prepara la descarga.",

  // La función execute ahora acepta 'playContext'
  async execute({ sock, msg, args, playContext }) {
    if (args.length === 0) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona el nombre de una canción. Ejemplo: `play Bella Ciao`" }, { quoted: msg });
      return;
    }

    const query = args.join(' ');
    await sock.sendMessage(msg.key.remoteJid, { text: `Buscando "${query}"...` }, { quoted: msg });

    try {
      const searchResult = await yts(query);
      const video = searchResult.videos[0];

      if (!video) {
        await sock.sendMessage(msg.key.remoteJid, { text: "No se encontraron resultados para tu búsqueda." }, { quoted: msg });
        return;
      }

      const videoUrl = video.url;
      // Se construye el mensaje con las nuevas instrucciones.
      const caption = `*${video.title}*\n\n*Autor:* ${video.author.name}\n*Duración:* ${video.timestamp}\n\n---\n*Responde a este mensaje con:*\n*1* - para descargar en Audio 🎵\n*2* - para descargar en Video 🎬`;

      // Se envía el mensaje de texto.
      const sentMsg = await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: caption,
          // Se añade una vista previa del enlace para que se vea la miniatura.
          contextInfo: {
            externalAdReply: {
              title: video.title,
              body: video.author.name,
              thumbnailUrl: video.thumbnail,
              sourceUrl: video.url,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        },
        { quoted: msg }
      );

      // Se guarda el ID del mensaje y la URL en el contexto para la respuesta.
      playContext.set(sentMsg.key.id, videoUrl);

      // Se añade un temporizador para limpiar el contexto si el usuario no responde.
      setTimeout(() => {
        if (playContext.has(sentMsg.key.id)) {
          playContext.delete(sentMsg.key.id);
          console.log(`Contexto de play para el mensaje ${sentMsg.key.id} eliminado por tiempo de espera.`);
        }
      }, 300000); // 5 minutos de tiempo de espera

    } catch (error) {
      console.error("Error en el comando play:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "Ocurrió un error al buscar el video." }, { quoted: msg });
    }
  }
};

export default playCommand;
