/**
 * Módulo de Cuentas y Transacciones - Banca Electrónica
 * Simula consultas de saldo, transferencias y historial de movimientos.
 */

// Base de datos simulada de cuentas bancarias
const cuentasDB = new Map([
  ['CTA-1001', { 
    id: 'CTA-1001', 
    titular: 'USR-001', 
    tipo: 'ahorro',
    saldo: 15000.00, 
    moneda: 'GTQ',
    activa: true
  }],
  ['CTA-1002', { 
    id: 'CTA-1002', 
    titular: 'USR-001', 
    tipo: 'monetaria',
    saldo: 45000.50, 
    moneda: 'GTQ',
    activa: true
  }],
  ['CTA-2001', { 
    id: 'CTA-2001', 
    titular: 'USR-002', 
    tipo: 'ahorro',
    saldo: 8200.75, 
    moneda: 'GTQ',
    activa: true
  }],
  ['CTA-3001', { 
    id: 'CTA-3001', 
    titular: 'USR-002', 
    tipo: 'ahorro',
    saldo: 500.00, 
    moneda: 'GTQ',
    activa: false  // Cuenta inactiva para pruebas
  }]
]);

// Historial de transacciones
const transaccionesDB = [];
let contadorTransacciones = 1000;

const LIMITE_TRANSFERENCIA_DIARIA = 50000.00;
const MONTO_MINIMO_TRANSFERENCIA = 1.00;

/**
 * Genera un ID único para la transacción.
 */
function generarIdTransaccion() {
  contadorTransacciones += 1;
  return `TXN-${Date.now()}-${contadorTransacciones}`;
}

/**
 * Consulta el saldo de una cuenta.
 */
function consultarSaldo(cuentaId, usuarioId) {
  if (!cuentaId || !usuarioId) {
    return { exito: false, mensaje: 'ID de cuenta y usuario son requeridos.' };
  }

  const cuenta = cuentasDB.get(cuentaId);

  if (!cuenta) {
    return { exito: false, mensaje: 'Cuenta no encontrada.' };
  }

  if (cuenta.titular !== usuarioId) {
    return { exito: false, mensaje: 'No tiene permisos para consultar esta cuenta.' };
  }

  if (!cuenta.activa) {
    return { exito: false, mensaje: 'La cuenta se encuentra inactiva.' };
  }

  return {
    exito: true,
    datos: {
      cuenta: cuenta.id,
      tipo: cuenta.tipo,
      saldo: cuenta.saldo,
      moneda: cuenta.moneda
    },
    mensaje: 'Consulta exitosa.'
  };
}

/**
 * Obtiene todas las cuentas de un usuario.
 */
function obtenerCuentasUsuario(usuarioId) {
  if (!usuarioId) {
    return { exito: false, mensaje: 'ID de usuario requerido.' };
  }

  const cuentas = [];
  for (const [id, cuenta] of cuentasDB) {
    if (cuenta.titular === usuarioId && cuenta.activa) {
      cuentas.push({
        id: cuenta.id,
        tipo: cuenta.tipo,
        saldo: cuenta.saldo,
        moneda: cuenta.moneda
      });
    }
  }

  return {
    exito: true,
    datos: cuentas,
    mensaje: `Se encontraron ${cuentas.length} cuenta(s) activa(s).`
  };
}

/**
 * Valida los datos de una transferencia antes de procesarla.
 */
