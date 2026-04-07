const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const PORT = 3000;

// Game State
// Just one global room for 2 players
let players = [];
let playerHearts = {};
let roundData = {
    prefix: '',
    answers: {}
};

const punishments = [
    "ทำท่าทางตามอีโมจิที่แฟนส่งมาให้ 🤪",
    "ดูหนังด้วยกัน1เรื่อง 🍣",
    "ตามใจ1วัน 🧽",
    "เปิดกล้อง 💃",
    "ถ่ายรูปตลกๆ ตัวเองแล้วตั้งเป็นโปรไฟล์ไลน์ 1 วัน 🤣",
    "อดข้าว1มื้อ🧋",
    "ห้ามเล่นมือถือ1ชั่วโมง 💆",
    "พูดชมแฟน 1 นาทีโดยห้ามซ้ำคำ 💖",
    "พรุ่งนี้ต้องตื่นมาปลุกตอนเช้า ☀️",
    "ทำเสียงร้องสัตว์ 3 ชนิดให้ตลกที่สุด 🐶"
];

const words = [
    "มะ", "น้ำ", "รถ", "ไฟ", "หมู", "ปลา", "ความ", "การ", "ที่", "ทาง", "คน", "ชาว", "ผู้", "นัก", "ช่าง",
    "ของ", "เครื่อง", "ใบ", "ดอก", "ผล", "ต้น", "พืช", "สัตว์", "ป่า", "ภู", "ทะเล", "ลม", "อากาศ", "แสง",
    "นก", "ฟ้า", "ดิน", "หน้า", "ตา", "หู", "ใจ", "ความ", "โรง", "ร้าน", "สถาน", "ห้อง", "ชั้น", "แผนก",
    "ทอง", "เงิน", "เพชร", "พลอย", "เหล็ก", "ทองแดง", "พลาสติก", "ยาง", "ไม้", "กระดาษ", "แก้ว", "ขวด", "กระป๋อง",
    "โต๊ะ", "เก้าอี้", "ตู้", "เตียง", "หมอน", "พรม", "ม่าน", "หน้าต่าง", "ประตู", "กำแพง", "หลังคา",
    "เสื้อ", "กางเกง", "กระโปรง", "รองเท้า", "ถุงเท้า", "หมวก", "เข็มขัด", "กระเป๋า", "แว่น", "แหวน", "สร้อย",
    "โรงเรียน", "มหาวิทยาลัย", "โรงพยาบาล", "สถานี", "สนาม", "ตลาด", "วัด", "บริษัท", "ธนาคาร", "สหกรณ์",
    "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์", "เช้า", "สาย", "บ่าย", "เย็น", "ค่ำ", "คืน",
    "แดง", "ดำ", "ขาว", "เหลือง", "เขียว", "น้ำเงิน", "ฟ้า", "ม่วง", "ชมพู", "ส้ม", "เทา", "น้ำตาล",
    "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน",
    "สุข", "ทุกข์", "ดี", "ชั่ว", "ใหญ่", "เล็ก", "สั้น", "ยาว", "สูง", "ต่ำ", "กว้าง", "แคบ", "หนา", "บาง",
    "เร็ว", "ช้า", "ร้อน", "เย็น", "หนาว", "อุ่น", "เปียก", "แห้ง", "สว่าง", "มืด", "แข็ง", "อ่อน", "นุ่ม", "หยาบ",
    "กล้วย", "ส้ม", "แตง", "ผัก", "ขนม", "ข้าว", "แกง", "ต้ม", "ผัด", "ทอด", "ยำ", "ไข่", "ไก่", "หมู", "เนื้อ",
    "กุ้ง", "หอย", "ปู", "กระ", "ประ", "พ่อ", "แม่", "ลูก", "พี่", "น้อง", "ปู่", "ย่า", "ตา", "ยาย", "ลุง", "ป้า", "น้า", "อา",
    "งาน", "ยา", "ดาว", "เดือน", "บ้าน", "เมือง", "ประเทศ", "โลก", "โค้ง", "ตรง",
    "สาย", "รอง", "พรี", "ก่อน", "บน", "ล่าง", "ซ้าย", "ขวา", "ใน", "นอก", "กลาง", "หลัง", "ใต้", "เหนือ", "ออก", "ตก",
    "พระ", "หลวง", "นาย", "นาง", "เด็ก", "สาว", "หนุ่ม", "เฒ่า", "แก่", "หมอ", "พยาบาล", "ครู", "อาจารย์",
    "เพลง", "หนัง", "ละคร", "เกม", "กีฬา", "ข่าว", "ดารา", "ศิลปิน", "นักร้อง", "ตำรวจ", "ทหาร", "ยาม",
    "แม่เหล็ก", "เข็ม", "ด้าย", "เชือก", "ลวด", "สายไฟ", "ปลั๊ก", "หลอด", "สวิตช์", "พัดลม", "แอร์", "ตู้เย็น", "ทีวี",
    "กล้อง", "คอม", "มือถือ", "ไอแพด", "สมุด", "ปากกา", "ดินสอ", "ยางลบ", "ไม้บรรทัด", "กรรไกร", "คัตเตอร์",
    "กาว", "สก๊อต", "แม็ก", "แฟ้ม", "กระดาน", "ชอล์ก", "แปรง", "สี", "พู่กัน", "ผ้าใบ", "เปียโน", "กีตาร์", "กลอง",
    "ฟุตซอล", "บาส", "วอลเลย์", "ตะกร้อ", "แบด", "เทนนิส", "ปิงปอง", "กอล์ฟ", "สระ", "ทะเลสาบ", "น้ำตก",
    "คลอง", "แม่น้ำ", "มหาสมุทร", "ภูเขา", "ป่า", "ดอย", "ถ้ำ", "เกาะ", "หาด", "แหลม", "อ่าว", "ทุ่ง", "ทราย",
    "หิน", "กรวด", "ดิน", "โคลน", "หญ้า", "ใบไม้", "กิ่ง", "ราก", "หนาม", "ดอกไม้", "ผลไม้", "เมล็ด", "เม็ด",
    "ฝน", "แดด", "หิมะ", "ลูกเห็บ", "พายุ", "ไต้ฝุ่น", "ทอร์นาโด", "สึนามิ", "แผ่นดิน", "ภูเขาไฟ",
    "วัน", "ปี", "ชั่วโมง", "นาที", "วินาที", "ทศ", "ศต", "สหัส", "กัป", "กัลป์", "ปัจจุบัน", "อดีต", "อนาคต",
    "ฤดู", "เทวดา", "นางฟ้า", "สวรรค์", "นรก", "ยมบาล", "ผี", "วิญญาณ", "เปรต", "อสูร", "ยักษ์", "มาร", "เทพ", "พรหม",
    "กุฏิ", "เจดีย์", "โบสถ์", "วิหาร", "ศาลา", "เณร", "ชี", "ฆราวาส", "พุทธ", "ธรรม", "สงฆ์", "ศีล", "สมาธิ", "ปัญญา",
    "วิชา", "คณิต", "วิทยา", "สังคม", "ประวัติ", "ฟิสิกส์", "เคมี", "ชีวะ", "ศิลปะ", "ดนตรี", "พละ", "ภาษา", "แกรมม่า",
    "กระทะ", "หม้อ", "ไห", "ชาม", "จาน", "ช้อน", "ส้อม", "มีด", "ครก", "สาก", "เขียง", "ตะหลิว", "ทัพพี",
    "หมูทอด", "ไก่ย่าง", "ปลาเผา", "กุ้งแช่", "หอยลาย", "ปูม้า", "ปลาหมึก", "อาหารทะเล", "น้ำจิ้ม", "พริก", "กระเทียม", "หอม", "มะนาว", "น้ำปลา", "ซีอิ๊ว",
    "รส", "เปรี้ยว", "หวาน", "มัน", "เค็ม", "เผ็ด", "จืด", "ฝาด", "ขม",
    "กริยา", "กิน", "นอน", "นั่ง", "ยืน", "เดิน", "วิ่ง", "กระโดด", "เตะ", "ต่อย", "ตี", "ฟาด", "ฟัน", "แทง",
    "หัวเราะ", "ร้องไห้", "ยิ้ม", "บึ้ง", "โกรธ", "เศร้า", "เหงา", "รัก", "เกลียด", "ชอบ", "ชัง", "กลัว", "กล้า",
    "ซื้อ", "ขาย", "แลก", "แจก", "แถม", "ลด", "ราคา", "เงิน", "ทอง", "เหรียญ", "แบงก์", "บัตร", "เครดิต", "เดบิต"
];

function pickRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    if (players.length < 2) {
        players.push(socket.id);

        if (players.length === 2) {
            // Both players joined, start game
            startGame();
        } else {
            socket.emit('waiting', 'รอแฟนเข้ามา...');
        }
    } else {
        socket.emit('error_full', 'ห้องเต็มแล้ว เล่นได้แค่ 2 คนครับ');
        socket.disconnect();
    }

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        players = players.filter(id => id !== socket.id);
        roundData.answers = {};
        if (players.length > 0) {
            io.to(players[0]).emit('waiting', 'แฟนหลุดออกไป รอแฟนเข้าใหม่...');
        }
    });

    socket.on('submit_answer', (answer) => {
        if (!players.includes(socket.id)) return;

        roundData.answers[socket.id] = answer.trim();

        // Check if both answered
        const answeredCount = Object.keys(roundData.answers).length;
        if (answeredCount === 1) {
            // Wait for other
            socket.emit('wait_for_partner');
            const partnerParam = players.find(id => id !== socket.id);
            if (partnerParam) io.to(partnerParam).emit('partner_waiting');
        } else if (answeredCount === 2) {
            // Both answered, stop timer and compare
            clearInterval(roundTimerInterval);
            checkAndEmitResult();
        }
    });

    socket.on('restart_game', () => {
        if (players.length === 2) {
            startGame();
        }
    });

    socket.on('spin_wheel', () => {
        const randomIndex = Math.floor(Math.random() * punishments.length);
        io.emit('spin_result', { index: randomIndex, punishment: punishments[randomIndex] });
    });
});

