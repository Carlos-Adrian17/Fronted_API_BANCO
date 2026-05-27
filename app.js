// ========================================
// CONFIGURACIÓN CENTRAL DE LA API
// ========================================
const API = "https://api-banco-services.azurewebsites.net";

let appState = {
    cliente: null,
    cuentaId: null,
    saldo: 0,
    movimientos: []
};

// Objeto Global para controlar la instancia del gráfico dinámico
let financialChartInstance = null;

// ========================================
// INICIALIZACIÓN DE ENTORNO
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    actualizarSaludo();
}

// ========================================
// CONTROL DE SALUDO TEMPORAL
// ========================================
function actualizarSaludo() {
    const el = document.getElementById("greeting");
    if (!el) return;

    const h = new Date().getHours();
    if (h < 12) el.innerText = "Buenos días";
    else if (h < 19) el.innerText = "Buenas tardes";
    else el.innerText = "Buenas noches";
}

// ========================================
// ESCUCHADORES DE EVENTOS DE FORMULARIO
// ========================================
function setupEventListeners() {
    document.getElementById("form-login")?.addEventListener("submit", handleLogin);
    document.getElementById("form-register")?.addEventListener("submit", handleRegister);
    document.getElementById("form-recover")?.addEventListener("submit", handleRecover);

    document.getElementById("form-transfer")?.addEventListener("submit", handleTransfer);
    
    // Vinculación del formulario de depósitos
    document.getElementById("form-deposit")?.addEventListener("submit", handleDeposit);

    document.getElementById("btn-logout")?.addEventListener("click", logout);
}

// ========================================
// AUTENTICACIÓN: INICIAR SESIÓN
// ========================================
async function handleLogin(e) {
    e.preventDefault();

    const dpi = document.getElementById("login-dpi").value;
    const pass = document.getElementById("login-password").value;

    try {
        const res = await fetch(`${API}/api/Cliente/login?dpi=${dpi}&password=${pass}`, {
            method: "POST"
        });

        if (!res.ok) throw new Error();

        const cliente = await res.json();
        appState.cliente = cliente;

        // Crear/vincular cuenta transaccional del cliente
        const resCuenta = await fetch(`${API}/api/Cuenta/crear?clienteId=${cliente.id}`, {
            method: "POST"
        });

        const cuenta = await resCuenta.json();
        appState.cuentaId = cuenta.id;

        enterApp(cuenta);
        showToast(`Sesión autorizada. Bienvenido ${cliente.nombre}`, "success");

    } catch (err) {
        console.error(err);
        showToast("Credenciales incorrectas o DPI no registrado", "error");
    }
}

// ========================================
// AUTENTICACIÓN: REGISTRO DE CUENTA
// ========================================
async function handleRegister(e) {
    e.preventDefault();

    const nombre = document.getElementById("reg-name").value;
    const dpi = document.getElementById("reg-dpi").value;
    const correo = document.getElementById("reg-email").value;
    const telefono = document.getElementById("reg-telefono").value;
    const direccion = document.getElementById("reg-direccion").value;
    const password = document.getElementById("reg-password").value;

    try {
        const url = `${API}/api/Cliente/registro?nombre=${encodeURIComponent(nombre)}&dpi=${encodeURIComponent(dpi)}&correo=${encodeURIComponent(correo)}&telefono=${encodeURIComponent(telefono)}&direccion=${encodeURIComponent(direccion)}&password=${encodeURIComponent(password)}`;
        
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) throw new Error();

        showToast("Cuenta creada correctamente ✅", "success");
        document.getElementById("form-register").reset();
        switchAuthForm("login");

    } catch (err) {
        showToast("Error en los parámetros de registro", "error");
    }
}

// ========================================
// AUTENTICACIÓN: RECUPERACIÓN DE CONTRASEÑA
// ========================================
async function handleRecover(e) {
    e.preventDefault();
    
    const dpi = document.getElementById("recover-dpi").value;
    const email = document.getElementById("recover-email").value;

    try {
        const url = `${API}/api/Cliente/recuperar?dpi=${encodeURIComponent(dpi)}&correo=${encodeURIComponent(email)}`;
        await fetch(url, { method: "POST" }).catch(() => console.log("Protocolo de recuperación enviado"));

        showToast("Token de restauración enviado al correo registrado", "success");
        document.getElementById("form-recover").reset();
        switchAuthForm("login");
    } catch (err) {
        showToast("Error en la solicitud de recuperación", "error");
    }
}

