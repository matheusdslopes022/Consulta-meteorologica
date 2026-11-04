const botao_buscar = document.getElementById("button");
mostrarFavoritos();

function descricaoClima(codigo) {
    const mapa = {
        0: "Céu limpo",
        1: "Predominantemente limpo",
        2: "Parcialmente nublado",
        3: "Nublado",
        45: "Neblina",
        48: "Neblina com geada",
        51: "Garoa leve",
        53: "Garoa moderada",
        55: "Garoa intensa",
        61: "Chuva leve",
        63: "Chuva moderada",
        65: "Chuva forte",
        71: "Neve leve",
        73: "Neve moderada",
        75: "Neve forte",
        80: "Pancadas de chuva leves",
        81: "Pancadas de chuva moderadas",
        82: "Pancadas de chuva violentas",
        95: "Tempestade",
        96: "Tempestade com granizo leve",
        99: "Tempestade com granizo forte",
        56: "Garoa congelante leve",
        57: "Garoa congelante intensa",
        66: "Chuva congelante leve",
        67: "Chuva congelante forte",
        77: "Grãos de neve",
        85: "Pancadas de neve leves",
        86: "Pancadas de neve fortes"
    };
    return mapa[codigo] || "Condição desconhecida";
}

function iconeClima(codigo, ehDia) {
    if (codigo === 0 || codigo === 1) return ehDia ? "☀️" : "🌙";
    if (codigo === 2) return ehDia ? "⛅" : "☁️";
    if (codigo === 3) return "☁️";
    if (codigo === 45 || codigo === 48) return "🌫️";
    if ((codigo >= 51 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return "🌧️";
    if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return "❄️";
    if (codigo >= 95) return "⛈️";
    return "☁️";
}

const CAMADAS_MAPA = [
    ["wind", "Vento"],
    ["rain", "Chuva"],
    ["temp", "Temperatura"],
    ["clouds", "Nuvens"],
    ["pressure", "Pressão"],
];

let camadaAtual = "wind";

function urlMapa(latitude, longitude, camada) {
    return `https://embed.windy.com/embed2.html` +
        `?lat=${latitude}` +
        `&lon=${longitude}` +
        `&zoom=7` +
        `&level=surface` +
        `&overlay=${camada}` +
        `&product=ecmwf` +
        `&menu=` +
        `&message=true` +
        `&marker=true` +
        `&calendar=now` +
        `&type=map` +
        `&location=coordinates` +
        `&metricWind=${encodeURIComponent("km/h")}` +
        `&metricTemp=${encodeURIComponent("°C")}`;
}

function htmlMapa(latitude, longitude) {
    const abas = CAMADAS_MAPA.map(([valor, nome]) => `
        <button type="button" data-camada="${valor}" class="${valor === camadaAtual ? "ativa" : ""}">${nome}</button>
    `).join("");

    return `
        <div class="abas-mapa">${abas}</div>
        <iframe id="mapa" title="Mapa do tempo" loading="lazy"
            src="${urlMapa(latitude, longitude, camadaAtual)}"></iframe>
        <p class="credito-mapa">Mapas: <a href="https://www.windy.com" target="_blank" rel="noopener">Windy.com</a></p>
    `;
}

function ligarAbasMapa(latitude, longitude) {
    const abas = document.querySelector(".abas-mapa");
    if (!abas) return;

    abas.addEventListener("click", evento => {
        const botao = evento.target.closest("button");
        if (!botao) return;

        camadaAtual = botao.dataset.camada;

        abas.querySelectorAll("button").forEach(b => {
            b.classList.toggle("ativa", b === botao);
        });

        document.getElementById("mapa").src = urlMapa(latitude, longitude, camadaAtual);
    });
}

function adicionarFavorito(local) {
    let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

    const existe = favoritos.some(f =>
        f.latitude === local.latitude &&
        f.longitude === local.longitude
    );

    if (existe) {
        alert("Cidade já está nos favoritos!");
        return;
    } else {
        favoritos.push({
            nome: local.name || local.nome,
            pais: local.country || local.pais || "",
            latitude: local.latitude,
            longitude: local.longitude
        });

        localStorage.setItem("favoritos", JSON.stringify(favoritos));
        mostrarFavoritos();
    }

    alert("Cidade adicionada aos favoritos!");
}

function mostrarFavoritos() {
    const favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
    const lista = document.getElementById("lista-favoritos");
    if (!lista) return;

    lista.innerHTML = "";

    if (favoritos.length === 0) {
        lista.textContent = "Nenhuma cidade favorita.";
        return;
    }

    favoritos.forEach(cidade => {
        const item = document.createElement("button");
        item.classList.add("item-favorito");
        item.textContent = cidade.pais ? `${cidade.nome}, ${cidade.pais}` : cidade.nome;
        lista.appendChild(item);

        item.addEventListener("click", () => {
            document.querySelector(".clima").style.display = "block";
            carregarClima(cidade);
        });
    });
}

function carregarClima(local) {
    const clima = document.getElementById("clima");
    const cartaoMapa = document.getElementById("cartao-mapa");

    camadaAtual = "wind";

    const nomeCidade = local.name || local.nome || "Local desconhecido";
    const nomePais = local.country || local.pais || "";
    const localizacaoTexto = nomePais ? `${nomeCidade}, ${nomePais}` : nomeCidade;

    const parametrosClima = new URLSearchParams({
        latitude: local.latitude,
        longitude: local.longitude,
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
        timezone: "auto"
    });

    clima.style.display = "none";
    cartaoMapa.style.display = "none";
    clima.textContent = "Carregando clima...";

    fetch(`https://api.open-meteo.com/v1/forecast?${parametrosClima}`)
        .then(function (resposta) {
            if (!resposta.ok) {
                throw new Error(`Erro HTTP: ${resposta.status}`);
            }
            return resposta.json();
        })
        .then(function (dados) {
            const atual = dados.current;

            clima.innerHTML = `
                <div class="geral">
                    <div class="teste">
                        <div class="icone-clima">${iconeClima(atual.weather_code, atual.is_day === 1)}</div>

                        <div class="clima-principal">
                            <div class="informacoes">
                                <p>${localizacaoTexto}</p>
                                <h1>${Math.round(atual.temperature_2m)}°C</h1>
                                <p>${descricaoClima(atual.weather_code)}</p>
                            </div>
                        </div>

                        <div class="detalhes-clima">
                            <div class="detalhe">
                                <p>SENSAÇÃO</p>
                                <h2>${Math.round(atual.apparent_temperature)}°C</h2>
                            </div>

                            <div class="detalhe">
                                <p>UMIDADE</p>
                                <h2>${atual.relative_humidity_2m}%</h2>
                            </div>

                            <div class="detalhe">
                                <p>VENTO</p>
                                <h2>${Math.round(atual.wind_speed_10m)} km/h</h2>
                            </div>
                        </div>
                    </div>

                    <div class="fav">
                     <button id="favoritos" class="botao-favoritos">
                        ☆ Adicionar aos favoritos
                    </button>

                    <div class="link">
                        <p>Fonte: <a href="https://open-meteo.com/">Open meteo</a></p>
                     </div>
                    </div>
                   
                </div>
            `;

            const botao_favorito = document.querySelector(".botao-favoritos");
            botao_favorito.addEventListener("click", () => {
                adicionarFavorito(local);
            });

            clima.style.display = "grid";

            if (typeof definirFundo === "function") {
                definirFundo(atual.weather_code, atual.is_day === 1);
            } else {
                console.warn("fundo.js não foi carregado.");
            }

            cartaoMapa.innerHTML = `
                <h2 class="titulo-mapa">Mapa do tempo · ${nomeCidade}</h2>
                ${htmlMapa(local.latitude, local.longitude)}
            `;
            cartaoMapa.style.display = "block";

            ligarAbasMapa(local.latitude, local.longitude);
            console.log("Dados do clima:", dados);
        })
        .catch(function (erro) {
            clima.style.display = "block";
            clima.textContent = "Não foi possível carregar o clima.";
            console.error(erro);
        });
}

botao_buscar.addEventListener("click", (evento) => {
    evento.preventDefault();

    const cidade = document.getElementById("cidade").value.trim();
    const resultado = document.getElementById("resultado");
    const clima = document.getElementById("clima");
    const mensagem = document.getElementById("mensagem");
    const cartaoMapa = document.getElementById("cartao-mapa");

    document.querySelector(".resultado").style.display = "none";
    clima.style.display = "none";
    cartaoMapa.style.display = "none";

    if (cidade === "") {
        alert("Campo vazio, Digite novamente");
        return;
    }

    botao_buscar.disabled = true;

    const parametros = new URLSearchParams({
        name: cidade,
        count: 10,
        language: 'pt',
        format: 'json'
    });

    fetch(`https://geocoding-api.open-meteo.com/v1/search?${parametros}`)
        .then(function (resposta) {
            if (!resposta.ok) {
                throw new Error(`Erro HTTP: ${resposta.status}`);
            }
            return resposta.json();
        })
        .then(function (dados) {
            const locais = dados.results || [];
            resultado.innerHTML = "";

            mensagem.textContent = locais.length === 0
                ? 'Nenhuma localidade encontrada.'
                : `${locais.length} Localidades encontradas.`;

            if (locais.length === 0) {
                return;
            }

            document.querySelector(".resultado").style.display = "block";

            locais.forEach(function (local) {
                const item = document.createElement("div");
                item.classList.add("item-cidade");
                const partes = [local.name, local.admin2, local.admin1, local.country].filter(Boolean);
                item.textContent = `${partes.join(', ')} (lat: ${local.latitude}, lon: ${local.longitude})`;
                resultado.append(item);

                item.addEventListener("click", () => {
                    document.querySelector(".clima").style.display = "block";
                    document.querySelectorAll(".item-cidade").forEach(function (outroItem) {
                        outroItem.classList.remove("selecionada");
                    });

                    item.classList.add("selecionada");

                    carregarClima(local);
                });
            });
        })
        .catch(function (erro) {
            mensagem.textContent = 'Não foi possível buscar os dados.';
            console.error(erro);
        })
        .finally(function () {
            botao_buscar.disabled = false;
        });
});