import axios from 'axios';

const iaCommand = {
  name: "ia",
  category: "ias",
  description: "Habla con una inteligencia artificial.",

  async execute({ sock, msg, args, config, iaConversations }) {
    const query = args.join(' ');
    if (!query) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Por favor, hazme una pregunta." }, { quoted: msg });
    }

    const senderId = msg.sender;
    let conversation = iaConversations.get(senderId);

    // Iniciar o continuar la conversación
    if (!conversation) {
      conversation = { count: 1 };
    } else {
      conversation.count++;
    }

    try {
      const apiUrl = `https://myapiadonix.vercel.app/api/adonix?q=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl);
      let aiResponse = response.data?.resultado || "No pude obtener una respuesta.";

      // Si es el último mensaje, añadir una despedida
      if (conversation.count >= 5) {
        aiResponse += "\n\n*Has alcanzado el límite de 5 mensajes. Para continuar, inicia una nueva conversación con el comando `ia`.*";
        iaConversations.delete(senderId);
      }

      const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: aiResponse }, { quoted: msg });

      // Actualizar el estado de la conversación solo si no ha terminado
      if (conversation.count < 5) {
        conversation.lastMessageId = sentMsg.key.id;
        iaConversations.set(senderId, conversation);
      }

    } catch (error) {
      console.error("Error en el comando ia:", error.message);
      await sock.sendMessage(msg.key.remoteJid, { text: "Ocurrió un error al contactar a la IA." }, { quoted: msg });
      // Limpiar la conversación si hay un error
      if (iaConversations.has(senderId)) {
        iaConversations.delete(senderId);
      }
    }
  }
};

export default iaCommand;
