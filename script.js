document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const ROWS = 6;
    const COLS = 7;
    // CELL_SIZE and GAP are now handled via CSS variables

    // State
    const state = {
        board: [], // 6x7 array: 0 = empty, 1 = Black, 2 = Red
        pieces: [], // Array of piece objects { id, row, col, player, element }
        turn: 1, // 1 = Black, 2 = Red
        gravity: 1, // 1 = Down, -1 = Up
        scores: { 1: 0, 2: 0 },
        gameOver: false,
        isAnimating: false,
        autoGravity: true,
        aiEnabled: false
    };

    // DOM Elements
    // DOM Elements
    const boardEl = document.getElementById('board');
    const gridBg = document.getElementById('grid-background');
    const colSelectors = document.getElementById('column-selectors');
    const scoreValYellow = document.getElementById('score-val-yellow');
    const scoreValRed = document.getElementById('score-val-red');
    const scoreYellowEl = document.getElementById('score-yellow');
    const scoreRedEl = document.getElementById('score-red');
    const gravityStatus = document.getElementById('gravity-direction');
    const btnReset = document.getElementById('btn-reset');
    const btnResetScore = document.getElementById('btn-reset-score');
    // btnGravity removed
    const btnAutoGravity = document.getElementById('btn-auto-gravity');
    const aiToggleBtn = document.getElementById('btn-ai-mode');
    const modal = document.getElementById('modal-game-over');
    const winnerText = document.getElementById('winner-text');
    const btnPlayAgain = document.getElementById('btn-play-again');

    // ... (init and other functions remain, just need to jump to event listeners)

    // We need to use multi_replace for this efficiently or just careful separate replaces.
    // I'll do separate replaces to be safe with context.


    // Initialization
    function init() {
        createGrid();
        resetGame();
        setupEventListeners();
        gameLoop();
    }

    function createGrid() {
        // Create visual grid slots
        gridBg.innerHTML = '';
        colSelectors.innerHTML = '';

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell-slot');
                gridBg.appendChild(cell);
            }
        }

        // Create column triggers
        for (let c = 0; c < COLS; c++) {
            const trigger = document.createElement('div');
            trigger.classList.add('col-trigger');
            trigger.dataset.col = c;
            trigger.addEventListener('click', () => handleColumnClick(c));
            colSelectors.appendChild(trigger);
        }
    }

    function resetGame() {
        // Clear board logic
        state.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

        // Clear visual pieces
        state.pieces.forEach(p => p.element.remove());
        state.pieces = [];

        // Reset state
        state.turn = 1;
        state.gameOver = false;
        state.isAnimating = false;
        // Keep scores and gravity setting? 
        // Typically reset game keeps scores but resets board.
        // Let's keep gravity as is or reset to DOWN?
        // Let's reset gravity to DOWN for consistency
        state.gravity = 1;

        updateUI();
        modal.classList.add('hidden');
    }

    function handleColumnClick(col) {
        if (state.gameOver || state.isAnimating) return;

        // Check if column is full based on current gravity
        // Actually, piece always enters from the side defined by gravity?
        // "The player then drops a piece from the bottom"
        // If Gravity DOWN (1): Drop from TOP (Row 0) -> Falls to max row.
        // If Gravity UP (-1): Drop from BOTTOM (Row 5) -> Falls (Rises) to min row.

        // Find the target spot
        let targetRow = -1;

        if (state.gravity === 1) { // DOWN
            // Find lowest empty row in this col
            for (let r = ROWS - 1; r >= 0; r--) {
                if (state.board[r][col] === 0) {
                    targetRow = r;
                    break;
                }
            }
        } else { // UP
            // Find highest empty row in this col
            for (let r = 0; r < ROWS; r++) {
                if (state.board[r][col] === 0) {
                    targetRow = r;
                    break;
                }
            }
        }

        if (targetRow === -1) return; // Column full

        // Place piece
        placePiece(targetRow, col, state.turn);
    }

    function placePiece(row, col, player) {
        state.isAnimating = true;

        // Logic update
        state.board[row][col] = player;

        // Visual update
        const piece = document.createElement('div');
        piece.classList.add('piece');
        piece.classList.add(player === 1 ? 'yellow' : 'red');

        // Start position (Spawn outside board)
        // If gravity DOWN, spawn above. If UP, spawn below.
        // We use CSS calc to be responsive.
        // var(--gap) + (col * (var(--cell-size) + var(--gap)))
        const left = `calc(var(--gap) + ${col} * (var(--cell-size) + var(--gap)))`;

        let startRow;
        if (state.gravity === 1) {
            startRow = -1;
        } else {
            startRow = ROWS;
        }

        const startTop = calcTop(startRow);
        const targetTop = calcTop(row);

        piece.style.left = left;
        piece.style.top = startTop;

        boardEl.appendChild(piece);

        state.pieces.push({
            row, col, player, element: piece
        });

        // Trigger animation
        // We use double requestAnimationFrame to ensure the browser has time to register
        // the initial 'top' value before we change it, forcing the transition.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                piece.style.top = targetTop;
            });
        });

        // Wait for animation to finish before next turn
        setTimeout(() => {
            state.isAnimating = false;
            if (checkWin(row, col, player)) {
                endGame(player);
            } else {
                switchTurn();
            }
        }, 600);
    }

    function checkWin(lastRow, lastCol, player) {
        // Directions: Horizontal, Vertical, Diagonal 1, Diagonal 2
        const directions = [
            [0, 1],  // Horizontal
            [1, 0],  // Vertical
            [1, 1],  // Diagonal \
            [1, -1]  // Diagonal /
        ];

        for (const [dr, dc] of directions) {
            let count = 1;

            // Check positive direction
            for (let i = 1; i < 4; i++) {
                const r = lastRow + dr * i;
                const c = lastCol + dc * i;
                if (isValid(r, c) && state.board[r][c] === player) count++;
                else break;
            }

            // Check negative direction
            for (let i = 1; i < 4; i++) {
                const r = lastRow - dr * i;
                const c = lastCol - dc * i;
                if (isValid(r, c) && state.board[r][c] === player) count++;
                else break;
            }

            if (count >= 4) return true;
        }
        return false;
    }

    function isValid(r, c) {
        return r >= 0 && r < ROWS && c >= 0 && c < COLS;
    }

    function switchTurn() {
        state.turn = state.turn === 1 ? 2 : 1;

        // Auto-gravity logic
        if (state.autoGravity) {
            // Random chance or fixed? 
            // "Alternates between normal and antigravity mode" -> Prompt implied alternating.
            // Let's make it toggle EVERY TURN if auto-gravity is on?
            // That's chaotic!
            // Let's do: Switch every 2 turns (one round)? 
            // Or just randomly.
            // Let's simply call toggleGravity() here if valid.
            toggleGravity(true); // true = automated
        }

        updateUI();

        if (state.aiEnabled && state.turn === 2 && !state.gameOver) {
            setTimeout(makeAiMove, 600);
        }
    }

    function toggleGravity(isAuto = false) {
        if (state.isAnimating && !isAuto) return; // Prevent manual spam

        state.gravity *= -1; // Toggle
        state.isAnimating = true;

        // Re-calculate all piece positions
        // 1. Clear logic board (temporarily)
        // 2. Sort existing pieces by their column
        // 3. Re-stack them in the new gravity direction

        // Create logical columns
        const cols = Array.from({ length: COLS }, () => []);

        // Collect pieces
        state.pieces.forEach(p => {
            cols[p.col].push(p);
        });

        const newBoard = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

        cols.forEach((colPieces, cIndex) => {
            // Sort pieces by current row to maintain relative order?
            // If pieces fall, their relative order in the column stays the same?
            // Yes. A piece above another stays "above" (further from gravity source).
            // Actually, if gravity inverts, the order in the array matches the visual stack.
            // We just need to pack them.

            // Sort by current row (Ascending)
            colPieces.sort((a, b) => a.row - b.row);

            if (state.gravity === 1) { // DOWN
                // Pack to bottom (ROWS-1, ROWS-2...)
                // The piece with highest row index (previously at bottom) should stay at bottom?
                // Wait.
                // If gravity was UP, pieces were at 0, 1, 2. (0 is top).
                // Now gravity is DOWN. 0 should fall to 5. 1 to 4.
                // So the order maintains.
                // We just fill from bottom up.
                // Last element in sorted array (largest row) is "lowest" visually.
                // So pieces with LOW ROW INDEX (Top) become pieces with LOW ROW INDEX (Top) in the new stack? NO.
                // If gravity DOWN: Stack from Bottom (5). 
                // Piece at 2 (Bottom-most of stack [0,1,2]) -> Goes to 5.
                // Piece at 1 -> Goes to 4.
                // So Sort DESCENDING.
                colPieces.sort((a, b) => b.row - a.row); // [2, 1, 0]

                colPieces.forEach((p, i) => {
                    const newRow = (ROWS - 1) - i;
                    updatePiecePosition(p, newRow, cIndex);
                    newBoard[newRow][cIndex] = p.player;
                });
            } else { // UP
                // Pack to top (0, 1, 2...)
                // Piece at 3 (Top-most of stack [3,4,5]) -> Goes to 0.
                // Piece at 4 -> Goes to 1.
                // So Sort ASCENDING.
                colPieces.sort((a, b) => a.row - b.row); // [3, 4, 5]

                colPieces.forEach((p, i) => {
                    const newRow = 0 + i;
                    updatePiecePosition(p, newRow, cIndex);
                    newBoard[newRow][cIndex] = p.player;
                });
            }
        });

        state.board = newBoard;

        updateUI();

        setTimeout(() => {
            state.isAnimating = false;
            // Check win after gravity shift? 
            // "The game should keep track..." - Usually rules check win after every move.
            // Shifting gravity IS a move or event. A win could occur.
            // Let's check win for current player? Or both?
            // If gravity shifts and Black gets 4 in a row, Black wins.
            // If both get 4 in a row? Draw or Turn player wins? 
            // Let's scan whole board.
            // Simply iterate all pieces or check all cells?
            checkGlobalWin();
        }, 600);
    }

    function updatePiecePosition(pieceObj, newRow, col) {
        pieceObj.row = newRow;
        pieceObj.col = col;
        const top = calcTop(newRow);
        pieceObj.element.style.top = top;
    }

    function calcTop(row) {
        return `calc(var(--gap) + ${row} * (var(--cell-size) + var(--gap)))`;
    }

    function checkGlobalWin() {
        // Iterate all cells
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const p = state.board[r][c];
                if (p !== 0) {
                    if (checkWin(r, c, p)) {
                        endGame(p);
                        return;
                    }
                }
            }
        }
    }

    function endGame(winner) {
        state.gameOver = true;
        state.scores[winner]++;
        winnerText.textContent = `${winner === 1 ? 'Yellow' : 'Red'} Wins!`;
        scoreValYellow.textContent = state.scores[1];
        scoreValRed.textContent = state.scores[2];
        modal.classList.remove('hidden');
    }

    function setupEventListeners() {
        btnReset.addEventListener('click', resetGame);

        btnResetScore.addEventListener('click', () => {
            state.scores[1] = 0;
            state.scores[2] = 0;
            scoreValYellow.textContent = '0';
            scoreValRed.textContent = '0';
        });

        btnAutoGravity.addEventListener('click', () => {
            state.autoGravity = !state.autoGravity;
            btnAutoGravity.textContent = `Auto Switch Gravity: ${state.autoGravity ? 'ON' : 'OFF'}`;
            btnAutoGravity.classList.toggle('secondary', !state.autoGravity);
            btnAutoGravity.classList.toggle('primary', state.autoGravity);
        });

        if (aiToggleBtn) {
            aiToggleBtn.addEventListener('click', (e) => {
                state.aiEnabled = !state.aiEnabled;
                const btn = e.currentTarget;
                btn.textContent = `Play vs AI (Red): ${state.aiEnabled ? 'ON' : 'OFF'}`;
                btn.classList.toggle('primary', state.aiEnabled);
                btn.classList.toggle('secondary', !state.aiEnabled);

                if (state.aiEnabled && state.turn === 2 && !state.gameOver && !state.isAnimating) {
                    makeAiMove();
                }
            });
        }

        btnPlayAgain.addEventListener('click', resetGame);
    }

    function updateUI() {
        scoreYellowEl.classList.toggle('active-turn', state.turn === 1);
        scoreRedEl.classList.toggle('active-turn', state.turn === 2);

        gravityStatus.innerHTML = state.gravity === 1
            ? 'Down ▼'
            : '<span style="color:var(--highlight)">Up ▲</span>';
    }

    function gameLoop() {
        // Optional: Continuous updates if needed
        requestAnimationFrame(gameLoop);
    }

    function makeAiMove() {
        if (state.gameOver || state.turn !== 2) return;

        const validMoves = [];
        for (let c = 0; c < COLS; c++) {
            if (getAiTargetRow(c) !== -1) {
                validMoves.push(c);
            }
        }

        if (validMoves.length === 0) return;

        let bestMove = -1;

        // 1. Check for immediate win
        for (const col of validMoves) {
            const row = getAiTargetRow(col);
            state.board[row][col] = 2; // Sim AI
            if (checkWin(row, col, 2)) {
                bestMove = col;
            }
            state.board[row][col] = 0; // Undo
            if (bestMove !== -1) break;
        }

        // 2. Block opponent immediate win
        if (bestMove === -1) {
            for (const col of validMoves) {
                const row = getAiTargetRow(col);
                state.board[row][col] = 1; // Sim Opponent
                if (checkWin(row, col, 1)) {
                    bestMove = col;
                }
                state.board[row][col] = 0; // Undo
                if (bestMove !== -1) break;
            }
        }

        // 3. Strategic Random (Prefer Center)
        if (bestMove === -1) {
            const centerOrder = [3, 2, 4, 1, 5, 0, 6];
            // Filter only valid moves from centerOrder
            const validCenterMoves = centerOrder.filter(c => validMoves.includes(c));

            // 20% randomness to avoid being too predictable, or pick first valid center move
            if (Math.random() < 0.2 && validMoves.length > 0) {
                bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            } else if (validCenterMoves.length > 0) {
                bestMove = validCenterMoves[0];
            } else {
                bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            }
        }

        handleColumnClick(bestMove);
    }

    function getAiTargetRow(col) {
        if (state.gravity === 1) { // DOWN
            for (let r = ROWS - 1; r >= 0; r--) {
                if (state.board[r][col] === 0) return r;
            }
        } else { // UP
            for (let r = 0; r < ROWS; r++) {
                if (state.board[r][col] === 0) return r;
            }
        }
        return -1;
    }

    init();
});
