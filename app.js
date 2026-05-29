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


let donationData = {
    institucionId: null,
    nombre: ""
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
    document.getElementById("form-donation")?.addEventListener("submit", procesarDonacion);
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

    // ✅ obtener numero de cuenta COMO STRING
    const destino = document.getElementById("transfer-account").value.trim();

    // ✅ monto
    const monto = parseFloat(document.getElementById("transfer-amount").value);

    // ✅ validación numero cuenta
    if (!destino) {
        showToast("Número de cuenta inválido", "error");
        return;
    }

    // ✅ validación monto
    if (isNaN(monto) || monto <= 0) {
        showToast("Monto inválido", "error");
        return;
    }

    // ✅ validar saldo en frontend
    if (monto > appState.saldo) {
        showToast("Fondos insuficientes", "error");
        return;
    }

    try {

        // ✅ LLAMADA CORRECTA AL BACKEND
        const res = await fetch(`${API}/api/Cuenta/transferir-numero?origenId=${appState.cuentaId}&numeroCuentaDestino=${destino}&monto=${monto}`, {
            method: "POST"
        });

        // ✅ manejo de error
        if (!res.ok) {
            const err = await res.json();
            showToast(err.error || "Error en transferencia", "error");
            return;
        }

        // ✅ éxito
        showToast("Transferencia realizada correctamente ✅", "success");

        // ✅ limpiar formulario
        document.getElementById("form-transfer").reset();

        // ✅ actualizar saldo
        await cargarDatos();

    } catch (error) {
        console.error(error);
        showToast("Error de conexión con el servidor", "error");
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

    await actualizarSaldoVista();

    const seguro = confirm(`¿Desea autorizar el pago para ${nombreServicio}?`);
    if (!seguro) return;

    if (appState.saldo <= 0) {
        showToast("Saldo insuficiente", "error");
        return;
    }

    const resultadoDiv = document.getElementById("resultado-entretenimiento");
    resultadoDiv.style.display = "block";
    resultadoDiv.innerHTML = "Procesando pago...";

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
        console.log("RESPUESTA ENTRETENIMIENTO:", data);

        if (data.pago && data.pago.estado === "Aprobado") {

            const monto = data.pago.monto || "0.00";
            const fecha = new Date().toLocaleString();

            resultadoDiv.innerHTML = `
                <div class="payment-card success">
                    <div class="payment-header">
                        <i class="fa-solid fa-check-circle"></i>
                        <span>PAGO APROBADO</span>
                    </div>

                    <div class="payment-body">
                        <h3>${nombreServicio}</h3>
                        <p class="amount">Q${monto}</p>
                    </div>

                    <div class="payment-footer">
                        <span>${fecha}</span>
                    </div>
                </div>
            `;

            showToast("Pago aprobado ✅", "success");
            await actualizarSaldoVista();

        } else {

            resultadoDiv.innerHTML = `
                <div class="payment-card error">
                    <div class="payment-header">
                        <i class="fa-solid fa-xmark-circle"></i>
                        <span>PAGO RECHAZADO</span>
                    </div>

                    <div class="payment-body">
                        <h3>${nombreServicio}</h3>
                        <p class="error-text">Operación no autorizada</p>
                    </div>
                </div>
            `;

            showToast("Pago rechazado", "error");
        }

    } catch (error) {
        console.error("ERROR ENTRETENIMIENTO:", error);

        resultadoDiv.innerHTML = `
            <div class="payment-card error">
                <div class="payment-header">
                    <i class="fa-solid fa-xmark-circle"></i>
                    <span>ERROR</span>
                </div>
                <div class="payment-body">
                    <p>No se pudo conectar con el servicio</p>
                </div>
            </div>
        `;
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
    closeClubsSubPage();
    closeDonationsSubPage();
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

// ========================================
// ✅ SUB-PÁGINAS CLUBS Y DONACIONES
// ========================================
function openClubsSubPage(){
    document.getElementById("payments-categories-view").classList.add("hidden");
    document.getElementById("payments-clubs-view").classList.remove("hidden");
}

function closeClubsSubPage(){
    document.getElementById("payments-clubs-view").classList.add("hidden");
    document.getElementById("payments-categories-view").classList.remove("hidden");
}

function openDonationsSubPage(){
    document.getElementById("payments-categories-view").classList.add("hidden");
    document.getElementById("payments-donations-view").classList.remove("hidden");
}

function abrirFormularioDonacion(id, nombre){
    donationData.institucionId = id;
    donationData.nombre = nombre;

    document.getElementById("donation-form-card").classList.remove("hidden");
    document.getElementById("donation-institucion").value = nombre;
}

function closeDonationsSubPage(){
    document.getElementById("payments-donations-view").classList.add("hidden");
    document.getElementById("payments-categories-view").classList.remove("hidden");
}

// ========================================
// ✅ PAGOS CLUBS
// ========================================
async function pagarClub(servicioId, nombre) {

    await actualizarSaldoVista();

    const confirmar = confirm(`¿Desea pagar ${nombre}?`);
    if (!confirmar) return;

    if (appState.saldo <= 0) {
        showToast("Saldo insuficiente", "error");
        return;
    }

    const resultadoDiv = document.getElementById("resultado-clubs");
    resultadoDiv.style.display = "block";
    resultadoDiv.innerHTML = "Procesando pago...";

    try {

        const response = await fetch("https://apiclub-arg4e0cravhhgxfa.mexicocentral-01.azurewebsites.net/api/Pagos/pagar", {
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
        console.log("RESPUESTA CLUB:", data);

        if (data.pago && data.pago.estado === "Aprobado") {

            const monto = data.pago.monto || "0.00";
            const fecha = new Date().toLocaleString();

            resultadoDiv.innerHTML = `
                <div class="payment-card success">
                    <div class="payment-header">
                        <i class="fa-solid fa-check-circle"></i>
                        <span>PAGO APROBADO</span>
                    </div>

                    <div class="payment-body">
                        <h3>${nombre}</h3>
                        <p class="amount">Q${monto}</p>
                    </div>

                    <div class="payment-footer">
                        <span>${fecha}</span>
                    </div>
                </div>
            `;

            showToast("Pago aprobado ✅", "success");
            await actualizarSaldoVista();

        } else {

            resultadoDiv.innerHTML = `
                <div class="payment-card error">
                    <div class="payment-header">
                        <i class="fa-solid fa-xmark-circle"></i>
                        <span>PAGO RECHAZADO</span>
                    </div>

                    <div class="payment-body">
                        <h3>${nombre}</h3>
                        <p class="error-text">Operación no autorizada</p>
                    </div>
                </div>
            `;

            showToast("Pago rechazado", "error");
        }

    } catch (error) {
        console.error("ERROR CLUB:", error);

        resultadoDiv.innerHTML = `
            <div class="payment-card error">
                <div class="payment-header">
                    <i class="fa-solid fa-xmark-circle"></i>
                    <span>ERROR</span>
                </div>
                <div class="payment-body">
                    <p>No se pudo conectar con el servicio</p>
                </div>
            </div>
        `;
    }
}


// ========================================
// ✅ DONACIONES
// ========================================

// ✅ ELIMINAR donar() (ya no se usa confirm ni prompt)
        async function procesarDonacion(e){
            e.preventDefault();

            // ✅ validar institución
            if (!donationData.institucionId) {
                showToast("Seleccione una institución", "error");
                return;
            }

            // ✅ obtener monto
            const montoInput = document.getElementById("donation-amount");
            const monto = parseFloat(montoInput.value);

            // ✅ validar monto
            if (isNaN(monto) || monto <= 0) {
                showToast("Monto inválido", "error");
                return;
            }

            // ✅ validar saldo
            if (appState.saldo < monto) {
                showToast("Saldo insuficiente", "error");
                return;
            }

            try {


            
            const res = await fetch("https://donacionesapi.azurewebsites.net/api/Donaciones/procesar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                institucionId: Number(donationData.institucionId),
                cuentaId: appState.cuentaId,
                montoTotal: Number(monto)
            })
        });

        // ✅ leer respuesta correctamente
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("RESPUESTA:", text);

        // ✅ manejo de error API
        if (!res.ok) {
            showToast("Error API: " + text, "error");
            return;
        }

        // ✅ éxito
        showToast("Donación realizada ✅", "success");

        // ✅ limpiar formulario
        montoInput.value = "";

        // ✅ ocultar formulario
        document.getElementById("donation-form-card").classList.add("hidden");

        // ✅ resetear institución (importante)
        donationData = { institucionId: null, nombre: "" };

        // ✅ actualizar saldo
        await actualizarSaldoVista();


    } catch (error) {
        console.error(error);
        showToast("Error en donación", "error");
    }
}