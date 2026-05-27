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

let financialChartInstance = null;


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
    document.getElementById("form-deposito")?.addEventListener("submit", handleDeposito);

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

        const resCuenta = await fetch(`${API}/api/Cuenta/crear?clienteId=${cliente.id}`, {
            method: "POST"
        });

        const cuenta = await resCuenta.json();
        appState.cuentaId = cuenta.id;

        enterApp(cuenta);

    } catch {
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

    await fetch(`${API}/api/Cliente/registro?nombre=${nombre}&dpi=${dpi}&correo=${correo}&telefono=${telefono}&direccion=${direccion}&password=${password}`, {
        method: "POST"
    });

    showToast("Registro exitoso ✅", "success");
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

    const res = await fetch(`${API}/api/Cuenta/saldo?cuentaId=${appState.cuentaId}`);
    const data = await res.json();

    appState.saldo = data.saldo;

    document.getElementById("dashboard-balance").innerText =
        "Q" + formatMoney(appState.saldo);
}


// ========================================
// ✅ DEPOSITO (NUEVO)
// ========================================
async function handleDeposito(e){

    e.preventDefault();

    const monto = parseFloat(document.getElementById("deposito-monto").value);

    if(monto <= 0){
        showToast("Monto inválido","error");
        return;
    }

    try{

        // Simulación si no tienes endpoint
        appState.saldo += monto;

        showToast("Depósito realizado ✅","success");

        actualizarSaldo();
        document.getElementById("form-deposito").reset();

        navigateToView("view-dashboard");

    }catch{
        showToast("Error en depósito","error");
    }
}


// ========================================
// TRANSFERENCIAS (INTOCADO)
// ========================================
async function handleTransfer(e) {

    e.preventDefault();

    const destino = document.getElementById("transfer-account").value;
    const monto = parseFloat(document.getElementById("transfer-amount").value);

    if (monto > appState.saldo) {
        showToast("Fondos insuficientes", "error");
        return;
    }

    await fetch(`${API}/api/Banco/transferir?origenId=${appState.cuentaId}&destinoId=${destino}&monto=${monto}`, {
        method: "POST"
    });

    showToast("Transferencia realizada ✅", "success");

    cargarDatos();
}


// ========================================
// MOVIMIENTOS + GRAFICO
// ========================================
async function cargarMovimientos() {

    const res = await fetch(`${API}/api/Movimiento?cuentaId=${appState.cuentaId}`);
    const data = await res.json();

    appState.movimientos = data;

    const tbody = document.getElementById("transactions-log");
    tbody.innerHTML = "";

    data.forEach(m => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${m.tipo}</td>
            <td>${formatFecha(m.fecha)}</td>
            <td>Q${formatMoney(m.monto)}</td>
        `;

        tbody.appendChild(tr);
    });

    renderFinancialChart(data);
}


// ========================================
// GRAFICO (RESTAURADO)
// ========================================
function renderFinancialChart(movimientos){

    const ctx=document.getElementById("analytics-chart");
    if(!ctx) return;

    if(financialChartInstance){
        financialChartInstance.destroy();
    }

    financialChartInstance=new Chart(ctx,{
        type:"line",
        data:{
            labels:movimientos.map(m=>formatFecha(m.fecha)),
            datasets:[{
                label:"Movimientos",
                data:movimientos.map(m=>m.monto),
                borderColor:"#d4af37",
                fill:false
            }]
        }
    });
}


// ========================================
// ENTRETENIMIENTO
// ========================================
async function pagarEntretenimiento(servicioId){

    const box=document.getElementById("resultado-entretenimiento");

    box.innerHTML="Procesando...";

    try{

        const res=await fetch("https://webapipagon5214.azurewebsites.net/api/Pagos/pagar",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                servicioId:servicioId,
                usuarioBancoId:appState.cuentaId
            })
        });

        const data=await res.json();

        box.innerHTML=`
            ✅ ${data.pago.servicio}<br>
            Q${data.pago.monto}
        `;

        cargarDatos();

    }catch{
        box.innerHTML="Error";
    }
}


// ========================================
// HISTORIAL
// ========================================
async function cargarHistorialPagos(){

    const cont=document.getElementById("tabla-pagos");

    const res=await fetch("https://webapipagon5214.azurewebsites.net/api/Pagos");
    const data=await res.json();

    let html="<table class='premium-table'><tr><th>ID</th><th>Servicio</th><th>Monto</th></tr>";

    data.forEach(p=>{
        html+=`
        <tr>
        <td>${p.id}</td>
        <td>${p.servicio}</td>
        <td>Q${p.monto}</td>
        </tr>`;
    });

    html+="</table>";

    cont.innerHTML=html;
}


// ========================================
// NAVEGAR
// ========================================
function navigateToView(viewId){

    document.querySelectorAll(".app-view").forEach(v=>v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
}


// ========================================
// FORMATOS
// ========================================
function formatMoney(num){
    return Number(num).toLocaleString("es-GT",{minimumFractionDigits:2});
}

function formatFecha(f){
    return new Date(f).toLocaleDateString("es-GT");
}


// ========================================
// LOGOUT
// ========================================
function logout(){
    location.reload();
}


// ========================================
// TOAST
// ========================================
function showToast(msg,type="normal"){

    const c=document.getElementById("toast-container");

    const t=document.createElement("div");
    t.className=`toast ${type}`;
    t.innerText=msg;

    c.appendChild(t);

    setTimeout(()=>t.remove(),3000);
}