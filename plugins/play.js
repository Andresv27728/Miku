import axios from 'axios';

const playCommand = {
  name: "play",
  category: "descargas",
  description: "Busca y descarga una canción en formato de audio (MP3).",

  async execute({ sock, msg, args }) {
    if (args.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona el nombre de una canción." }, { quoted: msg });
    }

    const query = args.join(' ');
    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `Buscando y procesando "${query}"...` }, { quoted: msg });

    try {
      const apiUrl = `https://apis.davidcyriltech.my.id/play?query=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl, { timeout: 120000 });

      // La estructura de la respuesta de esta API puede variar.
      // Intentamos obtener la URL de varias formas comunes.
      const downloadUrl = response.data?.result?.url || response.data?.url || response.data?.link;
      const videoTitle = response.data?.result?.title || response.data?.title || query;

      if (!downloadUrl) {
        console.error("Respuesta de la API sin URL:", response.data);
        throw new Error("La API no devolvió una URL de descarga válida.");
      }

      await sock.sendMessage(msg.key.remoteJid, { text: `Enviando audio para *${videoTitle}*...` }, { edit: waitingMsg.key });

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          audio: { url: downloadUrl },
          mimetype: 'audio/mpeg'
        },
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en el comando play:", error);
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Detalle del error:", errorMessage);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(msg.key.remoteJid, { text: "El servidor de descargas tardó demasiado en responder." }, { edit: waitingMsg.key, quoted: msg });
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error al procesar la solicitud de audio.`, edit: waitingMsg.key, quoted: msg });
      }
    }
  }
};

export default playCommand;
