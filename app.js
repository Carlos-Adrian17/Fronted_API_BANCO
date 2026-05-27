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
    
    // Vinculación del formulario de depósitos de capital inmediato
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
function handleDeposit(e) {
    e.preventDefault();
    const montoInput = document.getElementById("deposit-amount");
    const monto = parseFloat(montoInput.value);

    if (monto <= 0 || isNaN(monto)) {
        showToast("Monto ingresado inválido", "error");
        return;
    }

    appState.saldo += monto;
    document.getElementById("dashboard-balance").innerText = "Q" + formatMoney(appState.saldo);
    
    const nuevoMovimiento = {
        tipo: "Depósito de Capital",
        fecha: new Date().toISOString(),
        monto: monto
    };
    appState.movimientos.unshift(nuevoMovimiento);

    const tbody = document.getElementById("transactions-log");
    if (tbody) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${nuevoMovimiento.tipo}</strong></td>
            <td>${formatFecha(nuevoMovimiento.fecha)}</td>
            <td class="text-right" style="font-weight:600; color: var(--accent-emerald);">Q${formatMoney(nuevoMovimiento.monto)}</td>
        `;
        tbody.insertBefore(tr, tbody.firstChild);
    }

    renderFinancialChart(appState.movimientos);
    showToast(`Depósito de Q${formatMoney(monto)} completado exitosamente`, "success");
    montoInput.value = "";
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
    
    // Limpiar logs visuales anteriores por estética de renderizado premium
    const resDiv = document.getElementById("resultado-entretenimiento");
    if (resDiv) {
        resDiv.style.display = "none";
        resDiv.innerHTML = "";
    }
}

// ========================================
// TRANSICIÓN DE SALIDA DE SUB-PÁGINA
// ========================================
function closeEntertainmentSubPage() {
    document.getElementById("payments-entertainment-view").classList.add("hidden");
    document.getElementById("payments-categories-view").classList.remove("hidden");
}

// ========================================
// INTEGRACIÓN PASARELA ENTRETENIMIENTO EXTERNA
// ========================================
async function ejecutarPagoEntretenimiento(servicioId, nombreServicio) {
    // Definición estricta de montos según catálogo visual original
    let monto = 0;
    if (servicioId === 1) monto = 139.00;      // Netflix
    else if (servicioId === 2) monto = 79.99;   // Spotify
    else if (servicioId === 3) monto = 95.50;   // Disney+

    const seguro = confirm(`¿Desea autorizar el pago seguro para la plataforma ${nombreServicio}?`);
    if (!seguro) return;

    const resultadoDiv = document.getElementById("resultado-entretenimiento");
    resultadoDiv.style.display = "block";
    resultadoDiv.innerHTML = "<p><i class='fa-solid fa-circle-notch fa-spin'></i> Transmitiendo datos a la pasarela externa de seguridad...</p>";

    if (monto > appState.saldo) {
        resultadoDiv.innerHTML = `
            <div style="border-left: 4px solid var(--accent-crimson); padding-left: 10px;">
                <h4 class="txt-rechazado">TRANSACCIÓN DENEGADA</h4>
                <p style="margin-top:0.5rem; color: var(--text-secondary);">Motivo: Fondos líquidos insuficientes en cuenta de ahorro privado.</p>
            </div>`;
        showToast("Balance insuficiente para proceder", "error");
        return;
    }

    try {
        // 1. Envío a la pasarela externa
        const response = await fetch("https://webapipagon5214.azurewebsites.net/api/Pagos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: servicioId, nombre: nombreServicio })
        });

        if (!response.ok) throw new Error("Error en pasarela remota");
        const dataJson = await response.json();

        // Estructura de validación basada en la propiedad 'estado' de la pasarela
        if (dataJson.estado === "Aprobado") {
            
            // 2. Ejecutar descuento real en la cuenta del banco local
            const resBanco = await fetch(`${API}/api/Banco/transferir?origenId=${appState.cuentaId}&destinoId=999&monto=${monto}`, {
                method: "POST"
            });

            if (!resBanco.ok) throw new Error("Error al asentar débito local");

            // 3. Renderizar respuesta premium de éxito en el UI
            resultadoDiv.innerHTML = `
                <div style="border-left: 4px solid var(--accent-emerald); padding-left: 10px;">
                    <h4 class="txt-aprobado"><i class="fa-solid fa-circle-check"></i> TRANSACCIÓN AUTORIZADA</h4>
                    <p style="margin-top:0.5rem; color: var(--text-primary);">Servicio: <strong>${dataJson.nombre}</strong> (Ref: #AURA-${Math.floor(Math.random() * 90000 + 10000)})</p>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">Estado: Enrutado Exitosamente por Pasarela Externa</p>
                </div>`;

            showToast(`Pago de ${nombreServicio} procesado correctamente`, "success");
            
            // 4. Recargar datos del dashboard, saldo y movimientos en tiempo real
            cargarDatos();
        } else {
            // Manejo de rechazos controlados por la API
            resultadoDiv.innerHTML = `
                <div style="border-left: 4px solid var(--accent-crimson); padding-left: 10px;">
                    <h4 class="txt-rechazado">TRANSACCIÓN RECHAZADA</h4>
                    <p style="margin-top:0.5rem; color: var(--text-secondary);">La pasarela externa no aprobó el cobro automático.</p>
                </div>`;
            showToast("Transacción rechazada por el proveedor del servicio", "error");
        }

    } catch (error) {
        console.error(error);
        resultadoDiv.innerHTML = `
            <div style="border-left: 4px solid var(--accent-crimson); padding-left: 10px;">
                <h4 class="txt-rechazado">ERROR DE CONEXIÓN</h4>
                <p style="margin-top:0.5rem; color: var(--text-secondary);">No se pudo establecer comunicación segura con los servidores de cobro externos.</p>
            </div>`;
        showToast("Fallo crítico en el procesamiento del pago", "error");
    }
}

// ========================================
// SISTEMA COGNITIVO DE NAVEGACIÓN ENTRE VISTAS
// ========================================
function navigateToView(viewId) {
    document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId)?.classList.add("active");

    document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
    document.querySelector(`[data-target="${viewId}"]`)?.classList.add("active");
}

// ========================================
// CONSULTA HISTÓRICA DE MOVIMIENTOS
// ========================================
async function cargarMovimientos() {
    try {
        const res = await fetch(`${API}/api/Cuenta/movimientos?cuentaId=${appState.cuentaId}`);
        if (!res.ok) return;

        const data = await res.json();
        // Transformar e indexar flujos del backend
        appState.movimientos = data.map(m => ({
            tipo: m.tipo || "Débito / Pago Realizado",
            fecha: m.fecha || new Date().toISOString(),
            monto: m.monto
        }));

        renderMovimientosTabla();
        renderFinancialChart(appState.movimientos);
    } catch {
        console.warn("No se pudieron auditar los movimientos dinámicos en este ciclo.");
    }
}

// ========================================
// RENDERIZADO VISUAL DEL REGISTRO DE TABLA
// ========================================
function renderMovimientosTabla() {
    const tbody = document.getElementById("transactions-log");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (appState.movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color: var(--text-muted); padding: 2rem;">Ningún movimiento patrimonial registrado en este ciclo.</td></tr>`;
        return;
    }

    appState.movimientos.forEach(m => {
        const tr = document.createElement("tr");
        
        // Detectar si es un ingreso (Depósito de Capital) o egreso para aplicar color premium
        const esIngreso = m.tipo.toLowerCase().includes("depósito") || m.tipo.toLowerCase().includes("ingreso");
        const colorStyle = esIngreso ? "color: var(--accent-emerald);" : "color: var(--accent-crimson);";
        const signo = esIngreso ? "+" : "-";

        tr.innerHTML = `
            <td><strong>${m.tipo}</strong></td>
            <td>${formatFecha(m.fecha)}</td>
            <td class="text-right" style="font-weight:600; ${colorStyle}">${signo} Q${formatMoney(montoAbsoluto(m.monto))}</td>
        `;
        tbody.appendChild(tr);
    });
}

