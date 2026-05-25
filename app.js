let cuentaId = null;

const API_URL = "https://api-banco-services.azurewebsites.net";

// =========================
// CAMBIO DE VISTAS
// =========================
function mostrarRegistro() {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("registro").classList.remove("hidden");
}

function mostrarLogin() {
    document.getElementById("registro").classList.add("hidden");
    document.getElementById("login").classList.remove("hidden");
}


// =========================
// LOGIN
// =========================
function login() {
    let dpi = document.getElementById("dpiLogin").value;
    let password = document.getElementById("passLogin").value;

    fetch(`${API_URL}/api/Cliente/login?dpi=${dpi}&password=${password}`, {
        method: "POST"
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(cliente => {

        // Crear cuenta si no existe
        return fetch(`${API_URL}/api/Cuenta/crear?clienteId=${cliente.id}`, {
            method: "POST"
        });

    })
    .then(res => res.json())
    .then(cuenta => {

        cuentaId = cuenta.id;

        document.getElementById("login").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");

        // Mostrar tarjeta
        document.getElementById("tarjeta").innerText = cuenta.numeroTarjeta;
        document.getElementById("cvv").innerText = "CVV: " + cuenta.cvv;

        cargarDatos();
    })
    .catch(() => alert("Credenciales incorrectas"));
}


// =========================
// REGISTRO
// =========================
function registrar() {

    let nombre = document.getElementById("nombre").value;
    let dpi = document.getElementById("dpiRegistro").value;
    let password = document.getElementById("passRegistro").value;

    fetch(`${API_URL}/api/Cliente/registro?nombre=${nombre}&dpi=${dpi}&password=${password}`, {
        method: "POST"
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(() => {
        alert("Cuenta creada correctamente ✅");
        mostrarLogin();
    })
    .catch(() => alert("Error al registrar"));
}


// =========================
// CARGAR DATA
// =========================
function cargarDatos() {
    actualizarSaldo();
    cargarMovimientos();
}


// =========================
// SALDO
// =========================
function actualizarSaldo() {

    fetch(`${API_URL}/api/Cuenta/saldo?cuentaId=${cuentaId}`)
    .then(res => res.json())
    .then(data => {
        document.getElementById("saldo").innerText = data.saldo;
    });
}


// =========================
// DEPOSITO
// =========================
function depositar() {

    let monto = document.getElementById("depositoMonto").value;

    fetch(`${API_URL}/api/Cuenta/deposito?cuentaId=${cuentaId}&monto=${monto}`, {
        method: "POST"
    })
    .then(() => {
        alert("Depósito realizado ✅");
        cargarDatos();
    });
}


// =========================
// PAGO (SERVICIO EXTERNO)
// =========================
function pagar() {

    let monto = document.getElementById("pagoMonto").value;

    fetch(`${API_URL}/api/Banco/procesar?cuentaId=${cuentaId}&monto=${monto}&servicio=Servicio`, {
        method: "POST"
    })
    .then(res => res.json())
    .then(data => {
        alert(data.mensaje || "Pago realizado ✅");
        cargarDatos();
    });
}


// =========================
// TRANSFERENCIA
// =========================
function transferir() {

    let destino = document.getElementById("cuentaDestino").value;
    let monto = document.getElementById("montoTransfer").value;

    fetch(`${API_URL}/api/Banco/transferir?origenId=${cuentaId}&destinoId=${destino}&monto=${monto}`, {
        method: "POST"
    })
    .then(() => {
        alert("Transferencia realizada ✅");
        cargarDatos();
    });
}


// =========================
// MOVIMIENTOS
// =========================
function cargarMovimientos() {

    fetch(`${API_URL}/api/Movimiento?cuentaId=${cuentaId}`)
    .then(res => res.json())
    .then(data => {

        let lista = document.getElementById("movimientos");
        lista.innerHTML = "";

        data.forEach(m => {
            let li = document.createElement("li");
            li.innerText = `${m.tipo} - Q${m.monto}`;
            lista.appendChild(li);
        });

    });
}


// =========================
// LOGOUT
// =========================
function logout() {
    location.reload();
}
