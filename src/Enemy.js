import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Rover } from './Rover.js';
import { PhysicsEngine } from './Collision.js';

export class Enemy {
    constructor(scene) {
        this.scene = scene;

        // properties
        this.speed = 2; // movement speed
        this.detectRange = 5; // distance at which the enemy detects the rover
        this.attackRange = 1; // distance at which the enemy can attack the rover
        this.damage = 10; // attack damage
        this.attackCooldown = 1; // seconds between attacks
        this.attackCd = 0; // current cooldown timer
        this.state = 'patrol'; // current state: 'patrol', 'chase', 'attack'
        this.patrolTarget = new THREE.Vector3(); // target position for patrolling

        // for future
        this.health = 100;
        this.alive = true;

        this.mesh = null; // loaded model mesh

        this.hitRadius = 0.45; 

        // animation        
        this.wheelFL = null;    // front left wheel 
        this.wheelFR = null;    // front right wheel
        this.wheelRL = null;    // rear left wheel
        this.wheelRR = null;    // rear right wheel
    }

    setInitialPosition(colliders = []) {
        if (!this.mesh) return; 
        
        const center = new THREE.Vector3();
        const AREA = 70;    // world size is 80
        const MIN_ORIGIN_DIST = 10;

        let x, z, valid = false;
        while (!valid) {
            x = (Math.random() - 0.5) * AREA; 
            z = (Math.random() - 0.5) * AREA; 
            if (Math.sqrt(x * x + z * z) > MIN_ORIGIN_DIST) { 
                center.set(x, this.hitRadius, z); 
                
                const isInsideWall = PhysicsEngine.checkCollision(center, this.hitRadius, colliders);
                if (!isInsideWall) {
                    valid = true;
                }
            }
        }
        this.mesh.position.set(x, 0, z);
        this.patrolTarget.copy(this.mesh.position);
    }

    async load(path) {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(path);
        this.mesh = new THREE.Group();
        this.mesh.add(gltf.scene);

        if (path.includes('husky')) {
            this.wheelFL = this.mesh.getObjectByName('front_left_wheel');
            this.wheelFR = this.mesh.getObjectByName('front_right_wheel');
            this.wheelRL = this.mesh.getObjectByName('rear_left_wheel');
            this.wheelRR = this.mesh.getObjectByName('rear_right_wheel');

            gltf.scene.rotation.y = - Math.PI / 2; // rotate the model to face forward
            this.mesh.scale.set(0.012, 0.012, 0.012); // scale down the model
        }
        else if (path.includes('pioneer')) {
            this.wheelFL = this.mesh.getObjectByName('p3at_front_left_wheel');
            this.wheelFR = this.mesh.getObjectByName('p3at_front_right_wheel');
            this.wheelRL = this.mesh.getObjectByName('p3at_back_left_wheel');
            this.wheelRR = this.mesh.getObjectByName('p3at_back_right_wheel');

            gltf.scene.rotation.y = - Math.PI / 2; // rotate the model to face forward
            this.mesh.scale.set(0.015, 0.015, 0.015); // scale down the model
        }
        else {
            // fetch
            gltf.scene.rotation.y = - Math.PI / 2; // rotate the model to face forward
            this.mesh.scale.set(0.015, 0.015, 0.015); // scale down the model
        }

        this.mesh.position.set(0, 0, 0);    // overwrite in main.js
        this.scene.add(this.mesh);

        // debug tools
        this._addAttackRangeIndicator();
    }

