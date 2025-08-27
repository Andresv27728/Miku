import { Boom } from '@hapi/boom';
import Baileys, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import axios from 'axios';

// --- CONFIGURACIÓN GLOBAL ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = pino({ level: 'warn' });

// --- COLECCIONES GLOBALES ---
const commands = new Map();
const aliases = new Map();
const testCache = new Map();
const cooldowns = new Map();
export const subBots = new Map();

// --- CONFIGURACIÓN DE TIEMPOS ---
const COOLDOWN_SECONDS = 5;
const RESPONSE_DELAY_MS = 2000;

// --- FUNCIÓN PARA CARGAR COMANDOS ---
async function loadCommands() {
  const pluginsDir = path.join(__dirname, 'plugins');
  if (commands.size > 0) return;
  try {
    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
      try {
        const commandModule = await import(path.join('file://', pluginsDir, file));
        const command = commandModule.default;
        if (command && command.name) {
          commands.set(command.name, command);
          if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => aliases.set(alias, command.name));
          }
        }
      } catch (error) { console.error(`[-] Error al cargar ${file}:`, error); }
    }
    console.log(`[+] ${commands.size} comandos y ${aliases.size} alias cargados.`);
  } catch (error) { console.error(`[-] No se pudo leer la carpeta de plugins:`, error); }
}

// --- FUNCIÓN DE INICIO DE BOT ---
export async function startBot(sessionId, isSubBot = false, requesterMsg = null) {
  console.log(`Iniciando bot para la sesión: ${sessionId}`);
  const sessionPath = isSubBot ? `jadibots/${sessionId}` : 'auth_info_baileys';
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = Baileys.default({
    version: (await fetchLatestBaileysVersion()).version,
    auth: state,
    logger,
    browser: isSubBot ? ['SubBot', 'Chrome', '1.0.0'] : ['JulesBot', 'Chrome', '1.0.0'],
    printQRInTerminal: !isSubBot,
    pairingCode: isSubBot,
  });

  if (isSubBot) subBots.set(sessionId, sock);

  // --- MANEJO DE EVENTOS DE CONEXIÓN ---
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !isSubBot) qrcodeTerminal.generate(qr, { small: true });
    if (sock.authState.creds.pairingCode && isSubBot && requesterMsg) {
      try {
        const code = sock.authState.creds.pairingCode;
        await sock.sendMessage(requesterMsg.key.remoteJid, { text: `Tu código de emparejamiento es: *${code}*\n\nSigue los pasos en el WhatsApp que quieres que sea el bot para vincularlo.` });
      } catch (e) { console.error("Error enviando código de emparejamiento:", e); }
    }
    if (connection === 'close') {
      const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log(`Reconectando sesión ${sessionId}...`);
        startBot(sessionId, isSubBot, requesterMsg);
      } else {
        console.log(`Sesión ${sessionId} cerrada permanentemente.`);
        if (isSubBot) {
          fs.rmSync(`./${sessionPath}`, { recursive: true, force: true });
          subBots.delete(sessionId);
        }
      }
    } else if (connection === 'open') {
      console.log(`Sesión ${sessionId} conectada.`);
      if (!isSubBot) console.log('            BOT PRINCIPAL CONECTADO');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // --- MANEJO DE MENSAJES ---
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    // --- Lógica de Bloqueo ---
    const blockedDbPath = path.resolve('./database/blocked.json');
    try {
      const blockedData = fs.readFileSync(blockedDbPath, 'utf8');
      if (JSON.parse(blockedData).includes(sender)) return;
    } catch (e) {}

    // --- Cargar Ajustes del Grupo ---
    let groupSettings = {};
    if (isGroup) {
        const settingsDbPath = path.resolve('./database/groupSettings.json');
        try {
            const settingsData = fs.readFileSync(settingsDbPath, 'utf8');
            groupSettings = JSON.parse(settingsData)[from] || {};
        } catch(e) {}
    }

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

    // --- Lógica de Anti-Link ---
    if (isGroup && groupSettings.antilink && body.includes('chat.whatsapp.com/')) {
        const metadata = await sock.groupMetadata(from);
        const senderIsAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        const botIsAdmin = metadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        if (!senderIsAdmin && botIsAdmin) {
            await sock.sendMessage(from, { text: "No se permiten enlaces de otros grupos." }, { quoted: msg });
            await sock.sendMessage(from, { delete: msg.key });
            return; // Detener procesamiento si se borra el mensaje
        }
    }

    // --- Lógica de Comandos ---
    const args = body.trim().split(/ +/).slice(1);
    let commandName = body.trim().split(/ +/)[0].toLowerCase();
    let command = commands.get(commandName) || commands.get(aliases.get(commandName));

    if (command) {
      // --- Lógica de Modo Admin ---
      if (isGroup && groupSettings.adminMode) {
        const metadata = await sock.groupMetadata(from);
        const senderIsAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        if (!senderIsAdmin) return; // Ignorar comando si no es admin
      }

      // --- Lógica de Cooldown ---
      if (cooldowns.has(sender)) {
        if ((Date.now() - cooldowns.get(sender)) / 1000 < COOLDOWN_SECONDS) return;
      }

      try {
        await new Promise(resolve => setTimeout(resolve, RESPONSE_DELAY_MS));
        await command.execute({ sock, msg, args, commands, config, testCache, subBots });
        cooldowns.set(sender, Date.now());
      } catch (error) {
        console.error(`Error en comando ${commandName}:`, error);
        await sock.sendMessage(from, { text: 'Ocurrió un error.' }, { quoted: msg });
      }
    }
  });

  // --- MANEJO DE BIENVENIDA (Solo Bot Principal) ---
  if (!isSubBot) {
    sock.ev.on('group-participants.update', async (event) => {
        const { id, participants, action } = event;
        const settingsDbPath = path.resolve('./database/groupSettings.json');
        let settings = {};
        try {
          const data = fs.readFileSync(settingsDbPath, 'utf8');
          settings = JSON.parse(data);
        } catch (e) {}

        if (!settings[id]?.welcome) return;

        try {
          const metadata = await sock.groupMetadata(id);
          for (const p of participants) {
            const userName = `@${p.split('@')[0]}`;
            const message = action === 'add'
              ? `¡Bienvenido/a al grupo *${metadata.subject}*, ${userName}! 🎉`
              : `Adiós, ${userName}. Te extrañaremos. 👋`;
            await sock.sendMessage(id, { text: message, mentions: [p] });
          }
        } catch (e) { console.error("Error en group-participants.update:", e); }
    });
  }
}

// --- INICIO DEL BOT ---
(async () => {
  await loadCommands();
  startBot('main_session', false);
})();
