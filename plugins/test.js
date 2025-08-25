import fetch from 'node-fetch';
import yts from 'yt-search';
import axios from 'axios';

// --- Helper Functions con Logging ---

async function showDownloadOptions(sock, msg, videoInfo, testCache, config) {
  console.log('[test.js] Entrando a showDownloadOptions...');
  try {
    if (videoInfo && videoInfo.seconds > 3780) {
      console.log('[test.js] Video demasiado largo, abortando.');
      await sock.sendMessage(msg.key.remoteJid, { text: 'El video supera el límite de duración permitido (63 minutos).' }, { quoted: msg });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    console.log(`[test.js] Guardando en caché para senderId: ${senderId}`);
    testCache.set(senderId, {
      video: videoInfo,
      timestamp: Date.now()
    });

    const title = videoInfo.title || 'Video sin título';
    const duration = videoInfo.timestamp || 'Desconocida';
    const thumbnail = videoInfo.thumbnail || videoInfo.image || '';

    console.log(`[test.js] Preparando templateMessage para "${title}"`);
    const templateButtons = [
      { index: 1, quickReplyButton: { displayText: '🎵 Audio', id: `test audio_${senderId}` } },
      { index: 2, quickReplyButton: { displayText: '🎬 Video', id: `test video_${senderId}` } }
    ];

    const templateMessage = {
      text: `*${title}*\n\n*Canal:* ${videoInfo.author?.name}\n*Duración:* ${duration}`,
      footer: 'Elige una opción',
      templateButtons: templateButtons,
      contextInfo: {
        externalAdReply: {
          title: title,
          body: `${videoInfo.author?.name} • ${duration}`,
          thumbnailUrl: thumbnail,
          sourceUrl: videoInfo.url,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    };

    console.log('[test.js] Enviando mensaje con opciones...');
    await sock.sendMessage(msg.key.remoteJid, templateMessage, { quoted: msg });
    console.log('[test.js] Mensaje con opciones enviado exitosamente.');

  } catch (e) {
    console.error('[test.js] Error en showDownloadOptions:', e);
    await sock.sendMessage(msg.key.remoteJid, { text: 'Error al mostrar opciones de descarga.' }, { quoted: msg });
  }
}

async function handleDownload(sock, msg, selection, testCache, config) {
  console.log(`[test.js] Entrando a handleDownload con la selección: "${selection}"`);
  const senderId = msg.key.participant || msg.key.remoteJid;
  const requestedId = selection.split('_')[1];
  const type = selection.split('_')[0];

  if (requestedId !== senderId) {
    console.log(`[test.js] ID de usuario no coincide. Solicitado: ${requestedId}, Usuario: ${senderId}`);
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Esta opción de descarga no es para ti.' }, { quoted: msg });
  }

  if (!testCache.has(senderId)) {
    console.log(`[test.js] No se encontró caché para el usuario: ${senderId}`);
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Tu búsqueda ha expirado o no existe. Realiza una nueva búsqueda.' }, { quoted: msg });
  }

  const cached = testCache.get(senderId);
  console.log('[test.js] Caché encontrado, procediendo a la descarga.');

  try {
    const videoInfo = cached.video;
    const apiUrl = type === 'audio'
      ? `${config.api.ytmp3}?url=${videoInfo.url}`
      : `${config.api.ytmp4}?url=${videoInfo.url}`;

    console.log(`[test.js] Llamando a la API: ${apiUrl}`);
    await sock.sendMessage(msg.key.remoteJid, { text: `Procesando ${type}... (Puede tardar hasta 90 segundos)` }, { quoted: msg });

    const response = await axios.get(apiUrl, { timeout: 90000 });
    const downloadUrl = response.data.resultado.url;
    console.log(`[test.js] URL de descarga obtenida: ${downloadUrl}`);

    if (!downloadUrl) throw new Error('La API no devolvió una URL de descarga válida.');

    if (type === 'audio') {
      await sock.sendMessage(msg.key.remoteJid, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg' }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { video: { url: downloadUrl }, mimetype: 'video/mp4', caption: `*${videoInfo.title}*` }, { quoted: msg });
    }
    console.log(`[test.js] Archivo de ${type} enviado exitosamente.`);

    testCache.delete(senderId);

  } catch (e) {
    console.error('[test.js] Error en handleDownload:', e);
    const errorMessage = e.code === 'ECONNABORTED'
      ? 'El servidor de descargas tardó demasiado en responder.'
      : 'Error al procesar la descarga. La API podría estar fallando.';
    await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
  }
}

// --- Main Handler ---
const testCommand = {
  name: "test",
  category: "descargas",
  description: "Busca y descarga audio/video de YouTube con opciones.",

  async execute({ sock, msg, args, testCache, config }) {
    console.log(`[test.js] Comando 'test' ejecutado con args: "${args.join(' ')}"`);
    if (!args[0]) return sock.sendMessage(msg.key.remoteJid, { text: `Uso correcto: test <enlace o nombre>` }, { quoted: msg });

    try {
      const input = args.join(' ');

      if (input.startsWith('audio_') || input.startsWith('video_')) {
        return await handleDownload(sock, msg, input, testCache, config);
      }

      let videoInfo = null;

      if (input.includes('youtube.com') || input.includes('youtu.be')) {
        console.log('[test.js] Detectado enlace de YouTube.');
        let id = input.split('v=')[1]?.split('&')[0] || input.split('/').pop();
        let search = await yts({ videoId: id });
        if (search && search.title) videoInfo = search;
      } else {
        console.log(`[test.js] Iniciando búsqueda en yt-search para: "${input}"`);
        let search = await yts(input);
        if (!search.videos || search.videos.length === 0) {
          console.log('[test.js] No se encontraron resultados en yt-search.');
          return sock.sendMessage(msg.key.remoteJid, { text: 'No se encontraron resultados.' }, { quoted: msg });
        }
        videoInfo = search.videos[0];
        console.log(`[test.js] Resultado encontrado: "${videoInfo.title}"`);
      }

      if (videoInfo) {
        await showDownloadOptions(sock, msg, videoInfo, testCache, config);
      } else {
        console.log('[test.js] No se pudo obtener la información del video.');
        await sock.sendMessage(msg.key.remoteJid, { text: 'No se pudo obtener la información del video.' }, { quoted: msg });
      }

    } catch (e) {
      console.error('[test.js] Error en el handler principal:', e);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Ocurrió un error al procesar la solicitud.' }, { quoted: msg });
    }
  }
};

export default testCommand;
