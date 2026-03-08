/**
 * Módulo de Autenticación - Banca Electrónica
 * Simula el proceso de login, generación de tokens y validación de sesiones.
 */

const crypto = require('crypto');

// Base de datos simulada de usuarios
const usuariosDB = new Map([
  ['usuario001', { 
    id: 'USR-001', 
    nombre: 'Ana García', 
    passwordHash: crypto.createHash('sha256').update('Segura$2024').digest('hex'),
    intentosFallidos: 0, 
    bloqueado: false,
    rol: 'cliente'
  }],
  ['usuario002', { 
    id: 'USR-002', 
    nombre: 'Carlos López', 
    passwordHash: crypto.createHash('sha256').update('Clave#Fuerte1').digest('hex'),
    intentosFallidos: 0, 
    bloqueado: false,
    rol: 'cliente'
  }],
  ['admin001', { 
    id: 'ADM-001', 
    nombre: 'Root Admin', 
    passwordHash: crypto.createHash('sha256').update('Admin@Root99').digest('hex'),
    intentosFallidos: 0, 
    bloqueado: false,
    rol: 'administrador'
  }]
]);

// Almacén de sesiones activas
const sesionesActivas = new Map();

const MAX_INTENTOS_FALLIDOS = 3;
const DURACION_TOKEN_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Genera un token de sesión seguro.
 */
function generarToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashea una contraseña con SHA-256.
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Valida la fortaleza de una contraseña.
 * Requisitos: mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.
 */
function validarFortalezaPassword(password) {
  if (typeof password !== 'string') {
    return { valida: false, mensaje: 'La contraseña debe ser una cadena de texto.' };
  }
  if (password.length < 8) {
    return { valida: false, mensaje: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valida: false, mensaje: 'Debe contener al menos una letra mayúscula.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valida: false, mensaje: 'Debe contener al menos una letra minúscula.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valida: false, mensaje: 'Debe contener al menos un número.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valida: false, mensaje: 'Debe contener al menos un carácter especial.' };
  }
  return { valida: true, mensaje: 'Contraseña válida.' };
}

/**
 * Inicia sesión para un usuario.
 * @returns {{ exito: boolean, token?: string, mensaje: string }}
 */
function iniciarSesion(nombreUsuario, password) {
  if (!nombreUsuario || !password) {
    return { exito: false, mensaje: 'Usuario y contraseña son requeridos.' };
  }

  const usuario = usuariosDB.get(nombreUsuario);

  if (!usuario) {
    return { exito: false, mensaje: 'Credenciales inválidas.' };
  }

  if (usuario.bloqueado) {
    return { exito: false, mensaje: 'Cuenta bloqueada por múltiples intentos fallidos. Contacte soporte.' };
  }

  const passwordHashIngresado = hashPassword(password);

  if (passwordHashIngresado !== usuario.passwordHash) {
    usuario.intentosFallidos += 1;

    if (usuario.intentosFallidos >= MAX_INTENTOS_FALLIDOS) {
      usuario.bloqueado = true;
      return { exito: false, mensaje: 'Cuenta bloqueada por múltiples intentos fallidos. Contacte soporte.' };
    }

    return { 
      exito: false, 
      mensaje: `Credenciales inválidas. Intentos restantes: ${MAX_INTENTOS_FALLIDOS - usuario.intentosFallidos}.` 
    };
  }

  // Login exitoso: resetear intentos y crear sesión
  usuario.intentosFallidos = 0;
  const token = generarToken();

  sesionesActivas.set(token, {
    usuarioId: usuario.id,
    nombreUsuario,
    rol: usuario.rol,
    creadoEn: Date.now(),
    expiraEn: Date.now() + DURACION_TOKEN_MS
  });

  return { exito: true, token, mensaje: `Bienvenido/a, ${usuario.nombre}.` };
}

/**
 * Valida si un token de sesión es válido y no ha expirado.
 */
function validarSesion(token) {
  if (!token) {
    return { valida: false, mensaje: 'Token no proporcionado.' };
  }

  const sesion = sesionesActivas.get(token);

  if (!sesion) {
    return { valida: false, mensaje: 'Sesión no encontrada.' };
  }

  if (Date.now() > sesion.expiraEn) {
    sesionesActivas.delete(token);
    return { valida: false, mensaje: 'Sesión expirada. Inicie sesión nuevamente.' };
  }

  return { 
    valida: true, 
    usuarioId: sesion.usuarioId,
    rol: sesion.rol,
    mensaje: 'Sesión válida.' 
  };
}

/**
 * Cierra una sesión activa.
 */
function cerrarSesion(token) {
  if (!token || !sesionesActivas.has(token)) {
    return { exito: false, mensaje: 'Sesión no encontrada.' };
  }

  sesionesActivas.delete(token);
  return { exito: true, mensaje: 'Sesión cerrada correctamente.' };
}

/**
 * Desbloquea una cuenta de usuario (acción de administrador).
 */
function desbloquearCuenta(nombreUsuario) {
  const usuario = usuariosDB.get(nombreUsuario);
  if (!usuario) {
    return { exito: false, mensaje: 'Usuario no encontrado.' };
  }

  usuario.bloqueado = false;
  usuario.intentosFallidos = 0;
  return { exito: true, mensaje: `Cuenta de ${usuario.nombre} desbloqueada.` };
}

module.exports = {
  iniciarSesion,
  cerrarSesion,
  validarSesion,
  validarFortalezaPassword,
  desbloquearCuenta,
  // Exportados para testing
  _internos: { usuariosDB, sesionesActivas, generarToken, hashPassword }
};
