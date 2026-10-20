# Revisión editorial de KiroshiRP — 20 de octubre de 2026

El portal sigue siendo público y no incorpora registro, perfiles ni cuentas de jugadores. El panel editorial privado existente se conserva.

## Corregido en esta revisión

- La guía de inicio ya no indica que falta configurar Discord.
- Las seis fichas de mecánicas sin documentar se agrupan en «En preparación», sin desaparecer de búsquedas ni perder sus enlaces.
- Las normativas se presentan como documentos de trabajo; sus borradores no se convierten en normas vigentes.
- Los enlaces relacionados muestran el título editorial de cada ficha, con sus acentos.
- Las bibliotecas y los artículos incorporan portadas, ilustraciones de interfaz y lectura por apartados. Las ilustraciones no representan ubicaciones, emblemas de facciones ni mapas oficiales.

## Contenido que requiere decisiones del equipo

| Área | Estado actual | Información necesaria |
| --- | --- | --- |
| Netrunning | Por documentar | Alcance y acciones, límites, resolución e interacción con otros sistemas. |
| Trabajos | Por documentar | Empleos disponibles, requisitos, procedimientos y recompensas aprobadas. |
| Mercado negro | Por documentar | Alcance público y límites; los contactos o procedimientos privados no se publican. |
| Vehículos y carreras | Por documentar | Sistemas implementados y reglas aplicables. |
| Viviendas | Por documentar | Disponibilidad, acceso, uso y condiciones aprobadas. |
| Territorios | Por documentar | Alcance, acceso, disputas y límites aprobados. |
| Normativas (6 documentos) | Borradores | Revisión y aprobación del equipo; procedimientos, límites y consecuencias. |
| Otras mecánicas (9 fichas) | Propuestas | Confirmación de implementación y parámetros públicos. |
| Acceso a KiroshiRP | Sin apertura confirmada | Pasos probados de conexión y servicios disponibles. |
| Noticias y eventos | Sin anuncios oficiales | Publicaciones reales del equipo; la plantilla permanece sin publicar. |

Estas lagunas no se rellenan con reglas, funciones o fechas supuestas. Las fichas existentes continúan editables en el administrador y conservan su estado editorial.

## Mantenimiento visual

Los textos de portada y las fases se mantienen en src/data/home.json; los artículos, en src/content. PortalArt.astro contiene ilustraciones decorativas originales en SVG; los emblemas de dos letras en facciones son abreviaturas tipográficas, no logotipos oficiales. CityExplorer.astro utiliza la imagen original de KiroshiRP como ambientación, sin atribuirla a un distrito concreto.

Comprobación de lectura: con JavaScript desactivado se conserva el texto completo. Con JavaScript activo, «Leer por apartados» permite reducir la lectura; los enlaces del índice abren el capítulo enlazado. Los filtros incluyen las fichas en preparación y las despliegan cuando coinciden.
