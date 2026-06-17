import * as THREE from 'three';

export class ProceduralEnvironment {
    constructor(scene, worldSize = 80) {
        this.scene = scene;
        this.worldSize = worldSize;
        
        this.mapGroup = new THREE.Group();
        this.scene.add(this.mapGroup);
        
        this.wallMeshes = [];
        this.collisionOnly = []; // only for physics collision, invisible in the scene and for lidar detection

        // textures loader
        const texLoader = new THREE.TextureLoader();
        const loadTex = (name, repeatX, repeatY) => {
            const tex = texLoader.load('../assets/' + name);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(repeatX, repeatY);
            return tex;
        };

        // textures
        this.textures = {
            floor: {
                map: loadTex('Concrete031_1K-JPG_Color.jpg', 1, 1),  // repeat to 1 to fit single tile
                emissiveMap: loadTex('Concrete031_1K-JPG_Color.jpg', 1, 1), 
                normalMap: loadTex('Concrete031_1K-JPG_NormalGL.jpg', 1, 1),
                roughnessMap: loadTex('Concrete031_1K-JPG_Roughness.jpg', 1, 1)
            },
            wall: {
                map: loadTex('Concrete032_1K-JPG_Color.jpg', 4, 1),
                emissiveMap: loadTex('Concrete032_1K-JPG_Color.jpg', 4, 1),
                normalMap: loadTex('Concrete032_1K-JPG_NormalGL.jpg', 4, 1),
                roughnessMap: loadTex('Concrete032_1K-JPG_Roughness.jpg', 4, 1)
            },
            box: {
                map: loadTex('MetalPlates008_1K-JPG_Color.jpg', 1, 1),
                emissiveMap: loadTex('MetalPlates008_1K-JPG_Color.jpg', 1, 1),
                normalMap: loadTex('MetalPlates008_1K-JPG_NormalGL.jpg', 1, 1),
                roughnessMap: loadTex('MetalPlates008_1K-JPG_Roughness.jpg', 1, 1)
            },
            cylinder: {
                map: loadTex('MetalPlates001_1K-JPG_Color.jpg', 2, 1),
                emissiveMap: loadTex('MetalPlates001_1K-JPG_Color.jpg', 2, 1),
                normalMap: loadTex('MetalPlates001_1K-JPG_NormalGL.jpg', 2, 1),
                roughnessMap: loadTex('MetalPlates001_1K-JPG_Roughness.jpg', 2, 1)
            }
        };
    }

    _seededRand(seed) {
        let s = seed;
        return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    }

    generate(seed = 42, density = 25) {
        this.clear();
        
        const rng = this._seededRand(seed);
        const obsColors = [0xaaaaaa, 0xb8b8b8, 0xc4c4c4, 0xd0d0d0];

        // grid to explore the map
        const tileSize = 2; 
        const halfSize = this.worldSize / 2;
        const tileMatBase = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            ...this.textures.floor, 
            roughness: 0.9, 
            emissive: new THREE.Color(0x000000)
        });

        for (let x = -halfSize; x < halfSize; x += tileSize) {
            for (let z = -halfSize; z < halfSize; z += tileSize) {
                const geo = new THREE.PlaneGeometry(tileSize - 0.1, tileSize - 0.1);
                // clone the material to be able to light the tiles individually
                const tile = new THREE.Mesh(geo, tileMatBase.clone());
                tile.rotation.x = -Math.PI / 2;
                tile.position.set(x + tileSize/2, 0, z + tileSize/2);
                tile.receiveShadow = true;
                
                tile.userData.isDiscovered = false;
                tile.userData.baseColor = 0x666666; 
                this.mapGroup.add(tile);
            }
        }

        // walls (visible and invisible)
        const wallThickness = 1.5;
        const wallHeight = 4;
        const visualGap = 40;
        const visualLength = this.worldSize - visualGap; 
        
        const visualWallMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            ...this.textures.wall,
            roughness: 0.8, 
            emissive: new THREE.Color(0x000000) 
        });

        const visualWallDatas = [
            [visualLength, wallHeight, wallThickness, 0, -halfSize], 
            [visualLength, wallHeight, wallThickness, 0, halfSize],  
            [wallThickness, wallHeight, visualLength, -halfSize, 0], 
            [wallThickness, wallHeight, visualLength, halfSize, 0]   
        ];

        visualWallDatas.forEach(data => {
            const geo = new THREE.BoxGeometry(data[0], data[1], data[2]);
            const wall = new THREE.Mesh(geo, visualWallMat.clone());
            wall.position.set(data[3], wallHeight / 2, data[4]);
            wall.castShadow = true;
            wall.receiveShadow = true;
            
            wall.userData.isDiscovered = false;
            wall.userData.baseColor = 0xffffff;
            this.mapGroup.add(wall);
            this.wallMeshes.push(wall);
        });

        const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
        const collisionWallDatas = [
            [this.worldSize, wallHeight, wallThickness, 0, -halfSize], 
            [this.worldSize, wallHeight, wallThickness, 0, halfSize],  
            [wallThickness, wallHeight, this.worldSize, -halfSize, 0], 
            [wallThickness, wallHeight, this.worldSize, halfSize, 0]   
        ];

        collisionWallDatas.forEach(data => {
            const geo = new THREE.BoxGeometry(data[0], data[1], data[2]);
            const collisionWall = new THREE.Mesh(geo, invisibleMat);
            collisionWall.position.set(data[3], wallHeight / 2, data[4]);
            this.mapGroup.add(collisionWall);
            this.collisionOnly.push(collisionWall); 
        });

        // obstacles
        for (let i = 0; i < density; i++) {
            const type = Math.floor(rng() * 2); 
            const x = (rng() - 0.5) * (this.worldSize - 20);
            const z = (rng() - 0.5) * (this.worldSize - 20);
            
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; 

            const h = 2 + rng() * 2;
            let geo;
            let texProps;
            
            if (type === 0) {
                geo = new THREE.BoxGeometry(2 + rng() * 4, h, 2 + rng() * 4);
                texProps = this.textures.box;
            } else {
                const radius = 1 + rng() * 1.5;
                geo = new THREE.CylinderGeometry(radius, radius, h, 16);
                texProps = this.textures.cylinder;
            }
            
            const baseColor = obsColors[Math.floor(rng() * obsColors.length)];
            const mat = new THREE.MeshStandardMaterial({
                color: 0x222222,
                ...texProps,
                roughness: 0.6,
                metalness: 0.1,
                emissive: new THREE.Color(0x000000)
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, h / 2, z);
            if (type === 0) mesh.rotation.y = rng() * Math.PI;
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            mesh.userData.isDiscovered = false;
            mesh.userData.baseColor = 0xffffff; 

            this.mapGroup.add(mesh);
            this.wallMeshes.push(mesh);
        }
    }

    clear() {
        while(this.mapGroup.children.length > 0){ 
            const child = this.mapGroup.children[0];
            this.mapGroup.remove(child); 
            if(child.geometry) child.geometry.dispose();
            if(child.material) child.material.dispose();
        }
        this.wallMeshes = [];
        this.collisionOnly = [];
    }
}