export function renderGamesView() {
  return `
  <div class="games-grid">
    <div class="game-card" id="game-ttt">
      <div class="game-card-icon" style="background:var(--primary-light);">⭕</div>
      <h3>Tic-Tac-Toe</h3>
      <p>Classic 3x3 grid. Play as X against the computer.</p>
    </div>
    <div class="game-card" id="game-memory">
      <div class="game-card-icon" style="background:#e0f2fe;">🃏</div>
      <h3>Memory Match</h3>
      <p>Flip cards and find all matching pairs. Track your moves.</p>
   </div>
    </div>
  <div class="game-card" id="agame-memory">
    <div class="game-card-icon" style="background:#e0f2fe;">🧠</div>
    <h3>Mind heist</h3>
    <p>Coming Soon!!! 😄</p>
   </div>
<div class="game-card" id="arcade">
    <div class="game-card-icon" style="background:#e0f2fe;">🕹️</div>
    <h3>Arcade.exe</h3>
    <p>Play space shooter and a gap jumper game!👑</p>
   </div>
  </div>`;
}

export function attachGamesEvents() {
  document.getElementById('game-ttt')?.addEventListener('click', openTicTacToe);
  document.getElementById('game-memory')?.addEventListener('click', openMemory);
  document.getElementById("agame-memory").addEventListener("click", openMindHeist);
  document.getElementById("arcade").addEventListener("click", openArcade);
}

/* ===== Tic-Tac-Toe ===== */
function openTicTacToe() {
  let board = Array(9).fill(null);
  let gameOver = false;

  const overlay = document.createElement('div');
  overlay.className = 'game-modal-overlay';

  function render() {
    const winner = checkWinner(board);
    let status = '';
    if (winner === 'X') status = 'You win! 🎉';
    else if (winner === 'O') status = 'Computer wins 🤖';
    else if (board.every(c => c)) status = "It's a tie! 🤝";
    else status = 'Your turn (X)';

    overlay.innerHTML = `
    <div class="game-modal">
      <div class="game-modal-header">
        <h2>Tic-Tac-Toe</h2>
        <button class="game-modal-close" id="ttt-close">&times;</button>
      </div>
      <div class="game-status">${status}</div>
      <div class="ttt-board">
        ${board.map((cell, i) => `<div class="ttt-cell ${cell === 'X' ? 'x' : cell === 'O' ? 'o' : ''}" data-idx="${i}">${cell || ''}</div>`).join('')}
      </div>
      <button class="ttt-reset-btn" id="ttt-reset">New Round</button>
    </div>`;

    document.getElementById('ttt-close').addEventListener('click', () => overlay.remove());
    document.getElementById('ttt-reset').addEventListener('click', () => {
      board = Array(9).fill(null);
      gameOver = false;
      render();
    });

    if (!winner && !board.every(c => c)) {
      document.querySelectorAll('.ttt-cell').forEach(cell => {
        if (!cell.textContent) {
          cell.addEventListener('click', () => {
            if (gameOver || board[cell.dataset.idx]) return;
            board[cell.dataset.idx] = 'X';
            if (checkWinner(board) || board.every(c => c)) { gameOver = true; render(); return; }
            const move = getAiMove(board);
            if (move !== -1) board[move] = 'O';
            if (checkWinner(board) || board.every(c => c)) { gameOver = true; }
            render();
          });
        }
      });
    } else {
      gameOver = true;
    }
  }

  document.body.appendChild(overlay);
  render();
}

function checkWinner(b) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

