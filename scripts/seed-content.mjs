// Utilidad de preparación inicial. No se ejecuta durante la compilación.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
const root=new URL('../src/content/',import.meta.url);
let order=0;
function add(section,id,title,description,category,body,extra={}){const dir=new URL(`${section}/`,root);mkdirSync(dir,{recursive:true});const file=new URL(`${id}.md`,dir);if(existsSync(file))return;const meta={title,description,category,status:'Borrador',origin:'LORE KIROSHIRP',updated:'2026-10-16',order:order++,related:[],...extra};writeFileSync(file,`---\n${Object.entries(meta).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n${body}\n`)}
add('guias','primeros-pasos','Tu primera noche en Night City','Una guía para empezar a construir un personaje, una red de contactos y una historia propia.','Primeros pasos',`## Qué es KiroshiRP
KiroshiRP es un proyecto de roleplay ambientado en Night City, dentro del universo de Cyberpunk 2077, concebido para la plataforma multijugador OPEN//77. La experiencia propuesta se centra en la interpretación, la progresión orgánica y las consecuencias de las decisiones.

La web es un archivo público. No necesitas registrarte ni crear un perfil para consultar sus contenidos.

## Qué es OPEN//77
En el planteamiento del proyecto, OPEN//77 es la plataforma multijugador sobre la que se prevé desarrollar la experiencia. Esta guía no confirma compatibilidad, disponibilidad pública ni versiones soportadas. Los requisitos deben contrastarse con la documentación oficial antes de abrir el acceso.

## Qué necesitas para jugar
**Pendiente de verificación técnica:** edición del juego, versión compatible, expansiones necesarias, requisitos de equipo, cliente multijugador y método de instalación. No descargues clientes desde enlaces no confirmados por la organización.

## Cómo acceder al servidor
El acceso y los pasos de conexión se publicarán cuando estén comprobados. No existe en este portal una fecha de apertura confirmada. El enlace de Discord también está pendiente de configuración.

## Crea un personaje que pueda crecer
Empieza por una motivación, una necesidad y un límite. Piensa qué busca tu personaje hoy, qué está dispuesto a hacer y qué le haría cambiar de opinión. Una historia inicial abierta deja espacio a las relaciones que nazcan jugando.

> Ejemplo de rol: un técnico recién llegado busca un trabajo estable. Una reparación pequeña le permite conocer a un vecino; cumplir su palabra le abre un segundo contacto. Es un ejemplo narrativo, no una misión implementada.

## Tus primeros contactos y trabajos
Escucha, pregunta y participa en escenas cotidianas. Ofrece servicios coherentes con la experiencia de tu personaje. Los primeros trabajos pueden servir para conocer personas, pero el catálogo de empleos y sus recompensas todavía debe definirse.

## Cómo conocer una facción
Acércate desde la ficción: conversaciones, encargos y relaciones sostenidas. La filosofía del proyecto evita formularios de postulación tradicionales; la pertenencia se construye por méritos y reconocimiento. No des por hecho que una organización está disponible: comprueba su estado público.

## Normas y asistencia
Consulta Normativas antes de participar. Las fichas actuales están marcadas como borradores y requieren aprobación. El canal de asistencia se anunciará en Contacto cuando exista un enlace verificado.`,{related:['guias/preguntas-frecuentes','guias/glosario','normativas/general']});
add('guias','preguntas-frecuentes','Preguntas frecuentes','Las primeras respuestas antes de entrar en la ciudad.','Ayuda',`## ¿Necesito una cuenta en esta web?
No. Todo el contenido es público y el portal no incluye registro, login ni perfiles.

## ¿Está abierto el servidor?
Este portal no confirma una fecha de apertura ni disponibilidad de conexión. Los anuncios oficiales aparecerán en Actualizaciones.

## ¿Cómo entro en una banda?
La propuesta es hacerlo mediante contactos, encargos y reconocimiento dentro del rol. Los criterios definitivos y las organizaciones disponibles siguen pendientes de validación.

## ¿Puedo usar información de la enciclopedia dentro del juego?
Leer información como jugador no significa que tu personaje la conozca. Distingue lo que sabes fuera de personaje de lo que ha aprendido durante su historia.

## ¿Dónde se consultan los cambios?
Cada ficha incluye una fecha de revisión editorial y un historial. Los anuncios del servidor tendrán su propio registro cuando se publiquen.

## ¿Por qué hay borradores?
Para presentar el diseño del proyecto sin confundir propuestas con reglas vigentes. La etiqueta de cada artículo indica su estado.`,{related:['guias/primeros-pasos','guias/glosario']});
add('guias','glosario','Glosario de rol','Un vocabulario compartido para entender el archivo.','Conceptos',`## IC y OOC
**IC (In Character):** lo que ocurre dentro de la ficción y desde la perspectiva del personaje.

**OOC (Out Of Character):** comunicación o información fuera del personaje. Las definiciones siguientes son orientativas y requieren adaptación a la normativa oficial.

## MG — Metagaming
Uso de información externa por parte del personaje sin haberla obtenido dentro de la ficción.

## PG — Powergaming
Interpretaciones que fuerzan resultados, capacidades o acciones ajenas sin dar espacio de respuesta o sin respetar las posibilidades acordadas.

## CK — Character Kill
Término usado para la muerte definitiva de un personaje. Sus condiciones, consentimiento y procedimiento en KiroshiRP están pendientes de definición.

## PK — Player Kill
Término cuyo alcance varía entre comunidades. Sus efectos sobre memoria, heridas y continuidad no están definidos aún para KiroshiRP.

## Street Cred
Reputación de calle: reconocimiento que se construye mediante acciones y relaciones. Los umbrales o desbloqueos de KiroshiRP no están publicados.`,{related:['normativas/general','mecanicas/reputacion']});
add('mecanicas','cyberpsicosis','Cyberpsicosis','Una frontera ficticia entre identidad, tecnología y presión. Propuesta de interpretación responsable.','Ciberware',`## Un concepto del universo Cyberpunk
La cyberpsicosis es un concepto ficticio asociado a la relación entre seres humanos y tecnología en el universo Cyberpunk. Esta ficha no es una explicación clínica ni equipara enfermedades mentales reales con violencia. La síntesis canónica detallada queda pendiente de revisión de fuentes.

## Representación propuesta en KiroshiRP
La intención es crear oportunidades de interpretación con apoyo médico y consecuencias narrativas proporcionadas. No debe convertirse en una licencia para agredir sin límites ni en una penalización arbitraria por llevar implantes. Ninguna fase está confirmada como implementada.

## Implantes y factores de inestabilidad
El diseño puede explorar la adaptación a los implantes, su mantenimiento y la presión acumulada en la historia del personaje. La cantidad de ciberware no debe tomarse aquí como una causa automática ni como una fórmula pública. Los factores y su funcionamiento definitivo están pendientes de validación.

## Síntomas y efectos de rol
Se proponen señales narrativas como desconexión, dificultad para concentrarse o cambios en la percepción. Deben acordarse límites antes de escenas intensas. No es necesario representar agresividad, y ninguna etiqueta autoriza imponer el estado emocional o las acciones de otro personaje.

## Consecuencias y recuperación
El diseño prevé explorar descanso, acompañamiento, revisión de implantes y atención médica dentro de la ficción. No se fijan duraciones, pérdidas ni tratamientos automáticos. La recuperación debería generar continuidad narrativa, sin invalidar la agencia del jugador.

## Intervención médica y policial
Como propuesta, el personal médico prioriza la atención y la estabilización. La intervención policial responde a la conducta observable y al riesgo de la escena, no al mero uso de una etiqueta. Protocolos y competencias deben aprobarse con la normativa correspondiente.

## Límites de interpretación
Habla fuera de personaje si una escena resulta incómoda. Evita estereotipos sobre trastornos reales. No uses la mecánica para eludir normas, justificar ataques indiscriminados o acceder a información oculta. Las escenas de riesgo requieren criterios públicos, coherentes y revisables.`,{status:'Propuesta',related:['mecanicas/ciberware','normativas/cyberpsicosis']});
add('mecanicas','ciberware','Ciberware e implantes','La tecnología cambia lo que puedes hacer. El rol define lo que decides hacer con ella.','Ciberware',`## Categorías de implantes
La ficha está preparada para organizar implantes por función: sensorial, neural, extremidades, protección y soporte corporal. Es una clasificación editorial provisional; el catálogo permitido y sus efectos deben validarse.

## Instalación y ripperdocs
La propuesta concede a los ripperdocs un papel narrativo en la valoración, instalación y seguimiento. Una intervención debería dejar espacio para preguntas, consentimiento y recuperación. Precios, disponibilidad y requisitos no están definidos.

## Mantenimiento
Las revisiones pueden abrir historias de ajuste, desgaste o reparación. No se establece una frecuencia obligatoria ni un coste definitivo.

## Limitaciones y riesgos
Tener un implante no permite imponer resultados a otros jugadores. Sus capacidades deben estar respaldadas por la ficha aprobada y por las reglas de la escena. Compatibilidad, riesgos y límites técnicos siguen en diseño.

## Relación con la cyberpsicosis
La propuesta trata la adaptación al ciberware como un posible elemento narrativo, sin establecer causalidad automática ni fórmulas explotables. Consulta la ficha de cyberpsicosis para conocer los límites de interpretación.`,{status:'Propuesta',related:['mecanicas/cyberpsicosis','normativas/rol']});
add('mecanicas','reputacion','Reputación y Street Cred','Las acciones dejan huella. La confianza no se obtiene con un formulario.','Progresión',`## Reputación general
La filosofía de KiroshiRP sitúa las acciones dentro del rol en el centro del reconocimiento. Cumplir una promesa, resolver un problema o romper un acuerdo puede influir en cómo otros personajes te perciben. No se confirma un marcador numérico implementado.

## Reputación con facciones
Una organización puede confiar en alguien a quien otras rechazan. La reputación propuesta es contextual: las relaciones y los antecedentes importan. No equivale automáticamente a pertenecer a una facción.

## Méritos internos
Los méritos representan aportaciones reconocidas dentro de una organización. Se proponen como base para nuevas responsabilidades y para el derecho a reclamar liderazgo. La cantidad necesaria y la forma de validarlos no están fijadas.

## Confianza y lealtad
La confianza se interpreta en relaciones sostenidas. Compartir objetivos no impide desacuerdos, y una traición puede cerrar puertas sin borrar la historia previa.

## Oportunidades y consecuencias
Como diseño, el reconocimiento puede abrir encargos, contactos y responsabilidades. Los desbloqueos exactos se publicarán tras aprobarlos. No hay garantías de ascenso automático por repetir una acción.`,{status:'Propuesta',related:['mecanicas/facciones-progresion','mecanicas/liderazgo']});
add('mecanicas','facciones-progresion','Facciones y progresión','De una primera conversación al reconocimiento de una organización.','Progresión',`## Acceso a través del rol
La filosofía del servidor evita las postulaciones tradicionales para bandas y organizaciones. El acceso se construye mediante encargos, contactos, méritos y relaciones reconocidas por sus miembros. No se anuncian aquí vacantes ni accesos automáticos.

## Un recorrido propuesto
1. **Simpatizante:** conoce la cultura de la organización y comienza a relacionarse.
2. **Colaborador:** participa en encargos y demuestra fiabilidad.
3. **Miembro oficial:** recibe reconocimiento de pertenencia.
4. **Veterano:** asume responsabilidades y aporta continuidad.
5. **Liderazgo:** reúne legitimidad y respaldo mediante el proceso establecido.

Estas etapas son un diseño inicial; cada facción tendrá que validar sus rangos y requisitos.

## Encargos e iniciación
Las pruebas propuestas deben generar escenas con sentido narrativo. Repetir tareas sin contexto no sustituye la interpretación ni garantiza ascensos.

## Reconocimiento por los miembros
La organización reconoce aportaciones y confianza. Los criterios definitivos deben ser públicos en lo que afecta al acceso y la progresión, sin revelar contactos secretos ni operaciones internas.`,{status:'Propuesta',related:['mecanicas/reputacion','mecanicas/liderazgo','normativas/facciones']});
add('mecanicas','liderazgo','Reclamación de liderazgo','EL RESPETO SE GANA. EL PODER SE RECLAMA.','Liderazgo',`## Las tres bases
El sistema original propuesto para KiroshiRP combina **méritos suficientes**, una **reunión presencial de rol** y el **respaldo de los veteranos habilitados**. Es un diseño pendiente de implementación y aprobación, no una funcionalidad disponible.

## Proceso de reclamación
1. El jugador consigue méritos dentro de la facción.
2. Al cumplir los criterios aprobados, desbloquea el derecho a reclamar.
3. Presenta su reclamación dentro del juego.
4. Se convoca una reunión de facción.
5. Los candidatos defienden su posición mediante rol.
6. Los veteranos habilitados muestran su respaldo.
7. El sistema previsto valida el resultado según las reglas aprobadas.
8. Se reconoce al nuevo líder.

No se publica una interfaz de votación ni se exponen respaldos privados en esta web.

## Primer liderazgo
Propuesta pendiente: una reunión fundacional con criterios de elegibilidad previamente publicados. La composición del grupo inicial y el proceso de ratificación deben aprobarse antes de usarse.

## Si ya existe un jefe
Propuesta pendiente: permitir una reclamación solo cuando se cumplan las condiciones públicas, respetando los límites temporales y la continuidad de las escenas. No se presume que cualquier reclamación destituya al líder actual.

## Inactividad y sucesión
El procedimiento debe distinguir ausencia justificada, inactividad y renuncia. Se propone una revisión administrativa con comunicación a la facción y un proceso de sucesión trazable. Los plazos siguen pendientes.

## Prevención de abusos
La propuesta exige validar habilitación, impedir respaldos duplicados y disponer de revisión ante conflictos. Los límites a desafíos, empates y quórum se centralizan debajo para que la guía y la normativa siempre coincidan.`,{status:'Propuesta',related:['normativas/liderazgo-normas','mecanicas/reputacion']});
for(const [id,title,category] of [['netrunning','Netrunning','Tecnología'],['economia','Economía','Vida cotidiana'],['trabajos','Trabajos','Vida cotidiana'],['contratos-fixers','Contratos de fixers','Progresión'],['medicina-heridas','Medicina y heridas','Salud y consecuencias'],['muerte-personaje','Muerte de personaje','Salud y consecuencias'],['mercado-negro','Mercado negro','Economía'],['vehiculos-carreras','Vehículos y carreras','Vida cotidiana'],['viviendas','Viviendas','Vida cotidiana'],['territorios','Sistema de territorios','Facciones']])add('mecanicas',id,title,'Archivo reservado para documentar alcance, interpretación y reglas cuando el sistema esté aprobado.',category,`## Estado del sistema
Esta mecánica está prevista como espacio de documentación. No se confirma su disponibilidad ni su implementación.

## Alcance pendiente
Antes de publicar la ficha definitiva se deben concretar el propósito del sistema, las acciones permitidas, las limitaciones y la relación con otras mecánicas.

## Ejemplos y consecuencias
Se incorporarán ejemplos revisados de interpretación y consecuencias. No se publican todavía recompensas, costes, ubicaciones ni procedimientos operativos.

## Normativa relacionada
La versión aprobada deberá enlazar a las normas correspondientes y registrar cualquier modificación relevante.`,{status:'Por documentar',related:['normativas/rol']});
const rules=[['general','Normativa general','Convivencia',[['Respeto y convivencia','Propuesta: preservar un trato respetuoso fuera de personaje. Un conflicto ficticio no justifica hostilidad personal.'],['Metagaming','Propuesta: separar los conocimientos del jugador de lo que el personaje ha aprendido en rol.'],['Powergaming','Propuesta: no imponer resultados ni capacidades que no estén respaldadas por las reglas acordadas.'],['Interpretación e información externa','Propuesta: mantener la coherencia del personaje y no utilizar emisiones, chats externos o documentos OOC como conocimiento IC.'],['Juego limpio','Propuesta: comunicar errores y evitar aprovechar fallos para obtener ventaja.'],['Actuación administrativa','Pendiente: competencias, presentación de incidencias, evidencias, revisión y procedimiento de apelación. No se establece aquí un régimen sancionador.']]],['rol','Normativa de rol','Interpretación',[['Inicio y finalización de situaciones','Propuesta: establecer un contexto comprensible y dar oportunidad a los demás de responder y cerrar la escena.'],['Coherencia narrativa','Propuesta: las acciones deben corresponder a las capacidades y antecedentes del personaje.'],['Heridas y consecuencias','Propuesta: mantener continuidad narrativa de las heridas. Grados, tiempos y recuperación están pendientes.'],['Conflictos','Propuesta: tratar el desacuerdo entre personajes como ficción; recurrir a asistencia cuando sea necesario.'],['Muerte de personaje','Pendiente: alcance de CK y PK, consentimiento, autorización y continuidad. No hay un procedimiento definitivo publicado.']]],['facciones','Normativa de facciones','Organizaciones',[['Acceso y pertenencia','Propuesta: construir acceso mediante rol, contactos y reconocimiento.'],['Límites de miembros y rangos','Pendiente: tamaños máximos, compatibilidades y jerarquías por organización.'],['Responsabilidades','Propuesta: los rangos deben conllevar responsabilidades de interpretación y trato justo.'],['Alianzas y conflictos','Pendiente: procedimientos de alianzas, conflictos y resolución. No se concede permiso automático para acciones contra otras organizaciones.']]],['liderazgo-normas','Normativa de liderazgo','Liderazgo',[['Méritos y derecho a reclamar','Borrador: la reclamación se vincula a méritos reconocidos. Los umbrales deben aprobarse antes de aplicarse.'],['Reuniones y respaldos','Borrador: la defensa de candidaturas sucede presencialmente dentro del rol; los respaldos corresponden a veteranos habilitados.'],['Sucesión e inactividad','Borrador: se requiere un proceso revisable que distinga ausencia, renuncia y sustitución.'],['Protección frente a abusos','Borrador: validar habilitación y duplicados; no exponer votaciones privadas en el portal. Los parámetros compartidos se muestran al final.']]],['cyberpsicosis','Normativa de cyberpsicosis','Ciberware',[['Interpretación respetuosa','Borrador: tratar la cyberpsicosis como ficción, sin asociar automáticamente enfermedad mental real con violencia.'],['Límites','Borrador: ningún estado permite ignorar las normas o imponer acciones a terceros. Acordar límites para escenas intensas.'],['Consecuencias','Pendiente: consecuencias proporcionadas, recuperación y supervisión.'],['Intervenciones de rol','Borrador: atención médica e intervención policial basadas en la escena y su riesgo observable, con procedimientos aún por validar.']]],['policial-corporativa','Normativa policial y corporativa','Instituciones',[['Jerarquías','Pendiente: estructura de rangos, acceso y competencias.'],['Responsabilidades','Borrador: cada función debe tener responsabilidades públicas y mecanismos de supervisión.'],['Procedimientos','Pendiente: protocolos, registros, intervención y escalado. No se publican procedimientos operativos definitivos.'],['Abusos de autoridad','Borrador: la autoridad ficticia no autoriza acoso fuera de personaje. El procedimiento de revisión y sus consecuencias están pendientes.']]]];
for(const [id,title,category,parts] of rules)add('normativas',id,title,'Borrador para revisión de la administración. No constituye normativa vigente.',category,parts.map(([h,t])=>`## ${h}\n${t}`).join('\n\n'),{related:[id==='liderazgo-normas'?'mecanicas/liderazgo':id==='cyberpsicosis'?'mecanicas/cyberpsicosis':'guias/glosario']});
for(const name of ['Watson','Westbrook','City Center','Heywood','Santo Domingo','Pacifica','Badlands'])add('lore',name.toLowerCase().replaceAll(' ','-'),name,`Ficha de ${name}: contexto, ambiente y lugares para una futura lectura de la ciudad.`,'Distritos',`## Descripción y ambiente
Ficha editorial pendiente de contrastar con fuentes oficiales. Se documentará la identidad de ${name}, su vida cotidiana y su contexto social sin mezclar hechos del servidor con el universo original.

## Puntos de interés
Pendiente de incorporar lugares y descripciones verificadas. No se publican ubicaciones restringidas ni información operativa del servidor.

## Organizaciones relevantes
Pendiente de documentar presencias y relaciones canónicas con su referencia correspondiente. La presencia de una organización en el universo no confirma que sea jugable en KiroshiRP.

## Historias de KiroshiRP
No hay acontecimientos propios confirmados para esta ficha. Se incorporarán como LORE KIROSHIRP, separados del canon.`,{origin:'CANON CYBERPUNK',status:'Por documentar',related:['lore/historia-night-city','lore/cronologia']});
add('lore','historia-night-city','Historia de Night City','El marco para entender una ciudad moldeada por ambiciones, conflictos y cultura urbana.','Historia',`## Fundación y evolución
Este capítulo está preparado para una síntesis de la fundación y evolución de Night City. Fechas, nombres y acontecimientos concretos se incorporarán tras una revisión de fuentes oficiales.

## Conflictos importantes
La cronología distinguirá conflictos del universo y acontecimientos originales del servidor. No hay entradas históricas verificadas publicadas en este borrador.

## Situación política y social
Pendiente de documentar instituciones, corporaciones y vida cotidiana con referencias. El contexto de inicio del servidor todavía no está confirmado.

## Cultura urbana
El archivo recogerá subculturas, profesiones e identidades. Las fichas relacionadas están preparadas para ampliar este apartado.

## Canon y continuidad del servidor
**CANON CYBERPUNK** identifica contenido del universo que debe contrastarse con fuentes oficiales. **LORE KIROSHIRP** identifica historias propias; nunca se presentarán como canon oficial.`,{origin:'CANON CYBERPUNK',status:'Por documentar',related:['lore/cronologia','lore/historias-kiroshi']});
add('lore','cronologia','Cronología de Night City','Dos líneas de continuidad: universo original e historias del servidor.','Historia',`## Línea del canon
Sin entradas verificadas todavía. Cada futuro acontecimiento debe incluir fecha, resumen y una fuente oficial concreta.

## Línea KiroshiRP
Sin acontecimientos propios confirmados. No se fija un año de inicio ni un punto de divergencia sin aprobación del proyecto.

## Criterio editorial
Las fechas del lore se separan de las fechas de publicación de artículos. Un cambio en esta web no equivale a un acontecimiento dentro de la ficción.`,{status:'Por documentar',related:['lore/historia-night-city','lore/historias-kiroshi']});
add('lore','historias-kiroshi','Historias de KiroshiRP','El espacio reservado para las decisiones que transformen nuestra Night City.','Lore del servidor',`## Continuidad propia
Este archivo recogerá acontecimientos originales del servidor cuando estén confirmados y sean aptos para consulta pública.

## Historias por escribir
Todavía no se han incorporado eventos, protagonistas ni resultados oficiales. Cada entrada futura deberá indicar su contexto, fecha dentro de la ficción y relación con otras historias.

## Información pública
No se expondrán contactos secretos, operaciones clandestinas o datos privados de jugadores.`,{status:'Por documentar',related:['lore/cronologia']});
for(const name of ['Arasaka','Militech','Trauma Team','Otras corporaciones'])add('lore',name.toLowerCase().replaceAll(' ','-'),name,'Archivo corporativo preparado para completar con información contrastada.','Corporaciones',`## Identidad e historia
La información narrativa de ${name} está pendiente de revisión canónica. No se han incorporado afirmaciones históricas ni operativas sin fuente.

## Presencia en la ciudad
Pendiente de describir actividades, influencia y relaciones públicas del universo oficial.

## En KiroshiRP
Presencia jugable, jerarquías y alcance pendientes de confirmar. La inclusión en la enciclopedia no implica disponibilidad como facción.`,{origin:'CANON CYBERPUNK',status:'Por documentar',related:['facciones/corporaciones','normativas/policial-corporativa']});
for(const name of ['Edgerunners','Mercenarios','Fixers','Netrunners','Ripperdocs','Nómadas'])add('lore',name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),name,'Una entrada del vocabulario urbano de Night City, preparada para su revisión editorial.','Subculturas',`## Concepto y contexto
Esta ficha de ${name} está pendiente de redacción contrastada. Se distinguirán profesión, identidad cultural y uso del término en el universo original.

## Relaciones y cultura
Pendiente de añadir actividades, relaciones y ejemplos respaldados por fuentes.

## Interpretación en KiroshiRP
Las posibilidades de juego, requisitos y sistemas relacionados deben confirmarse antes de anunciarse.`,{origin:'CANON CYBERPUNK',status:'Por documentar',related:['guias/primeros-pasos']});
for(const name of ['Valentinos','Maelstrom','Moxes','Tyger Claws','Voodoo Boys','6th Street','Scavengers','NCPD','Corporaciones'])add('facciones',name.toLowerCase().replaceAll(' ','-'),name,'Dossier público de organización. Su presencia jugable en KiroshiRP está pendiente de confirmación.','Organizaciones',`## Descripción e historia
Ficha reservada para ${name}. La descripción canónica, historia e ideología deben verificarse antes de incorporarse. Este dossier no confirma que la organización esté activa en el servidor.

## Cultura y territorio
Pendiente de documentar identidad, lugares públicos y contexto territorial. No se mostrarán ubicaciones restringidas.

## Actividades y relaciones conocidas
Pendiente de incorporar información pública contrastada. Se excluyen operaciones clandestinas y contactos secretos.

## Rangos y progresión
La estructura concreta no está aprobada. La filosofía general se basa en contactos, encargos, confianza y méritos dentro del rol.

## Cómo aproximarse
Como orientación narrativa, conoce la organización a través de encuentros y relaciones coherentes con tu personaje. No hay una vía garantizada de ingreso ni un formulario tradicional de postulación.

## Normativa y estado
Ficha en desarrollo; requiere validar disponibilidad, requisitos y rangos antes de anunciar una facción activa. Consulta las normativas de facciones y liderazgo.`,{factionStatus:'En desarrollo',status:'Por documentar',related:['mecanicas/facciones-progresion','normativas/facciones','mecanicas/liderazgo']});
add('actualizaciones','plantilla','Plantilla de anuncio — no publicada','Estructura editorial para un futuro anuncio oficial.','Desarrollo',`## Resumen
Sustituir por información confirmada. Esta plantilla no se publica ni se indexa.

## Cambios
Documentar únicamente cambios aprobados y enlazar las fichas afectadas.

## Historial
Registrar fecha de publicación real y revisiones.`,{published:false});
console.log('Contenido inicial preparado sin sobrescribir archivos existentes.');
