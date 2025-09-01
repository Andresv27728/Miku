import axios from 'axios';
import youtubedl from 'youtube-dl-exec';

const spotifyCommand = {
  name: "spotify",
  category: "descargas",
  description: "Busca una canción en Spotify y la descarga.",
  aliases: ["spot"],

  async execute({ sock, msg, args }) {
    const query = args.join(' ');
    if (!query) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona el nombre de una canción para buscar en Spotify." }, { quoted: msg });
    }

    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `🎶 Buscando "${query}" en Spotify...` }, { quoted: msg });

    try {
      // --- Paso 1: Obtener metadatos de Spotify ---
      const spotifyApiUrl = `https://api.hanggts.xyz/download/playspotify?q=${encodeURIComponent(query)}`;
      const spotifyResponse = await axios.get(spotifyApiUrl);
      const spotifyData = spotifyResponse.data;

      if (!spotifyData.status || !spotifyData.result || !spotifyData.result.metadata) {
        throw new Error("No se pudo encontrar la canción en Spotify o la API falló.");
      }

      const metadata = spotifyData.result.metadata;
      const { title, artists, cover_url } = metadata;
      const artistString = Array.isArray(artists) ? artists.join(', ') : artists;

      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Canción encontrada: *${title} - ${artistString}*.\n\n⬇️ Ahora descargando el audio desde YouTube...` }, { edit: waitingMsg.key });

      // --- Paso 2: Descargar audio desde YouTube ---
      const ytSearchQuery = `${title} ${artistString} audio`;
      const audioUrl = await youtubedl(ytSearchQuery, {
        "default-search": "ytsearch",
        "get-url": true,
        "format": "bestaudio/best",
      });

      if (!audioUrl) {
        throw new Error("No se pudo encontrar el audio en YouTube.");
      }

      // --- Paso 3: Enviar el audio con metadatos ---
      const messageOptions = {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        contextInfo: {
          externalAdReply: {
            title: title,
            body: artistString,
            thumbnail: (await axios.get(cover_url, { responseType: 'arraybuffer' })).data, // Descargar la carátula
            mediaType: 1,
            mediaUrl: metadata.link,
            sourceUrl: metadata.link
          }
        }
      };

      await sock.sendMessage(msg.key.remoteJid, messageOptions, { quoted: msg });

    } catch (error) {
      console.error("Error en el comando spotify:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Ocurrió un error: ${error.message}` }, { quoted: msg, edit: waitingMsg.key });
    }
  }
};

export default spotifyCommand;
