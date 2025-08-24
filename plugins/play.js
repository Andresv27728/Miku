import yts from 'yt-search';

const playCommand = {
  name: "play",
  category: "descargas",
  description: "Busca una canción en YouTube y la envía.",

  async execute({ sock, msg, args }) {
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
      const caption = `*${video.title}*\n\n*Autor:* ${video.author.name}\n*Duración:* ${video.timestamp}\n*Vistas:* ${video.views.toLocaleString()}`;

      const buttons = [
        { buttonId: `descargar_audio_${videoUrl}`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
        { buttonId: `descargar_video_${videoUrl}`, buttonText: { displayText: '🎬 Video' }, type: 1 }
      ];

      const buttonMessage = {
        image: { url: video.thumbnail },
        caption: caption,
        footer: 'Elige una opción para descargar',
        buttons: buttons,
        headerType: 4
      };

      await sock.sendMessage(msg.key.remoteJid, buttonMessage, { quoted: msg });

    } catch (error) {
      console.error("Error en el comando play:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "Ocurrió un error al buscar el video." }, { quoted: msg });
    }
  }
};

export default playCommand;
