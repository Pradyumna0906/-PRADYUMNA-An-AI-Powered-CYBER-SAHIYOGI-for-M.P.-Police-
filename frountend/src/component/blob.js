import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const FractalAudioReactive = ({ config = {} }) => {
    const containerRef = useRef(null);
    const cleanupRef = useRef(null);
    const configRef = useRef(config);

    useEffect(() => {
        configRef.current = config;
    }, [config]);


    const initScene = useCallback((container) => {
        // --- AUDIO SETUP ---
        let audioContext = null;
        let analyser = null;
        let dataArray = null;
        let audioConnected = false;
        let audioSmooth = {
            bass: 0, mid: 0, high: 0, overall: 0,
            bassSmooth: 0, midSmooth: 0, highSmooth: 0, overallSmooth: 0,
            peak: 0, peakSmooth: 0,
            energy: 0, energySmooth: 0,
        };

        async function connectMicrophone() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.8;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                audioConnected = true;
            } catch (err) {
                console.warn('Microphone access denied or unavailable:', err);
            }
        }

        function updateAudio() {
            if (!audioConnected || !analyser) return;
            analyser.getByteFrequencyData(dataArray);

            const len = dataArray.length;
            const bassEnd = Math.floor(len * 0.15);
            const midEnd = Math.floor(len * 0.5);

            let bassSum = 0, midSum = 0, highSum = 0, total = 0, peak = 0;
            for (let i = 0; i < len; i++) {
                const v = dataArray[i] / 255;
                total += v;
                if (v > peak) peak = v;
                if (i < bassEnd) bassSum += v;
                else if (i < midEnd) midSum += v;
                else highSum += v;
            }

            audioSmooth.bass = bassSum / bassEnd;
            audioSmooth.mid = midSum / (midEnd - bassEnd);
            audioSmooth.high = highSum / (len - midEnd);
            audioSmooth.overall = total / len;
            audioSmooth.peak = peak;
            audioSmooth.energy = (audioSmooth.bass * 0.5 + audioSmooth.mid * 0.3 + audioSmooth.high * 0.2);

            const lerp = 0.12;
            const lerpSlow = 0.06;
            audioSmooth.bassSmooth += (audioSmooth.bass - audioSmooth.bassSmooth) * lerp;
            audioSmooth.midSmooth += (audioSmooth.mid - audioSmooth.midSmooth) * lerp;
            audioSmooth.highSmooth += (audioSmooth.high - audioSmooth.highSmooth) * lerp;
            audioSmooth.overallSmooth += (audioSmooth.overall - audioSmooth.overallSmooth) * lerpSlow;
            audioSmooth.peakSmooth += (audioSmooth.peak - audioSmooth.peakSmooth) * lerp;
            audioSmooth.energySmooth += (audioSmooth.energy - audioSmooth.energySmooth) * lerpSlow;
        }

        // --- STATE ---
        const state = {
            algorithm: 'Abyssal Jellyfish',
            color1: '#ff0055',
            color2: '#4422ff',
            color3: '#00ffff',
            pointsCount: 150000,
            pointSize: 0.046,
            opacity: 1.0,
            alignX: 0.0,
            alignY: 0.0,
            rotationSpeedX: 0.0033,
            rotationSpeedY: 0.0,
            params: {},
        };

        // --- ALGORITHMS ---
        const algorithms = {
            'Aizawa Sphere': {
                type: 'ode',
                defaults: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1, dt: 0.01 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let dx = (z - p.b) * x - p.d * y;
                        let dy = p.d * x + (z - p.b) * y;
                        let dz = p.c + p.a * z - Math.pow(z, 3) / 3 - (x * x + y * y) * (1 + p.e * z) + p.f * z * Math.pow(x, 3);
                        x += dx * p.dt; y += dy * p.dt; z += dz * p.dt;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 0.1; y = 0.1; z = 0.1; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Thomas Labyrinth': {
                type: 'ode',
                defaults: { b: 0.19, dt: 0.05 },
                generate: (p, positions) => {
                    let x = 1.0, y = 0.0, z = 0.0;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let dx = Math.sin(y) - p.b * x;
                        let dy = Math.sin(z) - p.b * y;
                        let dz = Math.sin(x) - p.b * z;
                        x += dx * p.dt; y += dy * p.dt; z += dz * p.dt;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 1; y = 0; z = 0; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Nose-Hoover Braid': {
                type: 'ode',
                defaults: { a: 0.2, dt: 0.01 },
                generate: (p, positions) => {
                    let x = 1.0, y = 0.0, z = 0.0;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let dx = y;
                        let dy = -x + y * z;
                        let dz = p.a - y * y;
                        x += dx * p.dt; y += dy * p.dt; z += dz * p.dt;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 1.0; y = 0.0; z = 0.0; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Four-Wing Butterfly': {
                type: 'ode',
                defaults: { a: 0.2, b: 0.01, c: -0.4, dt: 0.05 },
                generate: (p, positions) => {
                    let x = 1.0, y = 1.0, z = 1.0;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let dx = p.a * x + y * z;
                        let dy = p.b * x + p.c * y - x * z;
                        let dz = -z - x * y;
                        x += dx * p.dt; y += dy * p.dt; z += dz * p.dt;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 1.0; y = 1.0; z = 1.0; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Clifford Cloud': {
                type: 'map',
                defaults: { a: 1.5, b: -1.8, c: 1.6, d: 0.9 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let nx = Math.sin(p.a * y) + p.c * Math.cos(p.a * x);
                        let ny = Math.sin(p.b * x) + p.d * Math.cos(p.b * y);
                        let nz = Math.sin(p.c * z) + p.a * Math.cos(p.d * x);
                        x = nx; y = ny; z = nz;
                        positions.push(x, y, z);
                    }
                },
            },
            'Hopalong Nebula': {
                type: 'map',
                defaults: { a: 2.01, b: -2.53, c: 1.61, d: -0.33, e: 2.0, f: -1.0 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let nx = Math.sin(p.a * y) - Math.cos(p.b * x) + Math.sin(p.e * z);
                        let ny = Math.sin(p.c * x) - Math.cos(p.d * y) + Math.sin(p.f * z);
                        let nz = Math.sin(p.e * x) - Math.cos(p.f * y) + Math.sin(p.a * z);
                        x = nx; y = ny; z = nz;
                        positions.push(x, y, z);
                    }
                },
            },
            'Quantum Lotus': {
                type: 'map',
                defaults: { a: 1.2, b: 0.8, c: -1.5, d: 2.0, e: 0.9, f: 1.5 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let r = Math.sqrt(x * x + y * y);
                        let nx = y * Math.cos(p.a) - x * Math.sin(p.b + r) - z;
                        let ny = x * Math.cos(p.c) + y * Math.sin(p.d + r) - z;
                        let nz = z * p.e + Math.sin(r * p.f);
                        x = nx; y = ny; z = nz;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 0.1; y = 0.1; z = 0.1; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Stellar Web': {
                type: 'map',
                defaults: { a: 2.1, b: -1.5, c: 1.8, d: 2.4, e: -1.2, f: 1.1 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let nx = p.a * Math.sin(y) - Math.cos(p.b * z) * x;
                        let ny = p.c * Math.sin(z) - Math.cos(p.d * x) * y;
                        let nz = p.e * Math.sin(x) - Math.cos(p.f * y) * z;
                        x = nx; y = ny; z = nz;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 0.1; y = 0.1; z = 0.1; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Abyssal Jellyfish': {
                type: 'map',
                defaults: { a: -1.72, b: 1.16, c: -1.35, d: 0.66 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let nx = Math.sin(p.a * y) + Math.cos(p.b * z) - Math.sin(p.c * x);
                        let ny = Math.sin(p.a * z) + Math.cos(p.b * x) - Math.sin(p.c * y);
                        let nz = Math.sin(p.a * x) + Math.cos(p.b * y) - Math.sin(p.d * z);
                        x = nx; y = ny; z = nz;
                        positions.push(x, y, z);
                    }
                },
            },
            'Ethereal Loom': {
                type: 'map',
                defaults: { a: 2.1, b: -1.2, c: 1.5 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let nx = Math.sin(p.a * y) * Math.sin(p.b * z) + Math.cos(p.c * x);
                        let ny = Math.sin(p.b * z) * Math.sin(p.c * x) + Math.cos(p.a * y);
                        let nz = Math.sin(p.c * x) * Math.sin(p.a * y) + Math.cos(p.b * z);
                        x = nx; y = ny; z = nz;
                        positions.push(x, y, z);
                    }
                },
            },
            'Chrono Core': {
                type: 'map',
                defaults: { a: 2.5, b: 1.47, c: 0.5, d: 0.1 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let r = Math.sqrt(x * x + y * y + z * z);
                        let nx = Math.sin(p.a * y) + p.b * Math.cos(r);
                        let ny = Math.sin(p.c * z) + p.d * Math.sin(r);
                        let nz = Math.sin(p.a * x) + Math.cos(p.b * r);
                        x = nx; y = ny; z = nz;
                        positions.push(x, y, z);
                    }
                },
            },
            'Crystalline Spire': {
                type: 'ode',
                defaults: { a: 1.75, dt: 0.01 },
                generate: (p, positions) => {
                    let x = 1.0, y = 0.0, z = 0.0;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let dx = (-p.a * x - 4 * y - 4 * z - y * y) * p.dt;
                        let dy = (-p.a * y - 4 * z - 4 * x - z * z) * p.dt;
                        let dz = (-p.a * z - 4 * x - 4 * y - x * x) * p.dt;
                        x += dx; y += dy; z += dz;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 1.0; y = 0.0; z = 0.0; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Void Dragon': {
                type: 'ode',
                defaults: { a: 40.0, b: 3.0, c: 28.0, dt: 0.002 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.5, z = -0.6;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let dx = (p.a * (y - x)) * p.dt;
                        let dy = ((p.c - p.a) * x - x * z + p.c * y) * p.dt;
                        let dz = (x * y - p.b * z) * p.dt;
                        x += dx; y += dy; z += dz;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 0.1; y = 0.5; z = -0.6; }
                        positions.push(x, y, z);
                    }
                },
            },
            'Astral Web': {
                type: 'map',
                defaults: { a: 1.1, b: 2.2, c: 1.5, d: 0.8 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let nx = Math.sin(p.a * (y - z)) + p.b * Math.cos(x);
                        let ny = Math.sin(p.c * (z - x)) + p.d * Math.cos(y);
                        let nz = Math.sin(p.a * (x - y)) + p.b * Math.cos(z);
                        x = nx; y = ny; z = nz;
                        positions.push(x, y, z);
                    }
                },
            },
            'Hyperborean Snowflake': {
                type: 'map',
                defaults: { a: 1.5, b: 1.2, c: 1.8, d: 0.5 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let r = Math.sqrt(x * x + y * y + z * z);
                        let nx = Math.cos(p.a * r) * x - Math.sin(p.b * r) * y + p.c * Math.sin(z);
                        let ny = Math.sin(p.a * r) * x + Math.cos(p.b * r) * y + p.c * Math.sin(x);
                        let nz = p.d * Math.cos(r) + Math.sin(y);
                        let f = 1.0 / (1.0 + r * 0.05);
                        x = nx * f; y = ny * f; z = nz * f;
                        positions.push(x, y, z);
                    }
                },
            },
            'Aetheric Crown': {
                type: 'map',
                defaults: { a: 1.2, b: 2.1, c: 1.4, d: 1.5 },
                generate: (p, positions) => {
                    let x = 0.1, y = 0.1, z = 0.1;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let nx = Math.cos(p.a * y) + Math.sin(p.b * z) - Math.cos(p.c * x);
                        let ny = Math.cos(p.d * z) + Math.sin(p.a * x) - Math.cos(p.b * y);
                        let nz = Math.cos(p.c * x) + Math.sin(p.d * y) - Math.cos(p.a * z);
                        x = nx; y = ny; z = nz;
                        positions.push(x, y, z);
                    }
                },
            },
            'Plasma Coil': {
                type: 'ode',
                defaults: { s: 20.0, v: 4.272, dt: 0.005 },
                generate: (p, positions) => {
                    let x = 1.0, y = 0.0, z = 0.0;
                    for (let i = 0; i < state.pointsCount; i++) {
                        let dx = (-p.s * (x + y)) * p.dt;
                        let dy = (-y - p.s * x * z) * p.dt;
                        let dz = (p.s * x * y + p.v) * p.dt;
                        x += dx; y += dy; z += dz;
                        if (isNaN(x) || Math.abs(x) > 1000) { x = 1.0; y = 0.0; z = 0.0; }
                        positions.push(x, y, z);
                    }
                },
            },
        };

        // --- THREE.JS SCENE ---
        let scene, camera, renderer, controls, particles, geometry, material;
        let alignedPositions = null;
        let baseColors = null;
        let currentCentroid = new THREE.Vector3();
        let animFrameId = null;

        function createCircleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.8, 'rgba(255,255,255,1)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
            return new THREE.CanvasTexture(canvas);
        }

        function initThree() {
            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x020205, 0.015);

            camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(0, 10, 30);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            geometry = new THREE.BufferGeometry();
            material = new THREE.PointsMaterial({
                size: state.pointSize,
                vertexColors: true,
                transparent: true,
                opacity: state.opacity,
                map: createCircleTexture(),
                alphaTest: 0.01,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });

            particles = new THREE.Points(geometry, material);
            scene.add(particles);

            state.params = JSON.parse(JSON.stringify(algorithms[state.algorithm].defaults));
            updateFractal();
        }

        function updateFractal() {
            const alg = algorithms[state.algorithm];
            const rawPositions = [];
            alg.generate(state.params, rawPositions);
            if (rawPositions.length === 0) return;

            const actualCount = rawPositions.length / 3;
            currentCentroid.set(0, 0, 0);
            for (let i = 0; i < rawPositions.length; i += 3) {
                currentCentroid.x += rawPositions[i];
                currentCentroid.y += rawPositions[i + 1];
                currentCentroid.z += rawPositions[i + 2];
            }
            currentCentroid.divideScalar(actualCount);

            let maxDist = 0;
            for (let i = 0; i < rawPositions.length; i += 3) {
                let dx = rawPositions[i] - currentCentroid.x;
                let dy = rawPositions[i + 1] - currentCentroid.y;
                let dz = rawPositions[i + 2] - currentCentroid.z;
                let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (d > maxDist) maxDist = d;
            }

            const scaleFactor = 15.0 / (maxDist || 1.0);
            const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(state.alignX, state.alignY, 0, 'XYZ'));
            const m = matrix.elements;

            alignedPositions = new Float32Array(rawPositions.length);
            baseColors = new Float32Array(rawPositions.length);

            const c1 = new THREE.Color(state.color1);
            const c2 = new THREE.Color(state.color2);
            const c3 = new THREE.Color(state.color3);

            for (let i = 0; i < rawPositions.length; i += 3) {
                let bx = (rawPositions[i] - currentCentroid.x) * scaleFactor;
                let by = (rawPositions[i + 1] - currentCentroid.y) * scaleFactor;
                let bz = (rawPositions[i + 2] - currentCentroid.z) * scaleFactor;

                alignedPositions[i] = m[0] * bx + m[4] * by + m[8] * bz;
                alignedPositions[i + 1] = m[1] * bx + m[5] * by + m[9] * bz;
                alignedPositions[i + 2] = m[2] * bx + m[6] * by + m[10] * bz;

                let distNorm = Math.sqrt(bx * bx + by * by + bz * bz) / 15.0;
                let timeNorm = (i / 3) / actualCount;
                let t = Math.max(0, Math.min(1, distNorm * 0.4 + timeNorm * 0.6));

                let col = new THREE.Color();
                if (t < 0.5) {
                    col.copy(c1).lerp(c2, t * 2.0);
                } else {
                    col.copy(c2).lerp(c3, (t - 0.5) * 2.0);
                }
                baseColors[i] = col.r;
                baseColors[i + 1] = col.g;
                baseColors[i + 2] = col.b;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(alignedPositions), 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(baseColors), 3));
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
        }

        // --- AUDIO-REACTIVE ANIMATION ---
        // Color palettes that shift based on audio energy
        const idleColor1 = new THREE.Color('#ff0055');
        const idleColor2 = new THREE.Color('#4422ff');
        const idleColor3 = new THREE.Color('#00ffff');
        const activeColor1 = new THREE.Color('#ff4400');
        const activeColor2 = new THREE.Color('#ff00ff');
        const activeColor3 = new THREE.Color('#ffffff');

        let smoothScale = 1.0;
        let smoothPointSize = state.pointSize;
        let smoothRotSpeed = state.rotationSpeedX;
        let smoothDisplacement = 0;
        let smoothColorShift = 0;
        let breathPhase = 0;
        let lastShapeStr = null;
        let lastColorPreset = null;

        function animate() {
            animFrameId = requestAnimationFrame(animate);
            updateAudio();

            const currentConfig = configRef.current;
            
            // React to shape config
            if (currentConfig.shape && currentConfig.shape !== lastShapeStr) {
                lastShapeStr = currentConfig.shape;
                if (currentConfig.shape !== 'Auto' && algorithms[currentConfig.shape]) {
                    state.algorithm = currentConfig.shape;
                    state.params = JSON.parse(JSON.stringify(algorithms[state.algorithm].defaults));
                    updateFractal();
                }
            }

            // React to color config
            if (currentConfig.colorPreset && currentConfig.colorPreset !== lastColorPreset) {
                lastColorPreset = currentConfig.colorPreset;
                if (currentConfig.colorPreset === 'Neon Cyber') {
                    idleColor1.set('#00ffcc'); idleColor2.set('#ff00ff'); idleColor3.set('#0055ff');
                } else if (currentConfig.colorPreset === 'Molten Core') {
                    idleColor1.set('#ff2200'); idleColor2.set('#ffaa00'); idleColor3.set('#550000');
                } else if (currentConfig.colorPreset === 'Matrix Green') {
                    idleColor1.set('#00ff00'); idleColor2.set('#005500'); idleColor3.set('#aaffaa');
                } else if (currentConfig.colorPreset === 'Deep Space') {
                    idleColor1.set('#050522'); idleColor2.set('#220044'); idleColor3.set('#aa55ff');
                } else if (currentConfig.colorPreset === 'Golden Aura') {
                    idleColor1.set('#ffaa00'); idleColor2.set('#ffdd55'); idleColor3.set('#552200');
                } else if (currentConfig.colorPreset === 'Arctic Ice') {
                    idleColor1.set('#00aaff'); idleColor2.set('#ffffff'); idleColor3.set('#0033aa');
                } else if (currentConfig.colorPreset === 'Amethyst Dream') {
                    idleColor1.set('#9933ff'); idleColor2.set('#ff99ff'); idleColor3.set('#330066');
                } else if (currentConfig.colorPreset === 'Blood Moon') {
                    idleColor1.set('#ff0000'); idleColor2.set('#550000'); idleColor3.set('#000000');
                } else if (currentConfig.colorPreset === 'Toxic Waste') {
                    idleColor1.set('#aaff00'); idleColor2.set('#55ff00'); idleColor3.set('#003300');
                } else {
                    idleColor1.set('#ff0055'); idleColor2.set('#4422ff'); idleColor3.set('#00ffff');
                }
            }

            const time = performance.now() * 0.001;

            if (alignedPositions && geometry.attributes.position) {
                const positions = geometry.attributes.position.array;
                const colors = geometry.attributes.color.array;
                const len = alignedPositions.length;

                // --- DERIVE REACTIVE VALUES ---
                const sens = currentConfig.sensitivity || 1.0;
                const bass = audioSmooth.bassSmooth * sens;
                const mid = audioSmooth.midSmooth * sens;
                const high = audioSmooth.highSmooth * sens;
                const energy = audioSmooth.energySmooth * sens;
                const peak = audioSmooth.peakSmooth * sens;

                // Idle breathing when no audio
                breathPhase += 0.015;
                const breathVal = Math.sin(breathPhase) * 0.5 + 0.5; // 0..1
                const scaleM = currentConfig.scaleMult || 1.0;

                // Scale: bass makes it expand, quiet = gentle breathing
                const targetScale = (1.0 + bass * 0.6 + breathVal * 0.05) * scaleM;
                smoothScale += (targetScale - smoothScale) * 0.08;

                // Point size: reacts to mid frequencies (becomes chunkier with sound)
                const targetPointSize = state.pointSize * (1.0 + mid * 2.5 + peak * 1.5);
                smoothPointSize += (targetPointSize - smoothPointSize) * 0.1;
                material.size = smoothPointSize;

                // Opacity pulse with peak
                material.opacity = Math.min(1.0, state.opacity + peak * 0.3);

                // Rotation speed: energy makes it spin faster
                const targetRotSpeed = state.rotationSpeedX + energy * 0.02 + high * 0.01;
                smoothRotSpeed += (targetRotSpeed - smoothRotSpeed) * 0.05;

                // Displacement amplitude for map-type spatial drift
                const targetDisplacement = 0.08 + bass * 1.2 + mid * 0.5;
                smoothDisplacement += (targetDisplacement - smoothDisplacement) * 0.1;

                // Color shift intensity
                const targetColorShift = energy * 1.5 + peak * 0.5;
                smoothColorShift += (targetColorShift - smoothColorShift) * 0.06;
                const cs = Math.min(1, smoothColorShift);

                // Lerped color palette
                const lc1 = idleColor1.clone().lerp(activeColor1, cs);
                const lc2 = idleColor2.clone().lerp(activeColor2, cs);
                const lc3 = idleColor3.clone().lerp(activeColor3, cs);

                const algType = algorithms[state.algorithm].type;
                const speed = 0.4 + energy * 2.0;
                const amp = smoothDisplacement;

                for (let i = 0; i < len; i += 3) {
                    let bx = alignedPositions[i];
                    let by = alignedPositions[i + 1];
                    let bz = alignedPositions[i + 2];

                    // Scale from center
                    let sx = bx * smoothScale;
                    let sy = by * smoothScale;
                    let sz = bz * smoothScale;

                    if (algType === 'map') {
                        // Spatial drift displacement modulated by audio
                        sx += Math.sin(time * speed + by * 0.5) * amp;
                        sy += Math.cos(time * speed * 1.1 + bz * 0.5) * amp;
                        sz += Math.sin(time * speed * 0.9 + bx * 0.5) * amp;
                    } else {
                        // ODE: flow-like ripple along the trajectory
                        const ptIdx = i / 3;
                        const wave = Math.sin(ptIdx * 0.002 + time * 3.0) * bass * 0.5;
                        sx += wave;
                        sy += Math.cos(ptIdx * 0.003 + time * 2.5) * mid * 0.3;
                        sz += Math.sin(ptIdx * 0.001 + time * 2.0) * high * 0.2;
                    }

                    // Per-point audio-frequency "explosion" — high freq particles at edges move more
                    const distFromCenter = Math.sqrt(bx * bx + by * by + bz * bz) / 15.0;
                    const freqDisplace = distFromCenter * high * 1.5;
                    if (distFromCenter > 0.001) {
                        sx += (bx / (distFromCenter * 15.0)) * freqDisplace;
                        sy += (by / (distFromCenter * 15.0)) * freqDisplace;
                        sz += (bz / (distFromCenter * 15.0)) * freqDisplace;
                    }

                    positions[i] = sx;
                    positions[i + 1] = sy;
                    positions[i + 2] = sz;

                    // Color: blend base gradient with audio-reactive palette
                    const actualCount = len / 3;
                    const timeNorm = (i / 3) / actualCount;
                    const t = Math.max(0, Math.min(1, distFromCenter * 0.4 + timeNorm * 0.6));

                    let col = new THREE.Color();
                    if (t < 0.5) {
                        col.copy(lc1).lerp(lc2, t * 2.0);
                    } else {
                        col.copy(lc2).lerp(lc3, (t - 0.5) * 2.0);
                    }

                    // Flash bright on peaks
                    const flash = peak * peak * 0.5;
                    col.r = Math.min(1, col.r + flash);
                    col.g = Math.min(1, col.g + flash * 0.5);
                    col.b = Math.min(1, col.b + flash * 0.3);

                    colors[i] = col.r;
                    colors[i + 1] = col.g;
                    colors[i + 2] = col.b;
                }

                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.color.needsUpdate = true;
            }

            // Auto rotation
            if (particles) {
                particles.rotation.y += smoothRotSpeed;
                particles.rotation.x += state.rotationSpeedY;
            }

            if (controls) {
                if (currentConfig.dragEnabled) {
                    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
                    controls.touches.ONE = THREE.TOUCH.PAN;
                } else {
                    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
                    controls.touches.ONE = THREE.TOUCH.ROTATE;
                }
                controls.update();
            }

            renderer.render(scene, camera);
        }

        function onWindowResize() {
            if (!container || !camera || !renderer) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }

        // --- ALGORITHM CYCLING ---
        const algNames = Object.keys(algorithms);
        let currentAlgIndex = algNames.indexOf(state.algorithm);
        let cycleInterval = null;

        function cycleAlgorithm() {
            if (configRef.current.shape && configRef.current.shape !== 'Auto') return;
            currentAlgIndex = (currentAlgIndex + 1) % algNames.length;
            state.algorithm = algNames[currentAlgIndex];
            state.params = JSON.parse(JSON.stringify(algorithms[state.algorithm].defaults));
            updateFractal();
        }

        // Cycle algorithm every 15 seconds
        cycleInterval = setInterval(cycleAlgorithm, 15000);

        // --- INIT ---
        window.addEventListener('resize', onWindowResize);
        initThree();
        connectMicrophone();
        animate();

        // Return cleanup function
        return () => {
            if (animFrameId) cancelAnimationFrame(animFrameId);
            if (cycleInterval) clearInterval(cycleInterval);
            window.removeEventListener('resize', onWindowResize);
            if (audioContext) audioContext.close();
            if (renderer) {
                renderer.dispose();
                if (renderer.domElement && renderer.domElement.parentNode) {
                    renderer.domElement.parentNode.removeChild(renderer.domElement);
                }
            }
            if (geometry) geometry.dispose();
            if (material) material.dispose();
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        cleanupRef.current = initScene(containerRef.current);
        return () => {
            if (cleanupRef.current) cleanupRef.current();
        };
    }, [initScene]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'transparent' }}>
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                }}
            />
            {/* Mic permission hint overlay */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 13,
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    pointerEvents: 'none',
                    textAlign: 'center',
                    zIndex: 10,
                }}
            >
                🎤 Allow microphone access to make the fractal react to sound
            </div>
        </div>
    );
};

export default FractalAudioReactive;