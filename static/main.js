// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let solution = [];
let timerInterval = null;
let elapsedSeconds = 0;
let currentDifficulty = 'medium';
let gameActive = false;
const STORAGE_KEY = 'sudoku_scores';
const MAX_SCORES = 10;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function startTimer() {
  stopTimer();
  elapsedSeconds = 0;
  document.getElementById('timer').textContent = '0:00';
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    document.getElementById('timer').textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz, sol) {
  puzzle = puz;
  solution = sol;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className = 'sudoku-cell prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame() {
  stopTimer();
  const clues = parseInt(document.getElementById('difficulty').selectedOptions[0].dataset.clues);
  currentDifficulty = document.getElementById('difficulty').value;
  const res = await fetch(`/new?clues=${clues}`);
  const data = await res.json();
  if (data.puzzle && data.solution) {
    renderPuzzle(data.puzzle, data.solution);
  }
  document.getElementById('message').innerText = '';
  gameActive = true;
  startTimer();
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    msg.style.color = '#388e3c';
    msg.innerText = 'Congratulations! You solved it!';
    stopTimer();
    gameActive = false;
    showScoreModal(elapsedSeconds, currentDifficulty);
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

function getScores() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveScores(scores) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

function addScore(name, time, difficulty) {
  const scores = getScores();
  scores.push({
    name: name.trim() || 'Anonymous',
    time: time,
    difficulty: difficulty,
    timestamp: new Date().toISOString()
  });
  
  // Sort by time and keep only top 10
  scores.sort((a, b) => a.time - b.time);
  scores.splice(MAX_SCORES);
  
  saveScores(scores);
  displayScoreboard();
}

function displayScoreboard() {
  const scores = getScores();
  const tbody = document.getElementById('scores-body');
  tbody.innerHTML = '';
  
  if (scores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No scores yet. Complete a puzzle!</td></tr>';
    return;
  }
  
  scores.forEach((score, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${score.name}</td>
      <td>${formatTime(score.time)}</td>
      <td>${score.difficulty.charAt(0).toUpperCase() + score.difficulty.slice(1)}</td>
    `;
    tbody.appendChild(row);
  });
}

function showScoreModal(seconds, difficulty) {
  const modal = document.getElementById('score-modal');
  const msg = document.getElementById('completion-message');
  msg.innerText = `You completed the ${difficulty} puzzle in ${formatTime(seconds)}!`;
  modal.style.display = 'block';
  document.getElementById('player-name').focus();
  document.getElementById('player-name').value = '';
}

function hideScoreModal() {
  document.getElementById('score-modal').style.display = 'none';
}

function toggleScoreboard() {
  const scoreboard = document.getElementById('scoreboard');
  const btn = document.getElementById('toggle-scoreboard');
  if (scoreboard.classList.contains('scoreboard-hidden')) {
    scoreboard.classList.remove('scoreboard-hidden');
    btn.innerText = 'Hide Scores';
    displayScoreboard();
  } else {
    scoreboard.classList.add('scoreboard-hidden');
    btn.innerText = 'Show Scores';
  }
}

async function giveHint() {
  if (!gameActive) {
    alert('Start a new game to get a hint.');
    return;
  }
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  
  // Find empty cells that can be filled
  const emptyCells = [];
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      if (!inputs[idx].disabled && inputs[idx].value === '') {
        emptyCells.push({row: i, col: j, idx: idx});
      }
    }
  }
  
  if (emptyCells.length === 0) {
    alert('No empty cells available for hints.');
    return;
  }
  
  // Pick a random empty cell and fill it with the solution
  const hint = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  inputs[hint.idx].value = solution[hint.row][hint.col];
  inputs[hint.idx].disabled = true;
  inputs[hint.idx].className = 'sudoku-cell hint';
}

// Wire buttons and events
window.addEventListener('load', () => {
  // Dark mode toggle setup
  const darkModeBtn = document.getElementById('dark-mode-btn');
  const savedDarkMode = localStorage.getItem('darkMode') === 'true';
  if (savedDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeBtn.textContent = '☀️ Light Mode';
  }
  
  darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    darkModeBtn.textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
  });
  
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('difficulty').addEventListener('change', () => {
    if (gameActive) {
      newGame();
    }
  });
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint-button').addEventListener('click', giveHint);
  document.getElementById('toggle-scoreboard').addEventListener('click', toggleScoreboard);
  
  // Score modal handlers
  document.getElementById('save-score').addEventListener('click', () => {
    const name = document.getElementById('player-name').value;
    addScore(name, elapsedSeconds, currentDifficulty);
    hideScoreModal();
  });
  
  document.getElementById('skip-score').addEventListener('click', hideScoreModal);
  
  document.getElementById('player-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('save-score').click();
    }
  });
  
  // Initialize
  newGame();
});