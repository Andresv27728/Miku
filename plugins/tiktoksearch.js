import axios from 'axios';

const tiktokSearchCommand = {
  name: "tiktoksearch",
  category: "buscador",
  description: "Busca videos en TikTok y envía los enlaces.",
  aliases: ["tiktoks", "ttsearch"],

  async execute({ sock, msg, args }) {
    const query = args.join(' ');
    if (!query) {
      return sock.sendMessage(msg.key.remoteJid, { text: "☁️ ¿Qué quieres buscar en TikTok?" }, { quoted: msg });
    }

    const waitingMsg = await sock.sendMessage(msg.key.remoteJid, { text: "☁️ Buscando videos en TikTok..." }, { quoted: msg });

    try {
      const { data: response } = await axios.get(`https://delirius-apiofc.vercel.app/search/tiktoksearch?query=${encodeURIComponent(query)}`);

      if (!response.meta || response.meta.length === 0) {
        return sock.sendMessage(msg.key.remoteJid, { text: "❌ No se encontraron resultados para tu búsqueda." }, { quoted: msg, edit: waitingMsg.key });
      }

      const searchResults = response.meta.slice(0, 5); // Tomar los primeros 5 resultados

      let resultText = `🔎 *Resultados de búsqueda para "${query}":*\n\n`;

      searchResults.forEach((result, index) => {
        resultText += `*${index + 1}. Título:* ${result.title}\n`;
        resultText += `*Enlace:* ${result.hd}\n\n`;
      });

      await sock.sendMessage(msg.key.remoteJid, { text: resultText }, { quoted: msg, edit: waitingMsg.key });

    } catch (error) {
      console.error("Error en el comando tiktoksearch:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Ocurrió un error al realizar la búsqueda." }, { quoted: msg, edit: waitingMsg.key });
    }
  }
};

export default tiktokSearchCommand;
