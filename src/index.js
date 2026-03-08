/**
 * Módulo de Banca Electrónica
 * Punto de entrada principal que exporta todos los submódulos.
 * 
 * Componentes:
 * - Autenticación: Login, sesiones, validación de contraseñas
 * - Cuentas: Saldos, transferencias, historial de movimientos
 */

const autenticacion = require('./autenticacion');
const cuentas = require('./cuentas');

module.exports = {
  autenticacion,
  cuentas
};
