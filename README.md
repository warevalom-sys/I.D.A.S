# I.D.A.S
Intelligent Driving Support System - Sistema de soporte inteligente para la conducción

---
 
## Requisitos previos
 
### Python 3.11
 
Este proyecto **requiere Python 3.11** específicamente debido a compatibilidad con las librerías de visión computacional (`torch==2.2.2`, `torchvision==0.17.2`). Versiones superiores o inferiores pueden causar errores en la instalación.
 
Descarga Python 3.11 desde: https://www.python.org/downloads/release/python-3110/
 
### Node.js
 
Necesario para el frontend. Descarga la versión LTS desde: https://nodejs.org/
 
---
 
## Instalación
 
### 1. Clonar el repositorio
 
```bash
git clone <url-del-repositorio>
cd idss
```
 
### 2. Configurar el backend
 
Desde la raíz del proyecto, crea el entorno virtual con Python 3.11:
 
```bash
py -3.11 -m venv venv
```
 
Activa el entorno virtual:
 
```bash
venv\Scripts\activate
```
 
> En Mac/Linux usa: `source venv/bin/activate`
 
Instala las dependencias:
 
```bash
pip install -r requirements.txt
```
 
Las librerías instaladas son:
 
| Librería | Versión |
|---|---|
| torch | 2.2.2 |
| torchvision | 0.17.2 |
| numpy | 2.4.4 |
| pillow | 12.2.0 |
| fastapi / uvicorn | — |
| filelock | 3.25.2 |
| fsspec | 2026.3.0 |
| Jinja2 | 3.1.6 |
| MarkupSafe | 3.0.3 |
| mpmath | 1.3.0 |
| networkx | 3.6.1 |
| sympy | 1.14.0 |
| typing_extensions | 4.15.0 |
 
### 3. Configurar el frontend
 
```bash
cd frontend
npm install
```
 
---
 
## Ejecución
 
### Iniciar el backend
 
Asegúrate de estar en la carpeta `backend` con el entorno virtual activo, luego ejecuta:
 
```bash
cd backend
venv\Scripts\activate
uvicorn app:app --reload --port 8000
```
 
El servidor quedará disponible en: http://localhost:8000
 
### Iniciar el frontend
 
En otra terminal, desde la carpeta `frontend`:
 
```bash
cd frontend
npm run dev
```
 
La aplicación quedará disponible en: http://localhost:5173
 
---
 
## Estructura del proyecto
 
```
idss/
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
└── README.md
```
 
---
 
## Notas importantes
 
- El entorno virtual `venv/` y la carpeta `node_modules/` **no están incluidos** en el repositorio. Deben generarse localmente siguiendo los pasos anteriores.
- El backend debe estar corriendo antes de iniciar el frontend.
- Ambos servidores deben ejecutarse en terminales separadas.
 