// ========================================
// MANEJO DE VISTAS DE AUTENTICACIÓN
// ========================================
function switchAuthForm(tipo) {
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    document.getElementById(`form-${tipo}`).classList.add("active");
}

// ========================================
// ENTRADA AL ENTORNO PRIVADO
// ========================================
function enterApp(cuenta) {
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");

    document.getElementById("user-display-name").innerText = appState.cliente.nombre || "Cliente";
    document.getElementById("nombre-cliente").innerText = appState.cliente.nombre || "Cliente";
    document.getElementById("numero-cuenta").innerText = cuenta.numeroTarjeta || cuenta.numeroCuenta || "Cta. Corporativa";
    document.getElementById("cvv").innerText = cuenta.cvv || "992";

    cargarDatos();
}

// ========================================
// CARGA GLOBAL DE FLUJOS RECIENTES
// ========================================
function cargarDatos() {
    actualizarSaldoVista();
    cargarMovimientos();
}

// ========================================
// REFRESCAR SALDO FINANCIERO
// ========================================
async function actualizarSaldoVista() {
    try {
        const res = await fetch(`${API}/api/Cuenta/saldo?cuentaId=${appState.cuentaId}`);
        const data = await res.json();

        appState.saldo = data.saldo;
        document.getElementById("dashboard-balance").innerText = "Q" + formatMoney(appState.saldo);

    } catch {
        showToast("Error al cargar saldo en tiempo real", "error");
    }
}

// ========================================
// PROCESAMIENTO DE DEPÓSITOS DE CAPITAL
// ========================================
async function handleDeposit(e) {

    e.preventDefault();

    const montoInput = document.getElementById("deposit-amount");
    const monto = parseFloat(montoInput.value);

    if (monto <= 0 || isNaN(monto)) {
        showToast("Monto ingresado inválido", "error");
        return;
    }

    try {

        const res = await fetch(`${API}/api/Cuenta/deposito?cuentaId=${appState.cuentaId}&monto=${monto}`, {
            method: "POST"
        });

        if (!res.ok) throw new Error();

        showToast(`Depósito de Q${formatMoney(monto)} completado exitosamente`, "success");

        montoInput.value = "";

        await cargarDatos(); // ✅ esto actualiza saldo REAL

    } catch (error) {

        console.error(error);
        showToast("Error al procesar el depósito", "error");

    }
}


