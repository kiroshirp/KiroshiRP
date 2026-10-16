export const site = {
  name: 'KIROSHIRP', discord: '', contact: '',
  description: 'El archivo público de KiroshiRP. Lore, mecánicas y manual de rol para construir tu historia en Night City.',
};
export const sections = [
  {id:'lore', title:'Lore', subtitle:'Toda ciudad tiene una historia. Conoce la que hay bajo el neón.', code:'01', label:'Archivo de Night City'},
  {id:'mecanicas', title:'Mecánicas', subtitle:'Tus decisiones dejan huella. Descubre los sistemas que dan forma al rol.', code:'02', label:'Sistemas de rol'},
  {id:'normativas', title:'Normativas', subtitle:'Un mundo compartido necesita reglas claras. Consulta el manual de convivencia.', code:'03', label:'Protocolo de convivencia'},
  {id:'facciones', title:'Facciones', subtitle:'Nadie llega lejos en solitario. Encuentra tu lugar entre las organizaciones de la ciudad.', code:'04', label:'Organizaciones'},
  {id:'guias', title:'Guía de inicio', subtitle:'Toda leyenda fue una cara desconocida. Tu primer paso empieza aquí.', code:'05', label:'Acceso ciudadano'},
  {id:'actualizaciones', title:'Actualizaciones', subtitle:'El registro público de una ciudad en construcción.', code:'06', label:'Registro de cambios'},
] as const;
export const leadership = { status: 'Propuesta en desarrollo', minimumMerits: null, veteranEligibility: null, quorum: null, challengeCooldown: null, inactivityDays: null, rules: [
  ['Méritos mínimos','Pendiente de validación.'],['Veteranos habilitados','Criterios de antigüedad y participación pendientes.'],['Quórum y respaldo','Umbrales y resolución de empates pendientes.'],['Límites de desafíos','Intervalo y condiciones de repetición pendientes.'],['Inactividad y sucesión','Plazos, revisión y sustitución pendientes.'],['Protección frente a abusos','Propuesta: un respaldo por persona habilitada; registro revisable por administración. Sin cifras definitivas.']
] };
export const phases = [
 ['Fase inicial','Propuesta del documento: tics visuales y alteraciones de interfaz.'],['Fase crítica','Propuesta del documento: desorientación y alucinaciones mediante scripts, sin implementación confirmada.'],['Ciberpsicosis total','Propuesta del documento: amenaza pública y desenlaces de captura o CK, sujetos a procedimientos aún pendientes.']
];
export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
