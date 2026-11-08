# I.D.A.S

**Intelligent Driving Assistance System** — sistema de asistencia y prevención de colisiones.

La cámara captura video; el frontend envía un frame cada ~750 ms al backend, que detecta objetos (YOLOv8n con seguimiento ByteTrack), calcula un nivel de riesgo (`ninguno`, `bajo`, `medio`, `alto`) y decide si debe sonar una alerta.

- **Uso principal:** modo bicicleta. Web app para celular (cámara trasera, alerta sonora como canal principal).
- **Uso secundario:** modo vehículo/simulador con un video cargado.
- **Privacidad:** el video se queda en el dispositivo (IndexedDB) y nunca se sube al backend. Solo se guardan metadatos.

---

## Requisitos previos

- **Python 3.11** (probado con 3.11.9). Otras versiones pueden fallar al instalar `torch` y `ultralytics`.
- **Node.js LTS**: https://nodejs.org/
- **Git**.
- Espacio libre: `torch` y `ultralytics` pesan cientos de MB.

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd IDSS
```

### 2. Backend

El entorno virtual vive en `backend/venv` (no se versiona).

```powershell
cd backend
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> Mac/Linux: `source venv/bin/activate`

- `requirements.txt` lista solo las dependencias directas, con las versiones probadas.
- `requirements-lock.txt` es el `pip freeze` completo del entorno probado, para reproducirlo exacto.

**Linux:** el `torch` de PyPI incluye CUDA (varios GB). Para instalar la versión de CPU:

```bash
pip install torch==2.11.0 torchvision==0.26.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

**Windows:** `pip install torch` instala la versión de CPU. La inferencia corre en CPU; no se usa GPU.

> **Estado de validación:** las versiones de `requirements.txt` se probaron en el entorno de desarrollo. La instalación desde un entorno completamente limpio **no se ha validado** para `torch`, `ultralytics` y `lap`.

### 3. Frontend

```powershell
cd frontend
npm install
```

---

## Ejecución

Cada servidor va en su propia terminal. Inicia primero el backend.

### Backend

Desde `backend\`, con el entorno virtual activo:

```powershell
uvicorn app:app --port 8000
```

- No uses `--reload` al medir ni en la demo: reinicia el servidor y recarga el modelo.
- Usa `127.0.0.1` en lugar de `localhost`. En Windows, `localhost` puede añadir ~2,4 s por petición (resolución IPv6).
- **Calentamiento:** el primer frame carga el modelo y puede tardar unos segundos. Envía un frame antes de una demo (por ejemplo, con la prueba de humo).

Variables de entorno opcionales (se definen antes de `uvicorn`):

| Variable | Efecto | Por defecto |
|---|---|---|
| `IDSS_SQLITE_RAPIDO=1` | SQLite con WAL y `synchronous=NORMAL`. Reduce mucho el tiempo de escritura, a cambio de menor durabilidad ante un corte de energía. | Desactivado |
| `IDSS_MAX_SESIONES` | Máximo de sesiones simultáneas (un modelo YOLO por sesión). | 4 |

```powershell
$env:IDSS_SQLITE_RAPIDO = "1"
$env:IDSS_MAX_SESIONES = "4"
uvicorn app:app --port 8000
```

### Frontend

Desde `frontend\`:

```powershell
npm run dev
```

La app queda en http://127.0.0.1:5173. El proxy de Vite reenvía `/api` y `/health` a `http://127.0.0.1:8000`, así que el navegador solo habla con Vite y no hace falta configurar CORS ni la URL del backend.

---

## Probar desde el celular

El acceso a la cámara (`getUserMedia`) exige HTTPS. Se usa un túnel de VS Code:

1. Con backend y frontend corriendo, abre la pestaña **Ports** de VS Code.
2. Reenvía el puerto **5173** y ponlo en visibilidad **pública**.
3. Abre en el celular la URL `https://...devtunnels.ms`. La advertencia de Dev Tunnels aparece solo la primera vez.

El puerto público deja la API accesible a quien tenga el enlace; úsalo solo durante las pruebas.

---

## Pruebas

