require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const express = require('express');

const client = new Client({ checkUpdate: false });
const app = express();

const OWNER_ID = '1436539795340922922';
const NEKO_ID = '1248205177589334026';

let dictionary = new Set();
let channelData = new Map(); 

const SOURCES = [
    'https://raw.githubusercontent.com/c5least011/botgoiynoitu/refs/heads/main/data.json',
    'https://raw.githubusercontent.com/lvdat/phobo-contribute-words/refs/heads/main/accepted-words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/wiktionary/dictionary/words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/tudientv/dictionary/words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/hongocduc/dictionary/words.txt'
];

async function loadDict() {
    console.log('--- Đang nạp kho vũ khí ---');
    for (const url of SOURCES) {
        try {
            const res = await axios.get(url, { responseType: 'text' });
            const lines = res.data.split(/\r?\n/);
            lines.forEach(line => {
                if (!line.trim()) return;
                try {
                    const obj = JSON.parse(line.replace(/“|”/g, '"'));
                    let text = obj.text || obj.word || (typeof obj === 'string' ? obj : "");
                    if (text) dictionary.add(text.trim().toLowerCase());
                } catch (e) {
                    let clean = line.trim().toLowerCase();
                    if (clean.length > 1 && !clean.startsWith('{')) dictionary.add(clean);
                }
            });
        } catch (err) { console.log(`Lỗi source: ${url}`); }
    }
    console.log(`✅ Kho từ: ${dictionary.size}`);
}

function findAllAnswers(chars, length) {
    const cleanChars = chars.replace(/\*/g, '').replace(/\//g, '').toLowerCase();
    const targetSorted = cleanChars.split('').sort().join('');
    let matches = [];
    
    for (let word of dictionary) {
        let noSpace = word.replace(/\s+/g, '');
        if (noSpace.length === length) {
            if (noSpace.split('').sort().join('') === targetSorted) {
                matches.push(word);
            }
        }
    }
    return matches;
}

client.on('messageCreate', async (msg) => {
    const chId = msg.channel.id;
    if (!channelData.has(chId)) channelData.set(chId, { isRunning: false, currentAnswers: [], timer: null });
    let data = channelData.get(chId);

    if (msg.author.id === OWNER_ID) {
        if (msg.content === '.start') { data.isRunning = true; return msg.reply('ON!'); }
        if (msg.content === '.stop') { 
            data.isRunning = false; 
            if (data.timer) clearTimeout(data.timer);
            return msg.reply('OFF!'); 
        }
    }

    if (!data.isRunning) return;

    let content = msg.content;
    let embedDesc = (msg.embeds.length > 0) ? msg.embeds[0].description : "";
    let fullText = content + embedDesc;

    if (msg.author.id === NEKO_ID && fullText.includes('Trò chơi kết thúc sau 5 hiệp không có người đoán đúng')) {
        return setTimeout(() => msg.channel.send('start!'), 2000);
    }

    if (msg.author.id === NEKO_ID && (fullText.includes('đoán đúng') || fullText.includes('Không ai đoán đúng'))) {
        if (data.timer) {
            clearTimeout(data.timer);
            data.timer = null;
        }
        data.currentAnswers = [];
        return;
    }

    if (msg.author.id === NEKO_ID && fullText.includes('Từ cần đoán:')) {
        const charMatch = fullText.match(/Từ cần đoán:\s*([^\s\n(]+)/i);
        const lengthMatch = fullText.match(/\(gồm (\d+) ký tự\)/);

        if (charMatch && lengthMatch) {
            const allMatches = findAllAnswers(charMatch[1], parseInt(lengthMatch[1]));
            data.currentAnswers = allMatches;

            if (data.currentAnswers.length > 0) {
                if (data.timer) clearTimeout(data.timer);
                data.timer = setTimeout(() => {
                    sendNextAnswer(msg.channel, data);
                }, 4000);
            } else {
                setTimeout(() => msg.channel.send('bỏ qua'), 1500);
            }
        }
    }
});

function sendNextAnswer(channel, data) {
    if (data.currentAnswers.length === 0 || !data.isRunning) return;

    const word = data.currentAnswers.shift();
    channel.send(word);

    data.timer = setTimeout(() => {
        if (data.currentAnswers.length > 0) {
            console.log(`[${channel.name}] 4s im lặng, vả tiếp từ mới...`);
            sendNextAnswer(channel, data);
        }
    }, 4000); 
}

app.get('/', (req, res) => res.send('Bot ok'));
app.listen(process.env.PORT || 3000);
loadDict().then(() => client.login(process.env.DISCORD_TOKEN));
