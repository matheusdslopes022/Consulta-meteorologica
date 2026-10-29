const botao_buscar = document.getElementById("button");



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

// CORREÇÃO 1: variável que estava sendo usada sem ser declarada
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
            // O fetch não rejeita erros HTTP automaticamente
            if (!resposta.ok) {
                throw new Error(`Erro HTTP: ${resposta.status}`);
            }
            return resposta.json();
        })
        .then(function (dados) {
            // Sem ocorrências, a API omite "results"; usamos lista vazia
            const locais = dados.results || [];
            console.log(dados);
            resultado.innerHTML = "";

            mensagem.textContent = locais.length === 0
                ? 'Nenhuma localidade encontrada.'
                : `${locais.length} Localidades encontradas.`;

            if (locais.length === 0) {
                return;
            }

            document.querySelector(".resultado").style.display = "block";

            // cria conforme a quantidade de cidades
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
                    console.log("Cidade selecionada:", local);

                    // cada nova cidade começa na camada Vento
                    camadaAtual = "wind";

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
                                                <p>${local.name}, ${local.country}</p>
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

                                    <button id="favoritos" class="botao-favoritos">
                                        ☆ Adicionar aos favoritos
                                    </button>
                                </div>
                            `;
                            clima.style.display = "grid";
                            const botao_favorito = document.querySelectorAll(".botao-favoritos");

                            botao_favorito.addEventListener("click", ()=>{
                                alert("dwq")
                            })

                            // muda o fundo animado conforme o clima
                            // (se o fundo.js não carregar, o resto do site continua funcionando)
                            if (typeof definirFundo === "function") {
                                definirFundo(atual.weather_code, atual.is_day === 1);
                            } else {
                                console.warn("fundo.js não foi carregado: confira se o arquivo está na mesma pasta do index.html");
                            }

                            // Card novo só para o mapa
                            cartaoMapa.innerHTML = `
                                <h2 class="titulo-mapa">Mapa do tempo · ${local.name}</h2>
                                ${htmlMapa(local.latitude, local.longitude)}
                            `;
                            cartaoMapa.style.display = "block";

                            // ligar as abas depois que o HTML existe na página
                            ligarAbasMapa(local.latitude, local.longitude);

                            console.log("Dados do clima:", dados);



                            
                        })
                        .catch(function (erro) {
                            clima.style.display = "block";
                            clima.textContent = "Não foi possível carregar o clima.";
                            console.error(erro);
                        });

                });
            });
        })
        .catch(function (erro) {
            mensagem.textContent = 'Não foi possível buscar os dados.';
            console.error(erro);
        })
        // Executa sempre, com sucesso ou erro: reabilita o botão
        .finally(function () {
            botao_buscar.disabled = false;
        });

});