// =============================
// CONFIGURACIÓN GENERAL
// =============================
const API = "https://api-banco-services.azurewebsites.net";
let cuentaId = null;
let clienteActual = null;


// =============================
// UTILIDADES
// =============================

// Formato dinero Q14,885.00
function formatMoney(num){
    return Number(num).toLocaleString("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Mostrar alertas más limpias
function mostrarMensaje(msg){
    alert(msg);
}


// =============================
// CONTROL DE VISTAS
// =============================

function mostrar(seccion){

    document.querySelectorAll(".section").forEach(sec => {
        sec.classList.add("hidden");
    });

    document.getElementById(seccion).classList.remove("hidden");

    // Cargar dinámicamente
    if(seccion === "movimientos"){
        cargarMovimientos();
    }
}

// Mostrar login
function mostrarLogin(){
    document.getElementById("app").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
}


// =============================
// LOGIN
// =============================
function login(){

    let dpi = document.getElementById("dpiLogin").value;
    let password = document.getElementById("passLogin").value;

    if(!dpi || !password){
        mostrarMensaje("Completa todos los campos");
        return;
    }

    fetch(`${API}/api/Cliente/login?dpi=${dpi}&password=${password}`, {
        method: "POST"
    })
    .then(res => {
        if(!res.ok) throw new Error("Credenciales incorrectas");
        return res.json();
    })
    .then(cliente => {

        clienteActual = cliente;

        // Crear cuenta automática (tu backend lo maneja así)
        return fetch(`${API}/api/Cuenta/crear?clienteId=${cliente.id}`,{
            method:"POST"
        });
    })
    .then(res => res.json())
    .then(cuenta => {

        cuentaId = cuenta.id;

        // Camila vista
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");

        // Mostrar tarjeta
        document.getElementById("tarjeta").innerText = cuenta.numeroTarjeta;
        document.getElementById("cvv").innerText = "CVV: " + cuenta.cvv;

        iniciarApp();
    })
    .catch(err => {
        console.error(err);
        mostrarMensaje("Error en login");
    });
}


// =============================
// REGISTRO (SI LO USAS)
// =============================
function registrar(){

    let nombre = document.getElementById("nombre")?.value;
    let dpi = document.getElementById("dpiRegistro")?.value;
    let pass = document.getElementById("passRegistro")?.value;

    if(!nombre || !dpi || !pass){
        mostrarMensaje("Completa todos los campos");
        return;
    }

    fetch(`${API}/api/Cliente/registro?nombre=${nombre}&dpi=${dpi}&password=${pass}`,{
        method:"POST"
    })
    .then(res=>res.json())
    .then(()=>{
        mostrarMensaje("Cuenta creada ✅");
    })
    .catch(()=>{
        mostrarMensaje("Error al registrar");
    });
}


// =============================
// INICIO DE APP
// =============================
function iniciarApp(){
    actualizarSaldo();
    cargarMovimientos();
}


// =============================
// SALDO
// =============================
function actualizarSaldo(){

    fetch(`${API}/api/Cuenta/saldo?cuentaId=${cuentaId}`)
    .then(res=>res.json())
    .then(data=>{
        document.getElementById("saldo").innerText = formatMoney(data.saldo);
    })
    .catch(()=>{
        mostrarMensaje("Error al obtener saldo");
    });
}


// =============================
// DEPÓSITO
// =============================
function depositar(){

    let monto = document.getElementById("depositoMonto")?.value;

    if(!monto){
        mostrarMensaje("Ingresa un monto");
        return;
    }

    fetch(`${API}/api/Cuenta/deposito?cuentaId=${cuentaId}&monto=${monto}`,{
        method:"POST"
    })
    .then(()=>{
        mostrarMensaje("Depósito realizado ✅");
        actualizarSaldo();
        cargarMovimientos();
    })
    .catch(()=>{
        mostrarMensaje("Error en depósito");
    });
}


// =============================
// TRANSFERENCIAS
// =============================
function transferir(){

    let destino = document.getElementById("cuentaDestino").value;
    let monto = document.getElementById("montoTransfer").value;

    if(!destino || !monto){
        mostrarMensaje("Completa todos los campos");
        return;
    }

    fetch(`${API}/api/Banco/transferir?origenId=${cuentaId}&destinoId=${destino}&monto=${monto}`,{
        method:"POST"
    })
    .then(()=>{
        mostrarMensaje("Transferencia exitosa ✅");
        actualizarSaldo();
        cargarMovimientos();
    })
    .catch(()=>{
        mostrarMensaje("Error en transferencia");
    });
}


// =============================
// PAGOS DE SERVICIO
// =============================
function pagar(){

    let monto = document.getElementById("pagoMonto").value;
    let tipo = document.getElementById("tipoServicio").value;

    if(!monto){
        mostrarMensaje("Ingresa monto");
        return;
    }

    fetch(`${API}/api/Banco/procesar?cuentaId=${cuentaId}&monto=${monto}&servicio=${tipo}`,{
        method:"POST"
    })
    .then(()=>{
        mostrarMensaje("Pago realizado ✅");
        actualizarSaldo();
        cargarMovimientos();
    })
    .catch(()=>{
        mostrarMensaje("Error en pago");
    });
}


// =============================
// MOVIMIENTOS
// =============================
function cargarMovimientos(){

    fetch(`${API}/api/Movimiento?cuentaId=${cuentaId}`)
    .then(res=>res.json())
    .then(data=>{

        let lista = document.getElementById("listaMovimientos");
        lista.innerHTML = "";

        if(data.length === 0){
            lista.innerHTML = "<li>No hay movimientos</li>";
            return;
        }

        data.forEach(m => {

            let li = document.createElement("li");

            li.innerText =
                `${m.tipo} - Q${formatMoney(m.monto)} - ${formatearFecha(m.fecha)}`;

            lista.appendChild(li);
        });

    })
    .catch(()=>{
        mostrarMensaje("Error al cargar movimientos");
    });
}


// =============================
// FORMATO FECHA
// =============================
function formatearFecha(fecha){
    if(!fecha) return "";
    let f = new Date(fecha);
    return f.toLocaleDateString("es-GT") + " " + f.toLocaleTimeString("es-GT");
}


// =============================
// LOGOUT
// =============================
function logout(){

    cuentaId = null;
    clienteActual = null;

    // Limpieza visual
    document.getElementById("listaMovimientos").innerHTML = "";
    document.getElementById("saldo").innerText = "0.00";

    // Cambio de vista
    document.getElementById("app").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");

    mostrarMensaje("Sesión cerrada ✅");
}