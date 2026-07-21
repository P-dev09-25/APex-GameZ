/* ============================================================
 * tictactoe.c  --  Tic-Tac-Toe game logic
 *
 * This is the "backend" of the game: all rules, turn handling,
 * win/draw detection and the computer opponent live here, in C.
 * It is compiled straight to WebAssembly (no Emscripten runtime,
 * no libc) so the browser can call these functions directly.
 *
 * Build (see build.sh):
 *   clang --target=wasm32 -O2 -nostdlib -fno-builtin \
 *         -Wl,--no-entry -Wl,--strip-all \
 *         -o tictactoe.wasm tictactoe.c
 *
 * Cell values on the board:
 *   0 = empty, 1 = X, 2 = O
 *
 * Game state values:
 *   0 = in progress, 1 = X wins, 2 = O wins, 3 = draw
 * ============================================================ */

#define EMPTY 0
#define PLAYER_X 1
#define PLAYER_O 2

#define STATE_ONGOING 0
#define STATE_X_WINS  1
#define STATE_O_WINS  2
#define STATE_DRAW    3

#define MODE_PVP 0
#define MODE_PVC 1

static unsigned char board[9];
static int current_player;   /* whose turn it is: PLAYER_X or PLAYER_O   */
static int game_mode;        /* MODE_PVP or MODE_PVC                     */
static int game_state;       /* STATE_ONGOING / _X_WINS / _O_WINS / DRAW */
static unsigned int rng_state = 2463534242u; /* xorshift32 seed */

/* All 8 possible winning lines */
static const unsigned char LINES[8][3] = {
    {0, 1, 2}, {3, 4, 5}, {6, 7, 8}, /* rows    */
    {0, 3, 6}, {1, 4, 7}, {2, 5, 8}, /* columns */
    {0, 4, 8}, {2, 4, 6}             /* diagonals */
};

/* ---- tiny xorshift32 PRNG so we don't need libc's rand() ---- */
static unsigned int next_random(void) {
    unsigned int x = rng_state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    rng_state = x;
    return x;
}

__attribute__((export_name("seed_rng")))
void seed_rng(unsigned int seed) {
    rng_state = seed ? seed : 1u;
}

/* Scan the board and return the current game state without mutating it */
static int evaluate_board(void) {
    for (int i = 0; i < 8; i++) {
        unsigned char a = board[LINES[i][0]];
        unsigned char b = board[LINES[i][1]];
        unsigned char c = board[LINES[i][2]];
        if (a != EMPTY && a == b && b == c) {
            return (a == PLAYER_X) ? STATE_X_WINS : STATE_O_WINS;
        }
    }
    for (int i = 0; i < 9; i++) {
        if (board[i] == EMPTY) return STATE_ONGOING;
    }
    return STATE_DRAW;
}

__attribute__((export_name("reset_game")))
void reset_game(int mode) {
    for (int i = 0; i < 9; i++) board[i] = EMPTY;
    current_player = PLAYER_X; /* X always opens */
    game_mode = mode;
    game_state = STATE_ONGOING;
}

__attribute__((export_name("get_cell")))
int get_cell(int index) {
    if (index < 0 || index > 8) return -1;
    return board[index];
}

__attribute__((export_name("get_current_player")))
int get_current_player(void) {
    return current_player;
}

__attribute__((export_name("get_game_state")))
int get_game_state(void) {
    return game_state;
}

__attribute__((export_name("get_game_mode")))
int get_game_mode(void) {
    return game_mode;
}

/* Places the current player's mark on `cell`.
 * Returns the resulting game_state, or a negative error code:
 *   -1 game already over, -2 out of range, -3 cell occupied
 */
__attribute__((export_name("make_move")))
int make_move(int cell) {
    if (game_state != STATE_ONGOING) return -1;
    if (cell < 0 || cell > 8) return -2;
    if (board[cell] != EMPTY) return -3;

    board[cell] = (unsigned char)current_player;
    game_state = evaluate_board();
    if (game_state == STATE_ONGOING) {
        current_player = (current_player == PLAYER_X) ? PLAYER_O : PLAYER_X;
    }
    return game_state;
}

/* Would placing `player` at `cell` win the game? (pure test, no mutation) */
static int is_winning_move(int cell, int player) {
    unsigned char saved = board[cell];
    board[cell] = (unsigned char)player;
    int result = evaluate_board();
    board[cell] = saved;
    return (player == PLAYER_X) ? (result == STATE_X_WINS)
                                 : (result == STATE_O_WINS);
}

/* Computer always plays as O.
 * Strategy: win if possible -> block opponent's win -> take center ->
 *           take a corner -> take an edge. Ties broken randomly.
 * Returns the cell it played, or -1 if it wasn't the computer's turn.
 */
__attribute__((export_name("computer_move")))
int computer_move(void) {
    if (game_state != STATE_ONGOING) return -1;
    if (game_mode != MODE_PVC || current_player != PLAYER_O) return -1;

    int choice = -1;

    /* 1. Take a winning move if one exists */
    for (int i = 0; i < 9 && choice < 0; i++) {
        if (board[i] == EMPTY && is_winning_move(i, PLAYER_O)) choice = i;
    }

    /* 2. Otherwise block the opponent's winning move */
    if (choice < 0) {
        for (int i = 0; i < 9 && choice < 0; i++) {
            if (board[i] == EMPTY && is_winning_move(i, PLAYER_X)) choice = i;
        }
    }

    /* 3. Otherwise take the center */
    if (choice < 0 && board[4] == EMPTY) choice = 4;

    /* 4. Otherwise take a random open corner */
    if (choice < 0) {
        int corners[4] = {0, 2, 6, 8};
        int open[4], count = 0;
        for (int i = 0; i < 4; i++) {
            if (board[corners[i]] == EMPTY) open[count++] = corners[i];
        }
        if (count > 0) choice = open[next_random() % (unsigned int)count];
    }

    /* 5. Otherwise take a random open edge */
    if (choice < 0) {
        int edges[4] = {1, 3, 5, 7};
        int open[4], count = 0;
        for (int i = 0; i < 4; i++) {
            if (board[edges[i]] == EMPTY) open[count++] = edges[i];
        }
        if (count > 0) choice = open[next_random() % (unsigned int)count];
    }

    if (choice < 0) return -1; /* board full, shouldn't happen if state was ongoing */

    board[choice] = PLAYER_O;
    game_state = evaluate_board();
    if (game_state == STATE_ONGOING) current_player = PLAYER_X;
    return choice;
}
