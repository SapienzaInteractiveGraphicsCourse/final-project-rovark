import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';

export class PhysicsEngine {
    
    static checkCollision(center, radius, colliders) {
        const roverSphere = new THREE.Sphere(center, radius);

        for (let i = 0; i < colliders.length; i++) {
            const collider = colliders[i];
            collider.updateMatrixWorld(true);

            // calculus for cylinders
            if (collider.geometry.type === 'CylinderGeometry') {
                if (!collider.geometry.boundingBox) collider.geometry.computeBoundingBox();
                
                const box3 = collider.geometry.boundingBox;
                const cylRadius = (box3.max.x - box3.min.x) / 2;
                
                // 2D distance
                const dx = roverSphere.center.x - collider.position.x;
                const dz = roverSphere.center.z - collider.position.z;

                const distSq = dx * dx + dz * dz;
                const radiiSum = roverSphere.radius + cylRadius;
                
                if (distSq < radiiSum * radiiSum) {
                    return true;
                }
                
            } 
            // OOB for rettangular
            else {
                if (!collider.geometry.boundingBox) collider.geometry.computeBoundingBox();
                
                const obb = new OBB().fromBox3(collider.geometry.boundingBox);
                obb.applyMatrix4(collider.matrixWorld);

                if (obb.intersectsSphere(roverSphere)) {
                    return true; 
                }
            }
        }
        //no collision
        return false;
    }
}