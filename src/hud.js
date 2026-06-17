// shared object
const hudState = {
    rover: null,
    getBeaconsCollected: null,
    getNumBeacons: null,
    getElapsedTime: null,
    scorePenalty: 0, // fake exits penality
    gameMode: 'survive' // 'survive' or 'explore'
}

export function initHUD({rover, getBeaconsCollected, getNumBeacons, getElapsedTime, gameMode='survive'}) {
    hudState.rover = rover;
    hudState.getBeaconsCollected = getBeaconsCollected;
    hudState.getNumBeacons = getNumBeacons;
    hudState.getElapsedTime = getElapsedTime;
    hudState.gameMode = gameMode;

    document.getElementById('hud-stats').style.display = 'block';
}


export function addScorePenalty(points) {
    hudState.scorePenalty += points;
    
    const hudScoreEl = document.getElementById('hud-score');
    if (hudScoreEl) {
        hudScoreEl.classList.remove('score-pop');
        void hudScoreEl.offsetWidth; 
        hudScoreEl.classList.add('score-pop');
    }
}

export function computeScore(final = false) {
    const beaconPoints = hudState.getBeaconsCollected() * 500;
    //const hpPoints = Math.max(0, hudState.rover.health) * 10;
    const timePoints = Math.max(0, 3000 - Math.floor(hudState.getElapsedTime()) * 2);
    
    if (hudState.gameMode === 'explore') {
        // no HP bonus in explore mode (no health)
        return beaconPoints + (final ? timePoints: 0);
    }

    // survive mode
    const hpPoints = Math.max(0, hudState.rover.health) * 10;
    return beaconPoints + hpPoints + (final ? timePoints : 0) - hudState.scorePenalty;
}

export function updateHUD() {
    // update the HUD elements like health, collected beacons, etc.

    const hp = hudState.rover.health;
    const beaconsCollected = hudState.getBeaconsCollected();
    const numBeacons = hudState.getNumBeacons();
    const elapsedTime = hudState.getElapsedTime();

    // health
    const healthBar = document.getElementById('hud-hp');
    healthBar.textContent = Math.max(0, hp);
    healthBar.className = 'hud-val' + (hp < 30 ? ' danger' : '');

    const fill = document.getElementById('hp-bar-fill');
    fill.style.width = `${Math.max(0, hp)}%`;
    if (hp < 30) {
        fill.style.background = '#ff4422';
    } 
    else if (hp < 60) {
        fill.style.background = '#ffaa00';
    }
    else {
        fill.style.background = 'linear-gradient(90deg, #00cc88, #00ffcc)';
    }

    // beacons
    document.getElementById('hud-beacons').textContent = `${beaconsCollected} / ${numBeacons}`;

    // timer
    const secs = Math.floor(elapsedTime);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    document.getElementById('hud-time').textContent = `${mm}:${ss}`;

    // live score 
    document.getElementById('hud-score').textContent = computeScore(false);
}

export function showVictoryScreen() {
    const beaconsCollected = hudState.getBeaconsCollected();
    const hp = Math.max(0, hudState.rover.health);
    
    const secs = Math.floor(hudState.getElapsedTime());
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    const timeBonus = Math.max(0, 3000 - secs * 2);

    document.getElementById('v-beacons').textContent = `${beaconsCollected} x 500 = +${beaconsCollected * 500}`;
    document.getElementById('v-hp').textContent = `${hp} x 10 = +${hp * 10}`;
    document.getElementById('v-time').textContent = `${mm}:${ss}`;
    document.getElementById('v-time-bonus').textContent = `+${timeBonus}`;
    document.getElementById('v-total').textContent = computeScore(true);

    document.getElementById('victory-screen').style.display = 'flex';
}

export function showDefeatScreen() {
    document.getElementById('game-over-screen').style.display = 'flex';
}