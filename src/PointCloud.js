import * as THREE from 'three';

export class PointCloud {
    constructor(scene) {
        this.scene = scene;

        this.maxPoints = 60000; // maximum number of points in the point cloud
        this.count = 0; // current number of points in the cloud

        this.positions = new Float32Array(this.maxPoints * 3); // array to store point positions
        this.colors = new Float32Array(this.maxPoints * 3); // array to store point colors

        this.palette = [
            new THREE.Color(0x0077ff), // blue
            new THREE.Color(0x9400d3),  // violet
            new THREE.Color(0xff6600),   // orange
            new THREE.Color(0xaaff00)    // yellow-green
        ]

        this.geometry = new THREE.BufferGeometry(); // geometry for the point cloud
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3)); // set position attribute
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3)); // set color attribute

        this.geometry.setDrawRange(0, 0); // initially set draw range to 0 since there are no points yet

        this.material = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false }); // material for the points, using vertex colors
    
        this.points = new THREE.Points(this.geometry, this.material); // create the Points object for the point cloud
        this.points.frustumCulled = false; // disable frustum culling to ensure points are always rendered
        this.scene.add(this.points); // add the point cloud to the scene
    }

    addPoint(position) {
        if (this.count >= this.maxPoints) return; // if we've reached the maximum number of points, do not add more

        const offset = this.count * 3; // calculate the offset in the positions and colors arrays based on the current count

        // add the position of the new point to the positions array
        this.positions[offset] = position.x;
        this.positions[offset + 1] = position.y;
        this.positions[offset + 2] = position.z;

        const color = this.palette[Math.floor(Math.random() * this.palette.length)]; // randomly choose a color from the palette
        this.colors[offset] = color.r;
        this.colors[offset + 1] = color.g;
        this.colors[offset + 2] = color.b;

        this.count++; // increment the count of points
        
        // update the draw range to include the new point
        this.geometry.setDrawRange(0, this.count);

        this.geometry.attributes.position.needsUpdate = true; // mark the position attribute as needing an update
        this.geometry.attributes.color.needsUpdate = true; // mark the color attribute as needing an update
    }
}