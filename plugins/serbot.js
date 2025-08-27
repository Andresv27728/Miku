import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import NodeCache from "node-cache";
import fs from "fs";
import path from "path";
import pino from 'pino';
import chalk from 'chalk';
import { makeWASocket } from '../lib/simple.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jadi = 'jadibots';

// --- Mensajes de UI ---
const rtx = `❀ *Hazte Sub Bot*
✦ Escanea el QR desde tu WhatsApp:
✐ Más opciones → Dispositivos vinculados → Vincular nuevo dispositivo → Con QR
☁︎ *Importante:* El QR es válido por 30 segundos.`.trim();

const rtx2 = `❀ *Hazte Sub Bot*
✧ Usa el código manualmente:
✐ Más opciones → Dispositivos vinculados → Vincular nuevo dispositivo → Con número
☁︎ *Importante:* El código es válido por 30 segundos.`.trim();

// --- Función Principal del Sub-bot ---
async function yukiJadiBot(options) {
    let { pathYukiJadiBot, m, conn, args, usedPrefix, command } = options;
    const mcode = args[0] && /(--code|code)/.test(args[0].trim()) ? true : false;

    if (!fs.existsSync(pathYukiJadiBot)) {
        fs.mkdirSync(pathYukiJadiBot, { recursive: true });
    }

    let { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(pathYukiJadiBot);

    const connectionOptions = {
        logger: pino({ level: "fatal" }),
        printQRInTerminal: !mcode,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        browser: mcode ? ['Ubuntu', 'Chrome', '110.0.5585.95'] : ['Sub Bot', 'Chrome', '2.0.0'],
        version,
        shouldSyncHistoryMessage: () => false,
    };

    let sock = makeWASocket(connectionOptions);
    if (!global.conns) global.conns = [];
    global.conns.push(sock);

    const handlerModule = await import('../handler.js');
    // Pasamos 'true' para indicar que este es un sub-bot
    sock.handler = (msg) => handlerModule.handler.call(sock, msg, true);

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !mcode) {
            let txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: rtx }, { quoted: m });
            setTimeout(() => conn.sendMessage(m.chat, { delete: txtQR.key }).catch(() => {}), 30000);
        }

        if (sock.pairingCode && mcode) {
            let code = sock.pairingCode.match(/.{1,4}/g)?.join("-");
            let txtCode = await conn.sendMessage(m.chat, { text: rtx2 }, { quoted: m });
            let codeBot = await conn.sendMessage(m.chat, { text: code }, { quoted: m });
            setTimeout(() => conn.sendMessage(m.chat, { delete: txtCode.key }).catch(() => {}), 30000);
            setTimeout(() => conn.sendMessage(m.chat, { delete: codeBot.key }).catch(() => {}), 30000);
        }

        if (connection === 'open') {
            let userName = sock.user.name || 'Sub-bot';
            console.log(chalk.bold.cyanBright(`SUB-BOT CONECTADO: ${userName} (${sock.user.id.split(':')[0]})`));
            conn.reply(m.chat, `✅ Sub-bot conectado como *${userName}*.`, m);
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.yellow(`Conexión de sub-bot cerrada, razón: ${reason}`));
            let i = global.conns.findIndex(c => c.user?.id === sock.user?.id);
            if (i >= 0) global.conns.splice(i, 1);
            if (reason !== DisconnectReason.loggedOut) {
                yukiJadiBot(options);
            } else {
                conn.reply(m.chat, "La sesión del sub-bot se ha cerrado.", m);
                if (fs.existsSync(pathYukiJadiBot)) {
                    fs.rmSync(pathYukiJadiBot, { recursive: true, force: true });
                }
            }
        }
    }

    sock.ev.on("messages.upsert", sock.handler);
    sock.ev.on("connection.update", connectionUpdate);
    sock.ev.on('creds.update', saveCreds);
}


// --- Comando principal que inicia el proceso ---
const serbotCommand = {
    name: "serbot",
    category: "subbots",
    description: "Crea una sesión de sub-bot. Usa 'serbot code' para un código de emparejamiento.",
    aliases: ["qr", "code"],

    async execute({ sock, msg, args, config, command }) {
        const MAX_SUB_BOTS = 5;
        const senderId = msg.sender;
        const senderNumber = senderId.split('@')[0];
        const isOwner = config.ownerNumbers.includes(senderNumber);

        if (!isOwner) {
            return sock.sendMessage(msg.key.remoteJid, { text: "No tienes permiso para crear un sub-bot." }, { quoted: msg });
        }

        if (global.conns && global.conns.length >= MAX_SUB_BOTS) {
            return sock.sendMessage(msg.key.remoteJid, { text: `Límite de sub-bots (${MAX_SUB_BOTS}) alcanzado.` }, { quoted: msg });
        }

        let id = `${senderId.split`@`[0]}`;
        let pathYukiJadiBot = path.join(`./${jadi}/`, id);

        if (fs.existsSync(pathYukiJadiBot)) {
            return sock.sendMessage(msg.key.remoteJid, { text: "Ya tienes una sesión activa o archivos de sesión antiguos. Usa `deletesesion` primero." }, { quoted: msg });
        }

        const yukiJBOptions = {
            pathYukiJadiBot,
            m: msg,
            conn: sock,
            args,
            usedPrefix: '',
            command
        };

        yukiJadiBot(yukiJBOptions);
    }
};

export default serbotCommand;
