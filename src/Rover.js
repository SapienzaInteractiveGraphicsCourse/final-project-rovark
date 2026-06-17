import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PhysicsEngine } from './Collision.js';


export class Rover {
    constructor(scene) {
        this.scene = scene;
        this.speed = 3; // movement speed
        this.mesh = null; // loaded model mesh

        // rover model life properties
        this.health = 100; // health points
        this.alive = true; // is the rover alive
    
        this.hitRadius = 0.4; //radius of the spherical hitbox

        // animation
        this.wheelLeft = null;
        this.wheelRight = null;
        this.lidar = null;
    }

    async load(path) {
        // async/await for the model to load before adding it to the scene
        // better than using a callback
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(path);
        this.mesh = new THREE.Group();
        this.mesh.add(gltf.scene);

        // get references to the wheels and lidar for animation
        this.wheelLeft = this.mesh.getObjectByName('wheel_left');
        this.wheelRight = this.mesh.getObjectByName('wheel_right');
        this.lidar = this.mesh.getObjectByName('lidar');

        gltf.scene.rotation.y = Math.PI / 2; // rotate the model to face forward
        this.mesh.scale.set(0.035, 0.035, 0.035); // scale down the model
        this.mesh.position.set(0, 0, 0);    // start at the origin
        
        this.scene.add(this.mesh);
    }

    update(delta, keys, colliders = []) {
        // update rover position based on input keys and delta time
        // x-axis is left/right
        // z-axis is forward/backward
        // y-axis is up/down 

        if (!this.mesh) return; // if the model is not loaded, do not update

        if (!this.alive) return; // if the rover is destroyed, do not update

        const speed = this.speed * delta;
        const wheelRotation = speed * 5; // arbitrary factor to make the wheels rotate visibly
        
        // to take trace of position for collision
        const oldPosition = this.mesh.position.clone();

        let moved = false;

        if (this.lidar) {
            this.lidar.rotation.y += 4 * delta; // rotate the lidar for visual effect
        }

        // forward: Z negative (right hand rule)
        if (keys['w']) {
            this.mesh.translateZ(-speed);
            moved = true;

            // animate the wheels in forward direction
            if (this.wheelLeft) {
                this.wheelLeft.rotation.z -= wheelRotation;
            }
            if (this.wheelRight) {
                this.wheelRight.rotation.z -= wheelRotation;
            }
        }
        // backward
        if (keys['s']) {
            this.mesh.translateZ(speed);
            moved = true;

            // animate the wheels in backward direction
            if (this.wheelLeft) {
                this.wheelLeft.rotation.z += wheelRotation;
            }
            if (this.wheelRight) {
                this.wheelRight.rotation.z += wheelRotation;
            }
        }
        // rotate left
        if (keys['a']) {
            this.mesh.rotation.y += speed * 0.5; 
            moved = true;

            // left wheel rotates backward, right wheel rotates forward for a left turn
            if (this.wheelLeft) {
                this.wheelLeft.rotation.z += wheelRotation * 0.5;
            }
            if (this.wheelRight) {
                this.wheelRight.rotation.z -= wheelRotation * 0.5;
            }
        }
        // rotate right
        if (keys['d']) {
            this.mesh.rotation.y -= speed * 0.5;
            moved = true;

            // left wheel rotates forward, right wheel rotates backward for a right turn
            if (this.wheelLeft) {
                this.wheelLeft.rotation.z -= wheelRotation * 0.5;
            }
            if (this.wheelRight) {
                this.wheelRight.rotation.z += wheelRotation * 0.5;
            }
        }

        if (moved) {
            this.mesh.updateMatrixWorld(true);
            
            // define higth sphere center
            const center = this.mesh.position.clone();
            center.y += this.hitRadius; 
            
            const hit = PhysicsEngine.checkCollision(center, this.hitRadius, colliders);

            // reposition the rover at the previous point
            if (hit) {
                this.mesh.position.copy(oldPosition);
            }
        }
    }

    getPosition() {
        if (!this.mesh) return new THREE.Vector3(); // if the model is not loaded, return origin
        return this.mesh.position.clone();
    }
}
