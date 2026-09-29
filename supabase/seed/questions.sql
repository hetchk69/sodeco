-- questions.sql
--
-- Preguntas reales de la guía de entrevista, organizadas por rol y sección.
-- Revisadas y aprobadas por el usuario (ver preguntas_por_rol.pdf para el
-- detalle visual). Si la guía cambia de nuevo, regenera este archivo
-- completo a partir de la nueva versión — no lo edites pregunta por
-- pregunta a mano.
--
-- cascade: answers tiene una FK hacia questions. Como este seed se corre antes
-- de que existan respuestas reales, es seguro arrastrar el truncate a answers.
-- Si alguna vez lo corres con respuestas ya guardadas, revisa antes de correrlo.
truncate table questions cascade;

insert into questions (code, role_target, section, text, purpose, answer_type, position, active) values

-- Apertura (los tres roles)
('apertura_01', '{jefe_tienda,asesor_tienda,jefe_bodega}', 'Apertura',
  '¿Cuánto tiempo llevas en este puesto?', 'Contexto sobre la experiencia de la persona', 'text', 1, true),
('apertura_02', '{jefe_tienda,asesor_tienda,jefe_bodega}', 'Apertura',
  'Cuéntanos brevemente en qué consiste tu día a día.', 'Entender el rol desde su propia descripción', 'text', 2, true),

-- Tienda: comunes a Jefe de Tienda y Asesor de Tienda
('tienda_01', '{jefe_tienda,asesor_tienda}', 'Tienda',
  '¿Cómo consultas hoy el inventario disponible en otras tiendas o bodegas?', 'Mapear el proceso actual de consulta', 'text', 10, true),
('tienda_02', '{jefe_tienda,asesor_tienda}', 'Tienda',
  '¿Con qué frecuencia necesitas hacer esa consulta en un día normal?', 'Dimensionar la carga de uso', 'number', 11, true),
('tienda_03', '{jefe_tienda,asesor_tienda}', 'Tienda',
  '¿Qué problemas o demoras tienes con el proceso actual?', 'Detectar dolores concretos', 'text', 12, true),
('tienda_09', '{jefe_tienda,asesor_tienda}', 'Tienda',
  '¿Qué haces mientras esperas la respuesta? ¿Qué pasa con el cliente?', 'Entender el costo de la espera para el cliente y la tienda', 'text', 13, true),
('tienda_10', '{jefe_tienda,asesor_tienda}', 'Tienda',
  '¿Cómo confirmas que el producto realmente está antes de prometerlo al cliente?', 'Detectar el riesgo de prometer algo que luego no está', 'text', 14, true),

-- Tienda: solo Jefe de Tienda
('tienda_04', '{jefe_tienda}', 'Tienda',
  '¿Quién autoriza un traslado de mercancía entre tiendas o bodegas?', 'Entender el flujo de autorización', 'text', 15, true),
('tienda_05', '{jefe_tienda}', 'Tienda',
  '¿Cuántas tiendas y cuántas bodegas maneja la operación hoy?', 'Dimensionar el alcance del sistema', 'number', 16, true),

-- Tienda: solo Asesor de Tienda
('tienda_06', '{asesor_tienda}', 'Tienda',
  '¿Quién más en tu tienda consulta el inventario además de ti?', 'Mapear quién más usaría la herramienta', 'text', 17, true),
('tienda_07', '{asesor_tienda}', 'Tienda',
  '¿Con qué equipo haces hoy esa consulta (celular, computador, radio, otro)?', 'Definir requisitos de dispositivo', 'text', 18, true),
('tienda_08', '{asesor_tienda}', 'Tienda',
  '¿Qué tan seguido cambia el equipo de asesores en tu tienda?', 'Entender la rotación de personal', 'text', 19, true),
('tienda_11', '{asesor_tienda}', 'Tienda',
  '¿Qué información falta o llega mal en las respuestas (cantidad, ubicación, talla o referencia)?',
  'Detectar qué datos concretos hay que garantizar en cada respuesta', 'text', 20, true),

-- Tienda (orden de consulta): Jefe de Tienda y Asesor de Tienda
('tienda_orden_01', '{jefe_tienda,asesor_tienda}', 'Tienda (orden de consulta)',
  'Cuando necesitas consultar inventario, ¿a quién le preguntas primero? Y si esa persona no tiene lo que buscas, cuéntanos todo el proceso: ¿a quién le sigues preguntando después, y después de esa persona?',
  'Mapear en una sola respuesta la cadena completa de a quién consulta, según su zona/ubicación', 'text', 25, true),