function getAiMove(b) {
  // Simple AI: win if possible, block if possible, else center/corner/random
  for (let i = 0; i < 9; i++) {
    if (!b[i]) { b[i] = 'O'; if (checkWinner(b) === 'O') { b[i] = null; return i; } b[i] = null; }
  }
  for (let i = 0; i < 9; i++) {
    if (!b[i]) { b[i] = 'X'; if (checkWinner(b) === 'X') { b[i] = null; return i; } b[i] = null; }
  }
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter(i => !b[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  const empty = b.map((v, i) => v ? null : i).filter(i => i !== null);
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1;
}

/* ===== Memory Match ===== */
function openMemory() {
  const emojis = ['🚀', '🎨', '🎵', '⚡', '🌟', '🔥', '💎', '🍀'];
  const cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
  let flipped = [];
  let matched = new Set();
  let moves = 0;
  let locked = false;

  const overlay = document.createElement('div');
  overlay.className = 'game-modal-overlay';

  function render() {
    const won = matched.size === cards.length;
    overlay.innerHTML = `
    <div class="game-modal">
      <div class="game-modal-header">
        <h2>Memory Match</h2>
        <button class="game-modal-close" id="mem-close">&times;</button>
      </div>
      <div class="game-status">${won ? `You won in ${moves} moves! 🎉` : 'Find all matching pairs'}</div>
      <div class="memory-stats">
        <div class="memory-stat"><div class="memory-stat-num">${moves}</div><div class="memory-stat-label">Moves</div></div>
        <div class="memory-stat"><div class="memory-stat-num">${matched.size / 2}/${emojis.length}</div><div class="memory-stat-label">Pairs</div></div>
      </div>
      <div class="memory-board">
        ${cards.map((emoji, i) => {
          const isFlipped = flipped.includes(i) || matched.has(i);
          const isMatched = matched.has(i);
          return `
          <div class="memory-card ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''}" data-idx="${i}">
            <div class="memory-card-inner">
              <div class="memory-card-front">?</div>
              <div class="memory-card-back">${emoji}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      ${won ? '<button class="ttt-reset-btn" id="mem-reset">Play Again</button>' : ''}
    </div>`;

    document.getElementById('mem-close').addEventListener('click', () => overlay.remove());
    if (won) {
      document.getElementById('mem-reset')?.addEventListener('click', () => {
        cards.sort(() => Math.random() - 0.5);
        flipped = [];
        matched = new Set();
        moves = 0;
        render();
      });
    }

    document.querySelectorAll('.memory-card').forEach(card => {
      card.addEventListener('click', () => {
        if (locked || won) return;
        const idx = parseInt(card.dataset.idx);
        if (flipped.includes(idx) || matched.has(idx)) return;

        flipped.push(idx);
        moves++;
        render();

        if (flipped.length === 2) {
          locked = true;
          const [a, b] = flipped;
          if (cards[a] === cards[b]) {
            matched.add(a);
            matched.add(b);
          }
          setTimeout(() => {
            flipped = [];
            locked = false;
            render();
          }, 600);
        }
      });
    });
  }

  document.body.appendChild(overlay);
  render();
}
function openMindHeist(){
  // 1. Hide your current menu elements (adjust these selectors to match your CSS/HTML)
// If your menu button is named 'myButton', use: myButton.style.display = 'none';
// You can also hide a whole container div if you have one:
const menuContainer = document.querySelector('.menu-container'); // Example selector
if (menuContainer) menuContainer.style.display = 'none';

// 2. Create the full-screen iframe for the game
const gameIframe = document.createElement('iframe');
gameIframe.src = 'google.com'; 
gameIframe.style.width = '100vw';
gameIframe.style.height = '100vh';
gameIframe.style.border = 'none';
gameIframe.style.position = 'fixed';
gameIframe.style.top = '0';
gameIframe.style.left = '0';
gameIframe.style.zIndex = '9998'; // Floating right below the back button

// 3. Create the floating Back button
const backButton = document.createElement('button');
backButton.textContent = '← Back to Menu';
backButton.style.position = 'fixed';
backButton.style.top = '20px';
backButton.style.left = '20px';
backButton.style.zIndex = '9999'; // Highest layer to stay visible over the game
backButton.style.padding = '10px 15px';
backButton.style.backgroundColor = '#ff4444';
backButton.style.color = 'white';
backButton.style.border = 'none';
backButton.style.borderRadius = '5px';
backButton.style.cursor = 'pointer';
backButton.style.fontSize = '14px';
backButton.style.fontWeight = 'bold';

// 4. Set up the Exit functionality inside the Back button
backButton.addEventListener('click', () => {
    gameIframe.remove();  // Destroy the game session
    backButton.remove();  // Destroy the back button
    
    // Bring your main menu elements back to life
    if (menuContainer) menuContainer.style.display = 'block'; 
    // If you hid individual buttons instead, reset them here: myButton.style.display = 'inline-block';
});

// 5. Inject the iframe and button into your page
document.body.appendChild(gameIframe);
document.body.appendChild(backButton);

}

function openArcade(){
  // 1. Hide your current menu elements (adjust these selectors to match your CSS/HTML)
// If your menu button is named 'myButton', use: myButton.style.display = 'none';
// You can also hide a whole container div if you have one:
const menuContainer = document.querySelector('.menu-container'); // Example selector
if (menuContainer) menuContainer.style.display = 'none';

// 2. Create the full-screen iframe for the game
const gameIframe = document.createElement('iframe');
gameIframe.src = './games/arcade.html'; 
gameIframe.style.width = '100vw';
gameIframe.style.height = '100vh';
gameIframe.style.border = 'none';
gameIframe.style.position = 'fixed';
gameIframe.style.top = '0';
gameIframe.style.left = '0';
gameIframe.style.zIndex = '9998'; // Floating right below the back button

// 3. Create the floating Back button
const backButton = document.createElement('button');
backButton.textContent = '← Back to Menu';
backButton.style.position = 'fixed';
backButton.style.top = '20px';
backButton.style.left = '20px';
backButton.style.zIndex = '9999'; // Highest layer to stay visible over the game
backButton.style.padding = '10px 15px';
backButton.style.backgroundColor = '#ff4444';
backButton.style.color = 'white';
backButton.style.border = 'none';
backButton.style.borderRadius = '5px';
backButton.style.cursor = 'pointer';
backButton.style.fontSize = '14px';
backButton.style.fontWeight = 'bold';

// 4. Set up the Exit functionality inside the Back button
backButton.addEventListener('click', () => {
    gameIframe.remove();  // Destroy the game session
    backButton.remove();  // Destroy the back button
    
    // Bring your main menu elements back to life
    if (menuContainer) menuContainer.style.display = 'block'; 
    // If you hid individual buttons instead, reset them here: myButton.style.display = 'inline-block';
});

// 5. Inject the iframe and button into your page
document.body.appendChild(gameIframe);
document.body.appendChild(backButton);

}
