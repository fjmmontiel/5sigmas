---
hide:
  - navigation
  - toc
---
# Para quién es
Este sitio es para las personas que quieren entender la IA más allá de los titulares. 
Si buscas aprender a usar una herramienta específica, hay mejores sitios. <br> Si buscas saber cual ha sido exactamente el último modelo publicado por DeepSeek, OpenAI, Anthropic, Google... hay mejores sitios. <br>
**Si buscas entender *cómo funciona* esta tecnología desde sus cimientos, este es tu lugar.**

## Quién lo escribe
Soy **Francisco Maldonado**, doble graduado en Física y Matemáticas.<br>
Trabajo diseñando y construyendo sistemas de IA que operan en tiempo real, desde asistentes de voz hasta visión artificial.<br> Abarcando desde la identificación de necesidades de negocio hasta la implantación.<br>
Escribo para ordenar lo que normalmente queda disperso entre papers, repositorios y benchmarks.

## Colaboraciones y contacto
Si quieres proponer una colaboración, un artículo o una serie, si has encontrado algún error, o simplemente quieres hablar sobre estas tecnologías, contáctame.

<div class="contact-grid" markdown="1">

<div class="contact-item">
<a href="https://www.linkedin.com/in/fjmm1998/" class="contact-link" target="_blank">
<span class="contact-icon">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="20" height="20"><path fill="currentColor" d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"/></svg>
</span>
<span>LinkedIn</span>
</a>
</div>

<div class="contact-item contact-item--split">
<a href="mailto:contacto@5sigmas.com" class="contact-link">
<span class="contact-icon">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20"><path fill="currentColor" d="M64 112c-8.8 0-16 7.2-16 16v22.1l208 161.9l208-161.9V128c0-8.8-7.2-16-16-16H64zM48 212.2V384c0 8.8 7.2 16 16 16h384c8.8 0 16-7.2 16-16V212.2L256 375.4L48 212.2zM0 128C0 92.7 28.7 64 64 64h384c35.3 0 64 28.7 64 64v256c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z"/></svg>
</span>
<span id="email-text">contacto@5sigmas.com</span>
</a>
<button class="copy-button" onclick="copyEmail()" title="Copiar email">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16"><path fill="currentColor" d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V192c0-35.3 28.7-64 64-64zm336 67.9L316.1 128H224v67.9h160z"/></svg>
</button>
</div>

</div>

<script>
function copyEmail() {
navigator.clipboard.writeText("fran@5sigmas.com").then(() => {
const btn = document.getElementById("email-copy-status"); // Note: ID mismatch in orig CSS but script was custom. 
// Simulating visual feedback
const originalText = document.getElementById("email-text").innerText;
document.getElementById("email-text").innerText = "Copiado!";
setTimeout(() => {
document.getElementById("email-text").innerText = originalText;
}, 2000);
});
}
</script>
