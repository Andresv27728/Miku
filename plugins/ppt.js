const pptCommand = {
  name: "ppt",
  category: "juegos",
  description: "Juega Piedra, Papel o Tijera contra el bot. Uso: ppt [piedra|papel|tijera]",

  async execute({ sock, msg, args }) {
    const choices = ["piedra", "papel", "tijera"];
    const userChoice = args[0]?.toLowerCase();

    // 1. Validar la elección del usuario
    if (!userChoice || !choices.includes(userChoice)) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Por favor, elige una opción válida: piedra, papel o tijera.\nEjemplo: `ppt piedra`" }, { quoted: msg });
      return;
    }

    // 2. El bot elige aleatoriamente
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    // 3. Determinar el ganador
    let resultText;
    if (userChoice === botChoice) {
      resultText = "¡Es un empate! 🤝";
    } else if (
      (userChoice === "piedra" && botChoice === "tijera") ||
      (userChoice === "papel" && botChoice === "piedra") ||
      (userChoice === "tijera" && botChoice === "papel")
    ) {
      resultText = "¡Ganaste! 🎉";
    } else {
      resultText = "¡Perdiste! 🤖";
    }

    // 4. Enviar el resultado
    const fullMessage = `*Piedra, Papel o Tijera*\n\nTu elección: ${getEmoji(userChoice)}\nElección del bot: ${getEmoji(botChoice)}\n\n*Resultado:* ${resultText}`;
    await sock.sendMessage(msg.key.remoteJid, { text: fullMessage }, { quoted: msg });
  }
};

// Función de ayuda para obtener emojis
function getEmoji(choice) {
  if (choice === "piedra") return "🗿";
  if (choice === "papel") return "📄";
  if (choice === "tijera") return "✂️";
  return "";
}

export default pptCommand;
