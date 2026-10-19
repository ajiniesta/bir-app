# Simulacro

Quiero introducir otro nuevo tipo de modo de preguntas al que llamaremos simulacro.
El simulacro es una colección de preguntas ya predefinida por un rol Creador.
Los usuarios normales podran ver y acceder a los simulacros de sus bancos de preguntas o exam_type que pueden ver.
A su vez podrán responder el examen más de una vez, se podrán ver sus resultados y dejar registro de las estadísticas de cada vez que se resolvieron los simulacros.

# Herramienta para importar preguntas

Quiero que los usuarios con el rol de administrador y creador puedan importar preguntas a través de un nuevo modo de importación. Las preguntas vienen en el siguiente formato:
```json

```json
{ 
  "exam_type" : "3",
  "category": "Fisiología",
  "question":"Esta es la pregunta",
  "description": "Esta es la description",
  "answers":[
    {"letter": "A", "text": "respuesta 1", "is_correct":true},
    {"letter": "B", "text": "respuesta 2", "is_correct":false},
    {"letter": "C", "text": "respuesta 3", "is_correct":false},
    {"letter": "D", "text": "respuesta 4", "is_correct":false},    
  ]
}

```
```
```
Se seleccione un fichero en local al servidor y se pase a cargar con el formato anterior. Si tiene fallos la pregunta que evite la importación.
