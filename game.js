/**
 * game.js
 * Logique principale du jeu Memory Flower.
 * Dépend de : confetti.js (launchConfetti)
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const EMOJIS = [
  '🌸','🌺','🌹','🌷','🌼','🌻','💐','🌱',
  '🍀','🌿','🦋','🐝','✨','💫','⭐','🌟',
  '💖','💝','💕','💗','🎀','🫧','🍓','🫐'
];

const LEVELS = {
  easy:   { pairs: 8,  cols: 4, timeLimit: 0   },  // pas de limite de temps
  medium: { pairs: 10, cols: 5, timeLimit: 120  },  // 2 minutes
  hard:   { pairs: 18, cols: 6, timeLimit: 120  },  // 2 minutes
};

const WIN_EMOJIS = ['🌸','🌺','🌷','🎉','💐','✨','🌟'];

// ─── ÉTAT ─────────────────────────────────────────────────────────────────────

let currentLevel  = 'easy';
let moves         = 0;
let pairsFound    = 0;
let totalPairs    = 0;
let flipped       = [];
let locked        = false;
let timerInterval = null;
let elapsed       = 0;
let gameStarted   = false;

// ─── RÉFÉRENCES DOM ───────────────────────────────────────────────────────────

const grid        = document.getElementById('game-grid');
const movesEl     = document.getElementById('moves');
const pairsEl     = document.getElementById('pairs-found');
const timerEl     = document.getElementById('timer');
const winOverlay  = document.getElementById('win-overlay');
const winStatsEl  = document.getElementById('win-stats');
const winRecordEl = document.getElementById('win-record');
const winEmojiEl  = document.getElementById('win-emoji');
const bestScoreEl = document.getElementById('best-score-val');

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

/**
 * Mélange un tableau (algorithme Fisher-Yates).
 * @param {Array} arr
 * @returns {Array} nouveau tableau mélangé
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Formate des secondes en "m:ss".
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// ─── MEILLEUR SCORE (localStorage) ───────────────────────────────────────────

function getBestScore(level) {
  try {
    return JSON.parse(localStorage.getItem(`mf_best_${level}`));
  } catch {
    return null;
  }
}

function setBestScore(level, data) {
  try {
    localStorage.setItem(`mf_best_${level}`, JSON.stringify(data));
  } catch {
    // localStorage indisponible, on ignore silencieusement
  }
}

function updateBestScoreDisplay() {
  const best = getBestScore(currentLevel);
  bestScoreEl.textContent = best
    ? `${best.moves} coups · ${formatTime(best.time)}`
    : '—';
}

// ─── TIMER ────────────────────────────────────────────────────────────────────

function startTimer() {
  clearInterval(timerInterval);
  elapsed = 0;
  const { timeLimit } = LEVELS[currentLevel];

  timerInterval = setInterval(() => {
    elapsed++;
    const display = timeLimit > 0 ? timeLimit - elapsed : elapsed;
    timerEl.textContent = formatTime(display >= 0 ? display : 0);
    timerEl.classList.toggle('timer-warning', timeLimit > 0 && display <= 20);

    if (timeLimit > 0 && elapsed >= timeLimit) {
      clearInterval(timerInterval);
      showTimeUp();
    }
  }, 1000);
}

function showTimeUp() {
  locked = true;
  winEmojiEl.textContent  = '⏰';
  winStatsEl.textContent  = 'Temps écoulé ! Essayez encore.';
  winRecordEl.textContent = '';
  winOverlay.classList.add('show');
}

// ─── CRÉATION DES CARTES ──────────────────────────────────────────────────────

function createCard(emoji, index) {
  const card = document.createElement('div');
  card.className       = 'card';
  card.dataset.emoji   = emoji;
  card.dataset.index   = index;
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back"></div>
      <div class="card-face card-front">${emoji}</div>
    </div>`;
  card.addEventListener('click', onCardClick);
  return card;
}

// ─── DÉMARRAGE DU JEU ─────────────────────────────────────────────────────────

function startGame() {
  // Reset état
  clearInterval(timerInterval);
  gameStarted = false;
  moves       = 0;
  pairsFound  = 0;
  flipped     = [];
  locked      = false;
  elapsed     = 0;

  // Reset affichage
  movesEl.textContent = '0';
  pairsEl.textContent = '0';
  timerEl.textContent = '0:00';
  timerEl.classList.remove('timer-warning');
  winOverlay.classList.remove('show');

  // Config du niveau
  const { pairs, cols } = LEVELS[currentLevel];
  totalPairs = pairs;
  pairsEl.parentElement.querySelector('.stat-label').textContent = `Paires / ${totalPairs}`;
  grid.setAttribute('data-cols', cols);

  // Génération et mélange des cartes
  const chosen = shuffle(EMOJIS).slice(0, pairs);
  const cards  = shuffle([...chosen, ...chosen]);

  grid.innerHTML = '';
  cards.forEach((emoji, i) => grid.appendChild(createCard(emoji, i)));

  updateBestScoreDisplay();
}

// ─── GESTION DES CLICS ────────────────────────────────────────────────────────

function onCardClick(e) {
  const card = e.currentTarget;

  // Ignore si verrouillé ou déjà retourné/trouvé
  if (locked) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;

  // Démarre le timer au premier clic
  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  card.classList.add('flipped');
  flipped.push(card);

  if (flipped.length === 2) {
    moves++;
    movesEl.textContent = moves;
    locked = true;
    checkPair();
  }
}

// ─── VÉRIFICATION D'UNE PAIRE ─────────────────────────────────────────────────

function checkPair() {
  const [a, b] = flipped;

  if (a.dataset.emoji === b.dataset.emoji) {
    // ✅ Paire trouvée
    setTimeout(() => {
      a.classList.add('matched');
      b.classList.add('matched');
      flipped = [];
      locked  = false;
      pairsFound++;
      pairsEl.textContent = pairsFound;

      if (pairsFound === totalPairs) onWin();
    }, 300);

  } else {
    // ❌ Pas de paire — on retourne les cartes
    setTimeout(() => {
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      flipped = [];
      locked  = false;
    }, 900);
  }
}

// ─── VICTOIRE ─────────────────────────────────────────────────────────────────

function onWin() {
  clearInterval(timerInterval);
  const time = elapsed;

  // Mise à jour du meilleur score
  const best     = getBestScore(currentLevel);
  const isRecord = !best || moves < best.moves || (moves === best.moves && time < best.time);
  if (isRecord) setBestScore(currentLevel, { moves, time });

  // Affichage overlay
  winEmojiEl.textContent  = WIN_EMOJIS[Math.floor(Math.random() * WIN_EMOJIS.length)];
  winStatsEl.textContent  = `${moves} coups en ${formatTime(time)}`;
  winRecordEl.textContent = isRecord
    ? '🏆 Nouveau record !'
    : `Meilleur : ${best ? best.moves + ' coups · ' + formatTime(best.time) : '—'}`;

  winOverlay.classList.add('show');
  updateBestScoreDisplay();
  launchConfetti(); // défini dans confetti.js
}

// ─── ÉVÉNEMENTS ───────────────────────────────────────────────────────────────

// Boutons de difficulté
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLevel = btn.dataset.level;
    updateBestScoreDisplay();
    startGame();
  });
});

// Nouvelle partie
document.getElementById('new-game-btn').addEventListener('click', startGame);

// Rejouer depuis l'overlay
document.getElementById('play-again-btn').addEventListener('click', () => {
  winOverlay.classList.remove('show');
  startGame();
});

// ─── INITIALISATION ───────────────────────────────────────────────────────────

startGame();
