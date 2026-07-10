# Casos de test manuales (compras)

Los 3 flujos de compra **no corren en CI**: MercadoPago bloquea el input
automatizado en el formulario de tarjeta (iframe seguro), así que hay que
completar la tarjeta **a mano**. Todo el resto del suite (60 tests) es
automático — ver los `*.spec.ts` de esta carpeta.

Dos formas de correrlos:
- **Asistido por Playwright**: `npx playwright test purchase-cata --headed` — cuando aparece el Inspector (`page.pause()`), completás la tarjeta y seguís.
- **100% a mano** en el navegador: seguí los pasos de abajo.

---

## Cuentas para loguearse

| Uso | Email / usuario | Contraseña |
|---|---|---|
| **Comprador** (los 3 casos, en la app) | `whatsapp.assistance.v1+checkout@gmail.com` | `TestResend123!` |
| **Comprador de prueba MP** (solo suscripción, dentro de MercadoPago) | `TESTUSER7682991671644190556` | `HvaWovne9E` |

## Tarjeta de prueba (cata y curso)

| Campo | Valor |
|---|---|
| Número | `5031 7557 3453 0604` (Mastercard sandbox) |
| Titular | **`APRO`** (fuerza pago aprobado) |
| Vencimiento | `11/30` |
| CVV | `123` |
| DNI | `12345678` |

> ⚠️ **Token de MercadoPago — leer antes de testear.** La tarjeta de prueba de
> arriba **solo funciona con un token `TEST-`** (sandbox). Hoy el
> `MP_ACCESS_TOKEN` del entorno es el de **producción** (`APP_USR-…`), así que:
> - Con el token prod, la tarjeta `APRO` **es rechazada** — un pago requiere una
>   **tarjeta real** → **cobro real** (~$50 a la cuenta MP del vendedor).
> - Para testear con la tarjeta de prueba, hay que **cambiar temporalmente**
>   `MP_ACCESS_TOKEN` al token `TEST-` de la misma app y volver a prod después.
>
> En producción el token prod es el correcto (cobra a clientes reales); esta
> nota es solo para el testing manual.

> ⚠️ **Antes de empezar: borrá las cookies del navegador.** Si MercadoPago
> encuentra una sesión previa, el checkout falla con "una de las partes es de
> prueba" en vez de mostrar el checkout de invitado.

---

## Caso 1 — Compra de una CATA

1. Login en la app como **comprador** (`+checkout` / `TestResend123!`) en `/login`.
2. Ir a una cata: `/pichincha/catas/09e0bd67-0667-497d-a055-a0169817a207` (Cata de Malbec Mendocino).
3. (Opcional) subir la cantidad de entradas con el botón **`+`**.
4. Click en **"Reservar"** → redirige a MercadoPago.
5. Elegir **"Tarjeta – Crédito, débito"** (checkout de invitado, **sin** loguearse en MP).
6. Completar la tarjeta de prueba (titular **APRO**) y **"Pagar"**.
7. **Esperado:** vuelve a **`/pago-exitoso`** y llega el mail **"Tu reserva está confirmada — Lo de Granados"**.
8. Verificar: en `/mi-cuenta` aparece la cata en "Mis catas"; el cupo de la cata bajó.

_(spec: `purchase-cata.spec.ts`)_

---

## Caso 2 — Inscripción a un CURSO

1. Login como **comprador**.
2. Ir a un curso: `/pichincha/cursos/ed4bfb95-03ae-4270-a45e-4a31af54c240` (Sommelier Nivel Avanzado).
3. Click en **"Inscribirme"** → redirige a MercadoPago.
4. Elegir **"Tarjeta – Crédito, débito"** (invitado).
5. Completar la tarjeta de prueba (titular **APRO**) y **"Pagar"**.
6. **Esperado:** vuelve a **`/pago-exitoso`** y llega el mail **"Tu inscripción está confirmada — Lo de Granados"**.
7. Verificar: en `/mi-cuenta` aparece en "Mis cursos" como "Inscripto"; el cupo del curso bajó.

_(spec: `purchase-curso.spec.ts`)_

---

## Caso 3 — Suscripción al CLUB (recurrente)

Este flujo es distinto: es una **PreApproval** de MercadoPago (cobro mensual),
que **exige loguearse con una cuenta de prueba de MP** (el checkout de invitado
que sirve para catas/cursos NO funciona acá).

1. Login en la app como **comprador**.
2. Ir a un plan: `/pichincha/club/8175c125-0969-4975-98ea-3fcefd87fbb2` (Gran Reserva).
3. Click en **"Suscribirme"** → redirige al checkout de suscripción de MP.
4. Aceptar **"Términos y condiciones"**.
5. Click en **"Elegir medio de pago"**.
6. Click en **"Ingresar con mi cuenta"**.
7. Loguearse con el **comprador de prueba MP** (`TESTUSER7682991671644190556` / `HvaWovne9E`):
   usuario → "Continuar" → contraseña → "Confirmar".
8. En **"Confirmá tu suscripción"**, ingresar el **código de seguridad** de la tarjeta ya adjunta y **"Pagar suscripción"**.
9. **Esperado (ver ⚠️):** vuelve a **`/pago-exitoso`** y llega el mail **"Bienvenido/a al Club DeVinos — Lo de Granados"**; la sub queda con la sucursal donde te suscribiste.

> ⚠️ **Limitación conocida del sandbox:** el vendedor (collector `83212592`) es
> una cuenta **real**, no de prueba, y MP rechaza el par real-vendedor +
> comprador-de-prueba con **"una de las partes es de prueba"** — la suscripción
> **no llega a `/pago-exitoso`** en sandbox. Este caso solo se puede verificar
> **hasta el paso del código de seguridad**. El happy-path completo (creación de
> la sub + `external_reference` con sucursal/usuario) hay que verificarlo con un
> pago real, o quedó verificado a nivel función/DB en los tests automáticos.

_(spec: `purchase-club.spec.ts`)_

---

### IDs / rutas por defecto (overrideables por env var)

| Caso | ID | Env var |
|---|---|---|
| Cata | `09e0bd67-0667-497d-a055-a0169817a207` | `E2E_EVENT_ID` / `E2E_EVENT_PATH` |
| Curso | `ed4bfb95-03ae-4270-a45e-4a31af54c240` | `E2E_COURSE_ID` / `E2E_COURSE_PATH` |
| Plan | `8175c125-0969-4975-98ea-3fcefd87fbb2` | `E2E_PLAN_ID` / `E2E_PLAN_PATH` |
