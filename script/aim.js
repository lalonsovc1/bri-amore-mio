       // Carga de la imagen del logo de Alonso para el HUD
const alonsoLogoImg = new Image();
alonsoLogoImg.src = 'img/alonso-logo.png'; // Asegúrate de que la ruta sea correcta
        const MAX_AMMO = 25;
        const PLAYER_NAME = "Alonso";

        const KILL_LEVELS = [
            { level: 1, title: "PRIMERA BAJA", sub: "1 / 5 ELIMINADO", color: "#3b82f6" },
            { level: 2, title: "DOBLE BAJA", sub: "2 / 5 ELIMINADO", color: "#06b6d4" },
            { level: 3, title: "TRIPLE BAJA", sub: "3 / 5 ELIMINADO", color: "#eab308" },
            { level: 4, title: "CUÁDRUPLE BAJA", sub: "4 / 5 ELIMINADO", color: "#f97316" },
            { level: 5, title: "¡ACE!", sub: "¡EQUIPO ENEMIGO ELIMINADO!", color: "#ff4655" }
        ];

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const radarCanvas = document.getElementById('radarCanvas');
        const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        let gameActive = true;
        let killsCount = 0;
        let headshotsCount = 0;
        let totalShots = 0;
        let hitsCount = 0;
        let currentAmmo = MAX_AMMO;
        let reserveAmmo = 75;
        let playerHealth = 100;
        let playerShield = 50;
        let startTime = null;
        let timerInterval = null;
        let bannerTimeout = null;

        let targetSpeedMultiplier = 3.5;
        let customKillAudioBuffers = [null, null, null, null, null];
        let useSynthSound = true;

        const mouse = { x: 0, y: 0 };
        let recoilOffset = { x: 0, y: 0 };
        let crosshairBloom = 0;

        let agentsData = [];
        let targets = [];
        let obstacles = [];
        let damageNumbers = [];
        let particles = [];
        let tracers = [];
        let deathAnimations = [];

        let isMouseDown = false;
        let autoShootInterval = null;
        const fireRateMs = 120; 

        // Obtenemos la referencia del video en bucle desde el HTML
        const bgVideo = document.getElementById('bgVideo');

        const stonePillarImg = new Image();
        stonePillarImg.src = 'img/stone_pillar.webp';

        const metalPillarImg = new Image();
        metalPillarImg.src = 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?q=80&w=400&auto=format&fit=crop';

        const radianiteImg = new Image();
        radianiteImg.src = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop';

        const towerImg = new Image();
        towerImg.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=400&auto=format&fit=crop';

        const gameWrapper = document.getElementById('gameWrapper');
        const hudKills = document.getElementById('hudKills');
        const hudHS = document.getElementById('hudHS');
        const hudAccuracy = document.getElementById('hudAccuracy');
        const hudTimer = document.getElementById('hudTimer');
        const ammoCurrent = document.getElementById('ammoCurrent');
        const ammoReserve = document.getElementById('ammoReserve');
        const reloadPrompt = document.getElementById('reloadPrompt');
        const screenFlash = document.getElementById('screenFlash');
        const aceSubtleOverlay = document.getElementById('aceSubtleOverlay');
        const killFeed = document.getElementById('killFeed');
        const killBannerContainer = document.getElementById('killBannerContainer');
        const bannerText = document.getElementById('bannerText');
        const bannerIconBox = document.getElementById('bannerIconBox');
        const victoryModal = document.getElementById('victoryModal');
        const gameOverModal = document.getElementById('gameOverModal');
        const finalTime = document.getElementById('finalTime');
        const finalAccuracy = document.getElementById('finalAccuracy');
        const finalHS = document.getElementById('finalHS');
        const settingsModal = document.getElementById('settingsModal');

        function resizeCanvas() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            createMultidirectionalObstacles();
        }
        window.addEventListener('resize', resizeCanvas);

        function createMultidirectionalObstacles() {
            const w = canvas.width;
            const h = canvas.height;
            const horizon = h * 0.42;

            obstacles = [
                { x: w * 0.08, y: horizon - 160, width: 65, height: 190, type: 'stone_pillar', img: stonePillarImg, label: 'T' },
                { x: w * 0.28, y: horizon - 95, width: 115, height: 115, type: 'radianite_crate', img: radianiteImg, label: 'E' },
                { x: w * 0.48, y: horizon - 130, width: 75, height: 155, type: 'metal_pillar', img: metalPillarImg, label: 'A' },
                { x: w * 0.69, y: horizon - 110, width: 60, height: 135, type: 'metal_pillar', img: metalPillarImg, label: 'M' },
                { x: w * 0.85, y: horizon - 170, width: 70, height: 200, type: 'vertical_tower', img: towerImg, label: 'O' }
            ];
        }

        async function fetchAgents() {
            try {
                const response = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=es-ES');
                const data = await response.json();
                if (data && data.data) {
                    agentsData = data.data.filter(a => a.fullPortrait).map(a => {
                        let img = new Image();
                        img.src = a.fullPortrait; 
                        return {
                            displayName: a.displayName.toUpperCase(),
                            iconImg: img,
                            color: '#' + (a.backgroundGradientColors ? a.backgroundGradientColors[0].substring(0,6) : 'ff4655')
                        };
                    });
                }
            } catch (err) {
                console.warn('Error al conectar con la API de Valorant:', err);
            }

            if (!agentsData || agentsData.length === 0) {
                agentsData = [
                    { displayName: 'JETT', color: '#38bdf8', iconImg: null },
                    { displayName: 'REYNA', color: '#a855f7', iconImg: null },
                    { displayName: 'PHOENIX', color: '#f97316', iconImg: null },
                    { displayName: 'OMEN', color: '#6366f1', iconImg: null },
                    { displayName: 'SOVA', color: '#eab308', iconImg: null }
                ];
            }

            resizeCanvas();
            initGame();
        }

        class Target {
            constructor(id, obstacle, agentInfo) {
                this.id = id;
                this.obstacle = obstacle;
                this.agentInfo = agentInfo;
                this.width = 80;
                this.height = 170;
                this.hp = 100;
                this.maxHp = 100;
                this.isDead = false;

                this.state = 'HIDING';
                this.stateTimer = Math.random() * 50 + 30;

                this.hiddenX = obstacle.x + (obstacle.width / 2) - (this.width / 2);
                this.peekDirection = Math.random() < 0.5 ? -1 : 1;
                this.peekDistance = (obstacle.width / 2) + (this.width * 0.45);
                this.peekX = this.hiddenX + (this.peekDirection * this.peekDistance);

                this.x = this.hiddenX;
                this.y = obstacle.y + obstacle.height - this.height + 15;
                this.currentX = this.hiddenX;
                this.targetX = this.hiddenX;

                this.shootCooldown = Math.random() * 90 + 60;
            }

            update() {
                if (this.isDead || !gameActive) return;

                this.stateTimer--;
                if (this.stateTimer <= 0) {
                    if (this.state === 'HIDING') {
                        this.state = 'PEEKING';
                        this.targetX = this.peekX;
                        this.stateTimer = Math.random() * 60 + 30;
                    } else {
                        if (Math.random() < 0.4) {
                            this.state = 'HIDING';
                            this.targetX = this.hiddenX;
                            this.stateTimer = Math.random() * 40 + 20;
                        } else {
                            this.peekDirection *= -1;
                            this.peekX = this.hiddenX + (this.peekDirection * this.peekDistance);
                            this.targetX = this.peekX;
                            this.stateTimer = Math.random() * 35 + 15;
                        }
                    }
                }

                const speed = 0.12 * targetSpeedMultiplier;
                this.currentX += (this.targetX - this.currentX) * speed;
                this.x = this.currentX;

                if (this.state === 'PEEKING' && Math.abs(this.x - this.peekX) < 10) {
                    this.shootCooldown--;
                    if (this.shootCooldown <= 0) {
                        this.shootPlayer();
                        this.shootCooldown = Math.random() * 80 + 50;
                    }
                }
            }

            shootPlayer() {
                if (!gameActive) return;
                const dmg = 20;
                if (playerShield > 0) {
                    playerShield = Math.max(0, playerShield - dmg);
                } else {
                    playerHealth = Math.max(0, playerHealth - dmg);
                }

                document.getElementById('shieldText').innerText = `ESCUDO ${playerShield}`;
                document.getElementById('healthText').innerText = `SALUD ${playerHealth}`;
                document.getElementById('shieldBar').style.width = `${(playerShield / 50) * 100}%`;
                document.getElementById('healthBar').style.width = `${(playerHealth / 100) * 100}%`;

                playHitByEnemySound();

                screenFlash.style.opacity = '0.7';
                setTimeout(() => screenFlash.style.opacity = '0', 120);

                if (playerHealth <= 0) {
                    triggerGameOver();
                }
            }

            draw() {
                if (this.isDead) return;

                ctx.save();
                ctx.beginPath();
                ctx.ellipse(this.x + this.width / 2, this.y + this.height - 4, this.width / 2.5, 8, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fill();

                const headRadius = 12;
                const headCenterX = this.x + this.width / 2;
                const headCenterY = this.y + 32;

                if (this.agentInfo.iconImg && this.agentInfo.iconImg.complete && this.agentInfo.iconImg.naturalWidth !== 0) {
                    ctx.drawImage(this.agentInfo.iconImg, this.x - 10, this.y, this.width + 20, this.height);
                } else {
                    ctx.fillStyle = this.agentInfo.color || '#ff4655';
                    ctx.fillRect(this.x + 15, this.y + 35, this.width - 30, this.height - 35);
                }

                ctx.beginPath();
                ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
                ctx.strokeStyle = '#ff4655';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = 'rgba(15,25,35,0.9)';
                ctx.fillRect(this.x, this.y - 12, this.width, 18);
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.strokeRect(this.x, this.y - 12, this.width, 18);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Montserrat, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(this.agentInfo.displayName, this.x + this.width / 2, this.y + 1);

                const hpPercent = Math.max(0, this.hp / this.maxHp);
                ctx.fillStyle = '#000000';
                ctx.fillRect(this.x, this.y - 20, this.width, 4);
                ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : '#ef4444';
                ctx.fillRect(this.x, this.y - 20, this.width * hpPercent, 4);

                ctx.restore();
            }

            checkHit(shotX, shotY) {
                if (this.isDead) return null;

                const headRadius = 20;
                const headCenterX = this.x + this.width / 2;
                const headCenterY = this.y + 32;

                const obsLeft = this.obstacle.x;
                const obsRight = this.obstacle.x + this.obstacle.width;
                const obsTop = this.obstacle.y;
                const obsBottom = this.obstacle.y + this.obstacle.height;

                const shotIsInsideObstacle = (shotX >= obsLeft && shotX <= obsRight && shotY >= obsTop && shotY <= obsBottom);

                if (shotIsInsideObstacle) {
                    createSparkParticles(shotX, shotY, '#94a3b8', 6);
                    return null;
                }

                const distToHead = Math.hypot(shotX - headCenterX, shotY - headCenterY);
                if (distToHead <= headRadius) {
                    return { type: 'HEADSHOT', damage: 160 };
                }

                if (shotX >= this.x + 10 && shotX <= this.x + this.width - 10 && shotY >= this.y + 35 && shotY <= this.y + this.height) {
                    return { type: 'BODY', damage: 40 };
                }

                return null;
            }
        }

        function spawnTargets() {
            targets = [];
            const availableAgents = [...agentsData].sort(() => 0.5 - Math.random()).slice(0, 5);

            for (let i = 0; i < obstacles.length; i++) {
                const obstacle = obstacles[i];
                const agent = availableAgents[i] || { displayName: `ENEMIGO ${i+1}`, color: '#ff4655' };
                targets.push(new Target(i, obstacle, agent));
            }
        }

        // DIBUJO DEL FONDO USANDO EL VIDEO EN MOVIMIENTO CONTINUO


// Forzar la reproducción al iniciar
if (bgVideo) {
    bgVideo.play().catch(e => console.log("Play error:", e));
}
// Motor de partículas para el Banner de Racha
const bannerParticleCanvas = document.getElementById('bannerParticleCanvas');
const bannerCtx = bannerParticleCanvas ? bannerParticleCanvas.getContext('2d') : null;
let bannerParticles = [];
let bannerParticleAnimId = null;

function spawnBannerParticles() {
    if (!bannerParticleCanvas) return;
    bannerParticles = [];
    
    // Generar 35 partículas en tonos Turquesa (#06b6d4), Verde (#22c55e) y Blanco (#ffffff)
    const colors = ['#06b6d4', '#22c55e', '#67e8f9', '#86efac', '#ffffff'];
    const centerX = bannerParticleCanvas.width / 2;
    const centerY = bannerParticleCanvas.height / 2;

    for (let i = 0; i < 35; i++) {
        bannerParticles.push({
            x: centerX + (Math.random() - 0.5) * 100,
            y: centerY + (Math.random() - 0.5) * 50,
            vx: (Math.random() - 0.5) * 3.5, // Velocidad horizontal (dispersión)
            vy: -Math.random() * 2.5 - 0.8,   // Flujo ascendente
            size: Math.random() * 5.5 + 2.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1.0,
            decay: Math.random() * 0.02 + 0.015
        });
    }

    animateBannerParticles();
}

function animateBannerParticles() {
    if (!bannerCtx) return;
    bannerCtx.clearRect(0, 0, bannerParticleCanvas.width, bannerParticleCanvas.height);

    for (let i = bannerParticles.length - 1; i >= 0; i--) {
        const p = bannerParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
            bannerParticles.splice(i, 1);
            continue;
        }

        bannerCtx.save();
        bannerCtx.globalAlpha = p.alpha;
        bannerCtx.fillStyle = p.color;
        bannerCtx.shadowColor = p.color;
        bannerCtx.shadowBlur = 8;
        
        // Dibujar partículas con forma de diamante cibernético
        bannerCtx.beginPath();
        bannerCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        bannerCtx.fill();
        bannerCtx.restore();
    }

    if (bannerParticles.length > 0) {
        bannerParticleAnimId = requestAnimationFrame(animateBannerParticles);
    }
}

