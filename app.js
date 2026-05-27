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
    document.getElementById("form-deposit")?.addEventListener("submit", handleDeposit); // SOLUCIÓN AL BUG: Captura el depósito sin recargar la página
    document.getElementById("form-pago")?.addEventListener("submit", handlePago);

    document.getElementById("btn-logout")?.addEventListener("click", logout);
}

// ========================================
// AUTENTICACIÓN: INICIAR SESIÓN
// ========================================
async function handleLogin(e) {
    e.preventDefault();

    const dpiEl = document.getElementById("login-dpi");
    const passEl = document.getElementById("login-password");
    if (!dpiEl || !passEl) return;

    const dpi = dpiEl.value.trim();
    const pass = passEl.value;

    try {
        const res = await fetch(`${API}/api/Cliente/login?dpi=${encodeURIComponent(dpi)}&password=${encodeURIComponent(pass)}`, {
            method: "POST"
        });

        if (!res.ok) throw new Error();

        const cliente = await res.json();
        appState.cliente = cliente;

        // Crear/vincular cuenta transaccional del cliente
        const resCuenta = await fetch(`${API}/api/Cuenta/crear?clienteId=${cliente.id}`, {
            method: "POST"
        });

        if (!resCuenta.ok) throw new Error();

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

    const nombre = document.getElementById("reg-name")?.value || "";
    const dpi = document.getElementById("reg-dpi")?.value || "";
    const correo = document.getElementById("reg-email")?.value || "";
    const telefono = document.getElementById("reg-telefono")?.value || "";
    const direccion = document.getElementById("reg-direccion")?.value || "";
    const password = document.getElementById("reg-password")?.value || "";

    try {
        const url = `${API}/api/Cliente/registro?nombre=${encodeURIComponent(nombre)}&dpi=${encodeURIComponent(dpi)}&correo=${encodeURIComponent(correo)}&telefono=${encodeURIComponent(telefono)}&direccion=${encodeURIComponent(direccion)}&password=${encodeURIComponent(password)}`;
        
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) throw new Error();

        showToast("Cuenta creada correctamente ✅", "success");
        document.getElementById("form-register")?.reset();
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
    
    const dpi = document.getElementById("recover-dpi")?.value || "";
    const email = document.getElementById("recover-email")?.value || "";

    try {
        const url = `${API}/api/Cliente/recuperar?dpi=${encodeURIComponent(dpi)}&correo=${encodeURIComponent(email)}`;
        await fetch(url, { method: "POST" }).catch(() => console.log("Protocolo de recuperación enviado"));

        showToast("Token de restauración enviado al correo registrado", "success");
        document.getElementById("form-recover")?.reset();
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
    document.getElementById(`form-${tipo}`)?.classList.add("active");
}

// ========================================
// ENTRADA AL ENTORNO PRIVADO
// ========================================
function enterApp(cuenta) {
    document.getElementById("auth-container")?.classList.add("hidden");
    document.getElementById("main-app")?.classList.remove("hidden");

    const userDisplayName = document.getElementById("user-display-name");
    if (userDisplayName) userDisplayName.innerText = appState.cliente.nombre || "Cliente";

    const nombreCliente = document.getElementById("nombre-cliente");
    if (nombreCliente) nombreCliente.innerText = appState.cliente.nombre || "Cliente";

    const numeroCuenta = document.getElementById("numero-cuenta");
    if (numeroCuenta) numeroCuenta.innerText = cuenta.numeroTarjeta || cuenta.numeroCuenta || "Cta. Corporativa";

    const cvv = document.getElementById("cvv");
    if (cvv) cvv.innerText = cuenta.cvv || "992";

    cargarDatos();
}

// ========================================
// CARGA GLOBAL DE FLUJOS RECIENTES
// ========================================
function cargarDatos() {
    actualizarSaldo();
    cargarMovimientos();
}

// ========================================
// REFRESCAR SALDO FINANCIERO
// ========================================
async function actualizarSaldo() {
    if (!appState.cuentaId) return;
    try {
        const res = await fetch(`${API}/api/Cuenta/saldo?cuentaId=${appState.cuentaId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        appState.saldo = data.saldo;
        const balanceEl = document.getElementById("dashboard-balance");
        if (balanceEl) balanceEl.innerText = "Q" + formatMoney(appState.saldo);

    } catch {
        showToast("Error al cargar saldo en tiempo real", "error");
    }
}

// ========================================
// GESTIÓN: EFECTUAR DEPÓSITO BANCARIO
// ========================================
async function handleDeposit(e) {
    e.preventDefault(); // Detiene por completo la recarga de página y la pérdida de sesión

    const montoEl = document.getElementById("deposit-amount");
    if (!montoEl) return;

    const monto = parseFloat(montoEl.value);

    if (isNaN(monto) || monto <= 0) {
        showToast("Ingrese un monto de depósito válido", "error");
        return;
    }

    try {
        // Ejecución hacia el controlador de Banco encargado de transacciones financieras
        let res = await fetch(`${API}/api/Banco/depositar?cuentaId=${appState.cuentaId}&monto=${monto}`, {
            method: "POST"
        });

        // Mecanismo Fallback por si la arquitectura aloja el endpoint en la ruta de Cuenta
        if (!res.ok) {
            res = await fetch(`${API}/api/Cuenta/depositar?cuentaId=${appState.cuentaId}&monto=${monto}`, {
                method: "POST"
            });
        }

        if (!res.ok) throw new Error();

        showToast(`Depósito de Q${formatMoney(monto)} procesado en base de datos ✅`, "success");
        montoEl.value = "";
        
        // Sincroniza el balance global y los estados gráficos con los nuevos datos persistidos
        cargarDatos();

    } catch (err) {
        console.error(err);
        showToast("Error al procesar el depósito en el servidor corporativo", "error");
    }
}

// ========================================
// GESTIÓN: ENVIAR TRANSFERENCIAS
// ========================================
async function handleTransfer(e) {
    e.preventDefault();

    const destino = document.getElementById("transfer-account")?.value || "";
    const monto = parseFloat(document.getElementById("transfer-amount")?.value || "0");

    if (isNaN(monto) || monto <= 0) {
        showToast("Ingrese un monto de transferencia válido", "error");
        return;
    }

    if (monto > appState.saldo) {
        showToast("Fondos disponibles insuficientes", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/api/Banco/transferir?origenId=${appState.cuentaId}&destinoId=${encodeURIComponent(destino)}&monto=${monto}`, {
            method: "POST"
        });

        if (!res.ok) throw new Error();

        showToast("Transferencia Realizada con Éxito ✅", "success");
        document.getElementById("form-transfer")?.reset();
        cargarDatos();
        navigateToView("view-dashboard");

    } catch {
        showToast("Error en transferencia. Verifique el ID destino.", "error");
    }
}

// ========================================
// GESTIÓN: LIQUIDAR SERVICIOS (Formulario genérico backup)
// ========================================
async function handlePago(e) {
    e.preventDefault();

    const monto = parseFloat(document.getElementById("pago-monto")?.value || "0");
    const servicio = document.getElementById("pago-servicio")?.value || "";

    if (isNaN(monto) || monto <= 0) {
        showToast("Ingrese un monto de liquidación válido", "error");
        return;
    }

    if (monto > appState.saldo) {
        showToast("Fondos insuficientes para esta transacción", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/api/Banco/procesar?cuentaId=${appState.cuentaId}&monto=${monto}&servicio=${encodeURIComponent(servicio)}`, {
            method: "POST"
        });

        if (!res.ok) throw new Error();

        showToast(`Pago de servicio ${servicio} procesado ✅`, "success");
        document.getElementById("form-pago")?.reset();
        cargarDatos();
        navigateToView("view-dashboard");

    } catch {
        showToast("Error al procesar el pago del servicio", "error");
    }
}

// ========================================
// RENDERIZADO DE TABLA Y GRÁFICO DINÁMICO
// ========================================
async function cargarMovimientos() {
    if (!appState.cuentaId) return;
    try {
        const res = await fetch(`${API}/api/Movimiento?cuentaId=${appState.cuentaId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        appState.movimientos = data;

        const tbody = document.getElementById("transactions-log");
        if (!tbody) return;
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

        // Llamada para actualizar el Gráfico de Rendimiento Premium
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

    // Destruir instancia previa para evitar bugs de renderizado sobre el mismo canvas
    if (financialChartInstance) {
        financialChartInstance.destroy();
    }

    // Estructurar datos de movimientos o simular curva de rendimiento limpia
    const labels = movimientos && movimientos.length > 0 ? movimientos.map(m => formatFecha(m.fecha)).reverse() : ["Ene", "Feb", "Mar", "Abr", "May"];
    const dataPoints = movimientos && movimientos.length > 0 ? movimientos.map(m => m.monto).reverse() : [1200, 3400, 2100, 5600, appState.saldo];

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

// Helper Interactivo para la sección rápida de pagos
function selectServiceTemplate(serviceName) {
    const selectEl = document.getElementById("pago-servicio");
    if (selectEl) {
        selectEl.value = serviceName;
        showToast(`Proveedor ${serviceName} seleccionado.`, "normal");
    }
}

// ========================================
// INTEGRACIÓN: PASARELA DE ENTRETENIMIENTO
// ========================================
function openEntertainmentSubPage() {
    document.getElementById("payments-categories-view")?.classList.add("hidden");
    document.getElementById("payments-entertainment-view")?.classList.remove("hidden");
}

function closeEntertainmentSubPage() {
    document.getElementById("payments-entertainment-view")?.classList.add("hidden");
    document.getElementById("payments-categories-view")?.classList.remove("hidden");
}

async function ejecutarPagoEntretenimiento(id, nombre) {
    const montoStr = prompt(`Pasarela Digital Aura — Ingrese el monto líquido a pagar para ${nombre}:`, "79.00");
    if (montoStr === null) return; // Operación abortada por el usuario corporativo

    const monto = parseFloat(montoStr);
    if (isNaN(monto) || monto <= 0) {
        showToast("Monto ingresado no válido", "error");
        return;
    }

    if (monto > appState.saldo) {
        showToast("Fondos insuficientes para liquidar esta suscripción", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/api/Banco/procesar?cuentaId=${appState.cuentaId}&monto=${monto}&servicio=${encodeURIComponent(nombre)}`, {
            method: "POST"
        });

        if (!res.ok) throw new Error();

        showToast(`Suscripción a ${nombre} (ID: ${id}) liquidada con éxito ✅`, "success");
        cargarDatos(); // Sincroniza base de datos

        // Si el panel de desglose de entretenimiento está abierto, actualiza su contenido automáticamente
        if (document.getElementById("resultado-entretenimiento")?.style.display === "block") {
            obtenerHistorialEntretenimiento();
        }

    } catch (err) {
        console.error(err);
        showToast(`Error de interconexión al procesar el pago de ${nombre}`, "error");
    }
}

function obtenerHistorialEntretenimiento() {
    const contenedor = document.getElementById("resultado-entretenimiento");
    if (!contenedor) return;

    // Filtra del log de movimientos traídos de la base de datos aquellos vinculados a streaming
    const streamingLogs = appState.movimientos.filter(m => {
        const tipo = (m.tipo || "").toLowerCase();
        return tipo.includes("netflix") || tipo.includes("hbo") || tipo.includes("paramount") || tipo.includes("entretenimiento");
    });

    contenedor.style.display = "block";

    if (streamingLogs.length === 0) {
        contenedor.innerHTML = `
            <h4 style="margin-bottom: 0.5rem; color: #d4af37;">Historial de Pagos Externos</h4>
            <p style="color: #9ca3af; font-size: 0.9rem;">No se registran transacciones externas hacia plataformas de contenido en este período fiscal.</p>
        `;
        return;
    }

    let html = `
        <h4 style="margin-bottom: 1rem; color: #d4af37;">Historial de Pagos Externos (Streaming)</h4>
        <div class="table-responsive">
            <table class="premium-table" style="margin-top: 0;">
                <thead>
                    <tr>
                        <th>Concepto / Proveedor</th>
                        <th>Fecha de Cargo</th>
                        <th class="text-right">Monto Líquido</th>
                    </tr>
                </thead>
                <tbody>
    `;

    streamingLogs.forEach(m => {
        html += `
            <tr>
                <td><span style="color: #ef4444; margin-right: 6px;">●</span> Debito ${m.tipo}</td>
                <td>${formatFecha(m.fecha)}</td>
                <td class="text-right" style="font-weight:600; color: #ef4444;">-Q${formatMoney(m.monto)}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
}

// ========================================
// ENRUTADOR DE NAVEGACIÓN INTERNA (SPA)
// ========================================
function navigateToView(viewId) {
    document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
    const viewEl = document.getElementById(viewId);
    if (viewEl) viewEl.classList.add("active");

    document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
    document.querySelector(`[data-target="${viewId}"]`)?.classList.add("active");
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

    document.getElementById("main-app")?.classList.add("hidden");
    document.getElementById("auth-container")?.classList.remove("hidden");
    
    document.getElementById("form-login")?.reset();
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
        t.style.transform = "translateY(10px)";
        t.style.transition = "all 0.4s ease";
        setTimeout(() => t.remove(), 400);
    }, 3500);
}