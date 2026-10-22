# ADR-0012 — Datos bancarios del personal

- **Estado:** Propuesto
- **Fecha:** 2026-10-22

## Contexto

La institución necesita **comprobar que está pagando a las cuentas correctas**. La nómina trae tres columnas (`tipo_cuenta_banco`, `banco`, `num_cuenta_banco`). El objetivo no es solo guardar la cuenta, sino **cotejar** lo que la institución tiene con lo que la persona confirma.

Hechos que condicionan la decisión:

- Es un dato financiero personal. La Ley Orgánica de Protección de Datos Personales exige finalidad definida, mínimo necesario y medidas de seguridad. La persona ya acepta el tratamiento de sus datos (RF-DAT-001).
- La nómina es lo que afirma la institución; si la persona cree que está mal, debe poder corregirlo sin que su corrección se pierda ni pise el dato de la nómina.
- El número completo solo importa a quien paga y a su dueño. Al supervisor y al admin les basta saber si **coincide**.
- `AGENTS.md` prohíbe guardar credenciales o cadenas de conexión reales en el repositorio; la clave de cifrado entra en esa categoría. Su ubicación depende del despliegue (issue #25).
- Hay auditoría de accesos y exportaciones (spec-0001). Los archivos ya se descargan solo por el backend (ADR-0006).

## Opciones

1. **Número en claro en una columna, protegido solo por rol.** Es lo más simple. Una copia de la base, un respaldo o una consulta indebida exponen todos los números.
2. **Número cifrado en la aplicación, enmascarado en pantalla y con huella para cotejar.** El número se cifra antes de llegar a la base. Se guardan además los últimos cuatro dígitos para mostrarlos y una huella con clave (HMAC) del número de la nómina, para saber si coincide con el confirmado sin guardar dos copias en claro. Cuesta más y exige gestionar una clave.
3. **No guardar el número: solo «confirmo que es correcta» y los últimos cuatro dígitos.** Es lo de menor riesgo, pero no permite cotejar contra el banco ni alimentar un pago.

## Decisión

Se propone la **opción 2**. Queda en Propuesto hasta que quien desarrolla la cierre.

| # | Punto | Propuesta |
|---|---|---|
| 1 | Modelo | Una cuenta por persona (`CuentaBancaria`, con `institucion_id` y `persona_id`, ADR-0004): tipo de cuenta, banco, número cifrado, últimos cuatro dígitos, huella del valor de la nómina, estado (sin confirmar, coincide, difiere) y fecha. |
| 2 | Catálogos | `TipoCuenta` (ahorros, corriente) y `Banco` como catálogos compartidos de `elementos_catalogo` (ADR-0010 dec. 5). Fuente de bancos: Superintendencia de Bancos. Si el banco no está, la persona escribe el nombre. |
| 3 | Cifrado | Cifrado autenticado en la capa de aplicación, con clave por entorno **fuera de la base y del repositorio**. La mecánica concreta (ASP.NET Core Data Protection u otra) se fija al implementar, con el ADR de despliegue como dependencia. |
| 4 | Quién ve el número completo | Solo su dueño, en su propia pantalla. Supervisor y admin ven el banco, el tipo, los últimos cuatro dígitos y el estado de coincidencia. |
| 5 | Exportación | El Excel y el `.zip` llevan la cuenta **enmascarada**. Un archivo con números completos para pagos queda fuera hasta una spec que lo pida. |
| 6 | Auditoría | Cada lectura del número completo y cada cambio de cuenta se registra con quién y cuándo, sin guardar el número. |
| 7 | Carga de nómina | La cuenta de la nómina entra como propuesta: se cifra, se guarda su huella y el estado es «sin confirmar». Si la persona la confirma, pasa a «coincide»; si la cambia, a «difiere». |
| 8 | Pruebas y ejemplos | Solo cuentas ficticias evidentes (por ejemplo `0000000000`). Ninguna cuenta real en código, semillas, pruebas ni capturas. |

## Consecuencias

- Se puede responder «¿a qué personas se les paga a una cuenta distinta de la que confirmaron?» sin exponer números.
- Hay que gestionar una clave: dónde vive, quién la rota y qué pasa si se pierde (los números cifrados serían irrecuperables). Los respaldos de la base contienen los números cifrados; la clave debe respaldarse por separado.
- Más tablas, dos catálogos nuevos y más endpoints; cada uno con prueba de aislamiento por institución.
- Spec-0003 incluye la cuenta bancaria en RF-HDV-025 a 027. Hasta que este ADR sea Vigente, **no se implementa** la entidad, la migración ni la carga de las columnas bancarias.
- Los antecedentes penales (documento personal) son también un dato delicado. Su acceso se limita al dueño, al supervisor y al admin de su institución; no requiere cifrado propio porque van como archivo bajo ADR-0006.

## Puntos abiertos

- **¿Quién cierra el ADR y con qué base legal?** La finalidad (comprobar pagos) y la base del tratamiento deben quedar por escrito.
- **¿Quién administra la clave** y dónde se guarda en producción? Depende del despliegue (#25).
- **¿La cuenta es obligatoria para enviar?** Propuesta en spec-0003 (PD-HDV-17): sí.
- **¿Se necesitará un archivo con números completos para el pago?** Si sí, es otra spec y otro ADR.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0006 — Almacenamiento de archivos.
- ADR-0010 — Hoja de vida estructurada y catálogos.
- ADR-0011 — Carga de nómina: columnas, valores nulos y división de nombres (Propuesto).