function drawBackground() {
    const w = canvas.width;
    const h = canvas.height;

    if (bgVideo && bgVideo.readyState >= 2) {
        const vidW = bgVideo.videoWidth;
        const vidH = bgVideo.videoHeight;

        // Si el video ya cargó sus dimensiones, calculamos el "cover" proporcional
        if (vidW && vidH) {
            const canvasAspect = w / h;
            const videoAspect = vidW / vidH;

            let renderW, renderH, offsetX, offsetY;

            if (canvasAspect > videoAspect) {
                renderW = w;
                renderH = w / videoAspect;
                offsetX = 0;
                offsetY = (h - renderH) / 2;
            } else {
                renderW = h * videoAspect;
                renderH = h;
                offsetX = (w - renderW) / 2;
                offsetY = 0;
            }

            // Dibuja el video centrado y sin deformaciones
            ctx.drawImage(bgVideo, offsetX, offsetY, renderW, renderH);
        } else {
            // Respaldo por si las dimensiones tardan un instante
            ctx.drawImage(bgVideo, 0, 0, w, h);
        }

        // Filtro oscuro para resaltar los elementos del juego
        ctx.fillStyle = 'rgba(11, 19, 27, 0.4)'; 
        ctx.fillRect(0, 0, w, h);
    } else {
        ctx.fillStyle = '#09101d';
        ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = 'rgba(255, 70, 85, 0.25)';
    ctx.font = 'bold 36px Teko, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A SITE - VALORANT MAP', w / 2, 80);
}

