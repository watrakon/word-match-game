const socket = io();

const loadingScreen = document.getElementById('loading-screen');
const loadingMessage = document.getElementById('loading-message');
const gameContainer = document.getElementById('game-container');

// --- SOUND MANAGER (Asset-free Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let bgmInterval;
let isMuted = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playTone(freq, type, duration, vol = 0.1) {
    if (isMuted) return;
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
    tick: () => playTone(800, 'sine', 0.1, 0.05),
    success: () => {
        playTone(523.25, 'sine', 0.1, 0.1); 
        setTimeout(() => playTone(659.25, 'sine', 0.2, 0.1), 100); 
        setTimeout(() => playTone(783.99, 'sine', 0.4, 0.1), 200); 
    },
    fail: () => {
        playTone(300, 'sawtooth', 0.3, 0.1);
        setTimeout(() => playTone(250, 'sawtooth', 0.4, 0.1), 200);
    },
    spin: () => playTone(800, 'triangle', 0.05, 0.03),
    gameOver: () => {
        playTone(400, 'square', 0.3, 0.1);
        setTimeout(() => playTone(300, 'square', 0.5, 0.1), 200);
        setTimeout(() => playTone(200, 'square', 1.0, 0.1), 400);
    },
    fanfare: () => {
        playTone(523.25, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(523.25, 'sine', 0.1, 0.1), 150);
        setTimeout(() => playTone(783.99, 'sine', 0.4, 0.1), 300);
    }
};

function startBGM() {
    if (bgmInterval || isMuted) return;
    initAudio();
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C (Happy Arpeggio)
    let step = 0;
    bgmInterval = setInterval(() => {
        if (!isMuted) {
            playTone(notes[step % notes.length], 'sine', 0.3, 0.015);
        }
        step++;
    }, 300);
}

function stopBGM() {
    clearInterval(bgmInterval);
    bgmInterval = null;
}

// User must interact to start audio
document.body.addEventListener('touchstart', initAudio, { once: true });
document.body.addEventListener('click', initAudio, { once: true });
// ------------------------------------------------
const prefixDisplay = document.getElementById('prefix-display');
const inputSection = document.getElementById('input-section');
const waitingSection = document.getElementById('waiting-section');
const waitingText = document.getElementById('waiting-text');
const resultSection = document.getElementById('result-section');
const resultTitle = document.getElementById('result-title');
const myAnswerEl = document.getElementById('my-answer');
const partnerAnswerEl = document.getElementById('partner-answer');
const answerInput = document.getElementById('answer-input');
const myHeartsEl = document.getElementById('my-hearts');
const partnerHeartsEl = document.getElementById('partner-hearts');
const gameOverScreen = document.getElementById('game-over-screen');
const loserTextEl = document.getElementById('loser-text');
const punishmentTextEl = document.getElementById('punishment-text');
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const punishmentSection = document.getElementById('punishment-section');
const restartBtn = document.getElementById('restart-btn');

let currentRotation = 0;
let wheelPunishments = [];
let isSpinning = false;

function drawWheel(rotation = 0) {
    if (!wheelPunishments || !wheelPunishments.length) return;
    const numSlices = wheelPunishments.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSlices; i++) {
        const startAngle = rotation + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = i % 2 === 0 ? '#ffda79' : '#ffb8b8';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);

        // Start text further from center so it never overlaps
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = '600 14px "Mali", sans-serif';

        let text = wheelPunishments[i];
        const emojiMatch = text.match(/[\uD800-\uDBFF\uDC00-\uDFFF]+$/);

        // Truncate cleanly (max 12 characters + emoji)
        if (text.length > 12) {
            text = text.substring(0, 10) + '..';
            if (emojiMatch) {
                text += ' ' + emojiMatch[0];
            }
        }

        // White outline for readability
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(text, radius - 15, 0, radius - 60);

        ctx.fillStyle = '#2f3542';
        ctx.fillText(text, radius - 15, 0, radius - 60);
        ctx.restore();
    }
}

// Ensure the function is in the global scope for the HTML onclick handler
window.spinWheel = function() {
    if (isSpinning) return;
    isSpinning = true;
    socket.emit('spin_wheel');
    spinBtn.disabled = true;
};

function renderHearts(count) {
    return '❤️'.repeat(Math.max(0, count)) + '🖤'.repeat(Math.max(0, 5 - count));
}

function updateHearts(heartsObj) {
    if (!heartsObj) return;
    const myCount = heartsObj[socket.id] || 0;
    let partnerCount = 0;
    for (let id in heartsObj) {
        if (id !== socket.id) partnerCount = heartsObj[id];
    }

    myHeartsEl.textContent = renderHearts(myCount);
    partnerHeartsEl.textContent = renderHearts(partnerCount);
}

// Handle enter key to submit
answerInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

// Socket Events
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('waiting', (msg) => {
    showLoading(msg);
});

socket.on('error_full', (msg) => {
    showLoading(msg);
});

socket.on('init_hearts', (heartsObj) => {
    gameOverScreen.classList.add('hidden');
    punishmentSection.classList.add('hidden');
    restartBtn.classList.add('hidden');
    spinBtn.classList.add('hidden');
    updateHearts(heartsObj);
});