// ========================================
// GESTIÓN: ENVIAR TRANSFERENCIAS
// ========================================
async function handleTransfer(e) {
    e.preventDefault();

    const destino = document.getElementById("transfer-account").value;
    const monto = parseFloat(document.getElementById("transfer-amount").value);

    if (monto > appState.saldo) {
        showToast("Fondos disponibles insuficientes", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/api/Banco/transferir?origenId=${appState.cuentaId}&destinoId=${destino}&monto=${monto}`, {
            method: "POST"
        });

        if (!res.ok) throw new Error();

        showToast("Transferencia Realizada con Éxito ✅", "success");
        document.getElementById("form-transfer").reset();
        cargarDatos();
        navigateToView("view-dashboard");

    } catch {
        showToast("Error en transferencia. Verifique el ID destino.", "error");
    }
}

// ========================================
// CONTROL COGNITIVO INTERNO DE LA SUB-PÁGINA
// ========================================
function openEntertainmentSubPage() {
    document.getElementById("payments-categories-view").classList.add("hidden");
    document.getElementById("payments-entertainment-view").classList.remove("hidden");
    
    // Limpiar logs visuales anteriores por estética de renderizado
    const resDiv = document.getElementById("resultado-entretenimiento");
    if(resDiv) {
        resDiv.style.display = "none";
        resDiv.innerHTML = "";
    }
}

function closeEntertainmentSubPage() {
    document.getElementById("payments-entertainment-view").classList.add("hidden");
    document.getElementById("payments-categories-view").classList.remove("hidden");
}

// ========================================
// INTEGRACIÓN PASARELA ENTRETENIMIENTO EXTERNA
// ========================================
async function ejecutarPagoEntretenimiento(servicioId, nombreServicio) {
    // MÉTODO DE CONFIRMACIÓN DE SEGURIDAD
    const seguro = confirm(`¿Desea autorizar el pago seguro para la plataforma ${nombreServicio}?`);
    if (!seguro) return;

    const resultadoDiv = document.getElementById("resultado-entretenimiento");
    resultadoDiv.style.display = "block";
    resultadoDiv.innerHTML = "<p><i class='fa-solid fa-circle-notch fa-spin'></i> Transmitiendo datos a la pasarela externa...</p>";

    try {
        const response = await fetch("https://webapipagon5214.azurewebsites.net/api/Pagos/pagar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                servicioId: servicioId,
                usuarioBancoId: appState.cuentaId
            })
        });

        const data = await response.json();

        if (data.pago && data.pago.estado === "Aprobado") {
            resultadoDiv.innerHTML = `
                <h3 style="color: var(--accent-emerald); margin-bottom: 0.8rem;"><i class="fa-solid fa-circle-check"></i> Pago Autorizado de Forma Exitosa</h3>
                <p style="margin-bottom:0.4rem;"><strong>Servicio Vinculado:</strong> ${data.pago.servicio}</p>
                <p style="margin-bottom:0.4rem;"><strong>Monto Liquidado:</strong> Q${data.pago.monto}</p>
                <p><strong>Código Único Referencia Banco:</strong> ${data.pago.referenciaBanco}</p>
            `;
            showToast(`Pago de ${nombreServicio} Aprobado`, "success");
            
            if(data.pago.monto) {
                appState.saldo -= parseFloat(data.pago.monto);
                document.getElementById("dashboard-balance").innerText = "Q" + formatMoney(appState.saldo);
            }
        } else {
            const motivo = data.pago ? data.pago.motivoRechazo : "Fondos insuficientes detectados";
            resultadoDiv.innerHTML = `
                <h3 style="color: var(--accent-crimson); margin-bottom: 0.8rem;"><i class="fa-solid fa-circle-xmark"></i> Pago Denegado por la Entidad</h3>
                <p style="margin-bottom:0.4rem;"><strong>Servicio:</strong> ${nombreServicio}</p>
                <p><strong>Causa de Rechazo:</strong> ${motivo}</p>
            `;
            showToast("La transacción externa fue rechazada", "error");
        }

    } catch (error) {
        resultadoDiv.innerHTML = "<p style='color: var(--accent-crimson);'>⚠️ Error crítico de comunicación con la API de Entretenimiento</p>";
        console.error(error);
        showToast("Error de respuesta en pasarela", "error");
    }
}

async function obtenerHistorialEntretenimiento() {

    const resultadoDiv = document.getElementById("resultado-entretenimiento");

    resultadoDiv.style.display = "block";
    resultadoDiv.innerHTML = "<p><i class='fa-solid fa-circle-notch fa-spin'></i> Extrayendo historial de pagos desde el nodo externo...</p>";

    try {

        const response = await fetch("https://webapipagon5214.azurewebsites.net/api/Pagos");
        const data = await response.json();

        // ✅ CORRECCIÓN: FILTRAR SOLO PAGOS DEL USUARIO ACTUAL
        const dataFiltrado = data.filter(pago => pago.usuarioBancoId == appState.cliente.id);

        // ✅ VALIDACIÓN CORREGIDA
        if (!dataFiltrado || dataFiltrado.length === 0) {
            resultadoDiv.innerHTML = "<p>No se registran transacciones externas en la pasarela actual.</p>";
            return;
        }

        let html = `
            <h3 style="margin-bottom: 1.2rem;">Historial de Transacciones de Entretenimiento</h3>
            <div class="table-responsive">
                <table class="premium-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Servicio</th>
                            <th>Monto</th>
                            <th>Estado Transacción</th>
                            <th>Fecha</th>
                            <th>Referencia</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // ✅ LOOP CORREGIDO
        dataFiltrado.forEach(pago => {

            const statusClass = pago.estado === "Aprobado" ? "txt-aprobado" : "txt-rechazado";

            html += `
                <tr>
                    <td>${pago.id}</td>
                    <td><strong>${pago.servicio}</strong></td>
                    <td>Q${formatMoney(pago.monto || 0)}</td>
                    <td class="${statusClass}">${pago.estado}</td>
                    <td>${new Date(pago.fecha).toLocaleDateString("es-GT")}</td>
                    <td>${pago.referenciaBanco || "N/A"}</td>
                </tr>
            `;
        });

        html += "</tbody></table></div>";

        resultadoDiv.innerHTML = html;

    } catch (error) {

        resultadoDiv.innerHTML = "<p style='color: var(--accent-crimson);'>⚠️ Imposible recuperar el log consolidado de la API externa</p>";
        console.error(error);
    }
}

// ========================================
// RENDERIZADO DE TABLA Y GRÁFICO DINÁMICO
// ========================================
async function cargarMovimientos() {
    try {
        const res = await fetch(`${API}/api/Movimiento?cuentaId=${appState.cuentaId}`);
        const data = await res.json();
        appState.movimientos = data;

        const tbody = document.getElementById("transactions-log");
        tbody.innerHTML = "";

        data.forEach(m => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${m.tipo || "Transacción"}</strong></td>
                <td>${formatFecha(m.fecha)}</td>
                <td class="text-right" style="font-weight:600;">Q${formatMoney(m.monto)}</td>
            `;
            tbody.appendChild(tr);
        });

        renderFinancialChart(data);

    } catch {
        showToast("Error al sincronizar historial analítico", "error");
    }
}

// ========================================
// SISTEMA DE GRÁFICOS PREMIUM (CHART.JS)
// ========================================
function renderFinancialChart(movimientos) {
    const ctx = document.getElementById('analytics-chart');
    if (!ctx) return;

    if (financialChartInstance) {
        financialChartInstance.destroy();
    }

    const labels = movimientos.length > 0 ? movimientos.map(m => formatFecha(m.fecha)).reverse() : ["Ene", "Feb", "Mar", "Abr", "May"];
    const dataPoints = movimientos.length > 0 ? movimientos.map(m => m.monto).reverse() : [1200, 3400, 2100, 5600, appState.saldo];

    const context2d = ctx.getContext('2d');
    const goldGradient = context2d.createLinearGradient(0, 0, 0, 150);
    goldGradient.addColorStop(0, 'rgba(214, 175, 55, 0.3)');
    goldGradient.addColorStop(1, 'rgba(214, 175, 55, 0.0)');

    financialChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Flujo de Activos',
                data: dataPoints,
                borderColor: '#d4af37',
                borderWidth: 2,
                pointBackgroundColor: '#d4af37',
                pointRadius: 3,
                fill: true,
                backgroundColor: goldGradient,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#6b7280', font: { size: 10 } } }
            }
        }
    });
}

// ========================================
// ENRUTADOR DE NAVEGACIÓN INTERNA (SPA)
// ========================================
function navigateToView(viewId) {
    document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");

    document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
    document.querySelector(`[data-target="${viewId}"]`)?.classList.add("active");

    // Reiniciar sub-vista al cambiar o regresar a la pestaña de pagos
    if (viewId === "view-payments") {
        closeEntertainmentSubPage();
    }
}

// ========================================
// UTILERÍAS DE FORMATO
// ========================================
function formatMoney(num) {
    return Number(num).toLocaleString("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format optimizado para etiquetas scannables de Chart.js
function formatFecha(f) {
    if (!f) return "";
    return new Date(f).toLocaleDateString("es-GT", { day: 'numeric', month: 'short' });
}

// ========================================
// CIERRE DE SESIÓN SEGURO
// ========================================
function logout() {
    appState = {
        cliente: null,
        cuentaId: null,
        saldo: 0,
        movimientos: []
    };

    if (financialChartInstance) {
        financialChartInstance.destroy();
        financialChartInstance = null;
    }

    document.getElementById("main-app").classList.add("hidden");
    document.getElementById("auth-container").classList.remove("hidden");
    
    document.getElementById("form-login").reset();
    switchAuthForm("login");

    showToast("Sesión cerrada de manera segura ✅", "normal");
}

// ========================================
// CONTROLADOR DE NOTIFICACIONES TOAST
// ========================================
function showToast(msg, type = "normal") {
    const c = document.getElementById("toast-container");
    if(!c) return;

    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = msg;

    c.appendChild(t);

    setTimeout(() => {
        t.style.opacity = "0";
        t.style.transform = "translateY(10px)";
        t.style.transition = "all 0.4s ease";
        setTimeout(() => t.remove(), 400);
    }, 3500);
}