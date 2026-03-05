// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Remove loading screen
document.querySelector('.loading').style.display = 'none';

// Variables
let animationSpeed = 1;
let isPaused = false;
let showOrbits = true;
const planets = [];
const orbitLines = [];
const planetSpeedMultipliers = {};
let isDarkMode = true;
let hoveredPlanet = null;
let isUIExpanded = false;

// Planet data (distances scaled for visibility)
const planetData = {
    sun: { radius: 8, distance: 0, color: 0xFDB813, speed: 0, texture: 'https://www.solarsystemscope.com/textures/download/2k_sun.jpg' },
    mercury: { radius: 0.8, distance: 20, color: 0x8C7853, speed: 0.04, texture: 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg' },
    venus: { radius: 1.2, distance: 30, color: 0xFF6B47, speed: 0.035, texture: 'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg' },
    earth: { radius: 1.3, distance: 40, color: 0x6B93D6, speed: 0.03, texture: 'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg' },
    mars: { radius: 1.0, distance: 55, color: 0xCD5C5C, speed: 0.025, texture: 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg' },
    jupiter: { radius: 4.0, distance: 80, color: 0xD8CA9D, speed: 0.02, texture: 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg' },
    saturn: { radius: 3.5, distance: 110, color: 0xFAD5A5, speed: 0.015, texture: 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg' },
    uranus: { radius: 2.0, distance: 140, color: 0x4FD0E7, speed: 0.01, texture: 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg' },
    neptune: { radius: 2.0, distance: 170, color: 0x4B70DD, speed: 0.008, texture: 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg' }
};

const planetInfo = {
    sun: "The Sun is the star at the center of our Solar System. It's a nearly perfect sphere of hot plasma.",
    mercury: "Mercury is the smallest planet and closest to the Sun. It has extreme temperature variations.",
    venus: "Venus is the hottest planet in our solar system with a thick, toxic atmosphere.",
    earth: "Earth is our home planet, the only known planet with life. It has one natural satellite, the Moon.",
    mars: "Mars is known as the Red Planet due to iron oxide on its surface. It has two small moons.",
    jupiter: "Jupiter is the largest planet in our solar system, a gas giant with over 70 known moons.",
    saturn: "Saturn is famous for its prominent ring system. It's less dense than water.",
    uranus: "Uranus rotates on its side and has a faint ring system. It's an ice giant.",
    neptune: "Neptune is the windiest planet with speeds up to 2,100 km/h. It's the farthest from the Sun."
};

// Create starfield
function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 4000;
        starPositions[i + 1] = (Math.random() - 0.5) * 4000;
        starPositions[i + 2] = (Math.random() - 0.5) * 4000;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 2,
        sizeAttenuation: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.userData = { isStars: true };
    scene.add(stars);
    return stars;
}

// Create orbit lines
function createOrbitLine(radius) {
    const points = [];
    for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        ));
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x444444, 
        transparent: true, 
        opacity: 0.3 
    });
    const orbitLine = new THREE.Line(geometry, material);
    orbitLine.visible = showOrbits;
    scene.add(orbitLine);
    orbitLines.push(orbitLine);
    return orbitLine;
}

function createSunAura(sunPlanet, sunRadius) {
    // Create outer glow aura
    const auraGeometry = new THREE.SphereGeometry(sunRadius * 1.8, 32, 16);
    const auraMaterial = new THREE.MeshBasicMaterial({
        color: 0xf7ec8b,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.userData = { isSunAura: true };
    scene.add(aura);

    // Create middle glow layer
    const middleGlowGeometry = new THREE.SphereGeometry(sunRadius * 1.4, 32, 16);
    const middleGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xfae848,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide
    });
    const middleGlow = new THREE.Mesh(middleGlowGeometry, middleGlowMaterial);
    middleGlow.userData = { isSunAura: true };
    scene.add(middleGlow);

    // Create inner bright layer
    const innerGlowGeometry = new THREE.SphereGeometry(sunRadius * 1.15, 32, 16);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffe500,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    innerGlow.userData = { isSunAura: true };
    scene.add(innerGlow);

    // Store references to aura layers for animation
    sunPlanet.userData.auraLayers = [aura, middleGlow, innerGlow];
}

// Create planets
function createPlanet(name, data) {
    const geometry = new THREE.SphereGeometry(data.radius, 32, 16);
    let material;

    if (name === 'sun') {
        material = new THREE.MeshLambertMaterial({ 
            color: data.color,
            emissive: data.color,
            emissiveIntensity: 0.8
        });
    } else {
        material = new THREE.MeshLambertMaterial({ color: data.color });
    }

    const planet = new THREE.Mesh(geometry, material);
    planet.userData = { 
        name: name, 
        distance: data.distance, 
        baseSpeed: data.speed,
        speed: data.speed,
        angle: Math.random() * Math.PI * 2,
        info: planetInfo[name]
    };
    
    planetSpeedMultipliers[name] = 1.0;
    
    if (data.distance > 0) {
        planet.position.x = data.distance;
        planet.castShadow = true;
        planet.receiveShadow = true;
    }

    scene.add(planet);
    planets.push(planet);

    // Add aura effect for the sun
    if (name === 'sun') {
        createSunAura(planet, data.radius);
    }

    // Create orbit line for planets (not sun)
    if (data.distance > 0) {
        createOrbitLine(data.distance);
    }

    return planet;
}

// Create all celestial bodies
Object.entries(planetData).forEach(([name, data]) => {
    createPlanet(name, data);
});

// Create individual planet speed controls
function createPlanetSpeedControls() {
    const container = document.getElementById('planetSpeedControls');
    
    planets.forEach(planet => {
        const name = planet.userData.name;
        if (name === 'sun') return; // Skip sun
        
        const controlDiv = document.createElement('div');
        controlDiv.className = 'planet-speed-control';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'planet-name';
        nameSpan.textContent = name;
        nameSpan.style.color = `#${planet.material.color.getHexString()}`;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'planet-speed-slider';
        slider.min = '0';
        slider.max = '5';
        slider.step = '0.1';
        slider.value = '1';
        slider.id = `${name}Speed`;
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'speed-value';
        valueSpan.textContent = '1.0x';
        valueSpan.id = `${name}Value`;
        
        // Add event listener for real-time updates
        slider.addEventListener('input', function(e) {
            const multiplier = parseFloat(e.target.value);
            planetSpeedMultipliers[name] = multiplier;
            planet.userData.speed = planet.userData.baseSpeed * multiplier;
            valueSpan.textContent = multiplier.toFixed(1) + 'x';
        });
        
        controlDiv.appendChild(nameSpan);
        controlDiv.appendChild(slider);
        controlDiv.appendChild(valueSpan);
        container.appendChild(controlDiv);
    });
}

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xFFFFFF, 1, 2000);
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// Camera controls
camera.position.set(100, 50, 100);
camera.lookAt(0, 0, 0);

