import * as THREE from 'three';

export class FakeExit {
    constructor(scene) {
        this.scene = scene;
        this.meshGroup = new THREE.Group();

        this.material = new THREE.MeshStandardMaterial({ 
            color: 0xff6b49, 
            emissive: new THREE.Color(0xff3808), 
            emissiveIntensity: 2 
        });

        // base (disk)
        const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16);
        const baseMesh = new THREE.Mesh(baseGeo, this.material);
        baseMesh.position.y = 0.1;
        this.meshGroup.add(baseMesh);

        // pillar
        const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
        const pillarMesh = new THREE.Mesh(pillarGeo, this.material);
        pillarMesh.position.y = 2.1; 
        this.meshGroup.add(pillarMesh);

        this.scene.add(this.meshGroup);
        
        this.hitRadius = 1.5; 
    }

    setPosition(x, z) {
        this.meshGroup.position.set(x, 0, z);
    }

    update(elapsedTime) {
        this.material.emissiveIntensity = 1.5 + Math.sin(elapsedTime * 3) * 1;
    }
}