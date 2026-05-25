const API = "https://api-banco-services.azurewebsites.net";
let cuentaId = null;

// =====================
// CAMBIO DE VISTAS
// =====================
function mostrar(sec){
    document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
    document.getElementById(sec).classList.remove("hidden");

    if(sec === "movimientos") cargarMovimientos();
}

// =====================
// FORMATO DINERO
// =====================
function formatMoney(num){
    return Number(num).toLocaleString("es-GT", {
        minimumFractionDigits:2
    });
}

// =====================
// LOGIN
// =====================
function login(){

    let dpi = document.getElementById("dpiLogin").value;
    let pass = document.getElementById("passLogin").value;

    fetch(`${API}/api/Cliente/login?dpi=${dpi}&password=${pass}`,{method:"POST"})
    .then(r=>{
        if(!r.ok) throw new Error();
        return r.json();
    })
    .then(cliente => {

        return fetch(`${API}/api/Cuenta/crear?clienteId=${cliente.id}`, {method:"POST"});
    })
    .then(r=>r.json())
    .then(cuenta => {

        cuentaId = cuenta.id;

        document.getElementById("login").style.display="none";
        document.getElementById("app").style.display="flex";

        document.getElementById("tarjeta").innerText = cuenta.numeroTarjeta;
        document.getElementById("cvv").innerText = "CVV: " + cuenta.cvv;

        cargarDashboard();
    })
    .catch(()=>alert("Login incorrecto"));
}

// =====================
// REGISTRO
// =====================
function registrar(){

    let nombre = document.getElementById("nombre").value;
    let dpi = document.getElementById("dpiRegistro").value;
    let pass = document.getElementById("passRegistro").value;

    fetch(`${API}/api/Cliente/registro?nombre=${nombre}&dpi=${dpi}&password=${pass}`,{
        method:"POST"
    })
    .then(()=>alert("Cuenta creada ✅"));
}

// =====================
// DASHBOARD
// =====================
function cargarDashboard(){
    actualizarSaldo();
    cargarMovimientos();
}

function actualizarSaldo(){
    fetch(`${API}/api/Cuenta/saldo?cuentaId=${cuentaId}`)
    .then(r=>r.json())
    .then(d=>{
        document.getElementById("saldo").innerText = formatMoney(d.saldo);
    });
}

// =====================
// DEPÓSITO
// =====================
function depositar(){

    let monto = document.getElementById("depositoMonto").value;

    fetch(`${API}/api/Cuenta/deposito?cuentaId=${cuentaId}&monto=${monto}`,{
        method:"POST"
    }).then(()=>{
        alert("Depósito realizado ✅");
        actualizarSaldo();
    });
}

// =====================
// TRANSFERENCIA
// =====================
function transferir(){

    let destino = document.getElementById("cuentaDestino").value;
    let monto = document.getElementById("montoTransfer").value;

    fetch(`${API}/api/Banco/transferir?origenId=${cuentaId}&destinoId=${destino}&monto=${monto}`,{
        method:"POST"
    }).then(()=>{
        alert("Transferencia exitosa ✅");
        actualizarSaldo();
    });
}

// =====================
// PAGO SERVICIOS
// =====================
function pagar(){

    let monto = document.getElementById("pagoMonto").value;
    let tipo = document.getElementById("tipoServicio").value;

    fetch(`${API}/api/Banco/procesar?cuentaId=${cuentaId}&monto=${monto}&servicio=${tipo}`,{
        method:"POST"
    }).then(()=>{
        alert("Pago realizado ✅");
        actualizarSaldo();
    });
}

// =====================
// MOVIMIENTOS
// =====================
function cargarMovimientos(){

    fetch(`${API}/api/Movimiento?cuentaId=${cuentaId}`)
    .then(r=>r.json())
    .then(data=>{
        let lista = document.getElementById("listaMovimientos");
        lista.innerHTML="";

        data.forEach(m=>{
            let li = document.createElement("li");
            li.innerText = `${m.tipo} - Q${formatMoney(m.monto)}`;
            lista.appendChild(li);
        });
    });
}

// =====================
// LOGOUT
// =====================
function logout(){
    location.reload();
}