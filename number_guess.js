/* ============================================================
 * number_guess.js
 * Game rules are unchanged from the original: same ranges, same
 * attempt counts, same win/hint/loss conditions. The only thing
 * restructured is *how* the difficulty is looked up — a single
 * explicit table instead of an if/else chain — so the same level
 * always maps to the same settings, on every device.
 * ============================================================ */

// ---- Difficulty table (values identical to the original game) ----
const DIFFICULTIES = {
  easy:    { max: 50,  attempts: 10, label: "🟢 Easy Mode (1 - 50)" },
  medium:  { max: 100, attempts: 7,  label: "🟡 Medium Mode (1 - 100)" },
  hard:    { max: 200, attempts: 5,  label: "🟠 Hard Mode (1 - 200)" },
  extreme: { max: 500, attempts: 3,  label: "🔴 Extreme Mode (1 - 500)" },
};

// Get level from URL — trimmed/lowercased so stray whitespace or
// casing can never cause a mismatch, then falls back to Easy if the
// value isn't one of the four known keys.
const params = new URLSearchParams(window.location.search);
const requestedLevel = (params.get("level") || "").trim().toLowerCase();
const levelKey = Object.prototype.hasOwnProperty.call(DIFFICULTIES, requestedLevel)
  ? requestedLevel
  : "easy";
const config = DIFFICULTIES[levelKey];

let secretNumber = Math.floor(Math.random() * config.max) + 1;
let maxAttempts = config.attempts;
let attempts = 0;

document.getElementById("levelName").innerHTML = config.label;

// Show attempts
document.getElementById("attempts").innerHTML =
"🎯 Attempts Left: " + maxAttempts;

/* ================================
   EXTRA: sound effects (Web Audio)
   ================================ */

let soundOn = true;
let audioCtx = null;

function toggleSound(){

    soundOn = !soundOn;

    document.getElementById("soundIcon").className =
    soundOn ? "bi bi-volume-up-fill" : "bi bi-volume-mute-fill";

    document.getElementById("soundToggle").setAttribute(
        "aria-pressed", soundOn ? "true" : "false"
    );
}

