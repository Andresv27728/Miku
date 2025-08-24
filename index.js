import { Boom } from '@hapi/boom';
// Usaremos una importación de 'namespace' para más robustez.
import Baileys, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import axios from 'axios';

// --- CONFIGURACIÓN DE DIRECTORIOS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- LOGGER ---
// El logger ahora está en 'info' para dar más detalles en la consola.
const logger = pino({ level: 'info' });

// --- COLECCIÓN DE COMANDOS ---
const commands = new Map();

// --- FUNCIÓN PARA CARGAR COMANDOS (sin cambios) ---
async function loadCommands() {
  const pluginsDir = path.join(__dirname, 'plugins');
  try {
    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
      try {
        const commandModule = await import(path.join('file://', pluginsDir, file));
        const command = commandModule.default;
        if (command && command.name) {
          commands.set(command.name, command);
          console.log(`[+] Comando cargado: ${command.name}`);
        }
      } catch (error) {
        console.error(`[-] Error al cargar el comando ${file}:`, error);
      }
    }
  } catch (error) {
    console.error(`[-] No se pudo leer la carpeta de plugins:`, error);
  }
}

// --- LÓGICA DE CONEXIÓN REESCRITA ---
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando Baileys v${version.join('.')}, ¿es la última versión?: ${isLatest}`);

  // La clave del cambio: usamos Baileys.default, que es la forma más segura
  // de acceder al export principal en entornos mixtos de módulos.
  const sock = Baileys.default({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: true,
    logger,
    browser: ['JulesBot', 'Chrome', '1.0.0'],
  });

  // El resto del manejo de eventos permanece igual.
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error instanceof Boom) &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada debido a', lastDisconnect.error, ', reconectando...', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('Conexión abierta. ¡Bot en línea!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // --- MANEJO DE MENSAJES (sin cambios) ---
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const messageType = Object.keys(msg.message)[0];
    const body = (messageType === 'conversation') ? msg.message.conversation :
                 (messageType === 'extendedTextMessage') ? msg.message.extendedTextMessage.text :
                 (messageType === 'buttonsResponseMessage') ? msg.message.buttonsResponseMessage.selectedButtonId :
                 (messageType === 'listResponseMessage') ? msg.message.listResponseMessage.singleSelectReply.selectedRowId : '';

    const args = body.trim().split(/ +/).slice(1);
    const commandName = body.trim().split(/ +/)[0].toLowerCase();
    const command = commands.get(commandName);

    if (command) {
      try {
        await command.execute({ sock, msg, args, commands, config });
      } catch (error) {
        console.error(`Error al ejecutar el comando ${commandName}:`, error);
        await sock.sendMessage(from, { text: 'Ocurrió un error al intentar ejecutar ese comando.' }, { quoted: msg });
      }
    }

    if (messageType === 'buttonsResponseMessage') {
      const [action, type, url] = body.split('_');
      if (action === 'descargar' && url) {
        const apiUrl = type === 'audio' ? `${config.api.ytmp3}?url=${url}` : `${config.api.ytmp4}?url=${url}`;
        await sock.sendMessage(from, { text: `Procesando tu solicitud de ${type}...` }, { quoted: msg });
        try {
          const response = await axios.get(apiUrl, { responseType: 'json' });
          const downloadUrl = response.data.resultado.url;
          if (type === 'audio') {
            await sock.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg' }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { video: { url: downloadUrl }, mimetype: 'video/mp4' }, { quoted: msg });
          }
        } catch (error) {
          console.error("Error al descargar:", error);
          await sock.sendMessage(from, { text: `No se pudo procesar la descarga desde la API.` }, { quoted: msg });
        }
      }
    }
  });

  return sock;
}

// --- INICIO DEL BOT ---
(async () => {
  await loadCommands();
  await connectToWhatsApp();
})();
