/**
 * Tests para el módulo de Cuentas y Transacciones
 */

const {
  consultarSaldo,
  obtenerCuentasUsuario,
  realizarTransferencia,
  validarTransferencia,
  obtenerHistorial,
  _internos
} = require('../src/cuentas');

// Resetear saldos antes de cada test
beforeEach(() => {
  const { cuentasDB, transaccionesDB } = _internos;
  cuentasDB.get('CTA-1001').saldo = 15000.00;
  cuentasDB.get('CTA-1002').saldo = 45000.50;
  cuentasDB.get('CTA-2001').saldo = 8200.75;
  cuentasDB.get('CTA-3001').saldo = 500.00;
  cuentasDB.get('CTA-3001').activa = false;
  transaccionesDB.length = 0;
});

// ============================================================
// TESTS DE CONSULTA DE SALDO
// ============================================================
describe('consultarSaldo', () => {
  test('retorna saldo correctamente para cuenta propia', () => {
    const resultado = consultarSaldo('CTA-1001', 'USR-001');
    expect(resultado.exito).toBe(true);
    expect(resultado.datos.saldo).toBe(15000.00);
    expect(resultado.datos.moneda).toBe('GTQ');
    expect(resultado.datos.tipo).toBe('ahorro');
  });

  test('rechaza consulta sin parámetros', () => {
    const resultado = consultarSaldo('', '');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('requeridos');
  });

  test('rechaza consulta de cuenta inexistente', () => {
    const resultado = consultarSaldo('CTA-9999', 'USR-001');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('no encontrada');
  });

  test('rechaza consulta de cuenta ajena', () => {
    const resultado = consultarSaldo('CTA-1001', 'USR-002');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('permisos');
  });

  test('rechaza consulta de cuenta inactiva', () => {
    const resultado = consultarSaldo('CTA-3001', 'USR-002');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('inactiva');
  });
});

// ============================================================
// TESTS DE OBTENER CUENTAS DE USUARIO
// ============================================================
describe('obtenerCuentasUsuario', () => {
  test('retorna todas las cuentas activas del usuario', () => {
    const resultado = obtenerCuentasUsuario('USR-001');
    expect(resultado.exito).toBe(true);
    expect(resultado.datos).toHaveLength(2);
    expect(resultado.datos[0].id).toBe('CTA-1001');
    expect(resultado.datos[1].id).toBe('CTA-1002');
  });

  test('no incluye cuentas inactivas', () => {
    const resultado = obtenerCuentasUsuario('USR-002');
    const ids = resultado.datos.map(c => c.id);
    expect(ids).toContain('CTA-2001');
    expect(ids).not.toContain('CTA-3001');
  });

  test('rechaza consulta sin usuario', () => {
    const resultado = obtenerCuentasUsuario('');
    expect(resultado.exito).toBe(false);
  });
});

