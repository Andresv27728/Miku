import axios from 'axios';

const imagenCommand = {
  name: "imagen",
  category: "busquedas",
  description: "Busca y envía una imagen sobre un tema.",
  aliases: ["image"],

  async execute({ sock, msg, args }) {
    const query = args.join(' ');
    if (!query) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, dime qué imagen quieres que busque." }, { quoted: msg });
    }

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: `Buscando imágenes de "${query}"...` }, { quoted: msg });

      // Usamos una API pública para la búsqueda de imágenes
      const apiUrl = `https://api.akuari.my.id/search/image?query=${encodeURIComponent(query)}`;
      const apiResponse = await axios.get(apiUrl);

      const images = apiResponse.data?.result;

      if (!images || images.length === 0) {
        throw new Error("No se encontraron imágenes para esa búsqueda.");
      }

      // Tomar una imagen al azar de los resultados
      const randomImage = images[Math.floor(Math.random() * images.length)];
      const imageUrl = randomImage.url;

      // Descargar la imagen a un buffer para asegurar el envío
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');

      await sock.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        caption: `Aquí tienes una imagen de "${query}".`
      }, { quoted: msg });

    } catch (e) {
      console.error("Error en el comando imagen:", e);
      await sock.sendMessage(msg.key.remoteJid, { text: `No se pudo obtener una imagen para "${query}".` }, { quoted: msg });
    }
  }
};

export default imagenCommand;