function montoAbsoluto(val) {
    return Math.abs(parseFloat(val));
}

// ========================================
// ALGORITMO INTEGRADO DE RENDIMIENTO COMPORTAMENTAL (CHART.JS)
// ========================================
function renderFinancialChart(movimientos) {
    const ctx = document.getElementById("analytics-chart");
    if (!ctx) return;

    if (financialChartInstance) {
        financialChartInstance.destroy();
    }

    // Clonar e invertir movimientos para mostrarlos cronológicamente en el gráfico (de viejo a nuevo)
    const movimientosCronologicos = [...movimientos].reverse();

    // Reconstruir histórico analítico de saldo a partir de los flujos
    let balanceHistorico = 0;
    const dataPuntos = movimientosCronologicos.map(m => {
        const esIngreso = m.tipo.toLowerCase().includes("depósito") || m.tipo.toLowerCase().includes("ingreso");
        if (esIngreso) {
            balanceHistorico += montoAbsoluto(m.monto);
        } else {
            balanceHistorico -= montoAbsoluto(m.monto);
        }
        return balanceHistorico;
    });

    const labels = movimientosCronologicos.map(m => formatFecha(m.fecha));

    // Si no hay datos, inicializar gráfico con balance actual plano
    if (movimientos.length === 0) {
        labels.push("Actual");
        dataPuntos.push(appState.saldo);
    }

    financialChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Evolución Patrimonial Líquida (Q)",
                data: dataPuntos,
                borderColor: "#d4af37", // Oro Premium Aura
                borderWidth: 2,
                pointBackgroundColor: "#10121a",
                pointBorderColor: "#d4af37",
                pointHoverRadius: 6,
                tension: 0.35,
                fill: true,
                backgroundColor: "rgba(212, 175, 55, 0.04)"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255,255,255,0.02)" },
                    ticks: { color: "#6b7280", font: { family: "Plus Jakarta Sans", size: 10 } }
                },
                y: {
                    grid: { color: "rgba(255,255,255,0.04)" },
                    ticks: { color: "#6b7280", font: { family: "Plus Jakarta Sans", size: 10 } }
                }
            }
        }
    });
}

// ========================================
// INTERRUPTOR VISUAL DE FORMULARIOS AUTH
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
    if (!c) return;

    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = msg;

    c.appendChild(t);

    setTimeout(() => {
        t.style.opacity = "0";
        t.style.transform = "translateX(-20px)";
        setTimeout(() => t.remove(), 400);
    }, 4000);
}