function validarTransferencia(cuentaOrigen, cuentaDestino, monto, usuarioId) {
  const errores = [];

  if (!cuentaOrigen || !cuentaDestino || monto === undefined || !usuarioId) {
    return { valida: false, errores: ['Todos los campos son requeridos.'] };
  }

  if (cuentaOrigen === cuentaDestino) {
    errores.push('Las cuentas de origen y destino deben ser diferentes.');
  }

  if (typeof monto !== 'number' || isNaN(monto)) {
    errores.push('El monto debe ser un valor numérico.');
    return { valida: false, errores };
  }

  if (monto < MONTO_MINIMO_TRANSFERENCIA) {
    errores.push(`El monto mínimo de transferencia es ${MONTO_MINIMO_TRANSFERENCIA} GTQ.`);
  }

  if (monto > LIMITE_TRANSFERENCIA_DIARIA) {
    errores.push(`El monto excede el límite diario de ${LIMITE_TRANSFERENCIA_DIARIA} GTQ.`);
  }

  const origen = cuentasDB.get(cuentaOrigen);
  if (!origen) {
    errores.push('Cuenta de origen no encontrada.');
  } else {
    if (origen.titular !== usuarioId) {
      errores.push('No tiene permisos sobre la cuenta de origen.');
    }
    if (!origen.activa) {
      errores.push('La cuenta de origen está inactiva.');
    }
    if (origen.saldo < monto) {
      errores.push('Saldo insuficiente en la cuenta de origen.');
    }
  }

  const destino = cuentasDB.get(cuentaDestino);
  if (!destino) {
    errores.push('Cuenta de destino no encontrada.');
  } else if (!destino.activa) {
    errores.push('La cuenta de destino está inactiva.');
  }

  return { valida: errores.length === 0, errores };
}

/**
 * Realiza una transferencia entre cuentas.
 */
function realizarTransferencia(cuentaOrigen, cuentaDestino, monto, usuarioId, descripcion = '') {
  const validacion = validarTransferencia(cuentaOrigen, cuentaDestino, monto, usuarioId);

  if (!validacion.valida) {
    return { exito: false, errores: validacion.errores, mensaje: 'Transferencia rechazada.' };
  }

  const origen = cuentasDB.get(cuentaOrigen);
  const destino = cuentasDB.get(cuentaDestino);

  // Redondear a 2 decimales para evitar errores de punto flotante
  origen.saldo = Math.round((origen.saldo - monto) * 100) / 100;
  destino.saldo = Math.round((destino.saldo + monto) * 100) / 100;

  const transaccion = {
    id: generarIdTransaccion(),
    tipo: 'transferencia',
    cuentaOrigen,
    cuentaDestino,
    monto,
    moneda: 'GTQ',
    descripcion: descripcion || 'Transferencia entre cuentas',
    fecha: new Date().toISOString(),
    estado: 'completada'
  };

  transaccionesDB.push(transaccion);

  return {
    exito: true,
    datos: {
      transaccionId: transaccion.id,
      monto: transaccion.monto,
      nuevoSaldoOrigen: origen.saldo,
      fecha: transaccion.fecha
    },
    mensaje: 'Transferencia realizada exitosamente.'
  };
}

/**
 * Obtiene el historial de transacciones de una cuenta.
 */
function obtenerHistorial(cuentaId, usuarioId, limite = 10) {
  if (!cuentaId || !usuarioId) {
    return { exito: false, mensaje: 'ID de cuenta y usuario son requeridos.' };
  }

  const cuenta = cuentasDB.get(cuentaId);
  if (!cuenta) {
    return { exito: false, mensaje: 'Cuenta no encontrada.' };
  }

  if (cuenta.titular !== usuarioId) {
    return { exito: false, mensaje: 'No tiene permisos para consultar esta cuenta.' };
  }

  const historial = transaccionesDB
    .filter(t => t.cuentaOrigen === cuentaId || t.cuentaDestino === cuentaId)
    .slice(-limite)
    .reverse();

  return {
    exito: true,
    datos: historial,
    mensaje: `Se encontraron ${historial.length} transacción(es).`
  };
}

module.exports = {
  consultarSaldo,
  obtenerCuentasUsuario,
  realizarTransferencia,
  validarTransferencia,
  obtenerHistorial,
  // Exportados para testing
  _internos: { cuentasDB, transaccionesDB, LIMITE_TRANSFERENCIA_DIARIA }
};
