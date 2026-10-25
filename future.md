# Simulacro

Quiero introducir otro nuevo tipo de modo de preguntas al que llamaremos simulacro.
El simulacro es una colección de preguntas ya predefinida por un rol Creador.
Los usuarios normales podran ver y acceder a los simulacros de sus bancos de preguntas o exam_type que pueden ver.
A su vez podrán responder el examen más de una vez, se podrán ver sus resultados y dejar registro de las estadísticas de cada vez que se resolvieron los simulacros.

[X] Done

# Herramienta para importar preguntas

Quiero que los usuarios con el rol de administrador y creador puedan importar preguntas a través de un nuevo modo de importación. Las preguntas vienen en el siguiente formato:

```json
{ 
  "exam_type" : "3",
  "category": "Fisiología",
  "text":"Esta es la pregunta",
  "explanation": "Esta es la description",
  "answers":[
    {"letter": "A", "text": "respuesta 1", "is_correct":true},
    {"letter": "B", "text": "respuesta 2", "is_correct":false},
    {"letter": "C", "text": "respuesta 3", "is_correct":false},
    {"letter": "D", "text": "respuesta 4", "is_correct":false},    
  ]
}
{ 
  "exam_type" : "3",
  "category": "Fisiología",
  "text":"Otra pregunta más",
  "explanation": "Esta es la description de verdad mi hermano",
  "answers":[
    {"letter": "A", "text": "respuesta 1", "is_correct":false},
    {"letter": "B", "text": "respuesta 2", "is_correct":false},
    {"letter": "C", "text": "respuesta 3", "is_correct":true},
    {"letter": "D", "text": "respuesta 4", "is_correct":false},    
  ]
}
```
Se seleccione un fichero en local al servidor y se pase a cargar con el formato anterior. Si tiene fallos la pregunta que evite la importación.

[X] Done

# Categorías

Al crear las preguntas, en el campo de categoria, pase a ser un combo mostrando todas las categorías para ese exam_type.


# estadísticas

Mostrar a cada usuario normal un dashboard de estadísticas con el porcentaje de acierto, y que se pueda ver un gráfico repartido por catgegorías.

# PUntuación real en simulacros

Además de sacar el porcentaje en el resultado del simulacro, mostrar también un calculo en el que se añade 1 punto por cada pregunta correcta y se resta 1/3 de punto y se suman todos los puntos al final.

# Frontend reactivo 

Cambiar a un frontend reactivo...
