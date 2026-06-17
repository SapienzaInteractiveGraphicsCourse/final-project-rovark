import * as THREE from 'three';

export class Lidar {
    constructor(scene, rover, colliders, pointCloud) {
        this.scene = scene;
        this.rover = rover;     // reference to the rover for positioning the lidar
        this.pointCloud = pointCloud; // reference to the point cloud for storing scan data

        this.maxRange = 4; // maximum range of the lidar in units
        this.numRays = 48;  // number of rays to cast in a full 360-degree sweep
        this.numVertRays = 2; // number of vertical rays for a 3D scan

        this.beamGroup = new THREE.Group(); // group to hold the lidar beams
        this.scene.add(this.beamGroup);
        this.beamLines = []; // array to store the line objects for each ray

        // collision detection properties
        this.raycaster = new THREE.Raycaster(); // raycaster for detecting intersections

        // material for the lidar beams
        this.beamHitMaterial = new THREE.LineBasicMaterial({ color: 0x00ff99, transparent: true, opacity: 0.6 });
    
        // auto scan
        this.lastAutoScanPosition = new THREE.Vector3(); // store the position of the last auto scan for reference

        // manual scan state
        this.manualScanActive = false; // is a manual scan currently active
        this.lastScanPosition = new THREE.Vector3(); // store the position of the last scan for reference

        // pulse ring
        this.pulseRing = null; // pulse ring meshes
        this.scanCooldown = 0;
        this.scanCooldownDuration = 5.0; // cooldown duration in seconds between scans

        // colliders
        this.colliders = colliders; // array to store collider objects for raycasting
    }

    createPulseRing(position) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.6, 32),
            new THREE.MeshBasicMaterial({
                color: 0x00ffcc,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            })
        );
        ring.rotation.x = -Math.PI / 2; // rotate to lie flat on the ground
        ring.position.copy(position);
        ring.position.y = 0.05; // slightly above the ground to prevent z-fighting
        this.scene.add(ring);
        this.pulseRing = { mesh: ring, time: 0 }; // store the ring and its elapsed time
    }

    clear() {
        // remove existing beams from the scene
        this.beamLines.forEach(line => {
            this.beamGroup.remove(line);
            if (line.geometry) line.geometry.dispose(); // dispose of geometry to free memory
        });
        this.beamLines = [];
    }

    _doScan(numRays) {
        if (!this.rover.mesh) return; 

        this.clear(); // clear previous beams

        const origin = this.rover.mesh.position.clone(); // get the rover's current position
        origin.y = 0.5; // raise the origin slightly to match the lidar's height on the rover
        
        for (let v = 0; v < this.numVertRays; v++) {
            const angleVert = (v / (this.numVertRays - 1)) * Math.PI * 0.06 - Math.PI * 0.03;
            
            for (let h = 0; h < numRays; h++) {
                const angleHor = (h / numRays) * Math.PI * 2 + this.rover.mesh.rotation.y; // calculate the angle for this ray based on the rover's rotation
                const direction = new THREE.Vector3(
                    Math.sin(angleHor)*Math.cos(angleVert),     // x-axis
                    -Math.sin(angleVert), 
                    Math.cos(angleHor)*Math.cos(angleVert)  // z-axis
                ); 

                this.raycaster.set(origin, direction); // set the raycaster's origin and direction
                this.raycaster.far = this.maxRange; // set the maximum range for the raycaster
                const intersections = this.raycaster.intersectObjects(this.colliders); // check for intersections with colliders

                if (intersections.length > 0) {
                    // hit
                    const endPoint = intersections[0].point; // if there's an intersection, use the intersection point as the end of the beam
                    endPoint.y = Math.min(endPoint.y, origin.y + 0.5); // limit the height of the end point to prevent beams from going too high
                    // create a line geometry for the beam
                    const geometry = new THREE.BufferGeometry().setFromPoints([origin, endPoint]);
                    const line = new THREE.Line(geometry, this.beamHitMaterial); // create the line object for the beam
                    this.beamGroup.add(line); // add the beam to the group
                    this.beamLines.push(line); // store the line in the array for later cleanup
                
                    // add the hit point to the point cloud
                    this.pointCloud.addPoint(endPoint);
                }
            }   
        }
    }

    autoScan() {
        this._doScan(this.numRays / 3); // perform a scan with fewer rays and shorter range for real-time updates
        this.lastAutoScanPosition = this.rover.mesh.position.clone(); // store the position of the last auto scan for reference
    }

    scan() {
        if (this.scanCooldown > 0) return; // if still in cooldown, do not perform a scan
        
        this._doScan(this.numRays); // perform a full scan with specified number of rays and range
        this.createPulseRing(this.rover.mesh.position); // create a pulse ring at the rover's position
        this.scanCooldown = this.scanCooldownDuration; // reset the scan cooldown timer
        this.lastScanPosition = this.rover.mesh.position.clone(); // store the position of the last scan for reference
        this.manualScanActive = true; // set manual scan as active
    }

    update(delta) {
        if (!this.rover.mesh) return; // if the rover model is not loaded, do not update
        
        // update the timer for beam visibility
        if (this.manualScanActive) {
            if (this.rover.mesh.position.distanceTo(this.lastScanPosition) > 0.5) {
                this.clear(); // clear beams if the rover has moved significantly since the last scan
                this.manualScanActive = false; // reset manual scan state
                this.lastAutoScanPosition.copy(this.rover.mesh.position); // update the last auto scan position to prevent immediate auto scan
            } 
        } 
        else {
            if (this.rover.mesh.position.distanceTo(this.lastAutoScanPosition) > 0.5) {
                this.autoScan(); // perform an auto scan to update beams based on current colliders
            }
        }

        this.scanCooldown -= delta; // decrease the scan cooldown timer

        // update pulse rings
        if (this.pulseRing) {
            this.pulseRing.time += delta; // update the elapsed time for the pulse ring
            const s = 1 + this.pulseRing.time * 5; // calculate the scale based on elapsed time
            this.pulseRing.mesh.scale.set(s, s, s); // scale the pulse ring
            this.pulseRing.mesh.material.opacity = Math.max(0, 0.7 - this.pulseRing.time * 1.5); // fade out the pulse ring

            if (this.pulseRing.mesh.material.opacity <= 0) {
                this.scene.remove(this.pulseRing.mesh); // remove the pulse ring from the scene
                this.pulseRing = null; // clear the pulse ring reference
            }
        }
    }
}