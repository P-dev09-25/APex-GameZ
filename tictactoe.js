/* ============================================================
 * tictactoe.js
 * Frontend controller for the Tic-Tac-Toe widget.
 *
 * All game rules live in tictactoe.c, compiled to tictactoe.wasm.
 * This file's only job is: load that module, translate DOM events
 * into calls on it, and render whatever it reports back. No game
 * logic (win checks, turn order, AI) is duplicated here.
 * ============================================================ */

(function () {
  "use strict";

  const MODE_PVP = 0;
  const MODE_PVC = 1;

  const STATE_ONGOING = 0;
  const STATE_X_WINS = 1;
  const STATE_O_WINS = 2;
  const STATE_DRAW = 3;

  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  const WASM_PATH = new URL("tictactoe.wasm", document.currentScript.src);

  const state = {
    exports: null,
    mode: MODE_PVC,
    scores: { x: 0, o: 0, draws: 0 },
    locked: false, // true while the computer is "thinking" or game is over
  };

  let root, boardEl, cells, statusEl, restartBtn, modeButtons, scoreEl;

  function markSvg(mark, animate) {
    const drawClass = animate ? " ttt-mark-draw-on" : "";
    if (mark === 1) {
      return (
        `<svg viewBox="0 0 100 100" class="ttt-mark-x${drawClass}" aria-hidden="true">` +
        `<path class="ttt-mark-path" pathLength="1" d="M22 22 L78 78"></path>` +
        `<path class="ttt-mark-path" pathLength="1" style="animation-delay:0.12s" d="M78 22 L22 78"></path>` +
        `</svg>`
      );
    }
    if (mark === 2) {
      return (
        `<svg viewBox="0 0 100 100" class="ttt-mark-o${drawClass}" aria-hidden="true">` +
        `<circle class="ttt-mark-path" pathLength="1" cx="50" cy="50" r="32"></circle>` +
        `</svg>`
      );
    }
    return "";
  }

  function findWinningLine(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
        return line;
      }
    }
    return null;
  }

  function readBoard() {
    const board = new Array(9);
    for (let i = 0; i < 9; i++) board[i] = state.exports.get_cell(i);
    return board;
  }

  function render(justPlayedIndex) {
    const e = state.exports;
    const board = readBoard();
    const gameState = e.get_game_state();
    const currentPlayer = e.get_current_player();
    const winLine = gameState === STATE_X_WINS || gameState === STATE_O_WINS
      ? findWinningLine(board)
      : null;

    board.forEach((mark, i) => {
      const cell = cells[i];
      const animate = i === justPlayedIndex;
      cell.innerHTML = markSvg(mark, animate);
      cell.disabled = mark !== 0 || gameState !== STATE_ONGOING;
      cell.classList.toggle("is-win", !!winLine && winLine.includes(i));
      cell.setAttribute(
        "aria-label",
        mark === 0 ? `Empty cell ${i + 1}` : `Cell ${i + 1}: ${mark === 1 ? "X" : "O"}`
      );
    });

    renderStatus(gameState, currentPlayer);
    renderScore();

    state.locked = gameState !== STATE_ONGOING;
  }

  function renderStatus(gameState, currentPlayer) {
    statusEl.classList.remove("is-win-you", "is-win-x", "is-win-o", "is-lose", "is-draw");
    let html = "";
    let text = "";

    if (gameState === STATE_ONGOING) {
      const mark = currentPlayer; // 1 = X, 2 = O
      html = markSvg(mark, false);
      if (state.mode === MODE_PVC) {
        text = currentPlayer === 1 ? "Your move" : "Computer is thinking\u2026";
      } else {
        text = `Player ${currentPlayer === 1 ? "X" : "O"}\u2019s move`;
      }
    } else if (gameState === STATE_X_WINS) {
      if (state.mode === MODE_PVC) {
        text = "You Win";
        statusEl.classList.add("is-win-you");
      } else {
        text = "Player X Wins!";
        statusEl.classList.add("is-win-x");
      }
    } else if (gameState === STATE_O_WINS) {
      if (state.mode === MODE_PVC) {
        text = "You Lose";
        statusEl.classList.add("is-lose");
      } else {
        text = "Player O Wins!";
        statusEl.classList.add("is-win-o");
      }
    } else if (gameState === STATE_DRAW) {
      text = "Draw Game";
      statusEl.classList.add("is-draw");
    }

    statusEl.innerHTML = `<span class="ttt-turn-mark">${html}</span><span>${text}</span>`;
  }

  function renderScore() {
    const leftLabel = state.mode === MODE_PVC ? "You" : "X";
    const rightLabel = state.mode === MODE_PVC ? "CPU" : "O";
    scoreEl.innerHTML =
      `${leftLabel} <span>${state.scores.x}</span> &nbsp;\u2014&nbsp; ` +
      `Draws <span>${state.scores.draws}</span> &nbsp;\u2014&nbsp; ` +
      `${rightLabel} <span>${state.scores.o}</span>`;
  }

  function tallyIfFinished(gameState) {
    if (gameState === STATE_X_WINS) state.scores.x++;
    else if (gameState === STATE_O_WINS) state.scores.o++;
    else if (gameState === STATE_DRAW) state.scores.draws++;
  }

  function maybeRunComputer() {
    const e = state.exports;
    if (
      state.mode === MODE_PVC &&
      e.get_game_state() === STATE_ONGOING &&
      e.get_current_player() === 2
    ) {
      state.locked = true;
      setTimeout(() => {
        const played = e.computer_move();
        render(played);
        tallyIfFinished(e.get_game_state());
        renderScore();
      }, 380); // brief pause so the move doesn't feel instant/robotic
    }
  }

  function onCellClick(evt) {
    if (state.locked) return;
    const index = Number(evt.currentTarget.dataset.index);
    const e = state.exports;

    if (state.mode === MODE_PVC && e.get_current_player() !== 1) return;

    const result = e.make_move(index);
    if (result < 0) return; // invalid move (shouldn't happen: cell already disabled)

    render(index);
    tallyIfFinished(result);
    maybeRunComputer();
  }

  function startNewGame(mode) {
    state.mode = mode;
    state.exports.reset_game(mode);
    modeButtons.forEach((btn) =>
      btn.classList.toggle("is-active", Number(btn.dataset.mode) === mode)
    );
    render(-1);
  }

  function attachEvents() {
    cells.forEach((cell) => cell.addEventListener("click", onCellClick));
    restartBtn.addEventListener("click", () => startNewGame(state.mode));
    modeButtons.forEach((btn) =>
      btn.addEventListener("click", () => startNewGame(Number(btn.dataset.mode)))
    );
  }

  async function loadWasm(url) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(fetch(url), {});
      } catch (err) {
        // Falls through to the ArrayBuffer path below (e.g. the server
        // didn't send a application/wasm content-type).
      }
    }
    const resp = await fetch(url);
    const bytes = await resp.arrayBuffer();
    return WebAssembly.instantiate(bytes, {});
  }

  async function init() {
    root = document.getElementById("ttt-widget");
    if (!root) return;

    boardEl = root.querySelector(".ttt-board");
    cells = Array.from(root.querySelectorAll(".ttt-cell"));
    statusEl = root.querySelector(".ttt-status");
    restartBtn = root.querySelector(".ttt-restart");
    modeButtons = Array.from(root.querySelectorAll(".ttt-mode button"));
    scoreEl = root.querySelector(".ttt-score");

    const { instance } = await loadWasm(WASM_PATH);

    state.exports = instance.exports;
    state.exports.seed_rng((Date.now() & 0xffffffff) >>> 0);

    attachEvents();
    startNewGame(state.mode);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
