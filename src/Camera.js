import * as THREE from 'three';

export class Camera {
    constructor(camera, rover) {
        this.camera = camera;
        this.rover = rover;

        this.viewMode = 0; // 0: follow, 1: top-down, 2: isometric, 3: first-person

        // lerp parameters for smooth transitions
        this.lerpSpeed = 0.08; // how quickly the camera moves to the desired position
        this._lookTarget = new THREE.Vector3(); // target position for the camera to look at
    }

    update(delta) {
        if (!this.rover.mesh) return; 

        const roverPos = this.rover.mesh.position;
        const roverDir = this.rover.mesh.rotation.y;

        if (this.viewMode === 0) {
            // follow mode: camera follows behind the rover

            // offset behind and above the rover 
            const offset = new THREE.Vector3(5 * Math.sin(roverDir), 3, 5 * Math.cos(roverDir)); 
            const desiredPos = roverPos.clone().add(offset);
            
            this.camera.position.lerp(desiredPos, this.lerpSpeed); // move the camera with some smoothing
            this._lookTarget.lerp(roverPos.clone().setY(1.5), this.lerpSpeed); // look at the rover with some smoothing
            this.camera.lookAt(this._lookTarget);
        }
        else if (this.viewMode === 1) {
            // top-down mode: camera looks straight down at the rover

            const height = 15;
            const roverDir = this.rover.mesh.rotation.y;

            const offset = new THREE.Vector3(
                Math.sin(roverDir) * 0.001,
                height,
                Math.cos(roverDir) * 0.001
            );
            const desiredPos = roverPos.clone().add(offset);
            this.camera.position.lerp(desiredPos, this.lerpSpeed);
            this._lookTarget.lerp(roverPos.clone(), this.lerpSpeed); // look at the rover
            this.camera.lookAt(this._lookTarget);

            this.camera.up.set(-Math.sin(roverDir), 0, -Math.cos(roverDir)); // rotate the camera's up vector to match the rover's orientation
        }
        else if (this.viewMode === 2) {
            // isometric mode: camera is at a fixed angle and distance from the rover
            const offset = new THREE.Vector3(10, 10, 10);
            const desiredPos = roverPos.clone().add(offset);
            this.camera.position.lerp(desiredPos, this.lerpSpeed);
            this._lookTarget.lerp(roverPos.clone().setY(1.5), this.lerpSpeed); // look at the rover
            this.camera.lookAt(this._lookTarget);
        }
        else if (this.viewMode === 3) {
            // first-person mode: camera is positioned at the rover's head and looks forward
            const offset = new THREE.Vector3(0, 0.8, 0); // position at the rover's head
            const desiredPos = roverPos.clone().add(offset);
            this.camera.position.copy(desiredPos);
            const lookOffset = new THREE.Vector3(0, 1.5, -5).applyAxisAngle(new THREE.Vector3(0, 1, 0), roverDir); // look forward from the rover
            this._lookTarget.copy(roverPos).add(lookOffset);
            this.camera.lookAt(this._lookTarget);
        }
    }

    switchView() {
        this.camera.up.set(0, 1, 0); // reset camera up vector to default
        this.camera.position.copy(this.rover.mesh.position); // reset camera position to rover position for smooth transition
        this._lookTarget.copy(this.rover.mesh.position); // reset look target to rover position for smooth transition
        this.viewMode = (this.viewMode + 1) % 4; // cycle through the 4 view modes
    }
}