-- Gestión de tienda: solo Jefe de Tienda (antes se llamaba "Gerencia"; se
-- renombró porque ahora existe un rol separado llamado Gerencia, ver abajo)
('gestion_tienda_01', '{jefe_tienda}', 'Gestión de tienda',
  'Desde tu rol, ¿cómo describirías el funcionamiento actual del proceso de consulta de inventario entre tiendas y bodegas?',
  'Ver el proceso desde la perspectiva de quien gestiona la tienda', 'text', 30, true),
('gestion_tienda_02', '{jefe_tienda}', 'Gestión de tienda',
  '¿Qué tan bien crees que está funcionando ese proceso hoy en día?', 'Medir su percepción general de efectividad', 'text', 31, true),

-- Bodega: solo Jefe de Bodega
('bodega_01', '{jefe_bodega}', 'Bodega',
  '¿Cómo llevas hoy el control de existencias en la bodega?', 'Entender el proceso actual de control', 'text', 40, true),
('bodega_02', '{jefe_bodega}', 'Bodega',
  '¿Con qué frecuencia haces conteos o verificaciones de inventario?', 'Dimensionar la carga operativa', 'text', 41, true),
('bodega_03', '{jefe_bodega}', 'Bodega',
  '¿Qué problemas tienes hoy para saber qué hay disponible en tiempo real?', 'Detectar dolores concretos', 'text', 42, true),
('bodega_07', '{jefe_bodega}', 'Bodega',
  '¿Qué haces cuando el sistema dice que hay stock y al revisar no hay, o al revés?',
  'Detectar el desfase entre el sistema y la existencia real', 'text', 43, true),

-- Bodega (solicitudes): solo Jefe de Bodega
('bodega_04', '{jefe_bodega}', 'Bodega (solicitudes)',
  '¿Quién te pide más producto?', 'Identificar la tienda o persona con mayor volumen de solicitudes', 'text', 44, true),
('bodega_05', '{jefe_bodega}', 'Bodega (solicitudes)',
  '¿Cómo atiendes actualmente las consultas que te hacen?', 'Mapear el proceso/canal de respuesta actual', 'text', 45, true),
('bodega_06', '{jefe_bodega}', 'Bodega (solicitudes)',
  '¿Qué parte de tu trabajo actual te genera más estrés?', 'Detectar el dolor operativo más fuerte del día a día', 'text', 46, true),

-- Seguimiento: solo Jefe de Bodega
('seguimiento_01', '{jefe_bodega}', 'Seguimiento (orden en que le preguntan)',
  'Cuando una tienda necesita algo, ¿quién te pregunta primero? Y si tú no tienes lo que piden, ¿a quién más le dicen que le pregunte después? Cuéntanos el proceso completo, como en cascada.',
  'Mapear en una sola respuesta el orden real en que las tiendas escalan sus consultas', 'text', 50, true),
('seguimiento_02', '{jefe_bodega}', 'Seguimiento',
  'De cada 10 consultas que recibes, ¿cuántas terminan en un traslado real?', 'Medir la tasa de conversión de consultas', 'number', 51, true),
('seguimiento_03', '{jefe_bodega}', 'Seguimiento',
  '¿Consultas también el inventario de otras bodegas? ¿De cuáles?', 'Mapear relaciones entre bodegas', 'text', 52, true),

-- Logística y facturación: Jefe de Tienda y Jefe de Bodega
('logistica_01', '{jefe_tienda,jefe_bodega}', 'Logística y facturación',
  '¿Cómo se documenta un traslado entre bodegas o tiendas?', 'Entender si el traslado queda registrado en algún lado y cómo', 'text', 60, true),
('logistica_02', '{jefe_tienda,jefe_bodega}', 'Logística y facturación',
  '¿Qué evidencia se necesita para facturar y hoy dónde queda?', 'Mapear qué respaldo existe hoy para facturar', 'text', 61, true),
('logistica_03', '{jefe_tienda,jefe_bodega}', 'Logística y facturación',
  '¿Qué errores o reclamos de facturación aparecen con más frecuencia?', 'Detectar los problemas de facturación más comunes', 'text', 62, true),
('logistica_04', '{jefe_tienda,jefe_bodega}', 'Logística y facturación',
  '¿Cómo se coordina un despacho con transporte externo y qué información necesitan?',
  'Entender el proceso y los datos que pide el transportista', 'text', 63, true),

-- Gerencia: rol nuevo y separado, visión general de la operación (no
-- comparte apertura/cierre con los otros roles, ya trae su propio cierre)
('gerencia_01', '{gerencia}', 'Pedidos y distribución',
  '¿Cada cuánto le hacen pedidos de producto a cada tienda (semanal, quincenal, según demanda)?',
  'Entender la cadencia real de reabastecimiento', 'text', 80, true),
