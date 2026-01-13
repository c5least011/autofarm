require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const express = require('express');

const client = new Client({ checkUpdate: false });
const app = express();

const OWNER_ID = '1436539795340922922';
const NEKO_ID = '1248205177589334026';
let isRunning = false;
let dictionary = new Set();

const SOURCES = [
    'https://raw.githubusercontent.com/c5least011/botgoiynoitu/refs/heads/main/data.json',
    'https://raw.githubusercontent.com/lvdat/phobo-contribute-words/refs/heads/main/accepted-words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/wiktionary/dictionary/words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/tudientv/dictionary/words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/hongocduc/dictionary/words.txt'
];

async function loadDict() {
    console.log('--- Đang quét kho vũ khí hạng nặng ---');
    for (const url of SOURCES) {
        try {
            const res = await axios.get(url, { responseType: 'text' });
            // Tách từng dòng để xử lý y hệt con bot cũ của m
            const lines = res.data.split(/\r?\n/);
            
            lines.forEach(line => {
                if (!line.trim()) return;
                
                try {
                    // Ưu tiên parse kiểu JSON từng dòng (đúng định dạng ảnh m gửi)
                    const obj = JSON.parse(line.replace(/“|”/g, '"'));
                    let text = obj.text || obj.word || ""; 
                    if (typeof obj === 'string') text = obj; // Trường hợp JSON array đơn giản

                    if (text) {
                        let clean = text.trim().toLowerCase();
                        if (clean.length > 1) dictionary.add(clean);
                    }
                } catch (e) {
                    // Nếu k phải JSON (file txt thuần) thì lấy nguyên dòng
                    let clean = line.trim().toLowerCase();
                    if (clean.length > 1 && !clean.startsWith('{')) dictionary.add(clean);
                }
            });
            console.log(`✅ Đã nạp xong source: ${url.split('/').pop()}`);
        } catch (err) { console.log(`❌ Lỗi nạp source: ${url}`); }
    }
    console.log(`🚀 Tổng kho: ${dictionary.size} từ. Đã sẵn sàng thông nòng!`);
}

function solve(chars, length) {
    // Neko gửi ề/n/n/ô/i/đ -> gộp lại thành ennôiđ -> sort alphabet
    const targetSorted = chars.replace(/\//g, '').toLowerCase().split('').sort().join('');
    
    for (let word of dictionary) {
        // Vua Tiếng Việt tính độ dài k kèm dấu cách
        let noSpace = word.replace(/\s+/g, '');
        if (noSpace.length === length) {
            if (noSpace.split('').sort().join('') === targetSorted) return word;
        }
    }
    return null;
}

client.on('messageCreate', async (msg) => {
    if (msg.author.id === OWNER_ID) {
        if (msg.content === '.start') { isRunning = true; return msg.reply('Vua Tiếng Việt START!'); }
        if (msg.content === '.stop') { isRunning = false; return msg.reply('Vua Tiếng Việt STOP!'); }
    }

    if (!isRunning) return;

    let content = msg.content;
    if (msg.embeds.length > 0 && msg.embeds[0].description) {
        content = msg.embeds[0].description;
    }

    // Regex hốt cụm ký tự (bao gồm cả dấu tiếng Việt)
    if (msg.author.id === NEKO_ID && content.includes('Từ cần đoán:')) {
        const charMatch = content.match(/Từ cần đoán: ([^\s\n(]+)/i);
        const lengthMatch = content.match(/\(gồm (\d+) ký tự\)/);

        if (charMatch && lengthMatch) {
            const answer = solve(charMatch[1], parseInt(lengthMatch[1]));
            console.log(`[Giải đố] Ký tự: ${charMatch[1]} -> Kết quả: ${answer || 'Chịu'}`);
            
            setTimeout(() => {
                msg.channel.send(answer || 'bỏ qua');
            }, 1000 + Math.random() * 1000);
        }
    }
});

// Render Web Service
app.get('/', (req, res) => res.send('Bot Vua Tiếng Việt đang chạy 24/7 m ơi!'));
app.listen(process.env.PORT || 3000);

loadDict().then(() => client.login(process.env.DISCORD_TOKEN));