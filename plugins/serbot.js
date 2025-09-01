import Baileys, { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import fs from "fs";
import path from "path";
import pino from 'pino';
import chalk from 'chalk';

const jadi = 'jadibots';

const rtx2 = `❀ *Conexión por Código*

✧ Usa el código manualmente:
✐ En tu WhatsApp principal: Más opciones → Dispositivos vinculados → Vincular un dispositivo → Vincular con el número de teléfono.
☁︎ *Importante:* El código es válido por 45 segundos.`.trim();


async function startSubBot(options) {
    let { path, m, conn, targetPhoneNumber } = options;

    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }

    let { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(path);

    const connectionOptions = {
        logger: pino({ level: "fatal" }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Sub-Bot', 'Chrome', '2.0.0'],
        version,
        shouldSyncHistoryMessage: () => false,
        pairingCode: true
    };

    let sock = Baileys.default(connectionOptions);
    if (!global.conns) global.conns = [];
    global.conns.push(sock);

    const handlerModule = await import('../handler.js');
    sock.handler = (msg) => handlerModule.handler.call(sock, msg, true);

    let pairingCodeSent = false; // Flag para controlar el envío del código

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !pairingCodeSent) {
            try {
                // El código de emparejamiento ya está en la variable 'qr'
                const code = qr.match(/.{1,4}/g)?.join("-");

                await conn.sendMessage(m.key.remoteJid, { text: rtx2 }, { quoted: m });
                await conn.sendMessage(m.key.remoteJid, { text: `*${code}*` }, { quoted: m });

                pairingCodeSent = true; // Marcar como enviado para no repetir
            } catch (e) {
                console.error("Error enviando el código de emparejamiento:", e);
                await conn.sendMessage(m.key.remoteJid, { text: "Ocurrió un error al procesar el código de emparejamiento." }, { quoted: m });
            }
        }

        if (connection === 'open') {
            let userName = sock.user.name || 'Sub-bot';
            console.log(chalk.bold.cyanBright(`SUB-BOT CONECTADO: ${userName} (${sock.user.id.split(':')[0]})`));
            await conn.sendMessage(m.key.remoteJid, { text: `✅ Sub-bot para el número ${targetPhoneNumber} conectado exitosamente como *${userName}*.` }, { quoted: m });
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.yellow(`Conexión de sub-bot (${targetPhoneNumber}) cerrada, razón: ${reason}`));
            let i = global.conns.findIndex(c => c.user?.id.startsWith(targetPhoneNumber));
            if (i >= 0) global.conns.splice(i, 1);

            // NO se vuelve a llamar a startSubBot. Baileys maneja la reconexión.
            if (reason === DisconnectReason.loggedOut) {
                await conn.sendMessage(m.key.remoteJid, { text: `La sesión del sub-bot para ${targetPhoneNumber} se ha cerrado.` }, { quoted: m });
                if (fs.existsSync(path)) {
                    fs.rmSync(path, { recursive: true, force: true });
                }
            }
        }
    }

    sock.ev.on("messages.upsert", sock.handler);
    sock.ev.on("connection.update", connectionUpdate);
    sock.ev.on('creds.update', saveCreds);
}

const serbotCommand = {
    name: "serbot",
    category: "subbots",
    description: "Crea una sesión de sub-bot para un número específico.",

    async execute({ sock, msg, args, config }) {
        const MAX_SUB_BOTS = 5;
        const senderId = msg.sender;
        const senderNumber = senderId.split('@')[0];
        const isOwner = config.ownerNumbers.includes(senderNumber);

        if (!isOwner) {
            return sock.sendMessage(msg.key.remoteJid, { text: "No tienes permiso para crear un sub-bot." }, { quoted: msg });
        }

        const targetPhoneNumber = args[0]?.replace(/[^0-9]/g, ''); // Limpiar el número
        if (!targetPhoneNumber) {
            return sock.sendMessage(msg.key.remoteJid, { text: "Uso: `serbot <número_de_teléfono>`" }, { quoted: msg });
        }

        if (global.conns && global.conns.length >= MAX_SUB_BOTS) {
            return sock.sendMessage(msg.key.remoteJid, { text: `Límite de sub-bots (${MAX_SUB_BOTS}) alcanzado.` }, { quoted: msg });
        }

        const sessionPath = path.resolve(`./${jadi}/`, targetPhoneNumber);

        if (fs.existsSync(sessionPath)) {
            return sock.sendMessage(msg.key.remoteJid, { text: "Ya existe una sesión para este número. Usa `deletesesion` primero." }, { quoted: msg });
        }

        const options = {
            path: sessionPath,
            m: msg,
            conn: sock,
            targetPhoneNumber: targetPhoneNumber
        };

        startSubBot(options);
    }
};

export default serbotCommand;
