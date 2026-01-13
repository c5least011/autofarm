require('dotenv').config();

const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const client = new Client({ checkUpdate: false });

const OWNER_ID = '1436539795340922922';
const NEKO_ID = '1248205177589334026';
let isRunning = false;
let dictionary = new Set();

const SOURCES = [
    'https://raw.githubusercontent.com/c5least011/botgoiynoitu/refs/heads/main/data.json',
    'https://raw.githubusercontent.com/lvdat/phobo-contribute-words/refs/heads/main/accepted-words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/wiktionary/dictionary/words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/tudientv/dictionary/words.txt'
];

async function loadDict() {
    console.log('--- Dang quet kho vu khi ---');
    for (const url of SOURCES) {
        try {
            const res = await axios.get(url);
            let rawData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
            let cleanData = rawData.replace(/“|”/g, '"');
            let words = [];
            try { words = JSON.parse(cleanData); } catch (e) { words = cleanData.split(/\r?\n/); }

            if (Array.isArray(words)) {
                words.forEach(w => {
                    let text = typeof w === 'string' ? w : (w.text || "");
                    let clean = text.trim().toLowerCase().replace(/\s+/g, '');
                    if (clean.length > 1) dictionary.add(clean);
                });
            }
        } catch (e) { console.log(`Loi source: ${url}`); }
    }
    console.log(`✅ Kho tu: ${dictionary.size} tu san sang!`);
}

function solve(chars, length) {
    const sortedChars = chars.toLowerCase().replace(/\//g, '').split('').sort().join('');
    for (let word of dictionary) {
        if (word.length === length) {
            if (word.split('').sort().join('') === sortedChars) return word;
        }
    }
    return null;
}

client.on('ready', () => console.log(`Bot Vua Tieng Viet (Embed Fix) ON: ${client.user.tag}`));

client.on('messageCreate', async (msg) => {
    // Bam .start / .stop de dieu khien
    if (msg.author.id === OWNER_ID) {
        if (msg.content === '.start') { isRunning = true; return msg.reply('On r nhe!'); }
        if (msg.content === '.stop') { isRunning = false; return msg.reply('Off r!'); }
    }

    if (!isRunning) return;

    // Check ca tin nhan thuong va Embed
    let content = msg.content;
    if (msg.embeds.length > 0 && msg.embeds[0].description) {
        content = msg.embeds[0].description;
    }

    if (msg.author.id === NEKO_ID && content.includes('Từ cần đoán:')) {
        try {
            // Regex lay chuoi ki tu e/n/n/o/i/d
            const charMatch = content.match(/Từ cần đoán: ([^ \n(]+)/i);
            const lengthMatch = content.match(/\(gồm (\d+) ký tự\)/);

            if (charMatch && lengthMatch) {
                const chars = charMatch[1];
                const length = parseInt(lengthMatch[1]);
                
                console.log(`Dang giai: ${chars}`);
                const answer = solve(chars, length);

                setTimeout(() => {
                    if (answer) {
                        msg.channel.send(answer);
                    } else {
                        msg.channel.send('bỏ qua');
                    }
                }, 1500);
            }
        } catch (err) { console.log('Loi doc Embed!'); }
    }
});

loadDict().then(() => {
    client.login(process.env.DISCORD_TOKEN);
});const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot đang chạy m ơi!'));
app.listen(process.env.PORT || 3000);