   // State variables
        let agents = [];
        let currentIndex = 0;
        let lockedAgentId = null;

        // Custom Custom/Personalized Agent Data
     // Custom Custom/Localized Agent Data
        const customAgent = {
            uuid: 'custom-partner-agent-uuid',
            displayName: 'Alonso',
            description: 'El mejor compañero de equipo dentro y fuera del juego. Siempre listo para protegerte, sacarte una sonrisa y jugar juntos en el mismo equipo por siempre.',
            isCustom: true,
            backgroundGradientColors: ['d1a55c', 'ff4655'],
            fullPortrait: 'img/alonso.png', // Tu imagen principal sin fondo ni letras
            displayIcon: 'img/alonso-logo.png',     // Icono del agente
            role: {
                displayName: 'VINCULO',
                displayIcon: 'img/clase.png' // Icono del rol (corazón)
            },
            abilities: [
                {
                    slot: 'C',
                    displayName: 'C - COMPAÑERISMO',
                    description: 'EQUIPA lealtad incondicional. DISPARA para asegurar risas y protección en todas las partidas que jueguen juntos.',
                    displayIcon: 'img/1hb.png'
                },
                {
                    slot: 'Q',
                    displayName: 'Q - RISAS INVALUABLES',
                    description: 'DISPARA una ráfaga de buen humor que elimina instantáneamente el estrés de cualquier mal día.',
                    displayIcon: 'img/2hb.png'
                },
                {
                    slot: 'E',
                    displayName: 'E - APOYO INCONDICIONAL',
                    description: 'OTORGA un escudo protector y lealtad absoluta en cualquier momento difícil.',
                    displayIcon: 'img/3hb.png'
                },
                {
                    slot: 'X',
                    displayName: 'X - ULT: AMOR ETERNO',
                    description: 'HABILIDAD DEFINITIVA. Darte mucho amor, cariño y jugar en el mismo equipo por siempre. ❤️',
                    displayIcon: 'img/4hb.png'
                }
            ]
        };

        // Audio Context Synthesizer (No external audio files needed)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playSound(type) {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (type === 'hover') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'click') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'lockin') {
                // Dramatic synth impact for LOCK IN
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(523.25, now); // C5
                osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
                osc2.frequency.setValueAtTime(783.99, now + 0.2); // G5
                gain2.gain.setValueAtTime(0.2, now);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

                osc.start(now);
                osc2.start(now);
                osc.stop(now + 0.6);
                osc2.stop(now + 0.5);
            }
        }

        // DOM Elements
        const loader = document.getElementById('loader');
        const agentFullImg = document.getElementById('agentFullImg');
        const watermarkText = document.getElementById('watermarkText');
        const infoPanel = document.getElementById('infoPanel');
        const roleIcon = document.getElementById('roleIcon');
        const roleName = document.getElementById('roleName');
        const agentName = document.getElementById('agentName');
        const agentDesc = document.getElementById('agentDesc');
        const abilitiesTabs = document.getElementById('abilitiesTabs');
        const abilityName = document.getElementById('abilityName');
        const abilitySlot = document.getElementById('abilitySlot');
        const abilityDesc = document.getElementById('abilityDesc');
        const carousel = document.getElementById('carousel');
        const agentCounter = document.getElementById('agentCounter');
        const bgGradient = document.getElementById('bgGradient');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnLockIn = document.getElementById('btnLockIn');
        const lockInText = document.getElementById('lockInText');
        const lockedBanner = document.getElementById('lockedBanner');
        const statusText = document.getElementById('statusText');
        const statusBadge = document.getElementById('statusBadge');
        const lockinFlash = document.getElementById('lockinFlash');

        /**
         * Clean XML/HTML tags from Valorant API strings
         */
        function cleanDescriptionText(text) {
            if (!text) return '';
            return text.replace(/<[^>]*>/g, '');
        }

        /**
         * Fetch Playable Agent Data from VALORANT API
         */
        /**
         * Fetch Playable Agent Data from VALORANT API
         */
        async function fetchAgents() {
            try {
                const response = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=es-ES');
                const data = await response.json();
                
                // 1. Ordenar los agentes oficiales alfabéticamente
                const apiAgents = data.data.sort((a, b) => a.displayName.localeCompare(b.displayName));

                // 2. Insertar al agente personalizado (Alonso) exactamente en la posición 11 (Índice 10)
                // Si hay menos de 10 agentes, se colocará al final.
                agents = [...apiAgents];
                agents.splice(10, 0, customAgent);

                if (agents.length > 0) {
                    loader.classList.add('hidden');
                    agentFullImg.classList.remove('hidden');
                    infoPanel.classList.remove('opacity-0', 'translate-x-6');
                    
                    renderCarousel();
                    selectAgent(0);
                }
            } catch (error) {
                console.error('Error fetching VALORANT agents:', error);
                // Fallback si falla la API
                agents = [customAgent];
                loader.classList.add('hidden');
                agentFullImg.classList.remove('hidden');
                infoPanel.classList.remove('opacity-0', 'translate-x-6');
                renderCarousel();
                selectAgent(0);
            }
        }

        /**
         * Render lower thumbnail carousel
         */
        function renderCarousel() {
            carousel.innerHTML = '';
            agents.forEach((agent, index) => {
                const thumb = document.createElement('div');
                thumb.className = `min-w-[68px] h-[68px] bg-[#1a2733] border-2 border-white/20 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 flex-shrink-0 relative group`;
                thumb.setAttribute('data-index', index);

                thumb.innerHTML = `
                    <img src="${agent.displayIcon}" alt="${agent.displayName}" class="w-full h-full object-cover group-hover:scale-110 transition duration-300">
                    <div class="absolute inset-0 bg-black/40 group-hover:bg-transparent transition"></div>
                `;

                thumb.addEventListener('mouseenter', () => playSound('hover'));
                thumb.addEventListener('click', () => {
                    playSound('click');
                    selectAgent(index);
                });
                carousel.appendChild(thumb);
            });
        }

        /**
         * Select and Display Agent Data
         */
        function selectAgent(index) {
            currentIndex = index;
            const agent = agents[currentIndex];

            // Update Watermark & Agent Name
            watermarkText.innerText = agent.displayName;
            agentName.innerText = agent.displayName;
            agentDesc.innerText = agent.description;

            // Background Gradient styling using agent colors
            if (agent.backgroundGradientColors && agent.backgroundGradientColors.length >= 2) {
                const c1 = `#${agent.backgroundGradientColors[0]}`;
                const c2 = `#${agent.backgroundGradientColors[1]}`;
                bgGradient.style.background = `radial-gradient(circle at 35% 50%, ${c1} 0%, ${c2} 75%, transparent 100%)`;
            } else {
                bgGradient.style.background = 'radial-gradient(circle at 35% 50%, #ff4655 0%, transparent 75%)';
            }

            // Update Full Art Image
            agentFullImg.src = agent.fullPortrait || agent.displayIcon;

            // Update Role Info
            if (agent.role) {
                roleIcon.src = agent.role.displayIcon;
                roleName.innerText = agent.role.displayName;
            } else {
                roleIcon.src = '';
                roleName.innerText = 'AGENTE';
            }

            // Update Lock In Button & Banner State
            updateLockState();

            // Update Carousel Active Styling & Scroll Position
            const thumbs = carousel.children;
            Array.from(thumbs).forEach((t, i) => {
                t.classList.remove('agent-thumb-active', 'agent-thumb-locked');
                if (agents[i].uuid === lockedAgentId) {
                    t.classList.add('agent-thumb-locked');
                }
                if (i === currentIndex) {
                    t.classList.add('agent-thumb-active');
                    t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            });

            // Update Counter
            agentCounter.innerText = `${currentIndex + 1} / ${agents.length}`;

            // Render Abilities Tabs
            renderAbilities(agent.abilities);
        }

        /**
         * Render Ability Tabs for the active Agent
         */
        function renderAbilities(abilities) {
            abilitiesTabs.innerHTML = '';
            
            // Standard Valorant slot mapping
            const slotKeys = ['C', 'Q', 'E', 'X', 'P'];

            abilities.forEach((ability, idx) => {
                const btn = document.createElement('button');
                const slotName = ability.slot === 'Passive' ? 'P' : (slotKeys[idx] || ability.slot);
                
                btn.className = `flex flex-col items-center justify-center p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 transition group relative`;
                
                const iconSrc = ability.displayIcon 
                    ? ability.displayIcon 
                    : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';

                btn.innerHTML = `
                   
                    <span class="text-[10px] font-bold text-gray-400 group-hover:text-white">${slotName}</span>
                `;

                btn.addEventListener('mouseenter', () => playSound('hover'));
                btn.addEventListener('click', () => {
                    playSound('click');
                    selectAbility(ability, slotName, btn);
                });
                abilitiesTabs.appendChild(btn);

                // Default select the first ability
                if (idx === 0) {
                    selectAbility(ability, slotName, btn);
                }
            });
        }

        /**
         * Highlight and Display Details for Selected Ability
         */
        function selectAbility(ability, slotName, btnElement) {
            Array.from(abilitiesTabs.children).forEach(b => {
                b.classList.remove('border-[#ff4655]', 'bg-[#ff4655]/20');
                b.classList.add('border-white/10', 'bg-white/5');
            });
            btnElement.classList.remove('border-white/10', 'bg-white/5');
            btnElement.classList.add('border-[#ff4655]', 'bg-[#ff4655]/20');

            abilityName.innerText = ability.displayName;
            abilitySlot.innerText = `TECLA [ ${slotName} ]`;
            abilityDesc.innerText = cleanDescriptionText(ability.description);
        }

        /**
         * Update UI according to whether current agent is locked in
         */
/**
         * Update UI according to whether current agent is locked in
         */
        function updateLockState() {
            const currentAgent = agents[currentIndex];
            const isLocked = lockedAgentId === currentAgent.uuid;

            if (isLocked) {
                btnLockIn.disabled = true;
                lockInText.innerText = 'CONFIRMADO';
                lockedBanner.classList.remove('hidden');
                lockedBanner.classList.add('flex');
                statusBadge.className = 'px-4 py-1.5 bg-[#d1a55c]/20 border border-[#d1a55c] rounded font-mono text-xs text-[#d1a55c] flex items-center space-x-2';
                statusText.innerText = `AGENTE ELEGIDO: ${currentAgent.displayName.toUpperCase()}`;
            } else {
                // VERIFICAR SI ES EL AGENTE PERMITIDO (EL NÚMERO 11 / ALONSO)
                if (!currentAgent.isCustom) {
                    btnLockIn.disabled = true;
                    lockInText.innerText = 'AGENTE NO DISPONIBLE';
                    lockedBanner.classList.add('hidden');
                    lockedBanner.classList.remove('flex');
                    statusBadge.className = 'px-4 py-1.5 bg-red-950/40 border border-red-600/50 rounded font-mono text-xs text-red-400 flex items-center space-x-2';
                    statusText.innerText = 'ACCESO DENEGADO: FUERA DE PROTOCOLO';
                } else {
                    btnLockIn.disabled = false;
                    lockInText.innerText = 'CONFIRMA';
                    lockedBanner.classList.add('hidden');
                    lockedBanner.classList.remove('flex');
                    statusBadge.className = 'px-4 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-xs text-gray-300 flex items-center space-x-2';
                    statusText.innerText = 'FASE DE SELECCIÓN';
                }
            }
        }


        /**
         * LOCK IN Button Event
         */
            // Referencia al elemento de audio del HTML
            const lockinSound = document.getElementById('lockinSound');

            /**
 * LOCK IN Button Event
 */
/**
         * LOCK IN Button Event (Contador 5s -> Pantalla de carga con retrato de 5s -> aim.html)
         */
        btnLockIn.addEventListener('click', () => {
            const currentAgent = agents[currentIndex];
            lockedAgentId = currentAgent.uuid;

            // 1. Reproducir audio de lock-in limpio
            const lockinSound = new Audio('audio/lock.mp3');
            lockinSound.volume = 0.1;
            lockinSound.play().catch(error => {
                console.log("El navegador bloqueó el audio de lock-in:", error);
            });

            // 2. Efecto visual de flash
            lockinFlash.classList.remove('animate-lockin-flash');
            void lockinFlash.offsetWidth;
            lockinFlash.classList.add('animate-lockin-flash');


            // Actualizar UI
            updateLockState();
            renderCarousel();
            selectAgent(currentIndex);

            // 3. CREAR CONTADOR DISCRETO DE 5 SEGUNDOS
            let discreetCounter = document.createElement('div');
            discreetCounter.className = "fixed inset-0 z-50 flex items-center justify-center pointer-events-none select-none";
            discreetCounter.innerHTML = `
                <div id="counterNumber" class="font-teko text-9xl font-black text-white drop-shadow-[0_0_35px_rgba(255,70,85,0.9)] animate-pulse">
                    5
                </div>
            `;
            document.body.appendChild(discreetCounter);

            let timeLeft = 5;
            const counterInterval = setInterval(() => {
                timeLeft--;
                const numEl = document.getElementById('counterNumber');
                if (timeLeft > 0) {
                    if (numEl) numEl.innerText = timeLeft;
                } else {
                    clearInterval(counterInterval);
                    discreetCounter.remove(); // Eliminar el contador de la pantalla

                    // 4. LANZAR LA PANTALLA DE CARGA DE 5 SEGUNDOS CON EL RETRATO
                    showLoadingScreenWithAgent(currentAgent);
                }
            }, 1000);
        });

        /**
         * Pantalla de carga de 5 segundos utilizando los elementos fijos del HTML
         */
        function showLoadingScreenWithAgent(agent) {
            const loadingScreen = document.getElementById('loadingScreen');
            const loadingBar = document.getElementById('loadingBar');
            const loadingAgentImg = document.getElementById('loadingAgentImg');
            const loadingAgentName = document.getElementById('loadingAgentName');

            if (!loadingScreen) {
                console.error("No se encontró el elemento #loadingScreen en el HTML. Redirigiendo por seguridad...");
                window.location.href = 'aim.html';
                return;
            }

            // Asignar los datos del agente seleccionado a la pantalla de carga
            if (loadingAgentImg) loadingAgentImg.src = agent.fullPortrait || agent.displayIcon;
            if (loadingAgentName) loadingAgentName.innerText = agent.displayName.toUpperCase();

            // Mostrar el contenedor de carga
            loadingScreen.classList.remove('hidden');

            // Barra de progreso calibrada a 5 segundos exactos (50ms * 100 incrementos = 5000ms)
            let progress = 0;
            const barInterval = setInterval(() => {
                progress += 1; 
                if (loadingBar) loadingBar.style.width = `${progress}%`;

                if (progress >= 100) {
                    clearInterval(barInterval);

                    // Desvanecer suavemente la música de fondo y redirigir a aim.html
                    fadeOutAudio(soundSelectBg, 800, () => {
                        window.location.href = 'aim.html';
                    });
                }
            }, 50); 
        }

        /**
         * Función auxiliar para desvanecer el audio de fondo de manera fluida
         */
        function fadeOutAudio(audioElement, duration, callback) {
            if (!audioElement || audioElement.paused) {
                if (callback) callback();
                return;
            }
            let volume = audioElement.volume;
            let step = volume / (duration / 50);
            
            let fadeAudio = setInterval(() => {
                volume -= step;
                if (volume <= 0) {
                    volume = 0;
                    audioElement.pause();
                    clearInterval(fadeAudio);
                    if (callback) callback();
                }
                audioElement.volume = Math.max(0, volume);
            }, 50);
        }

        // Navigation Controllers
        btnPrev.addEventListener('click', () => {
            playSound('click');
            const nextIdx = (currentIndex - 1 + agents.length) % agents.length;
            selectAgent(nextIdx);
        });

        btnNext.addEventListener('click', () => {
            playSound('click');
            const nextIdx = (currentIndex + 1) % agents.length;
            selectAgent(nextIdx);
        });

        // Mouse Wheel Scroll Navigation
        window.addEventListener('wheel', (e) => {
            if (e.deltaY > 0) {
                const nextIdx = (currentIndex + 1) % agents.length;
                selectAgent(nextIdx);
            } else {
                const prevIdx = (currentIndex - 1 + agents.length) % agents.length;
                selectAgent(prevIdx);
            }
        });

        // Initialize App on Load
        window.onload = fetchAgents;

        // Instancia del audio de fondo para la selección de agentes
const soundSelectBg = new Audio('audio/select.mp3');
soundSelectBg.loop = true;
soundSelectBg.volume = 0.05; // Ajusta el volumen a tu gusto (0.0 a 1.0)

// Iniciar el audio con la primera interacción del usuario (para evitar bloqueos del navegador)
document.addEventListener('click', () => {
    if (soundSelectBg.paused) {
        soundSelectBg.play().catch(e => console.log("Audio select bloqueado:", e));
    }
}, { once: true });