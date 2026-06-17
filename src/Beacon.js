import * as THREE from 'three';

export class Beacon {
    // 'index' to stagger the animation between beacons
    constructor(scene, x, z, index = 0) {
        this.scene = scene;
        this.index = index; 
        this.collected = false;
        this.hitRadius = 1.8; // distance to collect it

        this.meshGroup = new THREE.Group();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff99, 
            emissive: new THREE.Color(0x00ff66), 
            emissiveIntensity: 2,
            roughness: 0.2, 
            metalness: 0.8
        });

        // crystal
        const geo = new THREE.OctahedronGeometry(0.6, 0);
        this.crystalMesh = new THREE.Mesh(geo, mat);
        this.crystalMesh.position.set(0, 1.2, 0);
        this.meshGroup.add(this.crystalMesh);

        // base (ring)
        const ringGeo = new THREE.RingGeometry(0.8, 1.0, 16);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff99, 
            transparent: true, 
            opacity: 0.3, 
            side: THREE.DoubleSide 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.05, 0);
        this.meshGroup.add(ring);

        this.meshGroup.position.set(x, 0, z);
        this.scene.add(this.meshGroup);
    }

    update(elapsedTime, delta = 0.016) {
        // animation
        if (this.collected && this.meshGroup.scale.x > 0) {
            this.meshGroup.scale.subScalar(3.0 * delta); 
            if (this.meshGroup.scale.x <= 0) {
                this.meshGroup.scale.set(0, 0, 0);
                this.meshGroup.visible = false; 
            }
        }

        // rotation always go
        this.crystalMesh.rotation.y = elapsedTime * 1.5 + this.index * 0.8;
        this.crystalMesh.position.y = 1.2 + Math.sin(elapsedTime * 2 + this.index) * 0.2;
    }

    checkCollection(roverPosition) {
        if (this.collected) return false;

        // distance check between rover and it
        const distance = this.meshGroup.position.distanceTo(roverPosition);
        if (distance < this.hitRadius) {
            this.collected = true;
            return true; 
        }
        return false;
    }
}