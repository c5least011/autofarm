require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const express = require('express');

const client = new Client({ checkUpdate: false });
const app = express();

const OWNER_ID = '1436539795340922922';
const NEKO_ID = '1248205177589334026';

let dictionary = new Set();
// Map này cực quan trọng: Lưu biệt lập trạng thái từng kênh
let channelData = new Map(); 

const SOURCES = [
    'https://raw.githubusercontent.com/c5least011/botgoiynoitu/refs/heads/main/data.json',
    'https://raw.githubusercontent.com/lvdat/phobo-contribute-words/refs/heads/main/accepted-words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/wiktionary/dictionary/words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/tudientv/dictionary/words.txt',
    'https://raw.githubusercontent.com/undertheseanlp/dictionary/refs/heads/hongocduc/dictionary/words.txt'
];

async function loadDict() {
    console.log('--- Quét kho vũ khí ---');
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
        } catch (err) { console.log(`Lỗi: ${url}`); }
    }
    console.log(`✅ Tổng kho: ${dictionary.size} từ dùng chung.`);
}

function solve(chars, length) {
    const cleanChars = chars.replace(/\*/g, '').replace(/\//g, '').toLowerCase();
    const targetSorted = cleanChars.split('').sort().join('');
    
    for (let word of dictionary) {
        let noSpace = word.replace(/\s+/g, '');
        if (noSpace.length === length) {
            if (noSpace.split('').sort().join('') === targetSorted) return word;
        }
    }
    return null;
}

client.on('messageCreate', async (msg) => {
    const channelId = msg.channel.id;

    // Khởi tạo bộ nhớ riêng cho kênh nếu lần đầu bắt được tin nhắn
    if (!channelData.has(channelId)) {
        channelData.set(channelId, { isRunning: false, failCount: 0 });
    }

    let data = channelData.get(channelId);

    // Lệnh điều khiển riêng biệt
    if (msg.author.id === OWNER_ID) {
        if (msg.content === '.start') { 
            data.isRunning = true;
            data.failCount = 0; // Reset riêng cho kênh này
            return msg.reply(`Kênh ${msg.channel.name} khởi động!`); 
        }
        if (msg.content === '.stop') { 
            data.isRunning = false;
            return msg.reply(`Kênh ${msg.channel.name} tạm nghỉ.`); 
        }
    }

    if (!data.isRunning) return;

    let content = msg.content;
    if (msg.embeds.length > 0 && msg.embeds[0].description) {
        content = msg.embeds[0].description;
    }

    if (msg.author.id === NEKO_ID && content.includes('Từ cần đoán:')) {
        const charMatch = content.match(/Từ cần đoán:\s*([^\s\n(]+)/i);
        const lengthMatch = content.match(/\(gồm (\d+) ký tự\)/);

        if (charMatch && lengthMatch) {
            const answer = solve(charMatch[1], parseInt(lengthMatch[1]));
            
            if (answer) {
                // CHỈ RECOUNT CHO KÊNH NÀY
                data.failCount = 0; 
                console.log(`[${msg.channel.name}] ĐÚNG -> Recount về 0. Đáp án: ${answer}`);
                setTimeout(() => { msg.channel.send(answer); }, 2000);
            } else {
                // CHỈ TĂNG FAIL CHO KÊNH NÀY
                data.failCount++;
                console.log(`[${msg.channel.name}] XỊT lần ${data.failCount}/5`);
                
                setTimeout(() => {
                    msg.channel.send('bỏ qua');
                    
                    if (data.failCount >= 5) {
                        data.failCount = 0; // Reset đếm để chuẩn bị cho chuỗi 1p mới
                        console.log(`[${msg.channel.name}] Đợi 1p gửi start!...`);
                        setTimeout(() => { 
                            // Check lại xem trong 1p chờ m có bấm .stop kênh đó k
                            if (data.isRunning) msg.channel.send('start!'); 
                        }, 60000);
                    }
                }, 1500);
            }
        }
    }
});

app.get('/', (req, res) => res.send('Bot live đa kênh, recount riêng biệt!'));
app.listen(process.env.PORT || 3000);

loadDict().then(() => client.login(process.env.DISCORD_TOKEN));