const timerDisplay = document.getElementById('timer-display');

socket.on('new_round', (prefix) => {
    hideLoading();

    // Reset UI
    document.body.classList.remove('success-bg', 'fail-bg');
    inputSection.classList.remove('hidden');
    waitingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    timerDisplay.classList.remove('hidden');
    timerDisplay.textContent = "เตรียมตัว...";
    answerInput.value = '';
    answerInput.focus();

    // Set word
    prefixDisplay.textContent = prefix;
});

socket.on('timer_tick', (timeLeft) => {
    timerDisplay.textContent = `เหลือเวลา ${timeLeft} วิ!`;
    if (timeLeft <= 1) {
        timerDisplay.style.color = 'red';
        sounds.tick(); // Extra panic
    } else {
        timerDisplay.style.color = '#ff4757';
    }
    sounds.tick();
});

socket.on('wait_for_partner', () => {
    inputSection.classList.add('hidden');
    waitingSection.classList.remove('hidden');
    waitingText.textContent = "รอแฟนพิมพ์แป๊บ...";
});

socket.on('partner_waiting', () => {
    // If we are still typing, let us know partner is waiting
    // Could add a small indicator here
});

socket.on('round_result', (data) => {
    waitingSection.classList.add('hidden');
    inputSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    timerDisplay.classList.add('hidden');

    const myAnswer = data.answers[socket.id];
    // Find partner's answer by finding the key that is not my answer
    let partnerAnswer = '';
    for (let id in data.answers) {
        if (id !== socket.id) partnerAnswer = data.answers[id];
    }

    myAnswerEl.textContent = myAnswer;
    partnerAnswerEl.textContent = partnerAnswer;

    if (data.hearts) {
        updateHearts(data.hearts);
    }

    if (data.match) {
        resultTitle.textContent = "เย้ ใจตรงกัน! 😍";
        resultTitle.style.color = "#2ed573";
        document.body.classList.add('success-bg');
        sounds.success();
    } else {
        resultTitle.textContent = "ว้า ไม่ตรงกัน! 💔";
        resultTitle.style.color = "#e1b12c";
        document.body.classList.add('fail-bg');
        sounds.fail();
    }
});

socket.on('game_over', (data) => {
    gameOverScreen.classList.remove('hidden');
    punishmentSection.classList.add('hidden');
    restartBtn.classList.add('hidden');

    const { losers, punishments } = data;
    isSpinning = false; // Reset state
    sounds.gameOver();
    stopBGM();
    
    // Check who lost
    if (losers.includes(socket.id) && losers.length === 1) {
        loserTextEl.textContent = "เธอแพ้แล้ว! หมุนวงล้อซะดีๆไออ้วน 😆";
        spinBtn.classList.remove('hidden');
        spinBtn.disabled = false;
    } else if (losers.length === 2) {
        loserTextEl.textContent = "แพ้ทั้งคู่! ใครใจกล้ากดหมุนหน่อยเร๊อะ 🤣";
        spinBtn.classList.remove('hidden');
        spinBtn.disabled = false;
    } else {
        loserTextEl.textContent = "แฟนแพ้แล้ว! รอแฟนกดหมุนวงล้อได้เลย 😎";
        spinBtn.classList.add('hidden');
    }

    wheelPunishments = punishments;
    currentRotation = 0;
    drawWheel(currentRotation);
});

socket.on('spin_result', (data) => {
    const { index, punishment } = data;

    spinBtn.classList.add('hidden');

    const targetSliceAngle = (2 * Math.PI) / wheelPunishments.length;
    let currentAnimRot = currentRotation;
    const extraSpins = 5 * 2 * Math.PI;

    // 1.5 * Math.PI is top (pointer location)
    const sliceCenter = index * targetSliceAngle + targetSliceAngle / 2;
    const targetRot = extraSpins + (1.5 * Math.PI - sliceCenter);

    const duration = 4000;
    const start = performance.now();

    function animateWheel(time) {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);

        const ease = 1 - Math.pow(1 - progress, 4);

        const newRot = currentAnimRot + targetRot * ease;
        if (Math.floor(newRot / 0.35) > Math.floor(currentRotation / 0.35)) {
            sounds.spin();
        }
        currentRotation = newRot;

        drawWheel(currentRotation);

        if (progress < 1) {
            requestAnimationFrame(animateWheel);
        } else {
            currentRotation = currentRotation % (2 * Math.PI);
            punishmentSection.classList.remove('hidden');
            punishmentTextEl.textContent = punishment;
            restartBtn.classList.remove('hidden');
            sounds.fanfare();
        }
    }

    requestAnimationFrame(animateWheel);
});

// Actions
function submitAnswer() {
    const val = answerInput.value.trim();
    if (!val) {
        alert("พิมพ์คำตอบด้วยน้าา");
        return;
    }

    startBGM(); // Start music after first interaction
    
    // Send to server
    socket.emit('submit_answer', val);
}

// Helpers
function showLoading(msg) {
    loadingScreen.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    if (msg) loadingMessage.textContent = msg;
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
}