function drawObstacles() {
            const time = Date.now() * 0.003;

            obstacles.forEach(obs => {
                ctx.save();
                const x = obs.x;
                const y = obs.y;
                const w = obs.width;
                const h = obs.height;

                // Sombra general en el suelo
                ctx.beginPath();
                ctx.ellipse(x + w / 2, y + h + 4, w / 1.8, 10, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.fill();

                // ==========================================
                // MODELO 1: PILAR DE PIEDRA CIBERNÉTICA (Ancient / Ruinas Tech)
                // ==========================================
                if (obs.type === 'stone_pillar') {
                    // Cuerpo principal con mampostería pesada y grietas de energía
                    ctx.beginPath();
                    ctx.moveTo(x + 10, y);
                    ctx.lineTo(x + w - 5, y + 10);
                    ctx.lineTo(x + w, y + h);
                    ctx.lineTo(x + 5, y + h);
                    ctx.closePath();

                    const stoneGrad = ctx.createLinearGradient(x, y, x + w, y + h);
                    stoneGrad.addColorStop(0, '#1e242d');
                    stoneGrad.addColorStop(0.5, '#2d3748');
                    stoneGrad.addColorStop(1, '#11161d');
                    ctx.fillStyle = stoneGrad;
                    ctx.fill();

                    // Grietas de energía antigua (Líneas naranjas/cian brillando en la piedra)
                    ctx.strokeStyle = '#06b6d4';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#06b6d4';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.moveTo(x + w * 0.4, y + 20);
                    ctx.lineTo(x + w * 0.6, y + h * 0.5);
                    ctx.lineTo(x + w * 0.3, y + h * 0.8);
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Placa de refuerzo superior
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(x + 5, y, w - 10, 12);
                    ctx.strokeStyle = '#06b6d4';
                    ctx.strokeRect(x + 5, y, w - 10, 12);
                }

                // ==========================================
                // MODELO 2: CAJAS DE RADIANITA (Contenedor de plasma)
                // ==========================================
                else if (obs.type === 'radianite_crate') {
                    // Estructura de doble contenedor industrial
                    ctx.fillStyle = '#062818';
                    ctx.fillRect(x, y, w, h);

                    // Marcos metálicos pesados de contención
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(x, y, w, h);

                    // Líneas de peligro diagonales en los bordes
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
                    for (let i = 0; i < w; i += 12) {
                        ctx.fillRect(x + i, y + h - 10, 6, 10);
                    }

                    // Núcleo de Radianite con efecto de plasma flotante
                    const coreY = y + h / 2 + Math.sin(time * 5) * 4;
                    ctx.shadowColor = '#22c55e';
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = '#86efac';
                    ctx.beginPath();
                    ctx.arc(x + w / 2, coreY, 14, 0, Math.PI * 2);
                    ctx.fill();

                    // Anillo de contención magnética giratorio simulado
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(x + w / 2, coreY, 20, time, time + Math.PI);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                // ==========================================
                // MODELO 3: PILAR METÁLICO / SERVIDOR TÁCTICO
                // ==========================================
                else if (obs.type === 'metal_pillar') {
                    // Diseño cilíndrico/recto estilizado con ranuras de servidores
                    ctx.fillStyle = '#111827';
                    ctx.fillRect(x + 4, y, w - 8, h);

                    ctx.strokeStyle = '#374151';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 4, y, w - 8, h);

                    // Tiras de luces LED de estado del servidor (Parpadeantes)
                    for (let ledY = y + 20; ledY < y + h - 20; ledY += 25) {
                        const active = Math.sin(time * 3 + ledY) > 0;
                        ctx.fillStyle = active ? '#38bdf8' : '#0369a1';
                        ctx.shadowColor = active ? '#38bdf8' : 'transparent';
                        ctx.shadowBlur = active ? 8 : 0;
                        ctx.fillRect(x + 12, ledY, w - 24, 6);
                    }
                    ctx.shadowBlur = 0;

                    // Rejillas de ventilación superiores
                    ctx.fillStyle = '#000000';
                    for (let ventY = y + 8; ventY < y + 18; ventY += 4) {
                        ctx.fillRect(x + 10, ventY, w - 20, 2);
                    }
                }

                // ==========================================
                // MODELO 4: TORRE VERTICAL / A HEAVEN (Estructura masiva con antena)
                // ==========================================
                else if (obs.type === 'vertical_tower') {
                    // Base de torre reforzada con vigas en X cruzadas
                    ctx.fillStyle = '#1e1b4b';
                    ctx.fillRect(x, y + 20, w, h - 20);

                    ctx.strokeStyle = '#6366f1';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y + 20, w, h - 20);

                    // Vigas en cruz industriales (Cruce metálico)
                    ctx.beginPath();
                    ctx.moveTo(x, y + 20);
                    ctx.lineTo(x + w, y + h);
                    ctx.moveTo(x + w, y + 20);
                    ctx.lineTo(x, y + h);
                    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Antena / Baliza superior intermitente tipo radar Valorant
                    ctx.fillStyle = '#312e81';
                    ctx.fillRect(x + w / 2 - 4, y, 8, 20);

                    const beaconOn = Math.sin(time * 8) > 0;
                    ctx.fillStyle = beaconOn ? '#ff4655' : '#7f1d1d';
                    ctx.shadowColor = beaconOn ? '#ff4655' : 'transparent';
                    ctx.shadowBlur = beaconOn ? 15 : 0;
                    ctx.beginPath();
                    ctx.arc(x + w / 2, y - 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // ==========================================
                // ETIQUETA HOLOGRÁFICA COMÚN FLOTANTE PARA TODOS
                // ==========================================
                ctx.fillStyle = 'rgba(5, 10, 15, 0.9)';
                ctx.fillRect(x + 4, y - 18, w - 8, 16);
                ctx.strokeStyle = obs.type === 'radianite_crate' ? '#22c55e' : (obs.type === 'stone_pillar' ? '#06b6d4' : '#ff4655');
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 4, y - 18, w - 8, 16);

                ctx.fillStyle = '#ffffff';
                ctx.font = '900 9px Montserrat, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`// ${obs.label.toUpperCase()}`, x + w / 2, y - 6);

                ctx.restore();
            });
        }

        function spawnDeathFinisherAnimation(target, isHeadshot) {
            const centerX = target.x + target.width / 2;
            deathAnimations.push({
                x: centerX,
                y: target.y + target.height / 2,
                radius: 4,
                alpha: 1.0,
                color: isHeadshot ? '#ff4655' : '#d1a55c'
            });

            createSparkParticles(centerX, target.y + target.height / 2, isHeadshot ? '#ff4655' : '#38bdf8', 35);
        }

        function createSparkParticles(x, y, color, count) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 1;
                particles.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.5,
                    size: Math.random() * 3 + 2,
                    color: color, alpha: 1.0
                });
            }
        }

        function triggerKillSound(streakIndex) {
            const customBuffer = customKillAudioBuffers[streakIndex];
            if (customBuffer) {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const source = audioCtx.createBufferSource();
                source.buffer = customBuffer;
                source.connect(audioCtx.destination);
                source.start(0);
            } else if (useSynthSound) {
                playSyntheticKillSound(streakIndex);
            }
        }

        function playSyntheticKillSound(streakIndex) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const now = audioCtx.currentTime;
            const baseFrequencies = [261.63, 329.63, 392.00, 523.25, 659.25];
            const pitch = baseFrequencies[streakIndex] || 440;

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(pitch, now);
            osc.frequency.exponentialRampToValueAtTime(pitch * 1.4, now + 0.15);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.start(now);
            osc.stop(now + 0.35);
        }

function playGunshotSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Si tu MP3 ya fue cargado, se reproduce
    if (gunshotAudioBuffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = gunshotAudioBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
    } else {
        // Respaldo sintético por si el archivo tarda o no existe
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
    }
}

        function playHitByEnemySound() {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const now = audioCtx.currentTime;
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            osc.start(now);
            osc.stop(now + 0.12);
        }

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

let gunshotAudioBuffer = null; // Variable para guardar el audio del disparo

// Función para cargar tu MP3 de disparo local
async function loadGunshotAudio() {
    try {
        const response = await fetch('audio/disparo.mp3');
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
            gunshotAudioBuffer = buffer;
        });
    } catch (e) {
        console.warn("No se pudo cargar el audio de disparo MP3, usando respaldo:", e);
    }
}

// Llama a esta función junto con la carga de los demás sonidos al final de tu script
loadGunshotAudio();

       canvas.addEventListener('mousedown', (e) => {
            if (!gameActive || e.button !== 0) return;
            isMouseDown = true;

            // Disparar la primera bala de inmediato
            shootWeapon();

            // Continuar disparando en bucle mientras mantengas presionado
            if (!autoShootInterval) {
                autoShootInterval = setInterval(() => {
                    if (!isMouseDown || !gameActive) {
                        clearInterval(autoShootInterval);
                        autoShootInterval = null;
                        return;
                    }
                    shootWeapon();
                }, fireRateMs);
            }
        });

        // Detener la ráfaga cuando sueltas el clic o sales del canvas
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            if (autoShootInterval) {
                clearInterval(autoShootInterval);
                autoShootInterval = null;
            }
        });

        canvas.addEventListener('mouseleave', () => {
            isMouseDown = false;
            if (autoShootInterval) {
                clearInterval(autoShootInterval);
                autoShootInterval = null;
            }
        });

        canvas.addEventListener('mouseleave', () => {
            isMouseDown = false;
            if (autoShootInterval) {
                clearInterval(autoShootInterval);
                autoShootInterval = null;
            }
        });
        function shootWeapon() {
            if (!gameActive) return;

            if (currentAmmo <= 0) {
                reloadPrompt.classList.remove('hidden');
                isMouseDown = false;
                if (autoShootInterval) {
                    clearInterval(autoShootInterval);
                    autoShootInterval = null;
                }
                return;
            }

            if (!startTime) startTimer();

            currentAmmo--;
            totalShots++;
            updateAmmoHUD();
            updateAccuracyHUD();
            playGunshotSound(); // Reproduce tu MP3 personalizado en cada bala

            // Activar destello de disparo en pantalla (Muzzle Flash)
            muzzleFlashTimer = 3; 

            recoilOffset.y = -8;
            crosshairBloom = 12;
            setTimeout(() => recoilOffset.y = 0, 60);

            gameWrapper.classList.remove('shake');
            void gameWrapper.offsetWidth;
            gameWrapper.classList.add('shake');

            tracers.push({
                x1: canvas.width * 0.75, y1: canvas.height - 40,
                x2: mouse.x, y2: mouse.y + recoilOffset.y, alpha: 1.0
            });

            // Comprobar si el disparo impacta contra algún obstáculo
            obstacles.forEach(obs => {
                if (mouse.x >= obs.x && mouse.x <= obs.x + obs.width && mouse.y >= obs.y && mouse.y <= obs.y + obs.height) {
                    createSparkParticles(mouse.x, mouse.y, obs.type === 'radianite_crate' ? '#22c55e' : '#38bdf8', 8);
                }
            });

            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                const hitResult = target.checkHit(mouse.x, mouse.y);

                if (hitResult) {
                    hitsCount++;
                    target.hp -= hitResult.damage;
                    target.state = 'HIDING';
                    target.targetX = target.hiddenX;

                    const isHeadshot = hitResult.type === 'HEADSHOT';
                    if (isHeadshot) headshotsCount++;
                    hudHS.innerText = headshotsCount;

                    damageNumbers.push({
                        text: `-${hitResult.damage}`,
                        x: mouse.x, y: mouse.y - 10,
                        color: isHeadshot ? '#ff4655' : '#ffffff',
                        size: isHeadshot ? 24 : 16, alpha: 1.0
                    });

                    if (target.hp <= 0 && !target.isDead) {
                        target.isDead = true;
                        killsCount++;
                        hudKills.innerText = killsCount;

                        spawnDeathFinisherAnimation(target, isHeadshot);
                        triggerKillSound(killsCount - 1);
                        addKillFeedEntry(target.agentInfo.displayName, isHeadshot);
                        showKillBanner(killsCount);

                     if (killsCount === 5) {
                        showSubtleAceOverlay();
                        gameActive = false;
                        stopTimer();
                        // Salta directo a la pantalla de victoria con sus estadísticas y la Spike desactivada
                        setTimeout(startDefusePhase(), 1500);
                    }
                    }
                    break;
                }
            }
            updateAccuracyHUD();
        }

        function showSubtleAceOverlay() {
            aceSubtleOverlay.classList.remove('hidden');
            setTimeout(() => {
                aceSubtleOverlay.classList.remove('scale-95', 'opacity-0');
                aceSubtleOverlay.classList.add('scale-100', 'opacity-100');
            }, 10);

            setTimeout(() => {
                aceSubtleOverlay.classList.remove('scale-100', 'opacity-100');
                aceSubtleOverlay.classList.add('scale-95', 'opacity-0');
                setTimeout(() => aceSubtleOverlay.classList.add('hidden'), 300);
            }, 2000);
        }
