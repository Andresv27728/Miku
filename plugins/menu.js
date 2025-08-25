// Mapa de emojis para las categorías
const categoryEmojis = {
  'general': 'ℹ️',
  'descargas': '📥',
  'diversion': '🎉',
  'juegos': '🎮',
  'grupos': '👥',
  'propietario': '👑',
  'utilidades': '🛠️',
  'informacion': '📚',
  'default': '⚙️'
};

const menuCommand = {
  name: "menu",
  category: "general",
  description: "Muestra el menú de comandos del bot.",
  aliases: ["help", "ayuda"],

  async execute({ sock, msg, commands, config }) {
    const categories = {};

    // Agrupar comandos por categoría
    commands.forEach(command => {
      if (!command.category || command.name === 'test') return; // Ocultar el comando test
      if (!categories[command.category]) {
        categories[command.category] = [];
      }
      // No añadir alias al menú principal
      if (command.name && !commands.get(command.name)?.aliases?.includes(command.name)) {
         categories[command.category].push(command.name);
      }
    });

    // Ordenar categorías
    const sortedCategories = Object.keys(categories).sort();

    // --- Construcción del nuevo menú ---
    let menuText = `╭─── 「 *${config.botName}* 」 ───╮\n`;
    menuText += `│\n`;
    menuText += `│  Hola, *${msg.pushName}*!\n`;
    menuText += `│  Aquí tienes la lista de mis comandos.\n`;
    menuText += `│\n`;
    menuText += `├─「 *Comandos Disponibles* 」\n`;

    for (const category of sortedCategories) {
      const emoji = categoryEmojis[category] || categoryEmojis['default'];
      menuText += `│\n`;
      menuText += `│  *${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}*\n`;
      const commandList = categories[category].map(cmd => `\`${cmd}\``).join(', ');
      menuText += `│  ${commandList}\n`;
    }

    menuText += `│\n`;
    menuText += `╰───「 _by ${config.ownerName}_ 」───╯`;

    await sock.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg });
  }
};

export default menuCommand;
