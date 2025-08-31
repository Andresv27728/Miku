const shopItems = [
  { name: "Caña de Pescar", price: 2500, description: "Aumenta tus ganancias en la pesca." },
  { name: "Poción de Suerte", price: 7000, description: "Aumenta la probabilidad de éxito en los robos por 24h." },
  { name: "Mascota Rara", price: 15000, description: "Demuestra tu estatus con una mascota exótica." },
  { name: "Cofre del Tesoro", price: 50000, description: "Contiene una cantidad aleatoria de monedas (puede ser más o menos del precio)." }
];

const shopCommand = {
  name: "shop",
  category: "economia",
  description: "Muestra la tienda de artículos.",
  aliases: ["tienda"],

  async execute({ sock, msg }) {
    let shopMessage = "🛍️ *Tienda de Artículos* 🛍️\n\n";
    shopMessage += "Usa el comando `buy <item>` para comprar.\n\n";

    shopItems.forEach(item => {
      shopMessage += `*${item.name}* - Precio: *${item.price} coins*\n`;
      shopMessage += `> _${item.description}_\n\n`;
    });

    await sock.sendMessage(msg.key.remoteJid, { text: shopMessage }, { quoted: msg });
  }
};

export default shopCommand;