// Instancia del audio local de derrota/muerte
const soundDefeat = new Audio('audio/defeat.mp3');

function triggerGameOver() {
    gameActive = false;
    stopTimer();
    
    // Reproducir el audio local de derrota asegurando que empiece limpio
    soundDefeat.currentTime = 0;
    soundDefeat.volume = 1.0;
    soundDefeat.play().catch(e => {
        console.log("Audio de derrota bloqueado por política del navegador:", e);
    });

    // Mostrar el modal con la cinta horizontal de "HAS MUERTO"
    const gameOverModal = document.getElementById('gameOverModal');
    if (gameOverModal) {
        gameOverModal.classList.remove('hidden');
    }
}

        function addKillFeedEntry(enemyName, isHeadshot) {
            const feedItem = document.createElement('div');
            feedItem.className = `kill-feed-item flex items-center space-x-2 bg-black/85 border-r-4 border-[#ff4655] px-3 py-1.5 rounded-l text-xs font-mono backdrop-blur-md shadow-lg`;
            feedItem.innerHTML = `
                <span class="font-bold text-white uppercase">${PLAYER_NAME}</span>
                <div class="flex items-center text-[#ff4655] px-1">
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M21 7l-5 2H3v2h2v3h2v-3h7.5l2 4H21V7z"/></svg>
                    ${isHeadshot ? '<span class="text-[11px] ml-1 font-bold text-red-500">🎯</span>' : ''}
                </div>
                <span class="font-semibold text-red-400 uppercase">${enemyName}</span>
            `;
            killFeed.appendChild(feedItem);
            if (killFeed.children.length > 5) killFeed.removeChild(killFeed.firstChild);
        }

function showKillBanner(streakLevel) {
            const levelData = KILL_LEVELS[streakLevel - 1] || KILL_LEVELS[0];
            bannerText.innerText = levelData.title;

            
            // Aquí aseguramos que solo cambie el color del borde exterior del contenedor circular
            bannerIconBox.style.borderColor = levelData.color;
            
            killBannerContainer.classList.remove('hidden');
            spawnBannerParticles();
            clearTimeout(bannerTimeout);
            bannerTimeout = setTimeout(() => {
                killBannerContainer.classList.add('hidden');
            }, 2400);
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                if (!gameActive && playerHealth <= 0) {
                    initGame();
                } else {
                    reloadWeapon();
                }
            }
        });

        function reloadWeapon() {
            if (reserveAmmo <= 0 || currentAmmo === MAX_AMMO) return;
            const needed = MAX_AMMO - currentAmmo;
            const amount = Math.min(needed, reserveAmmo);
            currentAmmo += amount;
            reserveAmmo -= amount;
            updateAmmoHUD();
            reloadPrompt.classList.add('hidden');
        }

        function updateAmmoHUD() {
            ammoCurrent.innerText = currentAmmo;
            ammoReserve.innerText = reserveAmmo;
        }

        function updateAccuracyHUD() {
            if (totalShots === 0) return;
            hudAccuracy.innerText = `${Math.round((hitsCount / totalShots) * 100)}%`;
        }

        function startTimer() {
            startTime = Date.now();
            timerInterval = setInterval(() => {
                hudTimer.innerText = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
            }, 100);
        }

        function stopTimer() {
            clearInterval(timerInterval);
        }

        // Instancia específica para el sonido de 5 kills
