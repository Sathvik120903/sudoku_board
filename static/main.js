// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let solution = [];
let timerInterval = null;
let elapsedSeconds = 0;
let currentDifficulty = 'medium';
let gameActive = false;
let hintsUsed = 0;
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
        updateConflictHighlights();
      });

      rowDiv.appendChild(input);
    }

    boardDiv.appendChild(rowDiv);
  }

  applySudokuCheckerboard();
}

function updateConflictHighlights() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = Array.from(boardDiv.getElementsByTagName('input'));

  inputs.forEach(inp => inp.classList.remove('incorrect'));

  const idxFromRC = (r, c) => r * SIZE + c;
  const sameBlock = (r1, c1, r2, c2) => Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3);

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const idx = idxFromRC(r, c);
      const inp = inputs[idx];
      const val = inp.value;
      if (!val) continue;

      for (let rr = 0; rr < SIZE; rr++) {
        for (let cc = 0; cc < SIZE; cc++) {
          const oidx = idxFromRC(rr, cc);
          if (oidx === idx) continue;
          const other = inputs[oidx];
          const oval = other.value;
          if (!oval) continue;
          const conflict = (rr === r) || (cc === c) || sameBlock(r, c, rr, cc);
          if (conflict && oval === val) {
            inp.classList.add('incorrect');
            other.classList.add('incorrect');
          }
        }
      }
    }
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
        inp.classList.remove('bg-gray', 'bg-white');
        inp.classList.add('sudoku-cell', 'prefilled');
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }

  applySudokuCheckerboard();
}

function applySudokuCheckerboard() {
  const cells = document.querySelectorAll('.sudoku-cell');

  cells.forEach(cell => {
    const row = parseInt(cell.getAttribute('data-row'), 10);
    const col = parseInt(cell.getAttribute('data-col'), 10);

    if (Number.isNaN(row) || Number.isNaN(col)) return;

    const blockRow = Math.floor(row / 3);
    const blockCol = Math.floor(col / 3);

    if (((blockRow + blockCol) % 2) === 0) {
      cell.classList.add('bg-gray');
      cell.classList.remove('bg-white');
    } else {
      cell.classList.add('bg-white');
      cell.classList.remove('bg-gray');
    }
  });
}

applySudokuCheckerboard();

async function newGame() {
  stopTimer();
  hintsUsed = 0;
  const clues = parseInt(document.getElementById('difficulty').selectedOptions[0].dataset.clues, 10);
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

  const incorrect = new Set(data.incorrect
    .map(x => x[0] * SIZE + x[1])
    .filter(idx => {
      const inp = inputs[idx];
      return inp && inp.value !== '' && inp.value !== '0';
    })
  );

  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.classList.remove('incorrect');
    if (incorrect.has(idx)) {
      inp.classList.add('incorrect');
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

function addScore(name, time, difficulty, hints) {
  const scores = getScores();
  scores.push({
    name: name.trim() || 'Anonymous',
    time: time,
    difficulty: difficulty,
    hints: hints || 0,
    timestamp: new Date().toISOString()
  });

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
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.style.textAlign = 'center';
    td.textContent = 'No scores yet. Complete a puzzle!';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  scores.forEach((score, idx) => {
    const row = document.createElement('tr');

    const tdRank = document.createElement('td');
    tdRank.textContent = String(idx + 1);

    const tdName = document.createElement('td');
    tdName.textContent = score.name;

    const tdTime = document.createElement('td');
    tdTime.textContent = formatTime(score.time);

    const tdDiff = document.createElement('td');
    tdDiff.textContent = score.difficulty.charAt(0).toUpperCase() + score.difficulty.slice(1);

    const tdHints = document.createElement('td');
    tdHints.textContent = String(score.hints || 0);

    row.appendChild(tdRank);
    row.appendChild(tdName);
    row.appendChild(tdTime);
    row.appendChild(tdDiff);
    row.appendChild(tdHints);

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

  const hint = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  inputs[hint.idx].value = solution[hint.row][hint.col];
  inputs[hint.idx].disabled = true;
  inputs[hint.idx].classList.add('hint');
  hintsUsed = (hintsUsed || 0) + 1;
  updateConflictHighlights();
}

window.addEventListener('load', () => {
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

  document.getElementById('save-score').addEventListener('click', () => {
    const name = document.getElementById('player-name').value;
    addScore(name, elapsedSeconds, currentDifficulty, hintsUsed);
    hideScoreModal();
  });

  document.getElementById('skip-score').addEventListener('click', hideScoreModal);

  document.getElementById('player-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('save-score').click();
    }
  });

  newGame();
});