    update(delta, roverPosition, colliders = []) {
        if (!this.mesh) return; // if the model is not loaded, do not update

        if (!this.alive) return; // if the enemy is destroyed, do not update

        // debug tools
        if (this.attackRangeIndicator) {
            this.attackRangeIndicator.position.x = this.mesh.position.x;
            this.attackRangeIndicator.position.z = this.mesh.position.z;
        }

        const distanceToRover = this.mesh.position.distanceTo(roverPosition);
        
        this.attackCd -= delta; // reduce cooldown timer

        // state transitions
        if (distanceToRover < this.attackRange) {
            this.state = 'attack';
            if (this.attackRangeIndicator) this.attackRangeIndicator.material.opacity = 0.7;
        }
        else if (distanceToRover < this.detectRange) {
            this.state = 'chase';
            if (this.attackRangeIndicator) this.attackRangeIndicator.material.opacity = 0.35;
        }
        else {
            this.state = 'patrol';
            if (this.attackRangeIndicator) this.attackRangeIndicator.material.opacity = 0.35;
        }

        // state behaviors
        if (this.state === 'patrol') {
            this.patrol(delta, colliders);
        }
        else if (this.state === 'chase') {
            this.chase(delta, roverPosition, colliders);
        }
        else if (this.state === 'attack') {
            return this.attack(roverPosition);
        }
    }

    moveToward(delta, targetPosition, colliders = []) {
        const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
        if (distanceToTarget < 0.1) return false;
        
        const oldPosition = this.mesh.position.clone();

        const direction = new THREE.Vector3(
            targetPosition.x - this.mesh.position.x,
            0,
            targetPosition.z - this.mesh.position.z
        ).normalize();

        this.mesh.position.addScaledVector(direction, this.speed * delta);
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z); 

        // animation
        const wheelRotSpeed = this.speed * delta * 5;
        if (this.wheelFL) {
            this.wheelFL.rotation.z -= wheelRotSpeed;
        }
        if (this.wheelFR) {
            this.wheelFR.rotation.z -= wheelRotSpeed;
        }
        if (this.wheelRL) {
            this.wheelRL.rotation.z -= wheelRotSpeed;
        }
        if (this.wheelRR) {
            this.wheelRR.rotation.z -= wheelRotSpeed;
        }

        // collision 
        this.mesh.updateMatrixWorld(true);
        const center = this.mesh.position.clone();
        center.y += this.hitRadius; 

        const hit = PhysicsEngine.checkCollision(center, this.hitRadius, colliders);

        if (hit) {
            this.mesh.position.copy(oldPosition);
            return true; 
        }

        return false;
    }

    patrol(delta, colliders) {
        const distanceToTarget = this.mesh.position.distanceTo(this.patrolTarget);
        
        const hitWall = this.moveToward(delta, this.patrolTarget, colliders);

        if (distanceToTarget < 1.5 || hitWall) {
            let angle;
            
            if (hitWall) {
                angle = this.mesh.rotation.y + Math.PI + (Math.random() - 0.5);
            } else {
                angle = Math.random() * Math.PI * 2;
            }

            const radius = 5 + Math.random() * 5; 
            let targetX = this.mesh.position.x + Math.cos(angle) * radius;
            let targetZ = this.mesh.position.z + Math.sin(angle) * radius;

            const maxBound = 38; 
            targetX = THREE.MathUtils.clamp(targetX, -maxBound, maxBound);
            targetZ = THREE.MathUtils.clamp(targetZ, -maxBound, maxBound);

            this.patrolTarget.set(targetX, 0, targetZ);
        }
    }

    chase(delta, roverPosition, colliders) {
        this.moveToward(delta, roverPosition, colliders);
    }

    attack(roverPosition) {
        if (this.attackCd <= 0) {
            this.attackCd = this.attackCooldown; // reset cooldown
            return this.damage; 
        }
        return 0;
    }

    // debug tools
    _addAttackRangeIndicator() {
        const segments = 64;
        const geometry = new THREE.RingGeometry(
            this.attackRange - 0.05,  
            this.attackRange,          
            segments
        );
        const material = new THREE.MeshBasicMaterial({
            color: 0xff2200,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
        });

        this.attackRangeIndicator = new THREE.Mesh(geometry, material);
        this.attackRangeIndicator.rotation.x = -Math.PI / 2; 
        this.attackRangeIndicator.position.y = 0.01;         
        this.scene.add(this.attackRangeIndicator);
    }
}