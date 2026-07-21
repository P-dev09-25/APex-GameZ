#!/usr/bin/env bash
# Compiles tictactoe.c straight to a small, dependency-free WebAssembly
# module. No Emscripten, no libc, no glue-code generation required —
# just clang's built-in wasm32 target. Re-run this any time you edit
# tictactoe.c.
#
# Requires: clang 9+ with the wasm32 target (ships with LLVM by default).
set -euo pipefail

clang --target=wasm32 -O2 -nostdlib -fno-builtin \
  -Wl,--no-entry -Wl,--strip-all -Wl,--allow-undefined \
  -o tictactoe.wasm tictactoe.c

echo "Built tictactoe.wasm ($(wc -c < tictactoe.wasm) bytes)"