// ============================================================
// TESTS DE VALIDACIÓN DE TRANSFERENCIA
// ============================================================
describe('validarTransferencia', () => {
  test('valida transferencia correcta', () => {
    const resultado = validarTransferencia('CTA-1001', 'CTA-2001', 1000, 'USR-001');
    expect(resultado.valida).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  test('rechaza transferencia a la misma cuenta', () => {
    const resultado = validarTransferencia('CTA-1001', 'CTA-1001', 100, 'USR-001');
    expect(resultado.valida).toBe(false);
    expect(resultado.errores.some(e => e.includes('diferentes'))).toBe(true);
  });

  test('rechaza monto no numérico', () => {
    const resultado = validarTransferencia('CTA-1001', 'CTA-2001', 'cien', 'USR-001');
    expect(resultado.valida).toBe(false);
  });

  test('rechaza monto menor al mínimo', () => {
    const resultado = validarTransferencia('CTA-1001', 'CTA-2001', 0.50, 'USR-001');
    expect(resultado.valida).toBe(false);
  });

  test('rechaza monto que excede límite diario', () => {
    const resultado = validarTransferencia('CTA-1001', 'CTA-2001', 60000, 'USR-001');
    expect(resultado.valida).toBe(false);
    expect(resultado.errores.some(e => e.includes('límite'))).toBe(true);
  });

  test('rechaza transferencia con saldo insuficiente', () => {
    const resultado = validarTransferencia('CTA-1001', 'CTA-2001', 20000, 'USR-001');
    expect(resultado.valida).toBe(false);
    expect(resultado.errores.some(e => e.includes('insuficiente'))).toBe(true);
  });

  test('rechaza transferencia desde cuenta ajena', () => {
    const resultado = validarTransferencia('CTA-1001', 'CTA-2001', 100, 'USR-002');
    expect(resultado.valida).toBe(false);
    expect(resultado.errores.some(e => e.includes('permisos'))).toBe(true);
  });

  test('rechaza transferencia a cuenta inactiva', () => {
    const resultado = validarTransferencia('CTA-2001', 'CTA-3001', 100, 'USR-002');
    expect(resultado.valida).toBe(false);
    expect(resultado.errores.some(e => e.includes('inactiva'))).toBe(true);
  });

  test('rechaza sin campos requeridos', () => {
    const resultado = validarTransferencia(null, null, undefined, null);
    expect(resultado.valida).toBe(false);
    expect(resultado.errores.some(e => e.includes('requeridos'))).toBe(true);
  });
});

// ============================================================
// TESTS DE REALIZACIÓN DE TRANSFERENCIA
// ============================================================
describe('realizarTransferencia', () => {
  test('transfiere correctamente entre cuentas', () => {
    const resultado = realizarTransferencia('CTA-1001', 'CTA-2001', 5000, 'USR-001', 'Pago de servicio');
    
    expect(resultado.exito).toBe(true);
    expect(resultado.datos.transaccionId).toBeDefined();
    expect(resultado.datos.monto).toBe(5000);
    expect(resultado.datos.nuevoSaldoOrigen).toBe(10000.00);

    // Verificar que el destino también se actualizó
    const saldoDestino = _internos.cuentasDB.get('CTA-2001').saldo;
    expect(saldoDestino).toBe(13200.75);
  });

  test('maneja decimales correctamente', () => {
    const resultado = realizarTransferencia('CTA-1001', 'CTA-2001', 99.99, 'USR-001');
    expect(resultado.exito).toBe(true);
    expect(resultado.datos.nuevoSaldoOrigen).toBe(14900.01);
  });

  test('registra la transacción en el historial', () => {
    realizarTransferencia('CTA-1001', 'CTA-2001', 100, 'USR-001');
    expect(_internos.transaccionesDB).toHaveLength(1);
    expect(_internos.transaccionesDB[0].estado).toBe('completada');
  });

  test('rechaza transferencia inválida', () => {
    const resultado = realizarTransferencia('CTA-1001', 'CTA-2001', 999999, 'USR-001');
    expect(resultado.exito).toBe(false);
    expect(resultado.errores).toBeDefined();
  });

  test('múltiples transferencias actualizan saldo acumulativamente', () => {
    realizarTransferencia('CTA-1001', 'CTA-2001', 3000, 'USR-001');
    realizarTransferencia('CTA-1001', 'CTA-2001', 2000, 'USR-001');

    const saldoOrigen = _internos.cuentasDB.get('CTA-1001').saldo;
    expect(saldoOrigen).toBe(10000.00);

    const saldoDestino = _internos.cuentasDB.get('CTA-2001').saldo;
    expect(saldoDestino).toBe(13200.75);
  });
});

// ============================================================
// TESTS DE HISTORIAL DE TRANSACCIONES
// ============================================================
describe('obtenerHistorial', () => {
  test('retorna historial vacío cuando no hay transacciones', () => {
    const resultado = obtenerHistorial('CTA-1001', 'USR-001');
    expect(resultado.exito).toBe(true);
    expect(resultado.datos).toHaveLength(0);
  });

  test('retorna historial con transacciones realizadas', () => {
    realizarTransferencia('CTA-1001', 'CTA-2001', 100, 'USR-001');
    realizarTransferencia('CTA-1001', 'CTA-2001', 200, 'USR-001');

    const resultado = obtenerHistorial('CTA-1001', 'USR-001');
    expect(resultado.exito).toBe(true);
    expect(resultado.datos).toHaveLength(2);
  });

  test('rechaza historial de cuenta ajena', () => {
    const resultado = obtenerHistorial('CTA-1001', 'USR-002');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('permisos');
  });

  test('rechaza historial sin parámetros', () => {
    const resultado = obtenerHistorial('', '');
    expect(resultado.exito).toBe(false);
  });

  test('respeta el límite de resultados', () => {
    for (let i = 0; i < 15; i++) {
      realizarTransferencia('CTA-1001', 'CTA-2001', 1, 'USR-001');
    }

    const resultado = obtenerHistorial('CTA-1001', 'USR-001', 5);
    expect(resultado.datos).toHaveLength(5);
  });
});
