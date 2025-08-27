import { googleImage } from '@bochilteam/scraper';
import axios from 'axios';

const forbiddenWords = ['caca', 'polla', 'porno', 'porn', 'gore', 'cum', 'semen', 'puta', 'puto', 'culo', 'putita', 'putito','pussy', 'hentai', 'pene', 'coño', 'asesinato', 'zoofilia', 'mia khalifa', 'desnudo', 'desnuda', 'cuca', 'chocha', 'muertos', 'pornhub', 'xnxx', 'xvideos', 'teta', 'vagina', 'marsha may', 'misha cross', 'sexmex', 'furry', 'furro', 'furra', 'xxx', 'rule34', 'panocha', 'pedofilia', 'necrofilia', 'pinga', 'horny', 'ass', 'nude', 'popo', 'nsfw', 'femdom', 'futanari', 'erofeet', 'sexo', 'sex', 'yuri', 'ero', 'ecchi', 'blowjob', 'anal', 'ahegao', 'pija', 'verga', 'trasero', 'violation', 'violacion', 'bdsm', 'cachonda', '+18', 'cp', 'mia marin', 'lana rhoades', 'cepesito', 'hot', 'buceta', 'xxx', 'Violet Myllers', 'Violet Myllers pussy', 'Violet Myllers desnuda', 'Violet Myllers sin ropa', 'Violet Myllers culo', 'Violet Myllers vagina', 'Pornografía', 'Pornografía infantil', 'niña desnuda', 'niñas desnudas', 'niña pussy', 'niña pack', 'niña culo', 'niña sin ropa', 'niña siendo abusada', 'niña siendo abusada sexualmente' , 'niña cogiendo', 'niña fototeta', 'niña vagina', 'hero Boku no pico', 'Mia Khalifa cogiendo', 'Mia Khalifa sin ropa', 'Mia Khalifa comiendo polla', 'Mia Khalifa desnuda'];

const imagenCommand = {
  name: "imagen",
  category: "busquedas",
  description: "Busca una imagen en Google.",
  aliases: ["image", "gimage"],

  async execute({ sock, msg, args }) {
    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, { text: "¿Qué imagen estás buscando?" }, { quoted: msg });
    }

    if (forbiddenWords.some(word => text.toLowerCase().includes(word))) {
      return sock.sendMessage(msg.key.remoteJid, { text: "No voy a buscar eso." }, { quoted: msg });
    }

    try {
      await sock.sendMessage(msg.key.remoteJid, { text: `Buscando imágenes de "${text}"...` }, { quoted: msg });

      const res = await googleImage(text);
      const imageUrl = await res.getRandom();

      if (!imageUrl) {
        throw new Error("No se encontró una URL de imagen válida.");
      }

      // Descargar la imagen a un buffer para asegurar el envío
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');

      await sock.sendMessage(msg.key.remoteJid, {
        image: imageBuffer,
        caption: `Resultado de: *${text}*`
      }, { quoted: msg });

    } catch (e) {
      console.error("Error en el comando imagen:", e);
      await sock.sendMessage(msg.key.remoteJid, { text: `No se pudo obtener una imagen para "${text}".` }, { quoted: msg });
    }
  }
};

export default imagenCommand;
