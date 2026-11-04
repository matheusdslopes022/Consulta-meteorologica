(function () {
    "use strict";

    const canvas = document.getElementById("fundo-clima");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = (a, b) => a + Math.random() * (b - a);

    let W = 0, H = 0;
    function redimensionar() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", redimensionar);
    redimensionar();

    // ---------- Cores do céu: [topo r,g,b, base r,g,b] ----------
    const PALETAS = {
        inicialD: [15, 53, 99, 42, 111, 181],
        inicialN: [15, 53, 99, 42, 111, 181],
        limpoD: [30, 100, 190, 90, 160, 225],
        limpoN: [7, 13, 38, 32, 48, 98],
        nubladoD: [88, 104, 124, 150, 164, 180],
        nubladoN: [22, 28, 40, 54, 62, 80],
        chuvaD: [52, 64, 82, 98, 112, 132],
        chuvaN: [15, 20, 30, 38, 46, 60],
        tempD: [28, 32, 46, 60, 64, 82],
        tempN: [10, 12, 20, 34, 38, 52],
        neveD: [84, 104, 132, 150, 168, 192],
        neveN: [30, 40, 60, 75, 90, 115],
        neblinaD: [98, 108, 120, 148, 156, 165],
        neblinaN: [34, 40, 50, 72, 78, 88],
    };

    // ---------- Configuração de cada tipo de tempo ----------
    const BASE = {
        pal: "inicial", nuvens: 0, tom: "claro", alfa: 0.5,
        esc: [0.9, 1.4], y: [0.05, 0.5], ceu: 0, chuva: 0, neve: 0, raio: false,
    };
    const CONFIG = {
        inicial: { ...BASE },
        limpo: { ...BASE, pal: "limpo", nuvens: 3, alfa: 0.35, ceu: 1 },
        parcial: { ...BASE, pal: "limpo", nuvens: 8, alfa: 0.7, ceu: 0.6 },
        nublado: { ...BASE, pal: "nublado", nuvens: 15, tom: "cinza", alfa: 0.8, y: [0, 0.65] },
        neblina: { ...BASE, pal: "neblina", nuvens: 12, alfa: 0.35, esc: [1.6, 2.6], y: [0.35, 0.95] },
        garoa: { ...BASE, pal: "nublado", nuvens: 12, tom: "cinza", alfa: 0.75, chuva: 0.25 },
        chuva: { ...BASE, pal: "chuva", nuvens: 16, tom: "escuro", alfa: 0.85, y: [0, 0.55], chuva: 0.6 },
        pancadas: { ...BASE, pal: "chuva", nuvens: 16, tom: "escuro", alfa: 0.85, y: [0, 0.55], chuva: 0.85 },
        tempestade: { ...BASE, pal: "temp", nuvens: 18, tom: "escuro", alfa: 0.92, y: [0, 0.55], chuva: 1, raio: true },
        neve: { ...BASE, pal: "neve", nuvens: 12, tom: "cinza", alfa: 0.6, neve: 1 },
    };

    function tipoDe(c) {
        if (c === 0 || c === 1) return "limpo";
        if (c === 2) return "parcial";
        if (c === 3) return "nublado";
        if (c === 45 || c === 48) return "neblina";
        if (c >= 51 && c <= 57) return "garoa";
        if (c >= 61 && c <= 67) return "chuva";
        if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "neve";
        if (c >= 80 && c <= 82) return "pancadas";
        if (c >= 95) return "tempestade";
        return "nublado";
    }

    // ---------- Sprites de nuvem (desenhados uma vez) ----------
    const TONS = {
        claro: { D: [255, 255, 255], N: [150, 165, 200] },
        cinza: { D: [205, 212, 222], N: [100, 110, 132] },
        escuro: { D: [125, 135, 150], N: [60, 68, 84] },
    };
    const sprites = {};
    function sprite(tom, dia) {
        const chave = tom + (dia ? "D" : "N");
        if (sprites[chave]) return sprites[chave];
        const c = document.createElement("canvas");
        c.width = 420;
        c.height = 200;
        const g = c.getContext("2d");
        const [r, gr, b] = TONS[tom][dia ? "D" : "N"];
        const bolhas = [[70, 140, 45], [110, 118, 70], [160, 100, 62], [195, 88, 88], [240, 105, 66], [275, 112, 74], [320, 125, 58], [360, 140, 42], [150, 140, 60], [235, 145, 58], [300, 148, 50]];
        bolhas.forEach(([x, y, raio]) => {
            const grad = g.createRadialGradient(x, y, 0, x, y, raio);
            grad.addColorStop(0, `rgba(${r},${gr},${b},0.9)`);
            grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
            g.fillStyle = grad;
            g.beginPath();
            g.arc(x, y, raio, 0, Math.PI * 2);
            g.fill();
        });
        sprites[chave] = c;
        return c;
    }

    // ---------- Estado ----------
    let cor = PALETAS.inicialD.slice();
    let alvoCor = PALETAS.inicialD.slice();
    let sol = 0, alvoSol = 0;
    let estrelasA = 0, alvoEstrelas = 0;
    let chuvaA = 0, alvoChuva = 0;
    let neveA = 0, alvoNeve = 0;
    let temRaio = false, proxRaio = 4, flash = 0, raioPontos = [];
    let atual = "";
    const nuvens = [];

    const gotas = Array.from({ length: 450 }, () => ({
        x: rand(0, 1) * 2000, y: rand(0, 1) * 1200, v: rand(700, 1100), l: rand(12, 26),
    }));
    const flocos = Array.from({ length: 220 }, () => ({
        x: rand(0, 1) * 2000, y: rand(0, 1) * 1200, v: rand(30, 80), r: rand(1.5, 3.8), fase: rand(0, 6.28),
    }));
    const estrelas = Array.from({ length: 90 }, () => ({
        x: Math.random(), y: Math.random() * 0.7, r: rand(0.6, 1.6), f: rand(0.8, 2.4), fase: rand(0, 6.28),
    }));

    function novaNuvem(cfg, img) {
        const esc = rand(cfg.esc[0], cfg.esc[1]);
        const larg = Math.max(300, W * 0.35) * esc;
        return {
            img, larg,
            x: rand(-larg * 0.5, W),
            y: rand(cfg.y[0], cfg.y[1]) * H,
            vel: rand(6, 18) * (0.6 + esc * 0.4),
            a: 0, alvo: cfg.alfa * rand(0.7, 1), sair: false,
        };
    }

    // ---------- API pública ----------
    window.definirFundo = function (codigo, ehDia) {
        const tipo = tipoDe(codigo);
        const chave = tipo + (ehDia ? "D" : "N");
        if (chave === atual) return;
        atual = chave;

        const cfg = CONFIG[tipo];
        alvoCor = PALETAS[cfg.pal + (ehDia ? "D" : "N")].slice();
        alvoSol = ehDia ? cfg.ceu : 0;
        alvoEstrelas = ehDia ? 0 : cfg.ceu;
        alvoChuva = cfg.chuva;
        alvoNeve = cfg.neve;
        temRaio = cfg.raio;

        nuvens.forEach(n => { n.sair = true; });
        const img = sprite(cfg.tom, ehDia);
        for (let i = 0; i < cfg.nuvens; i++) nuvens.push(novaNuvem(cfg, img));
    };

    // ---------- Loop de desenho ----------
    let ultimo = performance.now();
    let t = 0;

    function quadro(agora) {
        const dtReal = Math.min((agora - ultimo) / 1000, 0.1);
        const dt = dtReal * (reduz ? 0.25 : 1);
        ultimo = agora;
        t += dt;

        const k = Math.min(1, dtReal * 1.5);
        for (let i = 0; i < 6; i++) cor[i] += (alvoCor[i] - cor[i]) * k;
        sol += (alvoSol - sol) * k;
        estrelasA += (alvoEstrelas - estrelasA) * k;
        chuvaA += (alvoChuva - chuvaA) * k;
        neveA += (alvoNeve - neveA) * k;

        // céu
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, `rgb(${cor[0] | 0},${cor[1] | 0},${cor[2] | 0})`);
        g.addColorStop(1, `rgb(${cor[3] | 0},${cor[4] | 0},${cor[5] | 0})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // estrelas
        if (estrelasA > 0.01) {
            ctx.fillStyle = "#fff";
            estrelas.forEach(s => {
                ctx.globalAlpha = estrelasA * (0.4 + 0.6 * Math.abs(Math.sin(t * s.f + s.fase)));
                ctx.beginPath();
                ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        // sol
        if (sol > 0.01) {
            const sx = W * 0.82, sy = H * 0.2;
            const R = Math.min(W, H) * 0.55 * (1 + Math.sin(t * 0.6) * 0.04);
            const gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
            gs.addColorStop(0, `rgba(255,240,190,${0.65 * sol})`);
            gs.addColorStop(0.25, `rgba(255,225,150,${0.25 * sol})`);
            gs.addColorStop(1, "rgba(255,225,150,0)");
            ctx.fillStyle = gs;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = `rgba(255,252,230,${0.95 * sol})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 34, 0, Math.PI * 2);
            ctx.fill();
        }

        // nuvens
        for (let i = nuvens.length - 1; i >= 0; i--) {
            const n = nuvens[i];
            n.a += ((n.sair ? 0 : n.alvo) - n.a) * k;
            if (n.sair && n.a < 0.01) { nuvens.splice(i, 1); continue; }
            n.x += n.vel * dt;
            if (n.x > W + 50) n.x = -n.larg;
            ctx.globalAlpha = n.a;
            ctx.drawImage(n.img, n.x, n.y, n.larg, n.larg * 0.476);
        }
        ctx.globalAlpha = 1;

        // chuva
        if (chuvaA > 0.01) {
            const qtd = Math.round(gotas.length * chuvaA);
            ctx.strokeStyle = "rgba(210,225,255,0.45)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let i = 0; i < qtd; i++) {
                const d = gotas[i];
                d.y += d.v * dt;
                d.x += d.v * 0.18 * dt;
                if (d.y > H || d.x > W + 50) { d.y = -d.l; d.x = rand(-150, W); }
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - d.l * 0.18, d.y - d.l);
            }
            ctx.stroke();
        }

        // neve
        if (neveA > 0.01) {
            const qtd = Math.round(flocos.length * neveA);
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            for (let i = 0; i < qtd; i++) {
                const f = flocos[i];
                f.y += f.v * dt;
                f.x += Math.sin(t * 1.2 + f.fase) * 20 * dt;
                if (f.y > H + 5) { f.y = -5; f.x = rand(0, W); }
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // raios
        if (temRaio) {
            proxRaio -= dtReal;
            if (proxRaio <= 0) {
                flash = 1;
                proxRaio = rand(3, 8);
                let x = rand(0.15, 0.85) * W, y = 0;
                raioPontos = [[x, y]];
                while (y < H * rand(0.45, 0.7)) {
                    x += rand(-40, 40);
                    y += rand(25, 60);
                    raioPontos.push([x, y]);
                }
            }
        }
        if (flash > 0.01) {
            ctx.fillStyle = `rgba(255,255,255,${flash * 0.45})`;
            ctx.fillRect(0, 0, W, H);
            if (raioPontos.length) {
                ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, flash * 1.2)})`;
                ctx.lineWidth = 2.5;
                ctx.lineJoin = "round";
                ctx.beginPath();
                raioPontos.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
                ctx.stroke();
            }
            flash -= dtReal * 3.5;
        }

        requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
})();