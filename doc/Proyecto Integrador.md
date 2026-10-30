22/10/2026  
**Proyecto Integrador** 

FUNDAMENTOS Y  

ESCENARIOS DE  

USO DE LAS  

APLICACIONES  

WEB  

PROGRESIVAS 

**Objetivo del Proyecto** 

Diseñarán, configurarán y construirán un prototipo funcional de una Aplicación Web Progresiva  (PWA) para una empresa de servicios técnicos. El proyecto requiere justificar la arquitectura elegida  mediante un análisis comparativo frente a soluciones móviles nativas/multiplataforma, preparar el  entorno de desarrollo ideal, y asegurar la compatibilidad multiplataforma usando herramientas de  auditoría modernas. 

**Cronograma y Plan de Trabajo** 

**Semana 1: Arquitectura, Entorno y Fundamentos PWA** 

**Fase de Diagnóstico y Selección Arquitectónica** 

• Análisis de requerimientos de la problemática: Técnicos en campo necesitan levantar reportes en  zonas rurales sin internet usando smartphones variados (iOS/Android). • Elaboración de un reporte técnico justificando por qué una PWA es el escenario de uso ideal  frente a una App Web Tradicional, una App Orientada a Servicios (API), una App Nativa y una  Multiplataforma. 

• Entregable Parcial: Documento de Arquitectura de Software con matriz de decisión. **Compatibilidad y Requerimientos de Instalación** 

• Investigación y mapeo de navegadores compatibles con PWA (Chromium-based vs.  WebKit/Safari) y sus limitaciones específicas (ej. almacenamiento máximo en iOS, instalación en  segundo plano).   
• Identificación de los requerimientos mínimos de instalación: Uso obligatorio de HTTPS/Localhost,  Web App Manifest válido y Service Worker registrado con evento fetch. • Entregable Parcial: Tabla de compatibilidad por sistema operativo y checklist de criterios de  instalación. 

**Preparación del Entorno y API Base** 

• Preparación del entorno de desarrollo: Instalación de Node.js, un servidor local seguro y  configuración de Herramientas de Desarrollo (Chrome DevTools / Edge DevTools, Lighthouse, o  Workbox CLI). • Configuración de túneles seguros para pruebas en dispositivos reales (ej. Ngrok o LocalTunnel)  para cumplir el requisito de HTTPS. • Construcción de una API REST (Web Orientada a Servicios) muy básica para simular la persistencia  de los reportes. • Entregable Parcial: Capturas del entorno corriendo sobre HTTPS/Ngrok y endpoint de la API  funcional. 

**Semana 2: Desarrollo del Core PWA y Auditoría** 

**Construcción de la Interfaz y Manifiesto** 

• Desarrollo del front-end responsivo (HTML5, CSS3, JS nativo o framework a elegir). • Creación y vinculación del Web App Manifest (manifest.json). Configuración de colores temáticos,  íconos en diferentes resoluciones (especialmente 192x192 y 512x512) y modo de visualización  standalone. 

• Entregable Parcial: Aplicación con banner de instalación activado (Prompt de adición a pantalla  de inicio). 


**Service Worker e Intercepción de Red (Offline)** 

• Programación y registro del Service Worker. • Implementación del ciclo de vida (install, activate, fetch). • Aplicación de una estrategia de caché (ej. Stale-While-Revalidate para la UI y almacenamiento en  caché de contingencia offline). • Uso experimental de almacenamiento local (LocalStorage o IndexedDB) para guardar los reportes  de campo de forma local cuando no hay red. • Entregable Parcial: Demostración en video o simulación en DevTools de la app funcionando en  "Modo Avión" (Offline). 


  

**Auditoría, Pruebas Multiplataforma y Cierre** 

• Auditoría técnica utilizando Lighthouse en la pestaña de "Progressive Web App" (Meta: Alcanzar   
el 100% en la categoría PWA). • Pruebas de instalación real en al menos dos navegadores distintos (ej. Google Chrome en Android  y Safari en iOS). • Defensa del proyecto ante el grupo. • Entregable Final: Repositorio de GitHub y despliegue en producción (ej. Vercel, Netlify o Firebase  Hosting con HTTPS nativo). 

**Stack Tecnológico Sugerido (Herramientas de Desarrollo)** 

• **Editores/Entornos:** VS Code \+ Extensiones de PWA (PWA Tools). • **Auditoría y Testing:** Chrome/Edge DevTools (Application Panel), Lighthouse, PWA  Builder (para validar el manifiesto). 

• **Despliegue Local / Servidores de Prueba:** Vite, Live Server (con soporte HTTPS) o  Ngrok. 

• **Producción:** Vercel o Netlify (proveen certificados SSL/HTTPS automáticos). 

**Criterios de Evaluación (Rúbrica resumida)** 

• **Análisis Arquitectónico (20%):** Justificación clara de los escenarios de uso y  diferenciación correcta entre tecnologías web, móviles y PWA. 

• **Entorno y Configuración (15%):** Correcta preparación del entorno de desarrollo, uso  de herramientas de inspección y entorno HTTPS activo. 

• **Instalabilidad y Compatibilidad (20%):** Cumplimiento estricto del manifiesto e  instalación exitosa evaluada en navegadores compatibles. 

• **Capacidad Offline (30%):** Service Worker funcional que intercepte peticiones de red y  permita visualizar contenido esencial sin conexión. 

• **Calidad Tecnológica (15%):** Puntaje aprobatorio en la auditoría de Lighthouse PWA y  despliegue en la nube.