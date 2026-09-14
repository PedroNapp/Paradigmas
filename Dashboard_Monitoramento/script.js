// ==============================
// ELEMENTOS DA INTERFACE
// ==============================

const temperaturaElemento = document.getElementById("temperatura");
const statusElemento = document.getElementById("status");
const alertaElemento = document.getElementById("alerta");
const ultimaLeituraElemento = document.getElementById("ultimaLeitura");
const botaoResfriamento = document.getElementById("btnResfriamento");


// ==============================
// ESTADO DA MÁQUINA
// ==============================

let temperaturaAtual = 70;
let resfriando = false;


// ==============================
// EVENTO DO SENSOR
// ==============================

// Cria e dispara o evento do sensor
function lerTemperatura() {

    if (!resfriando) {
        temperaturaAtual += Math.floor(Math.random() * 10) - 2;

        temperaturaAtual = Math.max(
            50,
            Math.min(100, temperaturaAtual)
        );
    }

    document.dispatchEvent(
        new CustomEvent("temperaturaLida", {
            detail: {
                temperatura: temperaturaAtual,
                horario: new Date()
            }
        })
    );
}


// ==============================
// LEITURA DO SENSOR
// ==============================

// Reage à leitura do sensor
document.addEventListener("temperaturaLida", (evento) => {

    const { temperatura, horario } = evento.detail;

    temperaturaElemento.textContent = `${temperatura} °C`;
    ultimaLeituraElemento.textContent =
        horario.toLocaleTimeString();


    // Verifica o estado da máquina
    if (resfriando) {

        statusElemento.textContent = "RESFRIANDO";

        alertaElemento.textContent =
            "❄️ Resfriamento emergencial ativado.";

    } else if (temperatura >= 90) {

        statusElemento.textContent = "CRÍTICO";

        alertaElemento.textContent =
            "⚠️ Temperatura crítica!";

    } else if (temperatura >= 75) {

        statusElemento.textContent = "ATENÇÃO";

        alertaElemento.textContent =
            "⚠️ Temperatura elevada.";

    } else {

        statusElemento.textContent = "NORMAL";

        alertaElemento.textContent =
            "Temperatura dentro do limite.";
    }
});


// ==============================
// BOTÃO DE RESFRIAMENTO
// ==============================

// Reage ao clique do botão
botaoResfriamento.addEventListener("click", () => {

    if (resfriando) {
        return;
    }

    resfriando = true;


    // Reduz a temperatura a cada 1 segundo
    const resfriamento = setInterval(() => {

        temperaturaAtual--;

        document.dispatchEvent(
            new CustomEvent("temperaturaLida", {
                detail: {
                    temperatura: temperaturaAtual,
                    horario: new Date()
                }
            })
        );


        // Finaliza o resfriamento ao chegar em 50 °C
        if (temperaturaAtual <= 50) {

            temperaturaAtual = 50;
            resfriando = false;

            clearInterval(resfriamento);
        }

    }, 1000);
});


// ==============================
// LEITURA AUTOMÁTICA DO SENSOR
// ==============================

// Sensor realiza uma leitura a cada 2 segundos
setInterval(lerTemperatura, 2000);
