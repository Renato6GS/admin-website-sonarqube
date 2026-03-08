/**
 * Tests para el módulo de Autenticación
 */

const { 
  iniciarSesion, 
  cerrarSesion, 
  validarSesion, 
  validarFortalezaPassword,
  desbloquearCuenta,
  _internos 
} = require('../src/autenticacion');

// Resetear estado entre tests
beforeEach(() => {
  _internos.sesionesActivas.clear();
  // Resetear usuarios
  for (const [, usuario] of _internos.usuariosDB) {
    usuario.intentosFallidos = 0;
    usuario.bloqueado = false;
  }
});

// ============================================================
// TESTS DE VALIDACIÓN DE FORTALEZA DE CONTRASEÑA
// ============================================================
describe('validarFortalezaPassword', () => {
  test('acepta contraseña que cumple todos los requisitos', () => {
    const resultado = validarFortalezaPassword('MiClave$2024');
    expect(resultado.valida).toBe(true);
  });

  test('rechaza contraseña sin tipo string', () => {
    const resultado = validarFortalezaPassword(12345678);
    expect(resultado.valida).toBe(false);
  });

  test('rechaza contraseña menor a 8 caracteres', () => {
    const resultado = validarFortalezaPassword('Ab1$');
    expect(resultado.valida).toBe(false);
    expect(resultado.mensaje).toContain('8 caracteres');
  });

  test('rechaza contraseña sin mayúsculas', () => {
    const resultado = validarFortalezaPassword('miclave$2024');
    expect(resultado.valida).toBe(false);
    expect(resultado.mensaje).toContain('mayúscula');
  });

  test('rechaza contraseña sin minúsculas', () => {
    const resultado = validarFortalezaPassword('MICLAVE$2024');
    expect(resultado.valida).toBe(false);
    expect(resultado.mensaje).toContain('minúscula');
  });

  test('rechaza contraseña sin números', () => {
    const resultado = validarFortalezaPassword('MiClave$Fuerte');
    expect(resultado.valida).toBe(false);
    expect(resultado.mensaje).toContain('número');
  });

  test('rechaza contraseña sin caracteres especiales', () => {
    const resultado = validarFortalezaPassword('MiClave2024');
    expect(resultado.valida).toBe(false);
    expect(resultado.mensaje).toContain('especial');
  });
});

// ============================================================
// TESTS DE INICIO DE SESIÓN
// ============================================================
describe('iniciarSesion', () => {
  test('login exitoso con credenciales válidas', () => {
    const resultado = iniciarSesion('usuario001', 'Segura$2024');
    expect(resultado.exito).toBe(true);
    expect(resultado.token).toBeDefined();
    expect(resultado.token.length).toBe(64); // 32 bytes hex
    expect(resultado.mensaje).toContain('Bienvenido');
  });

  test('falla con usuario vacío', () => {
    const resultado = iniciarSesion('', 'Segura$2024');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('requeridos');
  });

  test('falla con contraseña vacía', () => {
    const resultado = iniciarSesion('usuario001', '');
    expect(resultado.exito).toBe(false);
  });

  test('falla con usuario inexistente', () => {
    const resultado = iniciarSesion('noexiste', 'Segura$2024');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('inválidas');
  });

  test('falla con contraseña incorrecta', () => {
    const resultado = iniciarSesion('usuario001', 'ClaveEquivocada');
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toContain('inválidas');
  });

  test('bloquea cuenta después de 3 intentos fallidos', () => {
    iniciarSesion('usuario001', 'mal1');
    iniciarSesion('usuario001', 'mal2');
    const tercerIntento = iniciarSesion('usuario001', 'mal3');

    expect(tercerIntento.exito).toBe(false);
    expect(tercerIntento.mensaje).toContain('bloqueada');

    // Verificar que incluso con clave correcta sigue bloqueada
    const intentoPostBloqueo = iniciarSesion('usuario001', 'Segura$2024');
    expect(intentoPostBloqueo.exito).toBe(false);
    expect(intentoPostBloqueo.mensaje).toContain('bloqueada');
  });

  test('resetea intentos fallidos tras login exitoso', () => {
    iniciarSesion('usuario001', 'mal1');
    iniciarSesion('usuario001', 'mal2');
    const loginExitoso = iniciarSesion('usuario001', 'Segura$2024');

    expect(loginExitoso.exito).toBe(true);

    // Verificar que los intentos se resetearon
    const usuario = _internos.usuariosDB.get('usuario001');
    expect(usuario.intentosFallidos).toBe(0);
  });
});

// ============================================================
// TESTS DE VALIDACIÓN DE SESIÓN
// ============================================================
describe('validarSesion', () => {
  test('valida token activo correctamente', () => {
    const login = iniciarSesion('usuario001', 'Segura$2024');
    const sesion = validarSesion(login.token);

    expect(sesion.valida).toBe(true);
    expect(sesion.usuarioId).toBe('USR-001');
    expect(sesion.rol).toBe('cliente');
  });

  test('rechaza token vacío', () => {
    const sesion = validarSesion('');
    expect(sesion.valida).toBe(false);
  });

  test('rechaza token inexistente', () => {
    const sesion = validarSesion('token-falso-12345');
    expect(sesion.valida).toBe(false);
    expect(sesion.mensaje).toContain('no encontrada');
  });

  test('rechaza token expirado', () => {
    const login = iniciarSesion('usuario001', 'Segura$2024');
    
    // Simular expiración manipulando la sesión
    const sesion = _internos.sesionesActivas.get(login.token);
    sesion.expiraEn = Date.now() - 1000;

    const resultado = validarSesion(login.token);
    expect(resultado.valida).toBe(false);
    expect(resultado.mensaje).toContain('expirada');
  });
});

// ============================================================
// TESTS DE CIERRE DE SESIÓN
// ============================================================
describe('cerrarSesion', () => {
  test('cierra sesión activa correctamente', () => {
    const login = iniciarSesion('usuario001', 'Segura$2024');
    const resultado = cerrarSesion(login.token);

    expect(resultado.exito).toBe(true);

    // Verificar que el token ya no es válido
    const sesion = validarSesion(login.token);
    expect(sesion.valida).toBe(false);
  });

  test('falla al cerrar sesión inexistente', () => {
    const resultado = cerrarSesion('token-inexistente');
    expect(resultado.exito).toBe(false);
  });
});

// ============================================================
// TESTS DE DESBLOQUEO DE CUENTA
// ============================================================
describe('desbloquearCuenta', () => {
  test('desbloquea cuenta correctamente', () => {
    // Bloquear primero
    iniciarSesion('usuario001', 'mal1');
    iniciarSesion('usuario001', 'mal2');
    iniciarSesion('usuario001', 'mal3');

    const resultado = desbloquearCuenta('usuario001');
    expect(resultado.exito).toBe(true);

    // Verificar que puede hacer login de nuevo
    const login = iniciarSesion('usuario001', 'Segura$2024');
    expect(login.exito).toBe(true);
  });

  test('falla al desbloquear usuario inexistente', () => {
    const resultado = desbloquearCuenta('noexiste');
    expect(resultado.exito).toBe(false);
  });
});
