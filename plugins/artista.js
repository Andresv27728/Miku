import yts from 'yt-search';
import fs from 'fs';
import axios from 'axios';
import { downloadWithYtdlp, downloadWithMaya } from '../lib/downloaders.js';

let isDownloadingArtist = false; // Flag para prevenir ejecuciones concurrentes

const artistaCommand = {
  name: "artista",
  category: "descargas",
  description: "Descarga las 10 canciones más populares de un artista.",

  async execute({ sock, msg, args }) {
    if (isDownloadingArtist) {
      return sock.sendMessage(msg.key.remoteJid, { text: "⚠️ ¡Ya hay una descarga de artista en curso! Por favor, espera a que termine." }, { quoted: msg });
    }

    const artistName = args.join(' ');
    if (!artistName) {
      return sock.sendMessage(msg.key.remoteJid, { text: "💡 Debes proporcionar el nombre de un artista." }, { quoted: msg });
    }

    isDownloadingArtist = true;
    let waitingMsg;

    try {
      waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `🔔 Buscando las mejores canciones de *${artistName}*...` }, { quoted: msg });

      const searchUrl = `https://delirius-apiofc.vercel.app/search/searchtrack?q=${encodeURIComponent(artistName)}`;
      const searchResponse = await axios.get(searchUrl);
      const tracks = searchResponse.data;

      if (!Array.isArray(tracks) || tracks.length === 0) {
        throw new Error("No se encontraron resultados para ese artista.");
      }

      const tracksToDownload = tracks.slice(0, 10);
      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Encontradas ${tracksToDownload.length} canciones. Iniciando descargas en orden...` }, { edit: waitingMsg.key });

      for (let i = 0; i < tracksToDownload.length; i++) {
        const track = tracksToDownload[i];
        const trackTitle = track.title || "Título Desconocido";

        try {
          // Extraer ID del video para verificar la duración
          const videoIdMatch = track.url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:\?|&|#|$)/);
          if (!videoIdMatch) {
            console.warn(`artista: No se pudo extraer el ID de la URL: ${track.url}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ No se pudo procesar la URL para *${trackTitle}*. Saltando.` }, { quoted: msg });
            continue;
          }
          const videoId = videoIdMatch[1];
          const videoInfo = await yts({ videoId });

          // Verificar la duración
          const maxDuration = 18000; // 5 horas
          if (videoInfo && videoInfo.seconds > maxDuration) {
            await sock.sendMessage(msg.key.remoteJid, { text: `⏭️ Saltando *${trackTitle}* (muy largo, >5 horas).` }, { quoted: msg });
            continue;
          }

          // Proceder a la descarga
          await sock.sendMessage(msg.key.remoteJid, { text: `[${i + 1}/${tracksToDownload.length}] Descargando: *${trackTitle}*...` }, { quoted: msg });

          let audioBuffer;
          try {
            const tempFilePath = await downloadWithYtdlp(track.url, false);
            audioBuffer = fs.readFileSync(tempFilePath);
            fs.unlinkSync(tempFilePath);
          } catch (e1) {
            console.error(`artista: yt-dlp failed for ${trackTitle}:`, e1.message);
            try {
              const mayaUrl = await downloadWithMaya(track.url, false);
              audioBuffer = (await axios.get(mayaUrl, { responseType: 'arraybuffer' })).data;
            } catch (e2) {
              console.error(`artista: Maya API failed for ${trackTitle}:`, e2.message);
              await sock.sendMessage(msg.key.remoteJid, { text: `❌ Falló la descarga de *${trackTitle}*. Saltando.` }, { quoted: msg });
              continue;
            }
          }

          await sock.sendMessage(msg.key.remoteJid, { audio: audioBuffer, mimetype: 'audio/mpeg' }, { quoted: msg });
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa

        } catch (error) {
          console.error(`Error procesando la canción ${trackTitle}:`, error);
          await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error al procesar *${trackTitle}*. Saltando.` }, { quoted: msg });
          continue;
        }
      }

      await sock.sendMessage(msg.key.remoteJid, { text: "✅ *Descargas Finalizadas Exitosamente.*" }, { quoted: msg });

    } catch (error) {
      console.error("Error en el comando artista:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ *Error:* ${error.message}` }, { quoted: msg });
    } finally {
      isDownloadingArtist = false; // Liberar el bloqueo
    }
  }
};

export default artistaCommand;
