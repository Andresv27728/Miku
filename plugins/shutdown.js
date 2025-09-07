const shutdownCommand = {
  name: "shutdown",
  category: "propietario",
  description: "Apaga el bot. Este comando solo puede ser usado por el propietario.",
  aliases: ["apagar"],

  async execute({ sock, msg }) {
    try {
      await sock.sendMessage(msg.key.remoteJid, { text: "✅ Apagando el bot..." }, { quoted: msg });
      // Un pequeño retraso para asegurar que el mensaje se envíe antes de apagar.
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (e) {
      console.error("Error en el comando shutdown:", e);
      // Si hay un error, al menos intenta apagar el proceso.
      process.exit(1);
    }
  }
};

export default shutdownCommand;
