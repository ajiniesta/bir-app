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

# Landing Page

La landing page sin logar debe ser igual, pero sin mostrar bancos de preguntas, sólo los usuarios que estén logados, podrán ver esta landing page con los bancos de preguntas a los que tengan acceso.

Objetivo de esta iteración TDD:
1. ARQUITECTO: Diseñar la landing page para que se sólo logados en el sistema puedan ver bancos de pruebas, y que la siguiente acción después del login sea ir a esta página de landing.
2. TESTER: Escribir tests de que la Landing Page para usuarios anónimos no muestra bancos de pruebas, y que tras el login el usuario logado tiene acceso a los bancos de pruebas que tiene permisos.
3. FRONTEND DEV: Implementar la redirección después del login a la página de Landing Page. Implementar que la landing page sólo muestre bancos de pruebas para los que el usuario tiene permiso, y si es anónimo no ve nada.
4. BACKEND DEV: En este caso no debería ser necesario modificar el backend

# Administracion

Migrar la página de administración. Sólo los usuarios con rold e ADMIN pueden acceder.

# Crud de preguntas 
Iniciamos la siguiente fase de la migración. Para ello vamos a migrar los formularios de CRUD de preguntas. Migrar listado, creación y edición de preguntas. 

Contexto legacy(Solo lectura):
Estos son los endpoints del CRUD de preguntas.
| GET | `/questions` | `question/list` | Question bank (ADMIN/CREATOR); paginated 20/page with text search + bank/category/tag filters (`?q=&examType=&category=&tag=&page=`) |
| GET | `/questions/{id}` | `question/detail` | ADMIN/CREATOR |
| GET/POST | `/questions/create` | `question/create` | ADMIN/CREATOR |
| GET/POST | `/questions/{id}/edit` | `question/create` | ADMIN/CREATOR |
| POST | `/questions/{id}/delete` | — | ADMIN/CREATOR |

Objetivo de esta iteración TDD:
1. ARQUITECTO: Diseñar y mapear los campos del formulario de Preguntas, definiendo rutas en Next.js y las distintas
2. TESTER: Escribir tests del CRUD para todos los casos del mantenimiento de preguntas.
3. FRONTEND DEV: Implementar las vistas del proyecto web-nextjs, asegurando que los tests pasan y que los resultados se renderizan desde el servidor.
4. BACKEND DEV: En este caso no debería ser necesario modificar el backend
Ejecuta el pipeline TDD.



# Modo Libre
## Configurción y Resultados

Iniciamos la siguiente fase: Modo Libre (Configuración y Resultados).

Contexto Legacy (Solo lectura):
Vistas Thymeleaf: web/src/main/resources/templates/free/config.html y free/result.html.
Endpoint Backend: POST /api/free-sessions y GET /api/free-sessions/{id}.

Objetivo del Sprint TDD:
ARQUITECTO: Mapear los campos del formulario de configuración y la tabla de resultados. Definir las rutas en Next.js (ej. app/free/page.tsx).
TESTER: Escribir tests que validen que el formulario de configuración valida los campos antes de enviarlos.
FRONTEND DEV: Implementar las vistas en el nuevo proyecto bir-app-nextjs, asegurando que la tabla de resultados se renderiza desde el servidor (Server Component) por rendimiento.
Ejecuta el pipeline TDD.

## El motor de examen libre. 

Migrar /free/{id} (la vista donde se responde pregunta a pregunta) y el modal de "Proponer cambio". Requiere manejo de estado (saber qué pregunta toca) e interactividad del lado del cliente.

# Revisiones
Migrar el modo de revisiones, que tendrá que tener acceso desde la barra de navegación superior.

| GET | `/revisiones{?status,examType}` | `review/list` | Review inbox (ADMIN/CREATOR) |
| POST | `/revisiones/{id}/review` | — | Accept/reject a proposal with a note; **accepting applies the change** (ADMIN/CREATOR) |


# Simulacros
Migrar el modo de simulacros del actual version web a web-nextjs. Pasamos todas las rutas de la aplicación original que deben ser migradas e integradas en la nueva web-nextjs.
Contexto Legacy:
| GET | `/simulacros` | `simulacro/list` | Mock exams visible to the user |
| GET | `/simulacros/{id}` | `simulacro/detail` | Detail + attempt history |
| GET | `/simulacros/{id}/pdf` | — | Printable PDF of the whole mock exam (questions + options, no correct answers, with an answer sheet) |
| GET/POST | `/simulacros/new` | `simulacro/form` | Create a mock exam (ADMIN/CREATOR) |
| GET/POST | `/simulacros/{id}/edit` | `simulacro/form` | Edit a mock exam (ADMIN/CREATOR) |
| POST | `/simulacros/{id}/delete` | — | Delete a mock exam (ADMIN/CREATOR) |
| POST | `/simulacros/{id}/start` | — | Start a new attempt |
| GET | `/simulacros/{id}/attempts/{attemptId}` | `simulacro/attempt` | Answer one question at a time |
| POST | `/simulacros/{id}/attempts/{attemptId}/answer` | — | Save an answer |
| POST | `/simulacros/{id}/attempts/{attemptId}/finish` | — | Submit the attempt |
| GET | `/simulacros/{id}/attempts/{attemptId}/result` | `simulacro/result` | Result + review (propose an alternative answer per item) |
| POST | `/simulacros/{id}/attempts/{attemptId}/proposals` | — | Propose an alternative answer from the mock-exam review |

Ejecuta el pipeline TDD.

# Estadisticas
Migrar la sección de estadísticas de web a web-nextjs. Paso la ruta de la aplicación original.
Contexto Legacy:
| GET | `/estadisticas` | `stats/index` | Personal stats by category (free + mock); global section for ADMIN/CREATOR |
Ejecuta el pipeline TDD.

# Import
Crear una vista para la importación de preguntas, que estará en la sección de preguntas, llamando al siguiente endpoint del API:
| POST | `/api/questions/import` | ADMIN/CREATOR | Bulk import of **one batch** (`{content}` carries the raw text); valid questions are saved, faulty ones skipped, already-existing ones counted as `duplicates` |

El fichero a importar puede ser de hasta 10 MB.
La vista tiene que mostrar un progress para que vaya mostrando poco a poco y no bloquee la vista con el fichero cargado.
Debe mostrar una muestra de fichero a importar como este:
```json
{
  "exam_type": "3",
  "category": "Fisiología",
  "tag": "Tema 1",
  "text": "Esta es la pregunta",
  "explanation": "Esta es la explicación",
  "answers": [
    {"letter": "A", "text": "respuesta 1", "is_correct": true},
    {"letter": "B", "text": "respuesta 2", "is_correct": false},
    {"letter": "C", "text": "respuesta 3", "is_correct": false},
    {"letter": "D", "text": "respuesta 4", "is_correct": false}
  ]
}
```
Una vez el fichero se ha terminado de tratar, mostrar los resultados de la importación.