let mouseX = 0, mouseY = 0;
let isMouseDown = false;
let cameraAngle = { x: 0, y: 0 };
let cameraDistance = 150;

// Mouse controls
document.addEventListener('mousedown', (e) => {
    const uiOverlay = document.querySelector('.ui-overlay');
    const rect = uiOverlay.getBoundingClientRect();
    const isOverUI = e.clientX >= rect.left && e.clientX <= rect.right && 
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
    
    if (!isOverUI) {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    }
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
});

document.addEventListener('mousemove', (e) => {
    const uiOverlay = document.querySelector('.ui-overlay');
    const rect = uiOverlay.getBoundingClientRect();
    const isOverUI = e.clientX >= rect.left && e.clientX <= rect.right && 
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
    
    if (isMouseDown && !isOverUI) {
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        
        cameraAngle.x -= deltaX * 0.01;
        cameraAngle.y += deltaY * 0.01;
        cameraAngle.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraAngle.y));
        
        mouseX = e.clientX;
        mouseY = e.clientY;
    } else if (!isOverUI) {
        handleMouseHover(e);
    }
})

// Handle planet hover tooltips
function handleMouseHover(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);

    if (intersects.length > 0) {
        const planet = intersects[0].object;
        if (hoveredPlanet !== planet) {
            hoveredPlanet = planet;
            showTooltip(e.clientX, e.clientY, planet.userData.name);
        }
    } else {
        if (hoveredPlanet) {
            hoveredPlanet = null;
            hideTooltip();
        }
    }
}

function showTooltip(x, y, planetName) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = planetName.charAt(0).toUpperCase() + planetName.slice(1);
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.classList.add('visible');
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('visible');
}

// Zoom controls
document.addEventListener('wheel', (e) => {
    cameraDistance += e.deltaY * 0.1;
    cameraDistance = Math.max(20, Math.min(500, cameraDistance));
});

