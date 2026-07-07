// Get level from URL
const params = new URLSearchParams(window.location.search);
const level = params.get("level");

let secretNumber;
let maxAttempts;
let attempts = 0;

// Set difficulty
if(level === "easy"){

    secretNumber =
    Math.floor(Math.random() * 50) + 1;

    maxAttempts = 10;

    document.getElementById("levelName").innerHTML =
    "🟢 Easy Mode (1 - 50)";
}
else if(level === "medium"){

    secretNumber =
    Math.floor(Math.random() * 100) + 1;

    maxAttempts = 7;

    document.getElementById("levelName").innerHTML =
    "🟡 Medium Mode (1 - 100)";
}
else if(level === "hard"){

    secretNumber =
    Math.floor(Math.random() * 200) + 1;

    maxAttempts = 5;

    document.getElementById("levelName").innerHTML =
    "🟠 Hard Mode (1 - 200)";
}
else if(level === "extreme"){

    secretNumber =
    Math.floor(Math.random() * 500) + 1;

    maxAttempts = 3;

    document.getElementById("levelName").innerHTML =
    "🔴 Extreme Mode (1 - 500)";
}
else{

    secretNumber =
    Math.floor(Math.random() * 50) + 1;

    maxAttempts = 10;

    document.getElementById("levelName").innerHTML =
    "🟢 Easy Mode (1 - 50)";
}

// Show attempts
document.getElementById("attempts").innerHTML =
"🎯 Attempts Left: " + maxAttempts;

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

        return;
    }

    // Hint
    if(guess > secretNumber){

        document.getElementById("message").innerHTML =
        "📈 Too High!";

        document.getElementById("message").style.color =
        "#f97316";
    }
    else{

        document.getElementById("message").innerHTML =
        "📉 Too Low!";

        document.getElementById("message").style.color =
        "#38bdf8";
    }

    let left = maxAttempts - attempts;

    if(left > 0){

        document.getElementById("attempts").innerHTML =
        "🎯 Attempts Left: " + left;
    }

    // Warning
    if(left <= 2 && left > 0){

        document.getElementById("attempts").innerHTML =
        "⚠ Only " + left + " attempts left!";
    }

    // Auto Clear Input
    input.value = "";
    input.focus();

    // Game Over
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
}}

// Enter Key Support
document.getElementById("guessInput")
.addEventListener("keydown", function(event){

    if(event.key === "Enter"){

        checkGuess();
    }

});