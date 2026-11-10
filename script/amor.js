   // 1. SINTETIZADOR DE SONIDO PARA CADA "TAP TAP" (Sin archivos externos requeridos)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playTapSound() {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;
            osc.type = 'sine';
            // Frecuencia estilo "pop" dulce de corazón
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.start(now);
            osc.stop(now + 0.08);
        }

        // 2. LÓGICA DE CONTADOR TAP TAP (10 VECES)
        let tapsRemaining = 10;
        let likesCount = 10482;
        const tapHeartBtn = document.getElementById('tapHeartBtn');
        const tapCounterBadge = document.getElementById('tapCounterBadge');
        const likeCounterDisplay = document.getElementById('likeCounterDisplay');
        const tapUnlockOverlay = document.getElementById('tapUnlockOverlay');
        const romanticCard = document.getElementById('romanticCard');
        const bgMusic = document.getElementById('bgMusic');

        tapHeartBtn.addEventListener('click', () => {
            if (tapsRemaining > 0) {
                playTapSound();
                tapsRemaining--;
                likesCount += 100; // Incrementa me gustas simulados de TikTok

                likeCounterDisplay.innerText = likesCount.toLocaleString();
                
                if (tapsRemaining > 0) {
                    tapCounterBadge.innerText = `${tapsRemaining} TAPS`;
                } else {
                    tapCounterBadge.innerText = `¡DESBLOQUEADO! ❤️`;
                    
                    // Desenroscar / Desvanecer overlay de TikTok
                    tapUnlockOverlay.classList.add('unwrap-animation');

                    setTimeout(() => {
                        tapUnlockOverlay.style.display = 'none';
                        romanticCard.classList.remove('hidden');
                        romanticCard.classList.add('animate-fade-in');

                        // INICIAR LA MÚSICA DE PIANO AUTOMÁTICAMENTE
                        if (bgMusic) {
                            bgMusic.volume = 0.5;
                            bgMusic.play().catch(e => console.log("Audio de amor iniciado:", e));
                        }

                        // Iniciar lluvia de corazones
                        animateHearts();
                    }, 1000);
                }
            }
        });

        // 3. CANVAS DE CORAZONES FLOTANTES
        const canvas = document.getElementById('heartCanvas');
        const ctx = canvas.getContext('2d');

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height + Math.random() * 100;
                this.size = Math.random() * 15 + 8;
                this.speedY = Math.random() * 1.5 + 0.5;
                this.speedX = Math.random() * 1 - 0.5;
                this.opacity = Math.random() * 0.7 + 0.3;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = Math.random() * 0.02 - 0.01;
            }

            update() {
                this.y -= this.speedY;
                this.x += this.speedX;
                this.rotation += this.rotSpeed;

                if (this.y < -50) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = '#f43f5e';
                
                ctx.beginPath();
                const topCurveHeight = this.size * 0.3;
                ctx.moveTo(0, topCurveHeight);
                ctx.bezierCurveTo(0, 0, -this.size / 2, 0, -this.size / 2, topCurveHeight);
                ctx.bezierCurveTo(-this.size / 2, (this.size + topCurveHeight) / 2, 0, this.size, 0, this.size);
                ctx.bezierCurveTo(0, this.size, this.size / 2, (this.size + topCurveHeight) / 2, this.size / 2, topCurveHeight);
                ctx.bezierCurveTo(this.size / 2, 0, 0, 0, 0, topCurveHeight);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }
        }

        const particles = Array.from({ length: 45 }, () => new Particle());

        function animateHearts() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animateHearts);
        }