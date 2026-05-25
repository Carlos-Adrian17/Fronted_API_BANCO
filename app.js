// ========================================
// CONFIG
// ========================================
const API = "https://api-banco-services.azurewebsites.net";

let appState = {
    cliente: null,
    cuentaId: null,
    saldo: 0,
    movimientos: []
};


// ========================================
// INIT
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    actualizarSaludo();
}


// ========================================
// SALUDO
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
// EVENTOS
// ========================================
function setupEventListeners() {

    document.getElementById("form-login")?.addEventListener("submit", handleLogin);
    document.getElementById("form-register")?.addEventListener("submit", handleRegister);

    document.getElementById("form-transfer")?.addEventListener("submit", handleTransfer);
    document.getElementById("form-pago")?.addEventListener("submit", handlePago);

    document.getElementById("btn-logout")?.addEventListener("click", logout);
}


// ========================================
// LOGIN
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

        // CREAR CUENTA
        const resCuenta = await fetch(`${API}/api/Cuenta/crear?clienteId=${cliente.id}`, {
            method: "POST"
        });

        const cuenta = await resCuenta.json();
        appState.cuentaId = cuenta.id;

        enterApp(cuenta);

    } catch (err) {
        console.error(err);
        showToast("Credenciales incorrectas", "error");
    }
}


// ========================================
// REGISTRO
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

        await fetch(
            `${API}/api/Cliente/registro?nombre=${nombre}&dpi=${dpi}&correo=${correo}&telefono=${telefono}&direccion=${direccion}&password=${password}`,
            { method: "POST" }
        );

        showToast("Cuenta creada correctamente ✅", "success");

        switchAuthForm("login");

    } catch {
        showToast("Error en registro", "error");
    }
}


// ========================================
// SWITCH AUTH
// ========================================
function switchAuthForm(tipo) {

    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));

    document.getElementById(`form-${tipo}`).classList.add("active");
}


// ========================================
// ENTRAR APP
// ========================================
function enterApp(cuenta) {

    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");

    document.getElementById("user-display-name").innerText =
        appState.cliente.nombre || "Cliente";

    document.getElementById("nombre-cliente").innerText =
        appState.cliente.nombre || "Cliente";

    document.getElementById("numero-cuenta").innerText =
        cuenta.numeroTarjeta || cuenta.numeroCuenta;

    document.getElementById("cvv").innerText = cuenta.cvv;

    cargarDatos();
}


// ========================================
// DATA
// ========================================
function cargarDatos() {
    actualizarSaldo();
    cargarMovimientos();
}


// ========================================
// SALDO
// ========================================
async function actualizarSaldo() {

    try {
        const res = await fetch(`${API}/api/Cuenta/saldo?cuentaId=${appState.cuentaId}`);
        const data = await res.json();

        appState.saldo = data.saldo;

        document.getElementById("dashboard-balance").innerText =
            "Q" + formatMoney(appState.saldo);

    } catch {
        showToast("Error al cargar saldo", "error");
    }
}


// ========================================
// TRANSFERENCIAS
// ========================================
async function handleTransfer(e) {

    e.preventDefault();

    const destino = document.getElementById("transfer-account").value;
    const monto = parseFloat(document.getElementById("transfer-amount").value);

    if (monto > appState.saldo) {
        showToast("Fondos insuficientes", "error");
        return;
    }

    try {

        await fetch(`${API}/api/Banco/transferir?origenId=${appState.cuentaId}&destinoId=${destino}&monto=${monto}`, {
            method: "POST"
        });

        showToast("Transferencia realizada ✅", "success");

        cargarDatos();

    } catch {
        showToast("Error en transferencia", "error");
    }
}


// ========================================
// PAGOS
// ========================================
async function handlePago(e) {

    e.preventDefault();

    const monto = parseFloat(document.getElementById("pago-monto").value);
    const servicio = document.getElementById("pago-servicio").value;

    if (monto > appState.saldo) {
        showToast("Fondos insuficientes", "error");
        return;
    }

    try {

        await fetch(`${API}/api/Banco/procesar?cuentaId=${appState.cuentaId}&monto=${monto}&servicio=${servicio}`, {
            method: "POST"
        });

        showToast("Pago realizado ✅", "success");

        cargarDatos();

    } catch {
        showToast("Error en pago", "error");
    }
}


// ========================================
// MOVIMIENTOS
// ========================================
async function cargarMovimientos() {

    try {

        const res = await fetch(`${API}/api/Movimiento?cuentaId=${appState.cuentaId}`);
        const data = await res.json();

        const tbody = document.getElementById("transactions-log");
        tbody.innerHTML = "";

        data.forEach(m => {

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${m.tipo}</td>
                <td>${formatFecha(m.fecha)}</td>
                <td class="text-right">Q${formatMoney(m.monto)}</td>
            `;

            tbody.appendChild(tr);
        });

    } catch {
        showToast("Error al cargar movimientos", "error");
    }
}


// ========================================
// NAVEGACIÓN (FIX REAL 🔥)
// ========================================
function navigateToView(viewId) {

    // cambiar vistas
    document.querySelectorAll(".app-view").forEach(v => {
        v.classList.remove("active");
    });

    document.getElementById(viewId).classList.add("active");

    // resaltar menú
    document.querySelectorAll(".menu-item").forEach(i => {
        i.classList.remove("active");
    });

    document.querySelector(`[data-target="${viewId}"]`)?.classList.add("active");
}


// ========================================
// FORMATOS
// ========================================
function formatMoney(num) {
    return Number(num).toLocaleString("es-GT", {
        minimumFractionDigits: 2
    });
}

function formatFecha(f) {
    if (!f) return "";
    return new Date(f).toLocaleDateString("es-GT");
}


// ========================================
// LOGOUT
// ========================================
function logout() {

    appState = {
        cliente: null,
        cuentaId: null,
        saldo: 0,
        movimientos: []
    };

    document.getElementById("main-app").classList.add("hidden");
    document.getElementById("auth-container").classList.remove("hidden");

    switchAuthForm("login");

    showToast("Sesión cerrada ✅");
}


// ========================================
// TOAST
// ========================================
function showToast(msg, type = "normal") {

    const c = document.getElementById("toast-container");

    const t = document.createElement("div");

    t.className = `toast ${type}`;
    t.innerText = msg;

    c.appendChild(t);

    setTimeout(() => {
        t.remove();
    }, 3000);
}