import * as THREE from 'three';
// FIX IMPORTANTE: Usa il CDN diretto per evitare il blocco del browser!
import * as TWEEN from 'https://unpkg.com/@tweenjs/tween.js@23.1.1/dist/tween.esm.js'; 
import { Rover } from './Rover.js';
import { Enemy } from './Enemy.js';
import { Camera } from './Camera.js';
//import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ProceduralEnvironment } from './World.js';
import { PhysicsEngine } from './Collision.js'
import { ExitNode } from './ExitNode.js';
import { Beacon } from './Beacon.js';
import { Lidar } from './Lidar.js';
import { FakeExit } from './FakeExit.js';
import { PointCloud } from './PointCloud.js';
import { initHUD, updateHUD, showVictoryScreen, showDefeatScreen, addScorePenalty } from './hud.js';
import { AudioManager } from './AudioManager.js';

function applySwitchView(gameCamera) {
    // listen for 'v' key to switch CAMERA views
    const viewNames = ['FOLLOW CAM', 'TOP DOWN', 'ISOMETRIC', 'FIRST PERSON'];

    window.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'v') {
            gameCamera.switchView();
            
            const msg = document.getElementById('view-msg');
            if (msg) {
                msg.textContent = viewNames[gameCamera.viewMode];
                msg.style.opacity = '1';
                clearTimeout(msg._hideTimer);
                msg._hideTimer = setTimeout(() => { msg.style.opacity = '0'; }, 500);
            }
        }
    });
}

function applyDamage(rover, damage) {
    // apply damage to rover from ENEMY attacks
    if (damage > 0) {
        rover.health -= damage;

        // html feedback for damage
        const msg = document.getElementById('damage-msg');
        msg.textContent = `IMPACT! -${damage} HP`;
        msg.style.opacity = '1';
        clearTimeout(msg._hideTimer);
        msg._hideTimer = setTimeout(() => { msg.style.opacity = '0'; }, 800);
        
        const overlay = document.getElementById('damage-overlay');
        overlay.style.background = 'rgba(255, 0, 0, 0.25)';
        clearTimeout(overlay._hideTimer);
        overlay._hideTimer = setTimeout(() => {
            overlay.style.background = 'rgba(255, 0, 0, 0)';
        }, 150);
    }
}

