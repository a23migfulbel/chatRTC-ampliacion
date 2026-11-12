let protocolo = 'ws';
if (location.protocol === 'https:') {
  protocolo = 'wss';
}
const ws = new WebSocket(protocolo + '://' + location.host);

let miId = '';
let miNombre = '';
let listaUsuarios = [];
let conexion = null;
let canal = null;

let streamPantalla = null;

const configuracion = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const botonCompartir = document.getElementById('shareScreenBtn');
console.log("boton compartir:", botonCompartir)

const botonDetener = document.getElementById('stopScreenBtn');
console.log("boton detener:", botonDetener)

const videoLocal = document.getElementById('localVideo');
console.log("Vídeo local:", videoLocal);

const videoRemoto = document.getElementById('remoteVideo');

const pantallaLogin = document.getElementById('login');
const pantallaUsuarios = document.getElementById('usersView');
const pantallaChat = document.getElementById('chatView');
const inputNombre = document.getElementById('nameInput');
const botonEntrar = document.getElementById('joinBtn');
const listaHTML = document.getElementById('usersList');
const nombreOtro = document.getElementById('peerName');
const zonaMensajes = document.getElementById('messages');
const inputMensaje = document.getElementById('msgInput');
const botonEnviar = document.getElementById('sendBtn');

function enviarAlServidor(objeto) {
  ws.send(JSON.stringify(objeto));
}

botonEntrar.onclick = function () {
  miNombre = inputNombre.value;
  if (miNombre === '') {
    alert('Escribe un nombre');
    return;
  }
  enviarAlServidor({ type: 'join', name: miNombre });
  pantallaLogin.classList.add('hidden');
  pantallaUsuarios.classList.remove('hidden');
};

ws.onmessage = function (evento) {
  const mensaje = JSON.parse(evento.data);

  if (mensaje.type === 'welcome') {
    miId = mensaje.id;
  }
  if (mensaje.type === 'users') {
    mostrarUsuarios(mensaje.users);
  }
  if (mensaje.type === 'offer') {
    recibirOferta(mensaje);
  }
  if (mensaje.type === 'answer') {
    recibirRespuesta(mensaje);
  }
  if (mensaje.type === 'candidate') {
    recibirCandidato(mensaje);
  }
};

function mostrarUsuarios(usuarios) {
  listaUsuarios = usuarios;
  listaHTML.innerHTML = '';

  for (let i = 0; i < usuarios.length; i++) {
    const usuario = usuarios[i];

    if (usuario.id !== miId) {
      const li = document.createElement('li');
      li.textContent = usuario.name;
      li.onclick = function () {
        llamar(usuario.id);
      };
      listaHTML.appendChild(li);
    }
  }
}

function crearConexion(idOtro) {
  conexion = new RTCPeerConnection(configuracion);

  conexion.onicecandidate = function (evento) {
    if (evento.candidate) {
      enviarAlServidor({ type: 'candidate', to: idOtro, candidate: evento.candidate });
    }
  };

  conexion.ondatachannel = function (evento) {
    configurarCanal(evento.channel);
  };
}

async function llamar(idOtro) {
  crearConexion(idOtro);

  const nuevoCanal = conexion.createDataChannel('chat');
  configurarCanal(nuevoCanal);

  const oferta = await conexion.createOffer();
  await conexion.setLocalDescription(oferta);

  enviarAlServidor({ type: 'offer', to: idOtro, sdp: conexion.localDescription });
  mostrarChat(idOtro);
}

async function recibirOferta(mensaje) {
  crearConexion(mensaje.from);

  await conexion.setRemoteDescription(mensaje.sdp);
  const respuesta = await conexion.createAnswer();
  await conexion.setLocalDescription(respuesta);

  enviarAlServidor({ type: 'answer', to: mensaje.from, sdp: conexion.localDescription });
  mostrarChat(mensaje.from);
}

async function recibirRespuesta(mensaje) {
  await conexion.setRemoteDescription(mensaje.sdp);
}

async function recibirCandidato(mensaje) {
  await conexion.addIceCandidate(mensaje.candidate);
}

function configurarCanal(nuevoCanal) {
  canal = nuevoCanal;

  canal.onopen = function () {
    escribirMensaje('Sistema', 'Conexión P2P establecida');
  };

  canal.onmessage = function (evento) {
    escribirMensaje(nombreOtro.textContent, evento.data);
  };
}

function mostrarChat(idOtro) {
  let nombre = idOtro;
  for (let i = 0; i < listaUsuarios.length; i++) {
    if (listaUsuarios[i].id === idOtro) {
      nombre = listaUsuarios[i].name;
    }
  }
  nombreOtro.textContent = nombre;
  pantallaUsuarios.classList.add('hidden');
  pantallaChat.classList.remove('hidden');
}

function escribirMensaje(quien, texto) {
  const div = document.createElement('div');
  div.textContent = quien + ': ' + texto;
  zonaMensajes.appendChild(div);
  zonaMensajes.scrollTop = zonaMensajes.scrollHeight;
}

function enviarMensaje() {
  const texto = inputMensaje.value;
  if (texto === '') {
    return;
  }
  if (canal === null || canal.readyState !== 'open') {
    alert('El canal todavía no está abierto');
    return;
  }
  canal.send(texto);
  escribirMensaje('Yo', texto);
  inputMensaje.value = '';
}

botonEnviar.onclick = enviarMensaje;

inputMensaje.onkeydown = function (evento) {
  if (evento.key === 'Enter') {
    enviarMensaje();
  }
};

async function compartirPantalla() {
    try {
        streamPantalla = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
        });

        console.log("Pantalla capturada:", streamPantalla);

        videoLocal.srcObject = streamPantalla;
        await videoLocal.play();

        console.log("Vídeo srcObject:", videoLocal.srcObject);
        console.log("Vídeo pausado:", videoLocal.paused);
        console.log("Ancho del vídeo:", videoLocal.videoWidth);
        console.log("Alto del vídeo:", videoLocal.videoHeight);

        botonCompartir.disabled = true;
        botonDetener.disabled = false;

    } catch (error) {
        console.error("Error al compartir pantalla:", error);
    }
}

botonCompartir.onclick = compartirPantalla;