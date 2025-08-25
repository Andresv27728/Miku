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
    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `Buscando y preparando video para "${query}"...` }, { quoted: msg });

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
      await sock.sendMessage(msg.key.remoteJid, { text: `Descargando video...` }, { quoted: msg });

      // Llamar a la API de descarga de video
      const apiUrl = `${config.api.ytmp4}?url=${videoUrl}`;
      const response = await axios.get(apiUrl, { responseType: 'json' });
      const downloadUrl = response.data.resultado.url;

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

      // Editar el mensaje de espera original (opcional, pero da buen feedback)
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Video enviado: ${video.title}`, edit: waitingMsg.key });

    } catch (error) {
      console.error("Error en el comando play2:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "Ocurrió un error al procesar tu solicitud de video." }, { quoted: msg });
    }
  }
};

export default play2Command;