// gameMode: 'survive' (default) or 'explore'
async function init(gameMode = 'survive') {

    //AUDIO
    const audio = new AudioManager();
    await audio.init();

    const soundSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>`;
    const muteSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
    </svg>`;

    window.toggleAudio = () => {
        const muted = audio.toggleMute();
        const btn = document.getElementById('mute-btn');
        btn.querySelector('.mute-icon').innerHTML = muted ? muteSVG : soundSVG;
        btn.classList.toggle('muted', muted);
    };
    window.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'm') window.toggleAudio();
    });

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); 
    scene.fog = new THREE.Fog(0x000000, 15, 80);

    // CAMERA
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 20);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // LIGHTS
    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.2);
    directional.position.set(20, 50, 20);
    directional.castShadow = true;
    directional.shadow.camera.left = -50;
    directional.shadow.camera.right = 50;
    directional.shadow.camera.top = 50;
    directional.shadow.camera.bottom = -50;
    scene.add(directional);

    const roverLight = new THREE.PointLight(0xffffff, 5, 20);
    roverLight.position.set(0, 2, 0);
    roverLight.castShadow = true;

    // WORLD
    const myEnvironment = new ProceduralEnvironment(scene, 80);
    myEnvironment.generate(42, 100);
    myEnvironment.mapGroup.children.forEach(child => {
        if (child.isMesh) child.visible = false; 
    });
    const allColliders = [...myEnvironment.wallMeshes, ...myEnvironment.collisionOnly];

    // ROVER
    const rover = new Rover(scene);
    await rover.load('../assets/turtlebot3_waffle_pi.glb');

    // ENEMIES
    const enemies = [];

    if (gameMode === 'survive') {
        const enemy_1 = new Enemy(scene); await enemy_1.load('../assets/fetch.glb'); enemy_1.setInitialPosition(allColliders); 
        const enemy_2 = new Enemy(scene); await enemy_2.load('../assets/fetch.glb'); enemy_2.setInitialPosition(allColliders); 
        const enemy_3 = new Enemy(scene); await enemy_3.load('../assets/fetch.glb'); enemy_3.setInitialPosition(allColliders); 
        const enemy_4 = new Enemy(scene); await enemy_4.load('../assets/husky.glb'); enemy_4.setInitialPosition(allColliders); 
        const enemy_5 = new Enemy(scene); await enemy_5.load('../assets/husky.glb'); enemy_5.setInitialPosition(allColliders); 
        const enemy_6 = new Enemy(scene); await enemy_6.load('../assets/pioneer3at.glb'); enemy_6.setInitialPosition(allColliders); 
        const enemy_7 = new Enemy(scene); await enemy_7.load('../assets/pioneer3at.glb'); enemy_7.setInitialPosition(allColliders); 
        const enemy_8 = new Enemy(scene); await enemy_8.load('../assets/pioneer3at.glb'); enemy_8.setInitialPosition(allColliders); 
        enemies.push(enemy_1, enemy_2, enemy_3, enemy_4, enemy_5, enemy_6, enemy_7, enemy_8);
    }

    // GLOBAL VARIABLES
    let beaconsCollected = 0;
    const numBeacons = 15;
    let score = 0; 

    // BEACONS
    const beacons = [];
    for (let i = 0; i < numBeacons; i++) {
        let x, z, valid = false;
        const dummyCenter = new THREE.Vector3();
        
        while (!valid) {
            x = (Math.random() - 0.5) * 70; 
            z = (Math.random() - 0.5) * 70;
            
            if (Math.sqrt(x * x + z * z) > 5) {
                dummyCenter.set(x, 1.0, z);
                const isInsideWall = PhysicsEngine.checkCollision(dummyCenter, 1.0, myEnvironment.wallMeshes);
                if (!isInsideWall) {
                    valid = true;
                }
            }
        }
        
        const beacon = new Beacon(scene, x, z, i);
        beacon.meshGroup.visible = false;
        beacons.push(beacon);
    }

    // EXITS
    // In explore mode: 1 real exit, no fake exits
    // In survive mode: 1 real exit, 3 fake exits

    const quadrants = [
        { x: 1, z: 1 },
        { x: -1, z: 1 },
        { x: 1, z: -1 },  
        { x: -1, z: -1 }  
    ];

    // shuffle helper
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    let exitNode = null;
    const fakeExits = [];

    if (gameMode === 'survive') {
        // 1 real + 3 fake, one per quadrant
        const exitRoles = ['real', 'fake', 'fake', 'fake'];
        shuffleArray(exitRoles);
 
        for (let i = 0; i < 4; i++) {
            let x, z, valid = false;
            const dummyCenter = new THREE.Vector3();
            
            while (!valid) {
                x = (20 + Math.random() * 15) * quadrants[i].x; 
                z = (20 + Math.random() * 15) * quadrants[i].z;
                dummyCenter.set(x, 1.0, z);
                const isInsideWall = PhysicsEngine.checkCollision(dummyCenter, 1.5, myEnvironment.wallMeshes);
                if (!isInsideWall) valid = true;
            }
            
            if (exitRoles[i] === 'real') {
                exitNode = new ExitNode(scene);
                exitNode.setPosition(x, z); 
                exitNode.meshGroup.visible = false;
            } else {
                const fakeExit = new FakeExit(scene);
                fakeExit.setPosition(x, z);
                fakeExit.meshGroup.visible = false; 
                fakeExit.triggered = false;
                fakeExits.push(fakeExit);
            }
        }
    } else {
        // explore mode: single exit in a random quadrant
        const q = quadrants[Math.floor(Math.random() * 4)];
        let x, z, valid = false;
        const dummyCenter = new THREE.Vector3();
 
        while (!valid) {
            x = (20 + Math.random() * 15) * q.x;
            z = (20 + Math.random() * 15) * q.z;
            dummyCenter.set(x, 1.0, z);
            const isInsideWall = PhysicsEngine.checkCollision(dummyCenter, 1.5, myEnvironment.wallMeshes);
            if (!isInsideWall) valid = true;
        }
 
        exitNode = new ExitNode(scene);
        exitNode.setPosition(x, z);
        exitNode.meshGroup.visible = false;
    }

    // LIDAR + POINT CLOUD
    const pointCloud = new PointCloud(scene);
    const lidar = new Lidar(scene, rover, myEnvironment.wallMeshes, pointCloud); 

    // CAMERA CONTROLLER
    const gameCamera = new Camera(camera, rover);
    applySwitchView(gameCamera);
    
    // INPUTS & INTERAZIONI USCITE
    const keys = {};
    window.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        keys[key] = true;

        if (key === ' ' && rover.alive) {
            let interactedWithExit = false;
            
            // Victory
            if (exitNode && rover.mesh.position.distanceTo(exitNode.meshGroup.position) < 2.5) {
                rover.alive = false; 
                audio.playVictory();
                showVictoryScreen();
                interactedWithExit = true;
            }

            // false exits 
            fakeExits.forEach(fake => {
                if (!fake.triggered && rover.mesh.position.distanceTo(fake.meshGroup.position) < 2.5) {
                    fake.triggered = true;
                    fake.meshGroup.visible = false;
                    score -= 1000; 
                    
                    addScorePenalty(1000);
                    audio.playFakeExit();
                    
                    const msg = document.getElementById('damage-msg');
                    if (msg) {
                        msg.textContent = `FAKE EXIT! -1000 SCORE`;
                        msg.style.opacity = '1';
                        msg.style.color = '#ffaa00'; 
                        clearTimeout(msg._hideTimer);
                        msg._hideTimer = setTimeout(() => { 
                            msg.style.opacity = '0'; 
                            setTimeout(() => { msg.style.color = '#ff4422'; }, 400);
                        }, 1500);
                    }
                    interactedWithExit = true;
                }
            });

            // Lidar
            if (!interactedWithExit) {
                if (lidar.scanCooldown <= 0) {
                    audio.playLidarScan();
                }
                lidar.scan();
            }
        }
    });
    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
    });

    // CLOCK
    const clock = new THREE.Clock();

    // FOG
    let discoveryRadius = 3;
    const isPositionExplored = pos => {
        if (!rover.mesh) return false;
        const dx = pos.x - rover.mesh.position.x;
        const dz = pos.z - rover.mesh.position.z;
        return Math.sqrt(dx*dx + dz*dz) < discoveryRadius;
    };

    // MINIMAP
    const mmCanvas = document.getElementById('minimap-canvas');
    const mmCtx = mmCanvas.getContext('2d');
    const WORLD_SIZE = 80;

    function updateMinimap() {
        mmCtx.fillStyle = '#080c10';
        mmCtx.fillRect(0, 0, 160, 160);
        const scale = 160 / WORLD_SIZE;

        // point cloud
        for (let i = 0; i < pointCloud.count; i++) {
            const x = pointCloud.positions[i * 3];
            const z = pointCloud.positions[i * 3 + 2];
            const sx = (x + WORLD_SIZE / 2) * scale;
            const sz = (z + WORLD_SIZE / 2) * scale;
            mmCtx.fillStyle = '#00aacc';
            mmCtx.fillRect(sx, sz, 1.5, 1.5);
        }

        // beacons
        beacons.forEach(b => {
            if (b.collected || !b.meshGroup.visible) return;
            const bx = (b.meshGroup.position.x + WORLD_SIZE / 2) * scale;
            const bz = (b.meshGroup.position.z + WORLD_SIZE / 2) * scale;
            mmCtx.fillStyle = '#00ff99';
            mmCtx.beginPath(); 
            mmCtx.arc(bx, bz, 2.5, 0, Math.PI * 2); 
            mmCtx.fill();
        });

        // enemies
        enemies.forEach(enemy => {
            if (!enemy.mesh || !enemy.alive || !enemy.mesh.visible) return;
            const emx = (enemy.mesh.position.x + WORLD_SIZE / 2) * scale;
            const emz = (enemy.mesh.position.z + WORLD_SIZE / 2) * scale;
            mmCtx.fillStyle = enemy.state === 'chase' ? '#ff2200' : '#882200';
            mmCtx.beginPath(); 
            mmCtx.arc(emx, emz, 3, 0, Math.PI * 2); 
            mmCtx.fill();
        });

        // rover (triangle pointing in the direction of the rover)
        if (rover.mesh) {
            const rx = (rover.mesh.position.x + WORLD_SIZE / 2) * scale;
            const rz = (rover.mesh.position.z + WORLD_SIZE / 2) * scale;
            const angle = -rover.mesh.rotation.y;
            const size = 5;
            mmCtx.fillStyle = '#00ff99';
            mmCtx.save();
            mmCtx.translate(rx, rz);
            mmCtx.rotate(angle);
            mmCtx.beginPath();
            mmCtx.moveTo(0, -size);
            mmCtx.lineTo(size * 0.6, size * 0.6);
            mmCtx.lineTo(-size * 0.6, size * 0.6);
            mmCtx.closePath();
            mmCtx.fill();
            mmCtx.restore();
        }
    }

    // DISCOVERY - FOG
    function updateFog() {
        myEnvironment.mapGroup.children.forEach(child => {
            if (!child.isMesh || !child.userData || !child.material.emissive) return;
            const dx = child.position.x - rover.mesh.position.x;
            const dz = child.position.z - rover.mesh.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            const fadeRadius = discoveryRadius * 1.2;

            if (dist < discoveryRadius) {
                // within discovery radius: mark as discovered and fully visible
                child.userData.isDiscovered = true;
                child.visible = true;
            }

            if (!child.visible && dist >= fadeRadius) return;
            child.visible = true;

            const base = new THREE.Color(child.userData.baseColor || 0x888888);
            let brightness;
            if (dist < discoveryRadius) {
                // within discovery radius: fully bright and mark as discovered
                child.userData.isDiscovered = true;
                child.visible = true;
                brightness = 0.5;
            }
            else if (child.userData.isDiscovered) {
                // already discovered but currently outside discovery radius: maintain a dim glow
                brightness = 0.2;
            } 
            else {
                // fade zone
                const t = (dist - discoveryRadius) / (fadeRadius - discoveryRadius);
                brightness = 0.05 * (1 - t); // linear fade
            }

            child.material.emissive.lerp(base.multiplyScalar(brightness), 0.08);
        });
    }
    
    // ANIMATE LOOP
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        TWEEN.update();

        // dynamic ray: 4 normal, 6 after press space
        discoveryRadius = lidar.scanCooldown > 0 ? 5 : 3; 

        if (rover.mesh) {
            // rover light
            roverLight.position.x = rover.mesh.position.x;
            roverLight.position.z = rover.mesh.position.z;
            
            roverLight.distance = lidar.scanCooldown > 0 ? 12 : 10;
            
            if (rover.alive && !scene.children.includes(roverLight)) {
                 scene.add(roverLight);
            } else if (!rover.alive && scene.children.includes(roverLight)) {
                 scene.remove(roverLight);
            }
            
            updateFog();
            if (rover.alive) {
                const isMoving = keys['w'] || keys['s'] || keys['a'] || keys['d'] || 
                                 keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'];
                audio.updateRoverEngine(isMoving);
                rover.update(delta, keys, allColliders);
            }
        }
        
        // update lidar and point cloud
        lidar.update(delta); 
 
        if (rover.mesh && rover.alive) {
 
            // enemies
            if (gameMode === 'survive') {
                let minEnemyDistance = Infinity;
 
                enemies.forEach((enemy, index) => {
                    if (!enemy.mesh) return;
                    
                    const isEnemyVisible = isPositionExplored(enemy.mesh.position);
                    enemy.mesh.visible = isEnemyVisible;
                    if (enemy.attackRangeIndicator) {
                        enemy.attackRangeIndicator.visible = isEnemyVisible;
                    }
 
                    const distToEnemy = rover.mesh.position.distanceTo(enemy.mesh.position);
                    if (distToEnemy < minEnemyDistance) {
                        minEnemyDistance = distToEnemy;
                    }
 
                    const damage = enemy.update(delta, rover.mesh.position, allColliders);
                    if (damage > 0) {
                        audio.playEnemyAttack();
                        applyDamage(rover, damage);
                    }
 
                    // push rover away from enemy on contact
                    const dx = rover.mesh.position.x - enemy.mesh.position.x;
                    const dz = rover.mesh.position.z - enemy.mesh.position.z;
                    const distanceSq = dx * dx + dz * dz;
                    const minDistanceSq = rover.hitRadius + enemy.hitRadius;
                    if (distanceSq < minDistanceSq * minDistanceSq) {
                        const distance = Math.sqrt(distanceSq);
                        const overlap = minDistanceSq - distance;
                        const pushX = (dx / distance) * overlap;
                        const pushZ = (dz / distance) * overlap;
                        rover.mesh.position.x += pushX;
                        rover.mesh.position.z += pushZ;
                    }
                });
 
                audio.updateEnemyEngine(minEnemyDistance);
 
                if (rover.health <= 0) {
                    rover.alive = false;
                    showDefeatScreen();
                }
 
                // enemy-enemy collision
                for (let i = 0; i < enemies.length; i++) {
                    for (let j = i + 1; j < enemies.length; j++) {
                        const e1 = enemies[i];
                        const e2 = enemies[j];
                        
                        if (e1 && e2 && e1.mesh && e2.mesh && e1.alive && e2.alive) {
                            const dx = e1.mesh.position.x - e2.mesh.position.x;
                            const dz = e1.mesh.position.z - e2.mesh.position.z;
                            const distSq = dx * dx + dz * dz;
                            const minDistance = e1.hitRadius + e2.hitRadius;
 
                            if (distSq < minDistance * minDistance && distSq > 0) {
                                const distance = Math.sqrt(distSq);
                                const overlap = (minDistance - distance) / 2;
                                const pushX = (dx / distance) * overlap;
                                const pushZ = (dz / distance) * overlap;
                                e1.mesh.position.x += pushX;
                                e1.mesh.position.z += pushZ;
                                e2.mesh.position.x -= pushX;
                                e2.mesh.position.z -= pushZ;
                            }
                        }
                    }
                }
            } else {
                // explore mode: no enemies, no damage - silence enemy radar
                audio.updateEnemyEngine(Infinity);
            }

        } 
        else if (rover.mesh && !rover.alive) {
            // Rover dead or won
            if (gameMode === 'survive') {
                enemies.forEach(enemy => {
                    if (enemy && enemy.mesh) {
                        enemy.update(delta, rover.mesh.position, allColliders);
                    }
                });
            }
            audio.updateRoverEngine(false);
            audio.updateEnemyEngine(Infinity);
        }
 
        // exit visibility
        if (exitNode) {
            exitNode.update(elapsedTime);
            if (rover.mesh && rover.alive) {
                exitNode.meshGroup.visible = isPositionExplored(exitNode.meshGroup.position);
            }
        }
 
        // fake exit visibility (survive mode only)
        fakeExits.forEach(fake => {
            fake.update(elapsedTime);
            if (rover.mesh && rover.alive && !fake.triggered) {
                fake.meshGroup.visible = isPositionExplored(fake.meshGroup.position);
            }
        });
 
        // beacons
        beacons.forEach(beacon => {
            beacon.update(elapsedTime);
            if (rover.mesh && rover.alive) {
                
                const isAnimating = beacon.collected && beacon.meshGroup.scale.x > 0;
                
                if (!beacon.collected) {
                    beacon.meshGroup.visible = isPositionExplored(beacon.meshGroup.position);
                } else if (isAnimating) {
                    beacon.meshGroup.visible = true;
                    beacon.crystalMesh.rotation.y += delta * 1.5; 
                }
 
                if (beacon.checkCollection(rover.mesh.position)) {
                    beaconsCollected++;
                    audio.playBeaconCollected();
                    
                    const bmsg = document.getElementById('beacon-msg');
                    if (bmsg) {
                        bmsg.textContent = `BEACON ACQUIRED  +500`;
                        bmsg.style.opacity = '1';
                        clearTimeout(bmsg._hideTimer);
                        bmsg._hideTimer = setTimeout(() => { bmsg.style.opacity = '0'; }, 1200);
                    }


                    beacon.meshGroup.visible = true;
                    new TWEEN.Tween(beacon.meshGroup.scale)
                        .to({ x: 0, y: 0, z: 0 }, 500)
                        .easing(TWEEN.Easing.Back.In)
                        .onComplete(() => { beacon.meshGroup.visible = false; })
                        .start();
                }
            }
        });

        gameCamera.update(delta);
        updateHUD();
        updateMinimap();
        renderer.render(scene, camera);
    }

    // START 
    initHUD({
        rover, 
        getBeaconsCollected: () => beaconsCollected,
        getNumBeacons: () => numBeacons,
        getElapsedTime: () => clock.getElapsedTime(),
        getScore: () => score,
        gameMode
    });

    // called after init() resolves to start the animation loop
    window._startAnimate = () => {
        const ts = document.getElementById('title-screen');
        if(ts) {
            ts.style.opacity = '0';
            setTimeout(() => { ts.style.display = 'none'; }, 1000);
        }
        const mm = document.getElementById('minimap');
        if(mm) mm.style.display = 'block';

        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.style.display = 'flex';
            muteBtn.querySelector('.mute-icon').innerHTML = soundSVG;
        }
        
        animate();
    };
}

// startGame is called from HTML onclick - must be global and receive the mode
window.startGame = (mode = 'survive') => {
    // apply body class for CSS mode-specific styles (hides HP bar in explore mode)
    document.body.classList.toggle('mode-explore', mode === 'explore');
 
    // init() loads all assets, then starts the loop via _startAnimate
    init(mode).then(() => {
        window._startAnimate?.();
    });
};