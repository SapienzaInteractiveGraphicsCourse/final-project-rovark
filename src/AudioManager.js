// audio files
const SOUNDS = {
    ambientDrone: 'assets/ambient_drone.wav',
    roverEngine: 'assets/rover_engine.wav',
    lidarScan: 'assets/lidar_scan.wav',
    beaconCollected: 'assets/beacon_collected.wav',
    enemyAttack: 'assets/enemy_attack.wav',
    fakeExit: 'assets/fake_exit.wav',
    victory: 'assets/victory.wav',
};

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;

        // decoded buffer cache: key -> AudioBuffer
        this._buffers = {};

        // nodes for continuous loops
        this._ambientNode = null;
        this._ambientGain = null;

        this._roverNode = null;
        this._roverGain = null;

        // enemy proximity tone
        this._enemyOsc = null;
        this._enemyGain = null;
    }

    async init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') await this.ctx.resume();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1;
        this.masterGain.connect(this.ctx.destination);

        await this._loadAll();

        this._startAmbient();
        this._startRoverEngine();
        this._initEnemyTone();
    }

    async _loadAll() {
        await Promise.all(
            Object.entries(SOUNDS).map(([key, url]) => this._load(key, url))
        );
    }

    async _load(key, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this._buffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn(`AudioManager: could not load "${url}"`, e);
        }
    }

    _startAmbient() {
        // ambient drone loop
        if (!this._buffers.ambientDrone) return;

        this._ambientGain = this.ctx.createGain();
        this._ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this._ambientGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 4);
        this._ambientGain.connect(this.masterGain);

        this._ambientNode = this.ctx.createBufferSource();
        this._ambientNode.buffer = this._buffers.ambientDrone;
        this._ambientNode.loop = true;
        this._ambientNode.connect(this._ambientGain);
        this._ambientNode.start();
    }

    _startRoverEngine() {
        // rover engine loop
        if (!this._buffers.roverEngine) return;

        this._roverGain = this.ctx.createGain();
        this._roverGain.gain.value = 0;
        this._roverGain.connect(this.masterGain);

        this._roverNode = this.ctx.createBufferSource();
        this._roverNode.buffer = this._buffers.roverEngine;
        this._roverNode.loop = true;
        this._roverNode.playbackRate.value = 1.0;
        this._roverNode.connect(this._roverGain);
        this._roverNode.start();
    }

    _initEnemyTone() {
        // enemy proximity tone 
        this._enemyOsc = this.ctx.createOscillator();
        this._enemyOsc.type = 'triangle';
        this._enemyOsc.frequency.value = 160;

        const hpf = this.ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 150;

        this._enemyGain = this.ctx.createGain();
        this._enemyGain.gain.value = 0;

        this._enemyOsc.connect(hpf);
        hpf.connect(this._enemyGain);
        this._enemyGain.connect(this.masterGain);
        this._enemyOsc.start();
    }

    _playOneShot(key, volume = 1.0) {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const buffer = this._buffers[key];
        if (!buffer) return;

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;
        gainNode.connect(this.masterGain);

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gainNode);
        src.start();
    }

    // one-shot sound effects
    playLidarScan() { 
        this._playOneShot('lidarScan', 0.6); 
    }
    playBeaconCollected() { 
        this._playOneShot('beaconCollected', 0.8); 
    }
    playEnemyAttack() { 
        this._playOneShot('enemyAttack', 1.0); 
    }
    playFakeExit() { 
        this._playOneShot('fakeExit', 0.5); 
    }
    playVictory() { 
        this._playOneShot('victory', 0.9); 
    }

    updateRoverEngine(isMoving) {
        // call every frame with whether the rover is moving
        if (!this.ctx || !this._roverGain || !this._roverNode) return;
        const t = this.ctx.currentTime;
        const tc = 0.08;

        if (isMoving) {
            this._roverNode.playbackRate.setTargetAtTime(1.35, t, tc);
            this._roverGain.gain.setTargetAtTime(0.55, t, tc);
        } else {
            this._roverNode.playbackRate.setTargetAtTime(1.0, t, tc);
            this._roverGain.gain.setTargetAtTime(0.0, t, tc * 2.5);
        }
    }

    updateEnemyEngine(minDistance) {
        // nearest enemy distance in world units
        if (!this.ctx || !this._enemyOsc) return;
        const t = this.ctx.currentTime;
        const maxRange = 20;

        if (minDistance < maxRange) {
            const proximity = 1 - (minDistance / maxRange); // 0 = far, 1 = close

            this._enemyOsc.frequency.setTargetAtTime(160 + proximity * 660, t, 0.12);
            this._enemyGain.gain.setTargetAtTime(proximity * proximity * 0.12, t, 0.2);

            // ambient drone gets louder as tension builds
            if (this._ambientGain) {
                this._ambientGain.gain.setTargetAtTime(0.4 + proximity * 0.35, t, 0.25);
            }
        } else {
            this._enemyGain.gain.setTargetAtTime(0, t, 0.35);
            if (this._ambientGain) {
                this._ambientGain.gain.setTargetAtTime(0.4, t, 0.6);
            }
        }
    }

    toggleMute() {
        if (!this.ctx) return;
        this.muted = !this.muted;
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
        return this.muted;
    }
}