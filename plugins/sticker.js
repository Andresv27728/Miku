const stickerCommand = {
  name: "sticker",
  category: "diversion",
  description: "Convierte una imagen en un sticker.",

  async execute({ sock, msg }) {
    const stickerText = "Para crear un sticker, envía una imagen con el comando `sticker` o responde a una imagen con `sticker`.";
    // Aquí iría la lógica para descargar la imagen (si es un mensaje con imagen)
    // y usar una librería como 'wa-sticker-formatter' para crear el sticker.
    await sock.sendMessage(msg.key.remoteJid, { text: stickerText }, { quoted: msg });
  }
};

export default stickerCommand;
