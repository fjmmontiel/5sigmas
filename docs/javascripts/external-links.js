(function () {
    function initExternalLinks(root) {
        var scope = root || document;
        var links = scope.querySelectorAll('a');
        links.forEach(function (link) {
            if (link.hostname && link.hostname !== location.hostname) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener');
            }
        });
    }

    if (typeof document$ !== "undefined" && document$.subscribe) {
        document$.subscribe(function () {
            initExternalLinks(document);
        });
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initExternalLinks(document);
        });
    } else {
        initExternalLinks(document);
    }
})();

function copyEmailToClipboard() {
    const email = "contacto@5sigmas.com";
    navigator.clipboard.writeText(email).then(() => {
        const status = document.getElementById("email-copy-status");
        if (status) {
            const originalText = status.textContent;
            status.textContent = " ¡Copiado!";
            status.style.color = "#26A69A";
            setTimeout(() => {
                status.textContent = originalText;
                status.style.color = "";
            }, 2000);
        }
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
}
