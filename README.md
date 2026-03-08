# Luis Renato Granados Ogaldez
# 2392-19-4642

# Módulo de Banca Electrónica: Creación de Pipeline CI e implementación de SAST con SonarQube

## Descripción del Proyecto

Proyecto académico que simula un módulo de banca electrónica desarrollado en **Node.js**, con un pipeline de **Integración Continua (CI)** usando GitHub Actions y análisis de **seguridad estática (SAST)** con **SonarQube**.

---

## Estructura del Proyecto

```
banca-electronica/
├── .github/
│   └── workflows/
│       └── ci.yml                  ← Pipeline CI (GitHub Actions)
├── src/
│   ├── index.js                    ← Punto de entrada del módulo
│   ├── autenticacion.js            ← Login, sesiones, contraseñas
│   └── cuentas.js                  ← Saldos, transferencias, historial
├── tests/
│   ├── autenticacion.test.js       ← Tests del módulo de autenticación
│   └── cuentas.test.js             ← Tests del módulo de cuentas
├── .eslintrc.json                  ← Configuración de ESLint (linting)
├── sonar-project.properties        ← Configuración de SonarQube (SAST)
├── package.json                    ← Dependencias y scripts
└── README.md                       ← Este archivo
```

---

## Módulos Simulados

### 1. Autenticación (`src/autenticacion.js`)

| Función                    | Descripción                                              |
|----------------------------|----------------------------------------------------------|
| `iniciarSesion()`          | Login con validación de credenciales                     |
| `cerrarSesion()`           | Cierre de sesión e invalidación de token                 |
| `validarSesion()`          | Verifica si un token es válido y no ha expirado          |
| `validarFortalezaPassword()` | Valida requisitos mínimos de seguridad de contraseña   |
| `desbloquearCuenta()`      | Desbloquea cuenta tras intentos fallidos                 |

**Características de seguridad implementadas:**
- Hashing de contraseñas con SHA-256
- Bloqueo automático tras 3 intentos fallidos
- Tokens de sesión con expiración (30 min)
- Validación de fortaleza de contraseñas

### 2. Cuentas y Transacciones (`src/cuentas.js`)

| Función                    | Descripción                                              |
|----------------------------|----------------------------------------------------------|
| `consultarSaldo()`         | Consulta saldo de una cuenta propia                      |
| `obtenerCuentasUsuario()`  | Lista todas las cuentas activas de un usuario            |
| `realizarTransferencia()`  | Ejecuta transferencia entre cuentas con validaciones     |
| `validarTransferencia()`   | Valida datos antes de procesar la transferencia          |
| `obtenerHistorial()`       | Obtiene historial de movimientos de una cuenta           |

**Validaciones implementadas:**
- Verificación de permisos (solo cuentas propias)
- Límite diario de transferencia (Q50,000)
- Monto mínimo (Q1.00)
- Validación de cuentas activas
- Control de saldo suficiente
- Precisión decimal (redondeo a 2 decimales)

---

## Pipeline CI (GitHub Actions)

El pipeline definido en `.github/workflows/ci.yml` tiene **4 jobs secuenciales**:

```
┌─────────┐     ┌──────────┐     ┌───────────────┐     ┌──────────┐
│  LINT   │────▶│  TESTS   │────▶│  SAST         │────▶│ RESUMEN  │
│ ESLint  │     │ Jest y   │     │  SonarQube    │     │ Estado   │
│         │     │ Cobertura│     │  Quality Gate │     │ Final    │
└─────────┘     └──────────┘     └───────────────┘     └──────────┘
```

### Job 1 — Lint (ESLint)
Verifica estilo y buenas prácticas del código. Incluye reglas de seguridad como prohibición de `eval()` y uso estricto de igualdad (`===`).

### Job 2 — Tests Unitarios (Jest)
Ejecuta 40+ tests unitarios con reporte de cobertura de código. Los reportes se guardan como artefactos del pipeline.

### Job 3 — SAST (SonarQube)
Ejecuta análisis estático de seguridad. Verifica el Quality Gate configurado (cobertura, bugs, vulnerabilidades y code smells).

### Job 4 — Resumen
Muestra el estado final de todos los jobs y falla si alguno no fue exitoso.

---

## Análisis SAST con SonarQube

### ¿Qué es SAST?
**Static Application Security Testing** analiza el código fuente sin ejecutarlo, buscando patrones que puedan representar vulnerabilidades de seguridad.

### ¿Qué analiza SonarQube en este proyecto?

| Categoría           | Qué detecta                                              |
|---------------------|----------------------------------------------------------|
| **Vulnerabilidades**| Inyección SQL/NoSQL, XSS, credenciales hardcodeadas      |
| **Bugs**            | Null references, condiciones imposibles, recursos abiertos|
| **Code Smells**     | Complejidad excesiva, código duplicado, funciones largas  |
| **Security Hotspots**| Puntos del código que requieren revisión manual de seguridad |

### Quality Gate (Umbral de Calidad)

El Quality Gate define los criterios mínimos para que el código sea aceptable:

| Métrica                       | Umbral     |
|-------------------------------|------------|
| Cobertura de código           | ≥ 80%      |
| Líneas duplicadas             | ≤ 3%       |
| Bugs (blocker/critical)       | 0          |
| Vulnerabilidades (blocker/critical) | 0    |
| Security Hotspots revisados   | 100%       |

### Configuración necesaria en GitHub

Para que el pipeline funcione con SonarQube, se deben configurar estos **secrets** en el repositorio de GitHub:

1. `SONAR_TOKEN` → Token de autenticación generado en SonarQube
2. `SONAR_HOST_URL` → URL del servidor SonarQube. En el ejercicio se usará SonarCloud, así que sera "https://sonarclourd.io"

**Ruta:** Settings → Secrets and variables → Actions → New repository secret

---

## Cómo Ejecutar Localmente

### Requisitos previos
- Node.js v20+ instalado
- npm v9+

### Instalación
```bash
git clone <url-del-repositorio>
cd <nombre-del-proyecto>
npm install
```

#### Comandos a ejecutar en un entorno local:

#### Ejecutar tests
```bash
# Tests con reporte de cobertura
npm test

# Tests con salida detallada
npm run test:verbose
```

#### Ejecutar linter
```bash
# Ver errores de estilo
npm run lint

# Corregir automáticamente
npm run lint:fix
```

#### Ejecutar SonarQube localmente (opcional)
```bash
# Requiere SonarQube corriendo localmente en el puerto 9000
# y la variable de entorno SONAR_TOKEN configurada
npm run sonar
```

---

## Tecnologías Utilizadas

| Herramienta      | Propósito                                    |
|------------------|----------------------------------------------|
| **Node.js 24.10.0**   | Runtime del módulo de banca                  |
| **Jest**         | Framework de testing y cobertura de código    |
| **ESLint**       | Análisis de calidad y estilo del código       |
| **GitHub Actions**| Orquestación del pipeline CI                 |
| **SonarQube**    | Análisis SAST (seguridad estática)            |

---