let roundTimerInterval;
let roundTimeLeft = 3;

function checkAndEmitResult() {
    const p1 = players[0];
    const p2 = players[1];
    let a1 = roundData.answers[p1];
    let a2 = roundData.answers[p2];

    let timeout1 = !a1;
    let timeout2 = !a2;

    if (timeout1) a1 = "หมดเวลา ⏰";
    if (timeout2) a2 = "หมดเวลา ⏰";

    const isMatch = (a1 === a2) && !timeout1 && !timeout2;

    if (!isMatch) {
        // If P1 timed out, or both answered but mismatched, P1 loses a heart
        if (timeout1 || (!timeout1 && !timeout2)) playerHearts[p1]--;
        // If P2 timed out, or both answered but mismatched, P2 loses a heart
        if (timeout2 || (!timeout1 && !timeout2)) playerHearts[p2]--;
    }

    let losers = [];
    if (playerHearts[p1] <= 0) losers.push(p1);
    if (playerHearts[p2] <= 0) losers.push(p2);

    io.emit('round_result', {
        match: isMatch,
        answers: {
            [p1]: a1,
            [p2]: a2
        },
        hearts: playerHearts
    });

    // Reset answers
    roundData.answers = {};

    if (losers.length > 0) {
        setTimeout(() => {
            io.emit('game_over', { losers, punishments });
        }, 3000);
        return; // stop loop
    }

    if (isMatch) {
        // Wait 4 seconds then new word
        setTimeout(() => {
            startNewRound(pickRandomWord());
        }, 4000);
    } else {
        // Wait 4 seconds then random new word even if wrong
        setTimeout(() => {
            startNewRound(pickRandomWord());
        }, 4000);
    }
}

function startNewRound(prefix) {
    roundData.prefix = prefix;
    roundData.answers = {};
    io.emit('new_round', roundData.prefix);

    // Start 3 second timer
    clearInterval(roundTimerInterval);
    roundTimeLeft = 4; // Display will start at 3

    roundTimerInterval = setInterval(() => {
        roundTimeLeft--;
        if (roundTimeLeft > 0) {
            io.emit('timer_tick', roundTimeLeft);
        }

        if (roundTimeLeft <= 0) {
            clearInterval(roundTimerInterval);
            checkAndEmitResult();
        }
    }, 1000);
}

function startGame() {
    if (players.length === 2) {
        playerHearts = {}; // Reset object to remove any stale disconnected player IDs
        playerHearts[players[0]] = 5;
        playerHearts[players[1]] = 5;
        io.emit('init_hearts', playerHearts);
        startNewRound(pickRandomWord());
    }
}

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