('gerencia_02', '{gerencia}', 'Pedidos y distribución',
  '¿Quién decide cuánto producto le toca a cada tienda en un pedido normal?', 'Identificar quién concentra esa decisión', 'text', 81, true),
('gerencia_03', '{gerencia}', 'Pedidos y distribución',
  'Cuando llega un pedido muy grande (de fábrica o proveedor), ¿a qué tienda o bodega lo mandan primero?',
  'Detectar el criterio real de priorización', 'text', 82, true),
('gerencia_04', '{gerencia}', 'Pedidos y distribución',
  '¿Cómo deciden repartir ese pedido grande entre las distintas tiendas y bodegas?', 'Mapear el proceso de reparto de pedidos grandes', 'text', 83, true),
('gerencia_05', '{gerencia}', 'Pedidos y distribución',
  '¿Con qué criterio deciden cuánto stock debe tener cada tienda (ventas históricas, tamaño de la tienda, tipo de cliente, otro)?',
  'Entender qué variables pesan en la decisión de stock', 'text', 84, true),
('gerencia_06', '{gerencia}', 'Pedidos y distribución',
  'Si tuvieras que repartir un pedido en porcentajes entre tus tiendas (por ejemplo, 20%, 40%, 10%, 10%... hasta llegar a 100%), ¿cómo lo dividirías hoy según la necesidad de compra de cada una?',
  'Obtener una distribución porcentual concreta y comparable entre tiendas', 'text', 85, true),
('gerencia_07', '{gerencia}', 'Pedidos y distribución',
  '¿Qué pasa si una tienda se queda sin producto antes del siguiente pedido?', 'Detectar el plan de contingencia actual ante quiebres de stock', 'text', 86, true),
('gerencia_08', '{gerencia}', 'Pedidos y distribución',
  '¿Qué tan seguido cambian esas cantidades o esa forma de repartir, y por qué?', 'Medir qué tan estable o reactivo es el criterio de reparto', 'text', 87, true),
('gerencia_09', '{gerencia}', 'Estructura general',
  '¿Cuántas tiendas y bodegas tiene la operación hoy, y en qué ciudades están?', 'Confirmar el alcance real de la operación desde la vista de gerencia', 'number', 88, true),
('gerencia_10', '{gerencia}', 'Estructura general',
  '¿Cómo está organizada la jerarquía entre tiendas, bodegas y gerencia?', 'Entender la cadena de mando actual', 'text', 89, true),
('gerencia_11', '{gerencia}', 'Estructura general',
  '¿Quién toma la decisión final cuando hay que autorizar un traslado grande de mercancía entre tiendas?', 'Identificar dónde queda realmente la autoridad de decisión', 'text', 90, true),
('gerencia_12', '{gerencia}', 'Visibilidad de los datos',
  '¿Qué tanta visibilidad tienes tú, desde gerencia, del inventario real de cada tienda y bodega en tiempo real?', 'Medir el nivel de visibilidad actual desde arriba', 'text', 91, true),
('gerencia_13', '{gerencia}', 'Visibilidad de los datos',
  '¿Qué tan confiables consideras que son los datos que llegan hoy desde tiendas y bodegas?', 'Medir la confianza actual en los datos reportados', 'text', 92, true),
('gerencia_14', '{gerencia}', 'Gente y cierre',
  '¿Cómo describirías la comunicación entre los jefes de tienda y los jefes de bodega a la hora de pedir o repartir producto?',
  'Detectar fricciones de comunicación en el proceso de pedidos', 'text', 93, true),
('gerencia_15', '{gerencia}', 'Gente y cierre',
  'Si tuvieras que resumir en una frase el problema más grande de cómo se reparte hoy el producto entre tiendas, ¿cuál sería?',
  'Priorizar el dolor más importante desde la vista de gerencia', 'text', 94, true),
('gerencia_16', '{gerencia}', 'Gente y cierre',
  '¿Algo más que quieras agregar sobre cómo se deciden los pedidos y la distribución hoy?', 'Espacio abierto para comentarios adicionales', 'text', 95, false),

-- Cierre (jefe_tienda, asesor_tienda, jefe_bodega — Gerencia no lo comparte,
-- ya trae su propio cierre arriba en gerencia_15/16)
('cierre_01', '{jefe_tienda,asesor_tienda,jefe_bodega}', 'Cierre',
  'Si pudieras cambiar una sola cosa del proceso actual, ¿cuál sería?', 'Priorizar el dolor más importante para esa persona', 'text', 70, true),
('cierre_02', '{jefe_tienda,asesor_tienda,jefe_bodega}', 'Cierre',
  '¿Algo más que quieras contarnos y que no te hayamos preguntado?', 'Espacio abierto para comentarios adicionales', 'text', 71, false);
