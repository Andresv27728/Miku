import { exec } from 'child_process';
import yts from 'yt-search';
import fs from 'fs';
import path from 'path';

// Helper function to run shell commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

// Helper function to get a stream from yt-dlp
async function getStream(url) {
    // We will save to a temp file because getting buffer directly can be unstable with large files
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    const tempPath = path.join(tempDir, `${Date.now()}.mp3`);

    // Command to download the best audio and save it to the temp file
    const command = `yt-dlp -o "${tempPath}" -f bestaudio --extract-audio --audio-format mp3 --audio-quality 0 "${url}"`;

    await runCommand(command);

    return tempPath;
}


const playCommand = {
  name: "play",
  category: "descargas",
  description: "Busca y descarga una canción en formato de audio (MP3).",

  async execute({ sock, msg, args }) {
    if (args.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, proporciona el nombre de una canción." }, { quoted: msg });
    }

    const query = args.join(' ');
    let waitingMsg;

    try {
      waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: `🎶 Buscando "${query}"...` }, { quoted: msg });

      const searchResults = await yts(query);
      if (!searchResults.videos.length) {
        throw new Error("No se encontraron resultados para tu búsqueda.");
      }
      const videoInfo = searchResults.videos[0];
      const videoTitle = videoInfo.title;

      await sock.sendMessage(msg.key.remoteJid, { text: `✅ Encontrado: *${videoTitle}*.\n\n⬇️ Descargando... (esto puede tardar un poco)` }, { edit: waitingMsg.key });

      const tempFilePath = await getStream(videoInfo.url);
      const audioBuffer = fs.readFileSync(tempFilePath);

      // Enviar como audio reproducible
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          audio: audioBuffer,
          mimetype: 'audio/mpeg'
        },
        { quoted: msg }
      );

      // Enviar como documento
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          document: audioBuffer,
          mimetype: 'audio/mpeg',
          fileName: `${videoTitle}.mp3`
        },
        { quoted: msg }
      );

      // Limpiar el archivo temporal
      fs.unlinkSync(tempFilePath);

    } catch (error) {
      console.error("Error en el comando play:", error);
      const errorMsg = { text: `Ocurrió un error al procesar la solicitud. Inténtalo de nuevo.` };
      if (waitingMsg) {
        await sock.sendMessage(msg.key.remoteJid, { ...errorMsg, edit: waitingMsg.key });
      } else {
        await sock.sendMessage(msg.key.remoteJid, errorMsg, { quoted: msg });
      }
    }
  }
};

export default playCommand;