function playTone(freq, duration, type){

    if(!soundOn) return;

    if(!audioCtx){
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type || "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playHighSound(){
    playTone(220, 0.18, "sawtooth");
}

function playLowSound(){
    playTone(440, 0.18, "sine");
}

function playWinSound(){
    playTone(523, 0.15, "triangle");
    setTimeout(()=>playTone(659, 0.15, "triangle"), 150);
    setTimeout(()=>playTone(784, 0.3, "triangle"), 300);
}

function playLoseSound(){
    playTone(180, 0.4, "sawtooth");
    setTimeout(()=>playTone(120, 0.5, "sawtooth"), 200);
}

function playErrorSound(){
    playTone(150, 0.15, "square");
}

/* ================================
   EXTRA: previous guesses history
   ================================ */

function addHistoryChip(value, type){

    const list = document.getElementById("historyList");

    const chip = document.createElement("span");
    chip.className = "chip " + type;

    let icon = "•";
    if(type === "low") icon = "📉";
    if(type === "high") icon = "📈";
    if(type === "correct") icon = "🎯";

    chip.innerHTML = icon + " " + value;

    list.appendChild(chip);

    list.scrollTop = list.scrollHeight;
}

/* ================================
   EXTRA: confetti burst on win
   ================================ */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function launchConfetti(){

    if(reduceMotion) return;

    const colors = ["#ff2fd0","#7b2fff","#2fb8ff","#22c55e","#facc15"];

    for(let i = 0; i < 40; i++){

        const piece = document.createElement("div");
        piece.className = "confetti";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (2 + Math.random() * 1.5) + "s";
        piece.style.opacity = Math.random();

        document.body.appendChild(piece);

        setTimeout(()=> piece.remove(), 3600);
    }
}

/* ================================
   EXTRA: firework bursts on win
   ================================ */

function launchFireworks(){

    if(reduceMotion) return;

    const colors = ["#ff2fd0","#7b2fff","#2fb8ff","#22c55e","#facc15"];
    const originCount = 3;

    for(let b = 0; b < originCount; b++){

        const originX = 15 + Math.random() * 70; // vw
        const originY = 20 + Math.random() * 40; // vh
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = b * 220;

        setTimeout(() => {

            const burst = document.createElement("div");
            burst.className = "firework-burst";
            burst.style.left = originX + "vw";
            burst.style.top = originY + "vh";

            const sparkCount = 16;
            for(let i = 0; i < sparkCount; i++){
                const spark = document.createElement("span");
                const angle = (360 / sparkCount) * i;
                spark.style.setProperty("--fw-angle", angle + "deg");
                spark.style.background = color;
                burst.appendChild(spark);
            }

            document.body.appendChild(burst);
            setTimeout(()=> burst.remove(), 1200);

        }, delay);
    }
}

/* ================================
   EXTRA: attempts progress bar
   ================================ */

function updateProgressBar(left){

    const pct = Math.max(0, (left / maxAttempts) * 100);

    document.getElementById("progressBar").style.width = pct + "%";
    document.getElementById("progressBar").parentElement.setAttribute(
        "aria-valuenow", Math.round(pct)
    );
}

updateProgressBar(maxAttempts);

// Main Game Function
function checkGuess(){

    let input =
    document.getElementById("guessInput");

    let guess =
    parseInt(input.value);

    if(isNaN(guess)){

        document.getElementById("message").innerHTML =
        "⚠ Please enter a number!";

        document.getElementById("message").style.color =
        "#facc15";

        input.classList.add("shake");
        setTimeout(()=> input.classList.remove("shake"), 400);
        playErrorSound();

        return;
    }

    attempts++;

    // Correct Guess
    if(guess === secretNumber){

        document.getElementById("message").innerHTML =
        "🎉 Congratulations! You guessed the number in "
        + attempts + " attempts!";

        document.getElementById("message").style.color =
        "#22c55e";

        document.getElementById("restartBtn").style.display =
        "block";

        input.disabled = true;

        addHistoryChip(guess, "correct");
        updateProgressBar(0);
        playWinSound();
        launchConfetti();
        launchFireworks();

        document.getElementById("message").classList.add("pop");

        return;
    }

    // Hint
    if(guess > secretNumber){

        document.getElementById("message").innerHTML =
        "📈 Too High!";

        document.getElementById("message").style.color =
        "#ef4444";

        addHistoryChip(guess, "high");
        playHighSound();
    }
    else{

        document.getElementById("message").innerHTML =
        "📉 Too Low!";

        document.getElementById("message").style.color =
        "#38bdf8";

        addHistoryChip(guess, "low");
        playLowSound();
    }

    document.getElementById("message").classList.remove("pop");
    void document.getElementById("message").offsetWidth;
    document.getElementById("message").classList.add("pop");

    let left = maxAttempts - attempts;

    if(left > 0){

        document.getElementById("attempts").innerHTML =
        "🎯 Attempts Left: " + left;
    }

    updateProgressBar(left);

    // Warning
    if(left <= 2 && left > 0){

        document.getElementById("attempts").innerHTML =
        "⚠ Only " + left + " attempts left!";
    }

    // Auto Clear Input
    input.value = "";
    input.focus();

    // Game Over
    if(left <= 0){

        document.getElementById("attempts").innerHTML =
        "🎯 Attempts Left: 0";

        document.getElementById("message").innerHTML =
        "💀 Game Over! Correct Number was "
        + secretNumber;

        document.getElementById("message").style.color =
        "#ef4444";

        document.getElementById("restartBtn").style.display =
        "block";

        input.disabled = true;

        playLoseSound();
    }
}

// Enter Key Support
document.getElementById("guessInput")
.addEventListener("keydown", function(event){

    if(event.key === "Enter"){

        checkGuess();
    }

});
