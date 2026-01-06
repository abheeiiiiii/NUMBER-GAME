document.addEventListener('DOMContentLoaded', () => {
    const levelSelectScreen = document.getElementById('level-select-screen');
    const gameScreen = document.getElementById('game-screen');
    const levelGrid = document.getElementById('level-grid');
    const gameGrid = document.getElementById('game-grid');
    
    const scoreDisplay = document.getElementById('score-display');
    const levelDisplay = document.getElementById('level-display');
    const timerDisplay = document.getElementById('timer-display');
    
    const backBtn = document.getElementById('back-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const hintBtn = document.getElementById('hint-btn');
    const buyHintBtn = document.getElementById('buy-hint-btn');
    const addNumbersBtn = document.getElementById('add-numbers-btn');
    const howToPlayBtn = document.getElementById('how-to-play-btn');
    
    const pauseOverlay = document.getElementById('pause-overlay');
    const infoModal = document.getElementById('info-modal');
    const closeModalBtn = infoModal.querySelector('.close-btn');

    let gridState = [], score = 0, currentLevel = 0, secondsElapsed = 0;
    let timerInterval, hintsRemaining = 3, isPaused = false;
    let highestLevelUnlocked = 1;
    let startCell = null, connectionLine = null;
    const TOTAL_LEVELS = 50;
    const HINT_COST = 10;
    const COLUMNS = 9;

    function init() {
        highestLevelUnlocked = parseInt(localStorage.getItem('highestLevelUnlocked') || '1', 10);
        createLevelSelectionScreen();
        showScreen('level-select');
    }

    function showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'));
        if (screenName === 'level-select') {
            levelSelectScreen.classList.add('visible');
        } else if (screenName === 'game') {
            gameScreen.classList.add('visible');
        }
    }

    function createLevelSelectionScreen() {
        levelGrid.innerHTML = '';
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            const btn = document.createElement('button');
            btn.classList.add('level-btn');
            if (i <= highestLevelUnlocked) {
                btn.classList.add('unlocked');
                btn.textContent = i;
                btn.onclick = () => {
                    currentLevel = i;
                    loadLevel(currentLevel);
                };
            } else {
                btn.classList.add('locked');
                btn.innerHTML = `${i}<span class="lock-icon">&#128274;</span>`;
            }
            levelGrid.appendChild(btn);
        }
    }
    
    function generateLevelGrid(level) {
        const baseSize = 27 + level;
        const complexity = 1 + Math.floor(level / 5);
        const newGrid = [];
        for(let i = 0; i < baseSize; i++) {
            newGrid.push(1 + ((i * complexity + level) % 9));
        }
        return newGrid;
    }

    function loadLevel(level) {
        gridState = generateLevelGrid(level);
        score = parseInt(localStorage.getItem('playerCoins') || '0', 10);
        hintsRemaining = 3;
        isPaused = false;
        
        updateScoreDisplay();
        updateHintDisplay();
        levelDisplay.textContent = `Level: ${level}`;
        startTimer();
        renderGrid();
        showScreen('game');
    }

    function renderGrid() {
        gameGrid.innerHTML = '';
        gridState.forEach((number, index) => {
            const cell = document.createElement('div');
            cell.classList.add('number-cell');
            if (number === 0) {
                cell.classList.add('cleared');
            } else {
                cell.textContent = number;
                cell.dataset.index = index;
                cell.addEventListener('mousedown', onMouseDown);
            }
            gameGrid.appendChild(cell);
        });
    }

    function onMouseDown(e) {
        if (isPaused || startCell) return;
        const cellEl = e.target;
        cellEl.classList.add('selected');
        startCell = { index: parseInt(cellEl.dataset.index), element: cellEl, rect: cellEl.getBoundingClientRect() };
        connectionLine = document.createElement('div');
        connectionLine.className = 'connection-line';
        document.body.appendChild(connectionLine);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
        if (!startCell) return;
        const startX = startCell.rect.left + startCell.rect.width / 2;
        const startY = startCell.rect.top + startCell.rect.height / 2;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        const length = Math.hypot(deltaX, deltaY);
        connectionLine.style.width = `${length}px`;
        connectionLine.style.left = `${startX}px`;
        connectionLine.style.top = `${startY}px`;
        connectionLine.style.transform = `rotate(${angle}deg)`;
    }

    function onMouseUp(e) {
        if (!startCell) return;
        startCell.element.classList.remove('selected');
        document.body.removeChild(connectionLine);
        const endEl = document.elementFromPoint(e.clientX, e.clientY);
        
        if (endEl && endEl.classList.contains('number-cell') && endEl !== startCell.element) {
            const endIndex = parseInt(endEl.dataset.index);
            if (isValidMatch(startCell.index, endIndex)) {
                handleValidMatch(startCell.index, endIndex);
            }
        }
        startCell = null;
        connectionLine = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    
    function handleValidMatch(index1, index2) {
        score += (gridState[index1] === gridState[index2]) ? 1 : 2;
        updateScoreDisplay();
        gridState[index1] = 0;
        gridState[index2] = 0;
        if (gridState.every(cell => cell === 0)) {
            handleLevelComplete();
        }
        renderGrid();
    }

    function isValidMatch(index1, index2) {
        const val1 = gridState[index1];
        const val2 = gridState[index2];
        if (!((val1 === val2) || (val1 + val2 === 10))) return false;

        const row1 = Math.floor(index1 / COLUMNS), col1 = index1 % COLUMNS;
        const row2 = Math.floor(index2 / COLUMNS), col2 = index2 % COLUMNS;

        if (row1 === row2) {
            for (let i = Math.min(col1, col2) + 1; i < Math.max(col1, col2); i++) if (gridState[row1 * COLUMNS + i] !== 0) return false;
            return true;
        }
        if (col1 === col2) {
            for (let i = Math.min(row1, row2) + 1; i < Math.max(row1, row2); i++) if (gridState[i * COLUMNS + col1] !== 0) return false;
            return true;
        }
        if (Math.abs(row1 - row2) === Math.abs(col1 - col2)) {
            const rowStep = (row2 > row1) ? 1 : -1, colStep = (col2 > col1) ? 1 : -1;
            let checkRow = row1 + rowStep, checkCol = col1 + colStep;
            while (checkRow !== row2) {
                if (gridState[checkRow * COLUMNS + checkCol] !== 0) return false;
                checkRow += rowStep; checkCol += colStep;
            }
            return true;
        }
        for (let i = Math.min(index1, index2) + 1; i < Math.max(index1, index2); i++) if (gridState[i] !== 0) return false;
        return true;
    }

    function handleLevelComplete() {
        stopTimer();
        if (currentLevel + 1 > highestLevelUnlocked) {
            highestLevelUnlocked = currentLevel + 1;
            localStorage.setItem('highestLevelUnlocked', highestLevelUnlocked);
        }
        setTimeout(() => {
            alert(`Level ${currentLevel} Complete!`);
            currentLevel++;
            if (currentLevel > TOTAL_LEVELS) {
                alert("You finished all levels!");
                createLevelSelectionScreen();
                showScreen('level-select');
            } else {
                loadLevel(currentLevel);
            }
        }, 500);
    }
    
    function findHint() {
        const uncleared = [];
        gridState.forEach((val, index) => { if (val !== 0) uncleared.push(index); });

        for (let i = 0; i < uncleared.length; i++) {
            for (let j = i + 1; j < uncleared.length; j++) {
                if (isValidMatch(uncleared[i], uncleared[j])) {
                    document.querySelectorAll(`[data-index='${uncleared[i]}'], [data-index='${uncleared[j]}']`).forEach(el => el.classList.add('hint'));
                    setTimeout(() => document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint')), 1500);
                    return true;
                }
            }
        }
        return false;
    }

    function startTimer() {
        stopTimer();
        secondsElapsed = 0;
        timerDisplay.textContent = 'Time: 00:00';
        timerInterval = setInterval(() => {
            if (!isPaused) {
                secondsElapsed++;
                timerDisplay.textContent = `Time: ${formatTime(secondsElapsed)}`;
            }
        }, 1000);
    }

    function stopTimer() { clearInterval(timerInterval); }
    function formatTime(s) { return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`; }
    function updateScoreDisplay() {
        scoreDisplay.textContent = `Coins: ${score}`;
        localStorage.setItem('playerCoins', score);
        buyHintBtn.disabled = score < HINT_COST;
    }
    function updateHintDisplay() {
        hintBtn.textContent = `Hint (${hintsRemaining})`;
        hintBtn.disabled = hintsRemaining <= 0;
    }

    pauseBtn.addEventListener('click', () => { isPaused = true; pauseOverlay.classList.add('visible'); });
    resumeBtn.addEventListener('click', () => { isPaused = false; pauseOverlay.classList.remove('visible'); });
    backBtn.addEventListener('click', () => { stopTimer(); createLevelSelectionScreen(); showScreen('level-select'); });
    
    howToPlayBtn.addEventListener('click', () => infoModal.classList.add('visible'));
    closeModalBtn.addEventListener('click', () => infoModal.classList.remove('visible'));
    
    hintBtn.addEventListener('click', () => {
        if (hintsRemaining > 0 && findHint()) {
            hintsRemaining--;
            updateHintDisplay();
        } else if (hintsRemaining > 0) {
            alert("No more moves! Try adding numbers.");
        }
    });

    buyHintBtn.addEventListener('click', () => {
        if (score >= HINT_COST) {
            score -= HINT_COST;
            hintsRemaining++;
            updateScoreDisplay();
            updateHintDisplay();
        }
    });
    
    addNumbersBtn.addEventListener('click', () => {
        const remainingNumbers = gridState.filter(num => num !== 0);
        gridState = gridState.concat(remainingNumbers);
        renderGrid();
    });

    init();
});