const sound5Kills = new Audio('audio/valorant-5-kills.mp3');

// Función que se ejecuta cuando haces la última baja de la ronda
function triggerAceVictory() {
    gameActive = false; // Detener la jugabilidad principal del aim trainer
    stopTimer();

    // 1. Reproducir el sonido completo de las 5 Kills (ACE)
    sound5Kills.currentTime = 0;
    sound5Kills.volume = 1.0;
    
    sound5Kills.play().catch(err => {
        console.warn("Reproducción de 5-kills bloqueada por el navegador:", err);
        // Si el navegador lo bloquea, pasamos directo a la Spike por seguridad
        startDefusePhase();
    });

    // 2. ESCUCHAR CUÁNDO TERMINA EL AUDIO DE LAS 5 KILLS
    sound5Kills.onended = () => {
        // Justo al terminar el audio del ACE, arranca la fase de la Spike
        startDefusePhase();
    };
}
// Instancia del audio local de victoria
const soundVictory = new Audio('audio/victory.mp3');

function showVictoryModal() {
    // Reproducir tu archivo victory.mp3 local
    soundVictory.currentTime = 0;
    soundVictory.volume = 1.0;
    soundVictory.play().catch(e => {
        console.log("Audio de victoria bloqueado por el navegador:", e);
    });

    const modal = document.getElementById('victoryModal');
    if (!modal) return;

    // Actualizar los textos de estadísticas
    const elTime = document.getElementById('finalTime');
    const elAcc = document.getElementById('finalAccuracy');
    const elHS = document.getElementById('finalHS');

    if (elTime && typeof startTime !== 'undefined') {
        elTime.innerText = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
    }
    if (elAcc && typeof hitsCount !== 'undefined' && typeof totalShots !== 'undefined') {
        elAcc.innerText = `${Math.round((hitsCount / Math.max(totalShots, 1)) * 100)}%`;
    }
    if (elHS && typeof headshotsCount !== 'undefined') {
        elHS.innerText = headshotsCount;
    }

    // Mostrar el modal con la cinta de victoria
    modal.classList.remove('hidden');
}
        function drawRadar() {
            if (!radarCtx) return;
            const rw = radarCanvas.width;
            const rh = radarCanvas.height;
            radarCtx.clearRect(0, 0, rw, rh);
            radarCtx.fillStyle = '#0b131b';
            radarCtx.fillRect(0, 0, rw, rh);

            radarCtx.fillStyle = '#22c55e';
            radarCtx.beginPath();
            radarCtx.arc(rw / 2, rh - 8, 4, 0, Math.PI * 2);
            radarCtx.fill();

            targets.forEach(t => {
                if (t.isDead) return;
                const rx = (t.x / canvas.width) * rw;
                const ry = (t.y / canvas.height) * rh;
                radarCtx.fillStyle = t.state === 'PEEKING' ? '#ff4655' : '#eab308';
                radarCtx.beginPath();
                radarCtx.arc(rx, ry, 3.5, 0, Math.PI * 2);
                radarCtx.fill();
            });
        }

        function initGame() {
            killsCount = 0;
            headshotsCount = 0;
            totalShots = 0;
            hitsCount = 0;
            currentAmmo = MAX_AMMO;
            reserveAmmo = 75;
            playerHealth = 100;
            playerShield = 50;
            startTime = null;
            gameActive = true;

            clearInterval(timerInterval);
            hudTimer.innerText = '0.0s';
            hudKills.innerText = '0';
            hudHS.innerText = '0';
            hudAccuracy.innerText = '100%';
            document.getElementById('shieldText').innerText = 'ESCUDO 50';
            document.getElementById('healthText').innerText = 'SALUD 100';
            document.getElementById('shieldBar').style.width = '100%';
            document.getElementById('healthBar').style.width = '100%';

            updateAmmoHUD();
            killFeed.innerHTML = '';
            killBannerContainer.classList.add('hidden');
            victoryModal.classList.add('hidden');
            gameOverModal.classList.add('hidden');
            reloadPrompt.classList.add('hidden');

            damageNumbers = [];
            tracers = [];
            particles = [];
            deathAnimations = [];

            spawnTargets();
        }

        function gameLoop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drawBackground();

            targets.forEach(t => {
                t.update();
                t.draw();
            });

            drawObstacles();

            for (let i = deathAnimations.length - 1; i >= 0; i--) {
                const da = deathAnimations[i];
                ctx.save();
                ctx.beginPath();
                ctx.arc(da.x, da.y, da.radius, 0, Math.PI * 2);
                ctx.fillStyle = da.color;
                ctx.globalAlpha = da.alpha;
                ctx.fill();
                da.radius += 2.5;
                da.alpha -= 0.03;
                if (da.alpha <= 0) deathAnimations.splice(i, 1);
                ctx.restore();
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fillRect(p.x, p.y, p.size, p.size);
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.035;
                if (p.alpha <= 0) particles.splice(i, 1);
            }
            ctx.globalAlpha = 1.0;

            for (let i = tracers.length - 1; i >= 0; i--) {
                const tr = tracers[i];
                ctx.strokeStyle = `rgba(255, 215, 0, ${tr.alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tr.x1, tr.y1);
                ctx.lineTo(tr.x2, tr.y2);
                ctx.stroke();
                tr.alpha -= 0.12;
                if (tr.alpha <= 0) tracers.splice(i, 1);
            }

            for (let i = damageNumbers.length - 1; i >= 0; i--) {
                const dn = damageNumbers[i];
                ctx.fillStyle = dn.color;
                ctx.font = `bold ${dn.size}px Montserrat, sans-serif`;
                ctx.fillText(dn.text, dn.x, dn.y);
                dn.y -= 1.2;
                dn.alpha -= 0.025;
                if (dn.alpha <= 0) damageNumbers.splice(i, 1);
            }

            drawRadar();

            // Crosshair
            ctx.save();
            const cx = mouse.x;
            const cy = mouse.y + recoilOffset.y;
            if (crosshairBloom > 0) crosshairBloom -= 0.6;
            const b = Math.max(0, crosshairBloom);

            ctx.fillStyle = '#ff4655';
            ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(cx - 9 - b, cy - 1, 5, 2);
            ctx.fillRect(cx + 4 + b, cy - 1, 5, 2);
            ctx.fillRect(cx - 1, cy - 9 - b, 2, 5);
            ctx.fillRect(cx - 1, cy + 4 + b, 2, 5);
            ctx.restore();

            requestAnimationFrame(gameLoop);
        }

     

        document.getElementById('btnRestart').addEventListener('click', initGame);
        document.getElementById('btnRestartVictory').addEventListener('click', initGame);
        document.getElementById('btnRestartGameOver').addEventListener('click', initGame);

        fetchAgents();
        requestAnimationFrame(gameLoop);

        async function loadDefaultAudio(index, filename) {
            try {
                const response = await fetch(filename);
                if (!response.ok) return;
                const arrayBuffer = await response.arrayBuffer();
                audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
                    customKillAudioBuffers[index] = buffer;
                });
            } catch (e) {
                console.warn(`No se pudo cargar el archivo ${filename}:`, e);
            }
        }

        function loadAllKillSounds() {
            const files = [
                'audio/valorant-1-kill.mp3',
                'audio/valorant-2-kills.mp3',
                'audio/valorant-3-kills.mp3',
                'audio/valorant-4-kills.mp3',
                'audio/valorant-5-kills.mp3'
            ];

            files.forEach((file, index) => {
                loadDefaultAudio(index, file);
            });
        }

        loadAllKillSounds();







 
        // =======================================================
// LÓGICA Y RENDERIZADO 3D DE LA SPIKE + AUDIO LOCAL
// =======================================================
const spikeCanvas = document.getElementById('spikeCanvas');
const spikeCtx = spikeCanvas ? spikeCanvas.getContext('2d') : null;

let isDefusing = false;
let defuseProgress = 0; // 0 a 100%
let defuseInterval = null;
let spikeAnimId = null;

const DEFUSE_TIME_MS = 6000; 

const defuseOverlay = document.getElementById('defuseOverlay');
const defusePercent = document.getElementById('defusePercent');
const defuseStatusText = document.getElementById('defuseStatusText');
const btnDefuseSpike = document.getElementById('btnDefuseSpike');
const spikeAmbientGlow = document.getElementById('spikeAmbientGlow');

// Instancias de Audio HTML5 para archivos locales
const soundSpikePlanted = new Audio('audio/spike-planted.mp3');
const soundDefuse = new Audio('audio/spike-defuse.mp3');
soundDefuse.loop = true; // Se reproduce en bucle mientras se mantiene desactivando

let spikeParticles = [];
let shockwaves = [];


function startDefusePhase() {
    defuseProgress = 0;
    isDefusing = false;
    defusePercent.innerText = "0%";
    defuseStatusText.innerText = "MANTÉN PRESIONADO [4]";
    
    // 1. Reproducir primero el sonido completo de 5 kills
    if (typeof sound5Kills !== 'undefined') {
        sound5Kills.currentTime = 0;
        sound5Kills.volume = 1.0;
        sound5Kills.play().catch(err => {
            console.warn("Reproducción de 5-kills bloqueada:", err);
        });

        // 2. ESPERAR A QUE TERMINE EL AUDIO DE LAS 5 KILLS para mostrar el defuse y sonar la spike
        sound5Kills.onended = () => {
            // Mostrar el overlay de la Spike solo cuando acaban las 5 kills
            defuseOverlay.classList.remove('hidden');

            // Reproducción segura de la Spike plantada
            setTimeout(() => {
                soundSpikePlanted.currentTime = 0;
                soundSpikePlanted.play().catch(err => {
                    console.warn("Reproducción de Spike evitada por el navegador:", err);
                });
            }, 100);

            cancelAnimationFrame(spikeAnimId);
            animateSpike3DAdvanced();
        };
    } else {
        // Fallback por si acaso sound5Kills no está definido
        defuseOverlay.classList.remove('hidden');
        setTimeout(() => {
            soundSpikePlanted.currentTime = 0;
            soundSpikePlanted.play().catch(err => {});
        }, 100);
        cancelAnimationFrame(spikeAnimId);
        animateSpike3DAdvanced();
    }
}

function updateDefuseUI() {
    defusePercent.innerText = `${Math.floor(defuseProgress)}%`;

    if (defuseProgress >= 50) {
        defuseStatusText.innerText = "CASILLA ASEGURADA • CONTINÚA";
        defuseStatusText.className = "text-[10px] font-mono tracking-widest text-green-400 uppercase mt-1";
        spikeAmbientGlow.className = "absolute inset-0 bg-gradient-radial from-green-600/35 via-transparent to-transparent pointer-events-none transition-all duration-500";
    } else {
        defuseStatusText.innerText = "DESACTIVANDO SPIKE...";
        defuseStatusText.className = "text-[10px] font-mono tracking-widest text-cyan-400 uppercase mt-1";
        spikeAmbientGlow.className = "absolute inset-0 bg-gradient-radial from-cyan-600/30 via-transparent to-transparent pointer-events-none transition-all duration-500";
    }

    // Generar partículas tridimensionales intensas al desactivar
    if (isDefusing) {
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 80 + 10;
            spikeParticles.push({
                x: 160 + Math.cos(angle) * dist,
                y: 160 + Math.sin(angle) * dist,
                z: (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 3.5 - 1.5,
                vz: (Math.random() - 0.5) * 2,
                size: Math.random() * 3.5 + 1.5,
                color: defuseProgress >= 50 ? '#22c55e' : '#06b6d4',
                alpha: 1.0
            });
        }
    }
}

function startDefusing() {
    if (isDefusing || defuseProgress >= 100) return;
    isDefusing = true;

    // Reproducir audio local de defuse en bucle
    soundDefuse.currentTime = 0;
    soundDefuse.play().catch(e => console.log("Defuse audio play prevented:", e));

    // Generar onda de choque visual al iniciar
    shockwaves.push({ radius: 20, alpha: 0.8, color: '#06b6d4' });

    defuseInterval = setInterval(() => {
        defuseProgress += (100 / (DEFUSE_TIME_MS / 30));
        updateDefuseUI();

        if (defuseProgress >= 100) {
            defuseProgress = 100;
            stopDefusing();
            completeDefuse();
        }
    }, 30);
}

// Al soltar el botón o la tecla '4', se detiene y se reinicia el progreso a 0%
function stopDefusing() {
    if (!isDefusing) return; // Si ya estaba detenido, no hace nada
    isDefusing = false;
    
    // Pausar el audio local de defuse
    soundDefuse.pause();
    soundDefuse.currentTime = 0;

    // Limpiar el bucle de progreso
    if (defuseInterval) {
        clearInterval(defuseInterval);
        defuseInterval = null;
    }

    // REINICIAR EL PROGRESO A CERO
    defuseProgress = 0;
    updateDefuseUI();
    
    // Feedback visual opcional de que se canceló/reinició
    if (defuseStatusText) {
        defuseStatusText.innerText = "¡INTERRUMPIDO! REINICIADO";
        defuseStatusText.className = "text-[10px] font-mono tracking-widest text-red-400 uppercase mt-1";
    }
}

function completeDefuse() {
    soundDefuse.pause();
    cancelAnimationFrame(spikeAnimId);
    defuseOverlay.classList.add('hidden');
    
    setTimeout(() => {
        showVictoryModal();
    }, 500);
}

// Sonido sintético de respaldo para el éxito de desactivación
function playDefuseSuccessSynth() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.5);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
}


// Motor de Renderizado 3D Avanzado en Canvas
function animateSpike3DAdvanced() {
    if (!spikeCtx) return;
    const time = Date.now() * 0.003;
    const cx = 160;
    const cy = 160;

    spikeCtx.clearRect(0, 0, 320, 320);

    const isGreen = defuseProgress >= 50;
    const themeColor = isGreen ? '#22c55e' : (isDefusing ? '#06b6d4' : '#ef4444');
    const themeGlow = isGreen ? 'rgba(34, 197, 94, 0.9)' : (isDefusing ? 'rgba(6, 182, 212, 0.9)' : 'rgba(239, 68, 68, 0.9)');

    // 1. Dibujar ondas de choque expansivas
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 2.5;
        sw.alpha -= 0.02;

        if (sw.alpha <= 0) {
            shockwaves.splice(i, 1);
            continue;
        }

        spikeCtx.save();
        spikeCtx.beginPath();
        spikeCtx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
        spikeCtx.strokeStyle = sw.color;
        spikeCtx.globalAlpha = sw.alpha;
        spikeCtx.lineWidth = 2.5;
        spikeCtx.stroke();
        spikeCtx.restore();
    }

    // 2. Anillo de progreso circular 3D exterior con brillo volumétrico
    const radius = 125;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (defuseProgress / 100));

    spikeCtx.beginPath();
    spikeCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    spikeCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    spikeCtx.lineWidth = 10;
    spikeCtx.stroke();

    spikeCtx.beginPath();
    spikeCtx.arc(cx, cy, radius, startAngle, endAngle);
    spikeCtx.strokeStyle = themeColor;
    spikeCtx.shadowColor = themeColor;
    spikeCtx.shadowBlur = 20;
    spikeCtx.lineWidth = 10;
    spikeCtx.lineCap = 'round';
    spikeCtx.stroke();
    spikeCtx.shadowBlur = 0;

    // 3. Estructura Isométrica 3D de la base de la Spike
    spikeCtx.save();
    spikeCtx.translate(cx, cy + 18);
    spikeCtx.scale(1, 0.45); // Perspectiva 3D inclinada al suelo
    
    // Sombra base
    spikeCtx.beginPath();
    spikeCtx.arc(0, 0, 80, 0, Math.PI * 2);
    spikeCtx.fillStyle = 'rgba(5, 10, 20, 0.9)';
    spikeCtx.fill();
    spikeCtx.strokeStyle = themeColor;
    spikeCtx.lineWidth = 4;
    spikeCtx.stroke();
    spikeCtx.restore();

    // 4. Núcleo Piramidal Central con Rotación 3D en Capas
    spikeCtx.save();
    spikeCtx.translate(cx, cy);
    
    const rot = time * (isDefusing ? 3.0 : 1.2);
    const pulse3D = Math.sin(time * 6) * 5 + 75;

    spikeCtx.rotate(rot);

    // Paneles exteriores con gradiente metálico cibernético
    spikeCtx.shadowColor = themeGlow;
    spikeCtx.shadowBlur = 30;
    spikeCtx.fillStyle = '#070f1a';
    spikeCtx.fillRect(-pulse3D/2, -pulse3D/2, pulse3D, pulse3D);
    
    spikeCtx.strokeStyle = themeColor;
    spikeCtx.lineWidth = 3.5;
    spikeCtx.strokeRect(-pulse3D/2, -pulse3D/2, pulse3D, pulse3D);

    // Gemas de Radianita internas rotando al revés
    spikeCtx.rotate(-rot * 2);
    spikeCtx.fillStyle = themeColor;
    spikeCtx.fillRect(-18, -18, 36, 36);
    spikeCtx.shadowBlur = 0;
    spikeCtx.restore();

    // 5. Anillos de energía orbitales flotantes en 3D
    spikeCtx.save();
    spikeCtx.translate(cx, cy);
    spikeCtx.rotate(-time * 1.8);
    spikeCtx.scale(1, 0.35); // Perspectiva de órbita inclinada
    spikeCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    spikeCtx.lineWidth = 2.5;
    spikeCtx.beginPath();
    spikeCtx.arc(0, 0, 95, 0, Math.PI * 2);
    spikeCtx.stroke();
    spikeCtx.restore();

    // 6. Sistema Avanzado de Partículas 3D con dispersión
    for (let i = spikeParticles.length - 1; i >= 0; i--) {
        const p = spikeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;

        if (p.alpha <= 0) {
            spikeParticles.splice(i, 1);
            continue;
        }

        spikeCtx.save();
        spikeCtx.globalAlpha = p.alpha;
        spikeCtx.fillStyle = p.color;
        spikeCtx.shadowColor = p.color;
        spikeCtx.shadowBlur = 10;
        spikeCtx.fillRect(p.x, p.y, p.size * 2, p.size);
        spikeCtx.restore();
    }

    spikeAnimId = requestAnimationFrame(animateSpike3DAdvanced);
}

// Eventos de control (Botón + Tecla 4)
if (btnDefuseSpike) {
    btnDefuseSpike.addEventListener('mousedown', startDefusing);
    btnDefuseSpike.addEventListener('mouseup', stopDefusing);
    btnDefuseSpike.addEventListener('mouseleave', stopDefusing);
}

window.addEventListener('keydown', (e) => {
    if (e.key === '4' && !defuseOverlay.classList.contains('hidden')) {
        startDefusing();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === '4') {
        stopDefusing();
    }
});