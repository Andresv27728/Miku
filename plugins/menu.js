const menuCommand = {
  name: "menu",
  category: "general",
  description: "Muestra el menú de comandos del bot.",

  async execute({ sock, msg, commands, config }) {
    const categories = {};

    // Agrupar comandos por categoría
    commands.forEach(command => {
      if (!command.category) return;
      if (!categories[command.category]) {
        categories[command.category] = [];
      }
      categories[command.category].push(command.name);
    });

    // Construir el mensaje del menú
    let menuText = `Hola, ¡soy ${config.botName}!\nAquí tienes mi lista de comandos:\n\n`;

    for (const category in categories) {
      menuText += `*┌─── 「 ${category.toUpperCase()} 」*
*│*
`;
      categories[category].forEach(commandName => {
        const command = commands.get(commandName);
        menuText += `*│*  \`${commandName}\`\n*│*  _${command.description || 'Sin descripción'}_
*│*
`;
      });
      menuText += `*└─────────────────*\n\n`;
    }

    menuText += `_Bot desarrollado por ${config.ownerName}._`;

    await sock.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg });
  }
};

export default menuCommand;