// Update camera position
function updateCamera() {
    camera.position.x = Math.cos(cameraAngle.x) * Math.cos(cameraAngle.y) * cameraDistance;
    camera.position.y = Math.sin(cameraAngle.y) * cameraDistance;
    camera.position.z = Math.sin(cameraAngle.x) * Math.cos(cameraAngle.y) * cameraDistance;
    camera.lookAt(0, 0, 0);
}

// Planet clicking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('click', (e) => {
    if (isMouseDown) return; 

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);

    if (intersects.length > 0) {
        const planet = intersects[0].object;
        showPlanetInfo(planet.userData);
    } else {
        hidePlanetInfo();
    }
});

function showPlanetInfo(data) {
    const infoPanel = document.getElementById('planetInfo');
    document.getElementById('planetName').textContent = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    document.getElementById('planetDescription').textContent = data.info;
    infoPanel.style.display = 'block';
}

function hidePlanetInfo() {
    document.getElementById('planetInfo').style.display = 'none';
}

// UI Controls
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const toggleOrbitsBtn = document.getElementById('toggleOrbits');
const resetSpeedsBtn = document.getElementById('resetSpeeds');
const themeToggle = document.getElementById('themeToggle');
const uiHeader = document.getElementById('uiHeader');
const uiContent = document.getElementById('uiContent');
const dropdownArrow = document.getElementById('dropdownArrow');

// UI Dropdown functionality
uiHeader.addEventListener('click', () => {
    isUIExpanded = !isUIExpanded;
    uiContent.classList.toggle('expanded', isUIExpanded);
    dropdownArrow.classList.toggle('expanded', isUIExpanded);
});

speedSlider.addEventListener('input', (e) => {
    animationSpeed = parseFloat(e.target.value);
    speedValue.textContent = animationSpeed + 'x';
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

resetBtn.addEventListener('click', () => {
    cameraAngle = { x: 0, y: 0 };
    cameraDistance = 150;
    hidePlanetInfo();
});

toggleOrbitsBtn.addEventListener('click', () => {
    showOrbits = !showOrbits;
    orbitLines.forEach(line => {
        line.visible = showOrbits;
    });
});

resetSpeedsBtn.addEventListener('click', () => {
    // Reset all planet speeds to 1x
    planets.forEach(planet => {
        const name = planet.userData.name;
        if (name !== 'sun') {
            planetSpeedMultipliers[name] = 1.0;
            planet.userData.speed = planet.userData.baseSpeed;
            
            // Update UI
            const slider = document.getElementById(`${name}Speed`);
            const valueSpan = document.getElementById(`${name}Value`);
            if (slider && valueSpan) {
                slider.value = '1';
                valueSpan.textContent = '1.0x';
            }
        }
    });
});

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    
    if (isDarkMode) {
        themeToggle.textContent = '🌙 Dark Mode';
        renderer.setClearColor(0x000000);
        // Make stars visible in dark mode
        scene.children.forEach(child => {
            if (child.userData && child.userData.isStars) {
                child.visible = true;
            }
        });
    } else {
        themeToggle.textContent = '☀️ Light Mode';
        renderer.setClearColor(0xf0f0f0);
        // Hide stars in light mode
        scene.children.forEach(child => {
            if (child.userData && child.userData.isStars) {
                child.visible = false;
            }
        });
    }
});

// Create starfield
const stars = createStarfield();

// Create planet speed controls after planets are created
createPlanetSpeedControls();

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (!isPaused) {
        // Animate planets
        planets.forEach(planet => {
            if (planet.userData.distance > 0) {
                planet.userData.angle += planet.userData.speed * animationSpeed;
                planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
                planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
            }
            // Rotate planets
            planet.rotation.y += 0.01 * animationSpeed;

            // Animate sun aura
            if (planet.userData.name === 'sun' && planet.userData.auraLayers) {
                planet.userData.auraLayers.forEach((layer, index) => {
                    // Gentle pulsing effect
                    const time = Date.now() * 0.001;
                    const pulse = Math.sin(time + index * 0.5) * 0.1 + 1;
                    layer.scale.setScalar(pulse);
                    layer.rotation.y += (0.005 + index * 0.002) * animationSpeed;
                });
            }
        });
    }

    updateCamera();
    renderer.render(scene, camera);
}   

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();