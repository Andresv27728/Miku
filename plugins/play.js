import yts from 'yt-search';
import axios from 'axios';

const playCommand = {
  name: "play",
  category: "descargas",
  description: "Busca y descarga una canción en formato de audio (MP3).",

  async execute({ sock, msg, args, config }) {
    if (args.length === 0) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona el nombre de una canción. Ejemplo: `play Bella Ciao`" }, { quoted: msg });
      return;
    }

    const query = args.join(' ');
    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `Buscando y preparando audio para "${query}"...` }, { quoted: msg });

    try {
      const searchResult = await yts(query);
      const video = searchResult.videos[0];

      if (!video) {
        await sock.sendMessage(msg.key.remoteJid, { text: "No se encontraron resultados para tu búsqueda." }, { quoted: msg });
        return;
      }

      const videoUrl = video.url;
      const caption = `*${video.title}*\n*Autor:* ${video.author.name}`;

      // Enviar un mensaje de que se está procesando
      await sock.sendMessage(msg.key.remoteJid, { text: `Descargando audio...` }, { quoted: msg });

      // Llamar a la API de descarga de audio
      const apiUrl = `${config.api.ytmp3}?url=${videoUrl}`;
      const response = await axios.get(apiUrl, { responseType: 'json' });
      const downloadUrl = response.data.resultado.url;

      // Enviar el archivo de audio
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          audio: { url: downloadUrl },
          mimetype: 'audio/mpeg',
          // Añadimos el caption al audio
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

      // Editar el mensaje de espera original (opcional, pero da buen feedback)
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Audio enviado: ${video.title}`, edit: waitingMsg.key });

    } catch (error) {
      console.error("Error en el comando play:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "Ocurrió un error al procesar tu solicitud de audio." }, { quoted: msg });
    }
  }
};

export default playCommand;
