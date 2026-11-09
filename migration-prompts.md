# Inicial

Vamos a iniciar la migración de la UI a Next.js, pero en un PROYECTO NUEVO y SEPARADO para que conviva con el actual.

Contexto actual:
- Tu backend de Micronaut (api) sigue corriendo en el puerto 18080.
- Tu frontend legacy (web/Thymeleaf) sigue en el puerto 8081.

Objetivo de esta iteración:
1. ARQUITECTO: Diseñar la estructura de carpetas para un nuevo proyecto de Next.js (App Router) que se alojará en una nueva carpeta raíz llamada `web-nextjs`. Definir los comandos para inicializarlo y la configuración para que consuma la API en el puerto 18080.
2. TESTER: Escribir el test inicial en Jest que valide que la página de Login (app/login/page.tsx) se renderiza correctamente (Fase Roja).
3. FRONTEND DEV:
   - Crear físicamente el nuevo proyecto en la ruta `web-nextjs`.
   - Implementar el componente de Login básico en React.
4. BACKEND DEV: No intervenir en esta fase, el backend actual (api) se mantiene intacto.

Por favor, empieza generando la estructura y el archivo de inicialización del nuevo proyecto.

# Landing Page, NextAuth.js y Registro

Landing page (/), Login y Registro. (Establece NextAuth y el esqueleto base)

Contexto actual:
- Vista de Landing page: web/src/main/resources/templates/index.html
- Vista de Login: web/src/main/resources/templates/login.html
- Vista de Registro: web/src/main/resources/templates/register.html
- Backend: El endpoint actual POST /login de Micronaut (gestionado por micronaut-security) ya devuelve un JWT, y /POST /register para registrar un nuevo usuario.

Objetivo de esta iteración TDD:
1. ARQUITECTO: Diseñar el contrato para integrar NextAuth.js (Auth.js) usando el proveedor de Credentials contra el POST /login de Micronaut. Definir la estructura de la página app/login/page.tsx.
2. TESTER: Escribir tests de que existe una Landing Page y de que se puede usar el registro correctamente.
3. FRONTEND DEV: Implementar NextAuth.js y la vista de Login en Next.js usando TailwindCSS, asegurando que el JWT devuelto por Micronaut se guarda de forma segura en la sesión de Next.js. También las Landing Page y vista de Registro.
4. BACKEND DEV: En este caso no debería ser necesario modificar el backend, ya que el POST /login es nativo de Micronaut, pero verifica que expone correctamente el JSON con el token de acceso.

Ejecuta el pipeline TDD estricto definido en AGENTS.md para esta funcionalidad.