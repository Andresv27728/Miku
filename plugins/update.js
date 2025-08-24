import { exec } from 'child_process';

const updateCommand = {
  name: "update",
  category: "propietario",
  description: "Actualiza el bot a la última versión desde el repositorio de GitHub.",

  async execute({ sock, msg, config }) {
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];

    if (!config.ownerNumbers.includes(senderNumber)) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Este comando solo puede ser utilizado por el propietario del bot." }, { quoted: msg });
      return;
    }

    await sock.sendMessage(msg.key.remoteJid, { text: "Iniciando actualización... Descargando los últimos cambios desde GitHub." }, { quoted: msg });

    exec('git pull', async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error en git pull: ${error.message}`);
        await sock.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error durante la actualización:\n\n${error.message}` }, { quoted: msg });
        return;
      }
      if (stderr) {
         // git pull a menudo usa stderr para mensajes de estado, así que lo tratamos como info
        console.log(`Git stderr: ${stderr}`);
      }

      let response = `*Resultado de la Actualización:*\n\n\`\`\`${stdout}\`\`\``;
      if (stdout.includes("Already up to date.") || stdout.includes("Ya está actualizado.")) {
        response = "El bot ya está en la última versión. No hay actualizaciones pendientes.";
      } else {
        response += "\n\nActualización completada. Se recomienda reiniciar el bot para aplicar todos los cambios.";
      }

      await sock.sendMessage(msg.key.remoteJid, { text: response }, { quoted: msg });
    });
  }
};

export default updateCommand;
