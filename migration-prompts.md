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