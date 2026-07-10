# Casos de test manuales (compras) — contra PRODUCCIÓN

Los 3 flujos de compra **no corren en CI**: MercadoPago bloquea el input
automatizado en el formulario de tarjeta (iframe seguro), así que hay que
completar la tarjeta **a mano**. Todo el resto del suite (60 tests) es
automático — ver los `*.spec.ts` de esta carpeta.

> 🔴 **Estos tests cobran plata de verdad.** El `MP_ACCESS_TOKEN` del entorno es
> el token de **producción** (`APP_USR-…`), y el vendedor es una cuenta MP
> **real**. No hay sandbox: cada compra usa una **tarjeta real** y genera un
> **cargo real** (~$50) en la cuenta MP del vendedor; la suscripción del Club
> genera un **débito recurrente real**. **Anulá todo al terminar** (ver
> _Limpieza_ al final).
>
> La tarjeta de prueba `APRO` (sandbox) **NO funciona** con el token de
> producción — MP la rechaza. Usá una tarjeta real.

Dos formas de correrlos:
- **Asistido por Playwright**: `npx playwright test purchase-cata --headed` — cuando aparece el Inspector (`page.pause()`), completás la tarjeta real y seguís.
- **100% a mano** en el navegador: seguí los pasos de abajo.

---

## Cuentas para loguearse

| Uso | Login | Contraseña |
|---|---|---|
| **Comprador** (los 3 casos, en la app) | `whatsapp.assistance.v1+checkout@gmail.com` | `TestResend123!` |
| **Cuenta MP real** (solo la suscripción del Club, dentro de MercadoPago) | tu cuenta real de MercadoPago | — |

> ⚠️ **Antes de empezar: borrá las cookies del navegador**, para arrancar sin
> una sesión MP previa.

---

## Caso 1 — Compra de una CATA

1. Login en la app como **comprador** (`+checkout` / `TestResend123!`) en `/login`.
2. Ir a: `/pichincha/catas/09e0bd67-0667-497d-a055-a0169817a207` (Cata de Malbec Mendocino).
3. (Opcional) subir entradas con el botón **`+`**.
4. Click en **"Reservar"** → redirige a MercadoPago.
5. Elegir **"Tarjeta – Crédito, débito"** (checkout de invitado).
6. Completar una **tarjeta real** y **"Pagar"**.
7. **Esperado:** vuelve a **`/pago-exitoso`** + mail **"Tu reserva está confirmada — Lo de Granados"**.
8. Verificar: en `/mi-cuenta` aparece la cata; el cupo bajó.

_(spec: `purchase-cata.spec.ts`)_

---

## Caso 2 — Inscripción a un CURSO

1. Login como **comprador**.
2. Ir a: `/pichincha/cursos/ed4bfb95-03ae-4270-a45e-4a31af54c240` (Sommelier Nivel Avanzado).
3. Click en **"Inscribirme"** → MercadoPago.
4. Elegir **"Tarjeta – Crédito, débito"** (invitado).
5. Completar una **tarjeta real** y **"Pagar"**.
6. **Esperado:** vuelve a **`/pago-exitoso`** + mail **"Tu inscripción está confirmada — Lo de Granados"**.
7. Verificar: en `/mi-cuenta` figura como "Inscripto"; el cupo bajó.

_(spec: `purchase-curso.spec.ts`)_

---

## Caso 3 — Suscripción al CLUB (recurrente)

Es una **PreApproval** de MercadoPago (débito mensual). Requiere **loguearse con
una cuenta MP real** (el checkout de invitado de catas/cursos no aplica acá).
Con el token de producción + un comprador real, **sí llega a `/pago-exitoso`**
(el error "una de las partes es de prueba" era solo con comprador de prueba +
vendedor real, en sandbox).

1. Login en la app como **comprador**.
2. Ir a: `/pichincha/club/8175c125-0969-4975-98ea-3fcefd87fbb2` (Gran Reserva).
3. Click en **"Suscribirme"** → checkout de suscripción de MP.
4. Aceptar **"Términos y condiciones"**.
5. **"Elegir medio de pago"** → **"Ingresar con mi cuenta"** → login con tu **cuenta MP real**.
6. En **"Confirmá tu suscripción"**, completar la **tarjeta real** (código de seguridad) y **"Pagar suscripción"**.
7. **Esperado:** vuelve a **`/pago-exitoso`** + mail **"Bienvenido/a al Club DeVinos — Lo de Granados"**; la sub queda con la sucursal donde te suscribiste (`branch_id` en `subscriptions`).

_(spec: `purchase-club.spec.ts`)_

---

## 🧹 Limpieza (OBLIGATORIA — son cargos reales)

Los helpers de test borran las **filas de la DB** (registration / enrollment /
subscription), pero **NO** tocan MercadoPago. Después de cada corrida:

1. **Reintegrar los pagos** de la cata/curso en el panel de MercadoPago (Actividad → el pago → Devolver).
2. **Cancelar la suscripción** del Club en MercadoPago (Suscripciones → Cancelar), o vía API `PUT /preapproval/{id}` con `status: "cancelled"`. Si no, sigue debitando todos los meses.
3. Confirmar que en la app la sub quedó cancelada (el webhook `mp-webhook` sincroniza `subscriptions.status` a `cancelled`).

---

### IDs / rutas por defecto (overrideables por env var)

| Caso | ID | Env var |
|---|---|---|
| Cata | `09e0bd67-0667-497d-a055-a0169817a207` | `E2E_EVENT_ID` / `E2E_EVENT_PATH` |
| Curso | `ed4bfb95-03ae-4270-a45e-4a31af54c240` | `E2E_COURSE_ID` / `E2E_COURSE_PATH` |
| Plan | `8175c125-0969-4975-98ea-3fcefd87fbb2` | `E2E_PLAN_ID` / `E2E_PLAN_PATH` |