**Frontend** (Vitest + jsdom, desde `frontend\`):

```powershell
npm test
```

**Backend:** los scripts están en `backend/pruebas/`. Con el servidor levantado y el entorno virtual activo:

```powershell
python pruebas\prueba_humo.py --auth
```

- `prueba_humo.py`: prueba de humo de extremo a extremo (servidor, sesión, análisis con el modelo, persistencia, errores 404/409/400, métricas y, con `--auth`, registro y login). Son 15 comprobaciones sin `--auth` y 19 con él. Termina con código 0 si todo pasó. Usa una imagen sintética: comprueba que cada pieza responde, no la calidad de las detecciones. Cada ejecución crea una sesión de prueba (queda finalizada) y, con `--auth`, un usuario de prueba en la base de datos local. Opción `--url` para otro servidor.
- `prueba_alerta.py`: política de alerta sonora con secuencias sintéticas.
- `probar_video.py`: envía un video al backend a cadencia real y guarda un CSV (y opcionalmente el detalle por objeto con `--objetos-jsonl`, y un tramo con `--desde` y `--hasta`).
- `recalibrar_umbrales.py`: recalcula el riesgo con umbrales candidatos sobre el detalle por objeto.
- `prueba_concurrencia.py`: simula varios usuarios simultáneos.
- `generar_episodios.py` y `simular_persistencia.py`: scripts de análisis de la primera corrida de `test2` (enviada sin ritmo real). Se conservan como evidencia del método; sus resultados no sirven para calibrar.
- `exportar_sesion.py`: exporta a CSV, con un resumen, una sesión ya guardada en la base de datos. Sirve cuando el análisis se hizo desde la app (por ejemplo, cargando un video en modo vehicular) y no con `probar_video.py`. Necesita el servidor encendido, porque lee los datos por la API. Opciones: `--listar` (últimas sesiones), `--sesion N` y `--etiquetas`. El tiempo de cada fila se cuenta desde el primer frame que recibió el servidor, no desde el inicio del video. La latencia por frame no se guarda en la base de datos: el resumen usa `/api/metricas`, que solo tiene datos si el servidor no se ha reiniciado desde la prueba.

Las pruebas con video deben enviarse a **cadencia real (750 ms)**: la tasa de expansión se calcula con el reloj del servidor, y enviar más rápido la distorsiona.

---

## Estructura del proyecto

```
IDSS/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── requirements-lock.txt
│   ├── database/      database.py, models.py, crud.py, mantenimiento.py
│   ├── routes/        analizar.py, auth.py
│   ├── services/      detector.py, riesgo.py, alerta.py, auth.py
│   └── pruebas/       scripts de prueba (ver "Pruebas")
│       └── datos/     intervalos revisados de test2 (CSV)
├── frontend/
│   ├── src/           pages/, config/, services/
│   ├── tests/
│   └── package.json
└── README.md
```

---

## API principal

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/sesiones` | Crea una sesión |
| GET | `/api/sesiones` | Lista sesiones |
| GET | `/api/sesiones/{id}/frames` | Frames de una sesión |
| GET | `/api/sesiones/{id}/alertas` | Alertas de una sesión |
| PATCH | `/api/sesiones/{id}/finalizar` | Finaliza la sesión |
| PATCH | `/api/sesiones/{id}/video` | Registra la referencia al video local |
| POST | `/api/analizar-frame/{id}` | Analiza un frame (imagen) y devuelve objetos, riesgo y `alerta_sonora` |
| GET | `/api/metricas` | Latencia de los últimos 500 frames |
| POST | `/api/metricas/reiniciar` | Borra las métricas acumuladas |
| POST | `/api/auth/registro` | Registra un usuario (contraseña con bcrypt) y, opcionalmente, su vehículo |
| POST | `/api/auth/login` | Inicia sesión con email y contraseña |
| POST | `/api/auth/login/oauth` | Login externo: no implementado (501) |
| GET | `/health` | Estado del servidor |

`/api/analizar-frame/{id}` responde 404 si la sesión no existe, 409 si ya fue finalizada y 400 si el archivo no es una imagen.

El registro responde 400 si el email ya existe y el login responde 401 si las credenciales son incorrectas. La autenticación no devuelve tokens ni protege el resto de rutas.

---

## Cómo se decide el riesgo y la alerta

- **Riesgo (por frame):** se evalúa cada objeto por su área relativa, su posición horizontal (zona central entre 25 % y 75 %) y su tasa de expansión (cambio de área por segundo). El frame toma el nivel más alto. Las constantes están en `backend/services/riesgo.py`; el umbral de `medio` para personas y bicicletas es menor que para vehículos y es **provisional**.
- **Alerta sonora:** solo se activa con riesgo `alto`. Los 3 primeros frames `alto` suenan; después solo vuelve a sonar con acercamiento confirmado, y se rearma tras 3 s fuera de `alto`. La lógica está en `backend/services/alerta.py`.
- Ajustes de sonido, volumen, vibración, cámara y resolución se guardan en el dispositivo (localStorage).

---

## Licencias

- **YOLOv8 / Ultralytics: AGPL-3.0.** Revisar sus implicaciones antes de distribuir o comercializar el sistema.
- El resto de dependencias son open source con licencias propias.

---

## Limitaciones conocidas

- No estima la velocidad propia ni el tiempo a colisión: frenar, detenerse en un semáforo y circular en cola se ven igual para el sistema. El nivel de riesgo no es una probabilidad de colisión ni una distancia real.
- Las clases detectadas son las de COCO que usa el sistema (persona, bicicleta, carro, moto, bus, camión). No hay clase de obstáculos genéricos ni de tranvía.
- La validación del riesgo se hizo con un solo video de conducción en coche. El modo bicicleta no está validado con videos de ciclovía.
- La tasa de expansión casi no actúa a 750 ms entre frames; la mayoría de los niveles `medio` y `alto` salen del tamaño del objeto.
- La alerta puede quedar en silencio durante un riesgo `alto` que persiste.
- La autenticación no usa tokens ni protege rutas; CORS está abierto.
- La inferencia corre en CPU. La latencia medida es backend + loopback en PC, no extremo a extremo desde el celular.
- La vibración depende del soporte del navegador.
- Las pruebas de concurrencia y la instalación desde un entorno limpio no están validadas.

---

## Notas

- `venv/` y `node_modules/` no están en el repositorio: se generan localmente con los pasos anteriores.
- La base de datos SQLite (`idss.db`, `-wal`, `-shm`) y los resultados de pruebas no se versionan.