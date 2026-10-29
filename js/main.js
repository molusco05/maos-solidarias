/* ==========================================================================
   Mãos Solidárias - script principal
   Script clássico (sem ES modules) para funcionar abrindo o index.html direto
   no navegador (file://). Depende de js/data.js, carregado antes.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* ==========================================================================
       0. UTILITÁRIOS
       ========================================================================== */
    const $ = (selector, context = document) => context.querySelector(selector);
    const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scrollBehavior = () => (reducedMotion.matches ? "auto" : "smooth");

    // Escapa texto digitado pelo usuário antes de inserir no HTML (evita XSS)
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
    }

    function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    // Gera protocolos no formato PREFIXO-ANO-XXXX (ex.: MS-2026-7K2F)
    function createProtocol(prefix) {
        const code = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
        return `${prefix}-${new Date().getFullYear()}-${code}`;
    }

    // Data/hora local no formato aceito por <input type="datetime-local">
    function toLocalInput(date) {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    const nowLocalDateTime = () => toLocalInput(new Date());

    const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const relativeFormat = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
    const numberFormat = new Intl.NumberFormat("pt-BR");

    function timeAgo(isoDate) {
        const seconds = Math.round((new Date(isoDate).getTime() - Date.now()) / 1000);
        const units = [
            ["year", 31536000], ["month", 2592000], ["week", 604800],
            ["day", 86400], ["hour", 3600], ["minute", 60]
        ];
        for (const [unit, size] of units) {
            if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
        }
        return "agora mesmo";
    }

    function formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
    }

    const normalize = (text) => String(text || "").toLowerCase();

    /* ==========================================================================
       1. ARMAZENAMENTO LOCAL (localStorage com proteção contra erros)
       ========================================================================== */
    const storage = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false; // cota cheia, modo privado ou armazenamento bloqueado
            }
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch { /* ignora */ }
        }
    };

    // Coleção salva no navegador; se a cota estourar, descarta os registros mais antigos
    function createCollection(key, maxItems) {
        return {
            all() {
                const list = storage.get(key, []);
                return Array.isArray(list) ? list : [];
            },
            save(list) {
                let items = list.slice(0, maxItems);
                while (!storage.set(key, items)) {
                    if (items.length <= 1) return false;
                    items = items.slice(0, -1);
                }
                return true;
            },
            add(item) {
                return this.save([item, ...this.all()]);
            }
        };
    }

    const SIGHTINGS_KEY = "ms:avistamentos";
    const DRAFT_KEY = "ms:rascunho";
    const sightingsStore = createCollection(SIGHTINGS_KEY, 30);

    /* ==========================================================================
       2. NOTIFICAÇÕES (TOASTS)
       ========================================================================== */
    const toastRegion = $("#toasts");
    const TOAST_ICONS = { success: "✅", error: "⚠️", info: "💡" };
    const MAX_TOASTS = 2;

    function toast(message, { type = "success", title = "", duration = 6000 } = {}) {
        if (!toastRegion) return;
        const item = document.createElement("div");
        item.className = `toast toast--${type}`;
        item.innerHTML = `
            <span class="toast__icon" aria-hidden="true">${TOAST_ICONS[type] || ""}</span>
            <div>
                ${title ? `<strong class="toast__title">${escapeHTML(title)}</strong>` : ""}
                <p class="toast__msg">${escapeHTML(message)}</p>
            </div>
            <button type="button" class="toast__close" aria-label="Fechar aviso">×</button>`;

        const remove = () => {
            item.classList.add("is-leaving");
            setTimeout(() => item.remove(), 300);
        };
        $(".toast__close", item).addEventListener("click", remove);

        while (toastRegion.children.length >= MAX_TOASTS) toastRegion.firstElementChild.remove();
        toastRegion.appendChild(item);
        setTimeout(remove, duration);
    }

    function setButtonLoading(button, isLoading) {
        if (!button) return;
        button.disabled = isLoading;
        button.classList.toggle("is-loading", isLoading);
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback para file:// ou navegadores sem Clipboard API
            const area = document.createElement("textarea");
            area.value = text;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            let ok = false;
            try { ok = document.execCommand("copy"); } catch { ok = false; }
            area.remove();
            return ok;
        }
    }

    /* ==========================================================================
       3. CABEÇALHO, MENU, PROGRESSO DE ROLAGEM E VOLTAR AO TOPO
       ========================================================================== */
    const header = $(".header");
    const navToggle = $(".nav__toggle");
    const navMenu = $("#menu");
    const progress = $(".scroll-progress");
    const backToTop = $(".topo");

    function setMenu(open) {
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
        navMenu.classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
    }

    navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
    $$("a", navMenu).forEach((link) => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && navMenu.classList.contains("is-open")) setMenu(false);
    });

    function onScroll() {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        header.classList.toggle("is-scrolled", y > 40);
        progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        backToTop.classList.toggle("is-visible", y > 900);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: scrollBehavior() }));

    // Destaca no menu a seção visível
    const navLinks = $$('.nav__menu a[href^="#"]:not(.btn)');
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((link) => link.classList.toggle("is-current", link.getAttribute("href") === `#${entry.target.id}`));
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach((link) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (target) spy.observe(target);
    });

    /* ==========================================================================
       4. ANIMAÇÕES: REVELAR AO ROLAR, DIGITAÇÃO, CONTADORES, VÍDEO
       ========================================================================== */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    function observeReveal(context = document) {
        $$(".reveal:not(.is-visible)", context).forEach((el, i) => {
            el.style.setProperty("--delay", `${(i % 4) * 90}ms`);
            revealObserver.observe(el);
        });
    }
    observeReveal();

    (function initTyping() {
        const el = $(".typing");
        if (!el) return;
        let words;
        try { words = JSON.parse(el.dataset.words); } catch { words = ["um lar."]; }
        if (reducedMotion.matches) {
            el.textContent = words[0];
            return;
        }
        let word = 0;
        let letter = 0;
        let deleting = false;

        (function tick() {
            const current = words[word];
            letter += deleting ? -1 : 1;
            el.textContent = current.slice(0, letter);

            let delay = deleting ? 45 : 95;
            if (!deleting && letter === current.length) {
                deleting = true;
                delay = 1800;
            } else if (deleting && letter === 0) {
                deleting = false;
                word = (word + 1) % words.length;
                delay = 350;
            }
            setTimeout(tick, delay);
        })();
    })();

    (function initCounters() {
        const counters = $$("[data-count]");
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                const el = entry.target;
                const target = Number(el.dataset.count);
                const prefix = el.dataset.prefix || "";
                const suffix = el.dataset.suffix || "";
                const duration = reducedMotion.matches ? 0 : 1800;
                const start = performance.now();

                (function frame(now) {
                    const t = duration ? Math.min(1, (now - start) / duration) : 1;
                    const eased = 1 - Math.pow(1 - t, 3);
                    el.textContent = prefix + numberFormat.format(Math.round(target * eased)) + suffix;
                    if (t < 1) requestAnimationFrame(frame);
                })(start);
            });
        }, { threshold: 0.5 });
        counters.forEach((el) => observer.observe(el));
    })();

    // Vídeo de fundo: pausa para quem prefere menos movimento ou quando sai da tela
    (function initVideo() {
        const video = $(".hero__video");
        if (!video) return;
        if (reducedMotion.matches) {
            video.pause();
            video.removeAttribute("autoplay");
            return;
        }
        new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) video.play().catch(() => {});
            else video.pause();
        }).observe(video);
    })();

    // Inclinação 3D suave nos cards (apenas com mouse)
    function initTilt(context = document) {
        if (reducedMotion.matches || !window.matchMedia("(hover: hover)").matches) return;
        $$("[data-tilt]:not([data-tilt-ready])", context).forEach((card) => {
            card.dataset.tiltReady = "1";
            card.addEventListener("pointermove", (event) => {
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-6px)`;
            });
            card.addEventListener("pointerleave", () => { card.style.transform = ""; });
        });
    }

    /* ==========================================================================
       5. VALIDAÇÃO DE FORMULÁRIOS (CONSTRAINT VALIDATION API)
       ========================================================================== */
    function getFieldMessage(input) {
        const { validity } = input;
        if (validity.valueMissing) {
            if (input.type === "radio") return "Selecione uma das opções.";
            if (input.type === "checkbox") return "Marque esta opção para continuar.";
            if (input.tagName === "SELECT") return "Selecione uma opção.";
            return "Este campo é obrigatório.";
        }
        if (validity.tooShort) return `Digite pelo menos ${input.minLength} caracteres.`;
        if (validity.typeMismatch && input.type === "email") return "Informe um e-mail válido.";
        if (validity.patternMismatch) return input.dataset.patternMessage || "Formato inválido.";
        if (validity.rangeOverflow) return input.dataset.maxMessage || "Valor acima do permitido.";
        if (validity.customError) return input.validationMessage;
        return "Verifique este campo.";
    }

    function setFieldError(input, message) {
        const field = input.closest(".field");
        if (!field) return;
        field.classList.add("is-invalid");
        const error = $(".field-error", field);
        if (error) error.textContent = message;
        const group = input.type === "radio" ? $$(`input[name="${input.name}"]`, input.form) : [input];
        group.forEach((el) => el.setAttribute("aria-invalid", "true"));
    }

    function clearFieldError(input) {
        const field = input.closest(".field");
        if (!field) return;
        field.classList.remove("is-invalid");
        const error = $(".field-error", field);
        if (error) error.textContent = "";
        const group = input.type === "radio" ? $$(`input[name="${input.name}"]`, input.form) : [input];
        group.forEach((el) => el.removeAttribute("aria-invalid"));
    }

    // Valida todos os campos de um formulário ou de um trecho dele (ex.: um passo)
    function validateFields(container) {
        let firstInvalid = null;
        const checkedGroups = new Set();

        $$("input, select, textarea", container).forEach((input) => {
            if (!input.willValidate) return;
            if (input.type === "radio") {
                if (checkedGroups.has(input.name)) return;
                checkedGroups.add(input.name);
            }
            if (input.checkValidity()) {
                clearFieldError(input);
            } else {
                setFieldError(input, getFieldMessage(input));
                if (!firstInvalid) firstInvalid = input;
            }
        });

        if (firstInvalid) {
            const field = firstInvalid.closest(".field") || firstInvalid;
            field.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
            firstInvalid.focus({ preventScroll: true });
        }
        return !firstInvalid;
    }

    // Validação em tempo real: limpa o erro assim que o campo fica válido
    $$("form[novalidate]").forEach((form) => {
        const revalidate = (event) => {
            const input = event.target;
            const field = input.closest && input.closest(".field");
            if (field && field.classList.contains("is-invalid") && input.checkValidity()) {
                clearFieldError(input);
            }
        };
        form.addEventListener("input", revalidate);
        form.addEventListener("change", revalidate);
    });

    // Contador de caracteres para textareas com limite
    $$("textarea[maxlength]").forEach((textarea) => {
        const counter = document.getElementById(`${textarea.id}-contador`);
        if (!counter) return;
        const max = textarea.maxLength;
        const update = () => {
            const length = textarea.value.length;
            counter.textContent = `${length}/${max}`;
            counter.classList.toggle("is-near-limit", length >= max * 0.9);
        };
        textarea.addEventListener("input", update);
        textarea.form && textarea.form.addEventListener("reset", () => setTimeout(update));
        update();
    });

    // Máscara de telefone: (19) 99999-9999 ou (19) 3333-3333
    $$("[data-phone-mask]").forEach((input) => {
        input.addEventListener("input", () => {
            const digits = input.value.replace(/\D/g, "").slice(0, 11);
            let masked = digits;
            if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
            if (digits.length > 6) {
                const split = digits.length === 11 ? 7 : 6;
                masked = `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
            }
            input.value = masked;
        });
    });

    /* ==========================================================================
       6. CHAVE PIX: DETECÇÃO AUTOMÁTICA DO TIPO E VALIDAÇÃO
       ========================================================================== */
    function isValidCPF(digits) {
        if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
        const calc = (len) => {
            let sum = 0;
            for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
            const rest = (sum * 10) % 11;
            return rest === 10 ? 0 : rest;
        };
        return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
    }

    function isValidCNPJ(digits) {
        if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
        const calc = (len) => {
            const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
            const rest = sum % 11;
            return rest < 2 ? 0 : 11 - rest;
        };
        return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
    }

    function detectPix(raw) {
        const value = String(raw || "").trim();
        if (!value) return null;
        if (value.includes("@")) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
                ? { tipo: "E-mail", valido: true }
                : { tipo: "E-mail", valido: false, erro: "E-mail incompleto." };
        }
        if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(value)) {
            return { tipo: "Chave aleatória", valido: true };
        }
        const digits = value.replace(/\D/g, "");
        const looksLikePhone = /^\+|\(/.test(value);
        const looksLikeCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
        if (!looksLikePhone && digits.length === 11 && isValidCPF(digits)) return { tipo: "CPF", valido: true };
        if (looksLikeCPF) return { tipo: "CPF", valido: false, erro: "CPF com dígitos inválidos." };
        if (digits.length === 14 && !looksLikePhone) {
            return isValidCNPJ(digits) ? { tipo: "CNPJ", valido: true } : { tipo: "CNPJ", valido: false, erro: "CNPJ com dígitos inválidos." };
        }
        // Telefone: DDD + 8 dígitos (fixo) ou DDD + 9 + 8 dígitos (celular), com ou sem +55
        const phone = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
        if (phone.length === 10 || (phone.length === 11 && phone[2] === "9")) return { tipo: "Telefone", valido: true };
        if (digits.length === 11 && !looksLikePhone) return { tipo: "CPF", valido: false, erro: "CPF com dígitos inválidos." };
        if (/[a-z]/i.test(value) && value.length >= 6) return { tipo: "Chave aleatória", valido: true };
        return { tipo: "Chave", valido: false, erro: "Não reconhecemos esta chave PIX. Confira os números." };
    }

    /* ==========================================================================
       7. FOTO: ARRASTAR E SOLTAR, COMPRESSÃO E DESFOQUE AUTOMÁTICO
       ========================================================================== */
    // Reduz a foto (máx. 800px, JPEG) para caber no localStorage. Com blur, a imagem
    // é reduzida a poucos pixels e ampliada de volta: desfoque que funciona em todo navegador.
    function compressImage(file, { maxSize = 800, quality = 0.72, blur = false } = {}) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#FFFFFF"; // fundo branco para PNGs transparentes
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (blur) {
                    const small = document.createElement("canvas");
                    small.width = Math.max(8, Math.round(canvas.width / 28));
                    small.height = Math.max(8, Math.round(canvas.height / 28));
                    small.getContext("2d").drawImage(img, 0, 0, small.width, small.height);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
                } else {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Imagem inválida"));
            };
            img.src = url;
        });
    }

    function initDropzone(root, { maxMB = 10, isBlurred = () => false, onChange = () => {} } = {}) {
        const input = $("input[type='file']", root);
        const previewImg = $(".dropzone__preview img", root);
        const fileName = $(".dropzone__filename", root);
        const removeBtn = $(".dropzone__remove", root);
        let file = null;
        let imageData = null;
        let pending = null;

        function clear() {
            input.value = "";
            file = null;
            imageData = null;
            pending = null;
            root.classList.remove("has-file");
            previewImg.removeAttribute("src");
            fileName.textContent = "";
            onChange();
        }

        // (Re)processa a foto atual, respeitando o switch de desfoque
        function process() {
            if (!file) return;
            root.classList.add("is-loading");
            pending = compressImage(file, { blur: isBlurred() })
                .then((dataUrl) => {
                    imageData = dataUrl;
                    previewImg.src = dataUrl;
                    fileName.textContent = file.name;
                    root.classList.add("has-file");
                    onChange();
                    return dataUrl;
                })
                .catch(() => {
                    clear();
                    setFieldError(input, "Não foi possível ler esta imagem. Tente outro arquivo.");
                    return null;
                })
                .finally(() => root.classList.remove("is-loading"));
        }

        function handleFile(newFile) {
            if (!newFile) {
                clear();
                return;
            }
            if (!newFile.type.startsWith("image/")) {
                clear();
                setFieldError(input, "Envie um arquivo de imagem (JPG, PNG ou WEBP).");
                return;
            }
            if (newFile.size > maxMB * 1024 * 1024) {
                clear();
                setFieldError(input, `A imagem deve ter no máximo ${maxMB} MB.`);
                return;
            }
            clearFieldError(input);
            file = newFile;
            process();
        }

        input.addEventListener("change", () => handleFile(input.files[0]));

        ["dragenter", "dragover"].forEach((type) => root.addEventListener(type, (event) => {
            event.preventDefault();
            root.classList.add("is-dragover");
        }));
        ["dragleave", "drop"].forEach((type) => root.addEventListener(type, (event) => {
            event.preventDefault();
            root.classList.remove("is-dragover");
        }));
        root.addEventListener("drop", (event) => {
            const dropped = event.dataTransfer && event.dataTransfer.files[0];
            if (!dropped) return;
            try {
                const transfer = new DataTransfer();
                transfer.items.add(dropped);
                input.files = transfer.files;
            } catch { /* navegadores antigos: segue só com a pré-visualização */ }
            handleFile(dropped);
        });

        removeBtn.addEventListener("click", () => {
            clear();
            input.focus();
        });

        return {
            hasFile: () => Boolean(file),
            refresh: process,
            async getImage() {
                if (pending) await pending;
                return imageData;
            },
            clear
        };
    }

    /* ==========================================================================
       8. MURAL DA ESPERANÇA (EXEMPLOS + ENVIOS DA COMUNIDADE)
       ========================================================================== */
    const URGENCIA = { alta: "Urgência alta", media: "Urgência média", baixa: "Urgência baixa" };
    const COLORS = ["magenta", "laranja", "roxo", "turquesa", "azul", "amarelo"];
    const isSafeImage = (src) => typeof src === "string" && (src.startsWith("data:image/") || src.startsWith("https://"));
    const isSafeUrl = (url) => typeof url === "string" && /^https?:\/\//.test(url);

    function colorFor(text) {
        let hash = 0;
        for (const char of String(text)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
        return COLORS[hash % COLORS.length];
    }

    function initials(name) {
        const parts = String(name || "?").trim().split(/\s+/).filter((p) => /^[\p{L}]/u.test(p));
        return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
    }

    function mapsUrl(person) {
        const query = person.coords
            ? `${person.coords.lat},${person.coords.lng}`
            : `${person.local}, ${person.cidade}`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }

    // Converte os exemplos de data.js para o mesmo formato dos envios
    const examples = MURAL.map((item, index) => ({
        ...item,
        id: `exemplo-${index}`,
        vistoEm: new Date(Date.now() - (item.horasAtras || 1) * 3600000).toISOString(),
        status: "verificado"
    }));

    const mural = (function initMural() {
        const section = $("#mural");
        const grid = $("#mural-grid");
        const empty = $("#mural-vazio");
        const filterButtons = $$(".filtro", section);
        const dialog = $("#detalhe");
        let filter = "todos";
        let list = [];

        function allPeople() {
            return [...sightingsStore.all(), ...examples];
        }

        function mediaHTML(person, extraClass = "") {
            if (isSafeImage(person.foto)) {
                return `<img class="${extraClass}" src="${escapeHTML(person.foto)}" alt="Foto de ${escapeHTML(person.nome || "pessoa avistada")}" loading="lazy">`;
            }
            return `<div class="avatar avatar--${colorFor(person.nome || person.id)} ${extraClass}" aria-hidden="true"><span>${escapeHTML(initials(person.nome))}</span></div>`;
        }

        function needsHTML(person) {
            return (person.precisa || [])
                .map((key) => `<li>${escapeHTML(NECESSIDADES[key] || key)}</li>`)
                .join("");
        }

        function helpButtonHTML(person) {
            if (person.pix) {
                return `<button type="button" class="btn btn--small btn--gradient" data-acao="pix" data-id="${escapeHTML(person.id)}">💸 Copiar PIX</button>`;
            }
            const ong = person.ong && isSafeUrl(person.ong.url) ? person.ong : ONG_PADRAO;
            return `<a class="btn btn--small btn--turquesa" href="${escapeHTML(ong.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(ong.nome)}">🤝 Ajudar via ONG</a>`;
        }

        function cardHTML(person) {
            const local = LOCAIS[person.tipoLocal] || LOCAIS.outro;
            const badges = [
                person.status === "aguardando" ? `<span class="badge badge--pendente">⏳ Aguardando verificação</span>` : "",
                person.exemplo ? `<span class="badge badge--exemplo">Perfil de exemplo</span>` : "",
                `<span class="badge badge--${escapeHTML(person.urgencia)}">${URGENCIA[person.urgencia] || ""}</span>`
            ].join("");

            return `
                <article class="pessoa reveal" data-tilt data-id="${escapeHTML(person.id)}">
                    <button type="button" class="pessoa__media" data-acao="detalhe" data-id="${escapeHTML(person.id)}" aria-label="Ver detalhes de ${escapeHTML(person.nome || "pessoa avistada")}">
                        ${mediaHTML(person)}
                        <span class="pessoa__local">${local.icone} ${escapeHTML(local.label)}</span>
                    </button>
                    <div class="pessoa__corpo">
                        <div class="pessoa__badges">${badges}</div>
                        <h3>${escapeHTML(person.nome || "Sem nome informado")}${person.idade ? `, <span>${escapeHTML(person.idade)}</span>` : ""}</h3>
                        <p class="pessoa__visto">📍 ${escapeHTML(person.local)} · ${escapeHTML(person.cidade)}<br>🕒 visto ${escapeHTML(timeAgo(person.vistoEm))}</p>
                        <p class="pessoa__historia">${escapeHTML(person.historia)}</p>
                        <ul class="pessoa__precisa">${needsHTML(person)}</ul>
                        <div class="pessoa__acoes">
                            ${helpButtonHTML(person)}
                            <button type="button" class="btn-icon" data-acao="share" data-id="${escapeHTML(person.id)}" aria-label="Compartilhar">↗</button>
                            <a class="btn-icon" href="${mapsUrl(person)}" target="_blank" rel="noopener noreferrer" aria-label="Ver no mapa">🗺️</a>
                        </div>
                    </div>
                </article>`;
        }

        function filtered(people) {
            const dayAgo = Date.now() - 86400000;
            switch (filter) {
                case "pix": return people.filter((p) => p.pix);
                case "ong": return people.filter((p) => !p.pix);
                case "urgentes": return people.filter((p) => p.urgencia === "alta");
                case "recentes": return people.filter((p) => new Date(p.vistoEm).getTime() >= dayAgo);
                default: return people;
            }
        }

        function updateStats(people) {
            const set = (key, value) => { $(`[data-stat="${key}"]`, section).textContent = numberFormat.format(value); };
            set("total", people.length);
            set("pix", people.filter((p) => p.pix).length);
            set("urgentes", people.filter((p) => p.urgencia === "alta").length);
        }

        function render({ highlightId = null } = {}) {
            list = allPeople();
            updateStats(list);
            const visible = filtered(list);
            grid.innerHTML = visible.map(cardHTML).join("");
            empty.hidden = visible.length > 0;
            observeReveal(grid);
            initTilt(grid);

            if (highlightId) {
                const card = $(`.pessoa[data-id="${CSS.escape(highlightId)}"]`, grid);
                if (card) {
                    card.classList.add("is-new", "is-visible");
                    setTimeout(() => card.classList.remove("is-new"), 4000);
                }
            }
        }

        filterButtons.forEach((button) => button.addEventListener("click", () => {
            filter = button.dataset.filtro;
            filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
            render();
        }));

        const findPerson = (id) => list.find((p) => p.id === id);

        async function copyPix(person) {
            const ok = await copyText(person.pix);
            toast(ok ? `Chave ${person.pix} copiada. Cole no app do seu banco.` : `Copie manualmente: ${person.pix}`, {
                type: ok ? "success" : "info",
                title: ok ? "PIX copiado!" : "Não foi possível copiar"
            });
        }

        async function share(person) {
            const text = `${person.nome || "Uma pessoa"} precisa de ajuda em ${person.local}, ${person.cidade}. ${person.pix ? `PIX: ${person.pix}` : "Ajude pela ONG parceira."}`;
            const url = location.href.split("#")[0] + "#mural";
            if (navigator.share) {
                try {
                    await navigator.share({ title: "Mãos Solidárias", text, url });
                    return;
                } catch (error) {
                    if (error.name === "AbortError") return;
                }
            }
            window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
        }

        function openDialog(person) {
            const local = LOCAIS[person.tipoLocal] || LOCAIS.outro;
            $(".detalhe__media", dialog).innerHTML = mediaHTML(person);
            $(".detalhe__badges", dialog).innerHTML = $(`.pessoa[data-id="${CSS.escape(person.id)}"] .pessoa__badges`, grid)?.innerHTML || "";
            $("#detalhe-titulo").textContent = person.nome || "Sem nome informado";
            $(".detalhe__historia", dialog).textContent = person.historia;

            const rows = [
                ["Onde", `${local.icone} ${local.label} — ${person.local}, ${person.cidade}`],
                ["Quando", `${formatDate(person.vistoEm)} (${timeAgo(person.vistoEm)})`],
                person.aparencia ? ["Aparência", person.aparencia] : null,
                person.faixa ? ["Idade", FAIXAS_ETARIAS[person.faixa]] : null,
                person.precisa && person.precisa.length ? ["Precisa de", person.precisa.map((k) => NECESSIDADES[k] || k).join(" · ")] : null,
                person.pix ? ["PIX", `${person.pix}${person.pixTipo ? ` (${person.pixTipo})` : ""}`] : ["Doações via", (person.ong || ONG_PADRAO).nome],
                person.protocolo ? ["Protocolo", person.protocolo] : null
            ].filter(Boolean);
            $(".detalhe__info", dialog).innerHTML = rows
                .map(([dt, dd]) => `<div><dt>${escapeHTML(dt)}</dt><dd>${escapeHTML(dd)}</dd></div>`).join("");

            $(".detalhe__acoes", dialog).innerHTML = `
                ${helpButtonHTML(person)}
                <a class="btn btn--small btn--ghost-dark" href="${mapsUrl(person)}" target="_blank" rel="noopener noreferrer">🗺️ Ver no mapa</a>
                <button type="button" class="btn btn--small btn--ghost-dark" data-acao="share" data-id="${escapeHTML(person.id)}">↗ Compartilhar</button>`;

            if (typeof dialog.showModal === "function") dialog.showModal();
            else dialog.setAttribute("open", "");
        }

        function handleAction(event) {
            const trigger = event.target.closest("[data-acao]");
            if (!trigger) return;
            const person = findPerson(trigger.dataset.id);
            if (!person) return;
            if (trigger.dataset.acao === "pix") copyPix(person);
            if (trigger.dataset.acao === "share") share(person);
            if (trigger.dataset.acao === "detalhe") openDialog(person);
        }
        grid.addEventListener("click", handleAction);
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog || event.target.closest(".detalhe__fechar")) dialog.close();
            else handleAction(event);
        });

        // Sincroniza se outra aba do navegador enviar um avistamento
        window.addEventListener("storage", (event) => {
            if (event.key === SIGHTINGS_KEY) render();
        });

        render();
        return { render };
    })();

    /* ==========================================================================
       9. PAINEL "AVISTEI ALGUÉM" (FORMULÁRIO EM PASSOS)
       ========================================================================== */
    (function initSightingForm() {
        const form = $("#form-avistei");
        if (!form) return;

        const panels = $$(".wizard__panel", form);
        const stepItems = $$(".wizard__steps li", form);
        const bar = $(".wizard__bar", form);
        const btnBack = $("#btn-voltar");
        const btnNext = $("#btn-avancar");
        const btnSend = $("#btn-enviar");
        const blurSwitch = $("#desfocar");
        const dateInput = $("#datahora");
        const localInput = $("#local");
        const cidadeInput = $("#cidade");
        const geoButton = $("#btn-geo");
        const geoStatus = $("#geo-status");
        const miniMap = $("#mini-mapa");
        const historia = $("#historia");
        const aparencia = $("#aparencia");
        const faixa = $("#faixa");
        const pixInput = $("#pix");
        const pixBadge = $("#pix-tipo");
        const ongField = $("#campo-ong");
        const ongSelect = $("#ong");
        const consent = $("#consentimento");
        const consentText = $("#consentimento-texto");
        const review = $("#revisao");
        const alertUrgent = $("#alerta-urgencia");
        const alertMinor = $("#alerta-menor");
        let step = 1;
        let coords = null;
        let urgencyAutoSet = false;

        /* ---------- Monta as opções a partir de data.js ---------- */
        $("#chips-local").innerHTML = Object.entries(LOCAIS).map(([key, l], i) => `
            <label class="chip"><input type="radio" name="tipoLocal" value="${key}" ${i === 0 ? "required" : ""}><span>${l.icone} ${l.label}</span></label>`).join("");
        $("#chips-necessidades").innerHTML = Object.entries(NECESSIDADES).map(([key, label]) => `
            <label class="chip"><input type="checkbox" name="precisa" value="${key}"><span>${label}</span></label>`).join("");
        faixa.innerHTML = `<option value="">Selecione...</option>` +
            Object.entries(FAIXAS_ETARIAS).map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
        ongSelect.innerHTML = ONGS.map((ong, i) => `<option value="${i}">${escapeHTML(ong.nome)} — ${escapeHTML(ong.sub)}</option>`).join("");

        const dropzone = initDropzone($("[data-dropzone]", form), {
            isBlurred: () => blurSwitch.checked,
            onChange: updateConsent
        });
        blurSwitch.addEventListener("change", () => {
            dropzone.refresh();
            updateConsent();
        });

        /* ---------- Navegação entre passos ---------- */
        function goTo(target, { focus = true } = {}) {
            step = Math.max(1, Math.min(panels.length, target));
            panels.forEach((panel) => {
                const active = Number(panel.dataset.step) === step;
                panel.hidden = !active;
                panel.classList.toggle("is-active", active);
            });
            stepItems.forEach((item, i) => {
                item.classList.toggle("is-active", i + 1 === step);
                item.classList.toggle("is-done", i + 1 < step);
            });
            bar.style.width = `${(step / panels.length) * 100}%`;
            btnBack.hidden = step === 1;
            btnNext.hidden = step === panels.length;
            btnSend.hidden = step !== panels.length;
            if (step === panels.length) buildReview();
            if (focus) {
                form.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
                const first = $("input:not([type=hidden]):not(.sr-only), select, textarea", panels[step - 1]);
                if (first) first.focus({ preventScroll: true });
            }
        }

        btnNext.addEventListener("click", () => {
            if (validateFields(panels[step - 1])) goTo(step + 1);
        });
        btnBack.addEventListener("click", () => goTo(step - 1));
        // Permite voltar clicando nos passos já concluídos
        stepItems.forEach((item, i) => item.addEventListener("click", () => {
            if (i + 1 < step) goTo(i + 1);
        }));

        /* ---------- Data e hora ---------- */
        function resetDate() {
            dateInput.value = nowLocalDateTime();
            dateInput.max = nowLocalDateTime();
        }
        resetDate();
        $$(".quick-time button", form).forEach((button) => button.addEventListener("click", () => {
            dateInput.value = toLocalInput(new Date(Date.now() - Number(button.dataset.minutos) * 60000));
            dateInput.max = nowLocalDateTime();
            clearFieldError(dateInput);
            saveDraft();
        }));

        /* ---------- GPS + endereço automático + mini-mapa ---------- */
        function setGeoStatus(message, success = false) {
            geoStatus.textContent = message;
            geoStatus.classList.toggle("is-success", success);
        }

        function showMap({ lat, lng }) {
            const d = 0.0035;
            $("iframe", miniMap).src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
            miniMap.hidden = false;
        }

        // Converte coordenadas em endereço usando o OpenStreetMap (gratuito, sem chave)
        async function reverseGeocode({ lat, lng }) {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR&zoom=18`;
            const response = await fetch(url, { headers: { Accept: "application/json" } });
            if (!response.ok) throw new Error("Falha no geocoding");
            const data = await response.json();
            const a = data.address || {};
            const street = [a.road, a.house_number].filter(Boolean).join(", ");
            const area = a.suburb || a.neighbourhood || a.quarter || "";
            return {
                endereco: [street, area].filter(Boolean).join(" — "),
                cidade: a.city || a.town || a.village || a.municipality || ""
            };
        }

        if (!("geolocation" in navigator)) {
            geoButton.hidden = true;
        } else {
            geoButton.addEventListener("click", () => {
                geoButton.classList.add("is-loading");
                setGeoStatus("Obtendo sua localização...");

                navigator.geolocation.getCurrentPosition(async (position) => {
                    coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        precisao: Math.round(position.coords.accuracy)
                    };
                    showMap(coords);
                    setGeoStatus("Buscando o endereço...");
                    try {
                        const place = await reverseGeocode(coords);
                        if (place.endereco) localInput.value = place.endereco;
                        if (place.cidade) cidadeInput.value = place.cidade;
                        setGeoStatus(`✔ Endereço encontrado (precisão de ~${coords.precisao} m). Acrescente um ponto de referência, como "semáforo em frente ao mercado".`, true);
                    } catch {
                        if (!localInput.value.trim()) localInput.value = `Coordenadas ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
                        setGeoStatus(`✔ Localização capturada (precisão de ~${coords.precisao} m). Descreva um ponto de referência.`, true);
                    }
                    [localInput, cidadeInput].forEach(clearFieldError);
                    geoButton.classList.remove("is-loading");
                    saveDraft();
                }, (error) => {
                    geoButton.classList.remove("is-loading");
                    const messages = {
                        1: "Permissão de localização negada. Digite o endereço manualmente.",
                        2: "Não foi possível determinar sua localização agora.",
                        3: "A localização demorou demais para responder. Tente novamente."
                    };
                    setGeoStatus("");
                    toast(messages[error.code] || "Erro ao obter localização.", { type: "error" });
                }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
            });
        }

        /* ---------- Detecção inteligente de emergência e de menores ---------- */
        function analyzeText() {
            const text = normalize(`${historia.value} ${aparencia.value}`);
            const urgent = PALAVRAS_URGENCIA.some((word) => text.includes(word));
            const minor = faixa.value === "menor" || PALAVRAS_MENOR.some((word) => text.includes(word));

            alertUrgent.hidden = !urgent;
            alertMinor.hidden = !minor;

            if (urgent && !urgencyAutoSet) {
                const high = $('input[name="urgencia"][value="alta"]', form);
                if (!high.checked) {
                    high.checked = true;
                    clearFieldError(high);
                    toast("Pelo que você descreveu, marcamos a urgência como alta.", { type: "info", title: "Urgência detectada" });
                }
                urgencyAutoSet = true;
            }
            if (minor && !blurSwitch.checked) {
                blurSwitch.checked = true;
                dropzone.refresh();
            }
            blurSwitch.disabled = minor; // fotos de menores ficam sempre desfocadas
            updateConsent();
        }
        [historia, aparencia].forEach((el) => el.addEventListener("input", analyzeText));
        faixa.addEventListener("change", analyzeText);

        /* ---------- PIX ---------- */
        function checkPix() {
            const result = detectPix(pixInput.value);
            pixInput.setCustomValidity(result && !result.valido ? result.erro : "");
            pixBadge.className = "pix-tipo" + (result ? (result.valido ? " is-ok" : " is-bad") : "");
            pixBadge.textContent = result ? `${result.valido ? "✔" : "⚠"} ${result.tipo}` : "";
            ongField.hidden = Boolean(result && result.valido);
            updateConsent();
            return result;
        }
        pixInput.addEventListener("input", checkPix);

        /* ---------- Consentimento dinâmico ---------- */
        function needsAuthorization() {
            return Boolean(pixInput.value.trim()) || (dropzone.hasFile() && !blurSwitch.checked);
        }
        function updateConsent() {
            consent.required = true;
            consentText.innerHTML = needsAuthorization()
                ? "Confirmo que a pessoa <strong>autorizou</strong> a publicação da foto/PIX e que as informações são verdadeiras."
                : "Confirmo que as informações são verdadeiras e respeitam a dignidade da pessoa.";
            if (step === panels.length) buildReview();
        }

        /* ---------- Revisão antes de enviar ---------- */
        function buildReview() {
            const data = new FormData(form);
            const local = LOCAIS[data.get("tipoLocal")] || LOCAIS.outro;
            const needs = data.getAll("precisa").map((k) => NECESSIDADES[k]).join(" · ") || "—";
            const pix = checkPixSilently();
            const ong = ONGS[Number(data.get("ong"))] || ONGS[0];
            review.innerHTML = `
                <h4>Confira antes de enviar</h4>
                <dl>
                    <div><dt>Pessoa</dt><dd>${escapeHTML(data.get("nome") || "Sem nome")} · ${escapeHTML(FAIXAS_ETARIAS[data.get("faixa")] || "—")}</dd></div>
                    <div><dt>Onde</dt><dd>${local.icone} ${escapeHTML(data.get("local"))}, ${escapeHTML(data.get("cidade"))}</dd></div>
                    <div><dt>Quando</dt><dd>${escapeHTML(formatDate(data.get("datahora")))}</dd></div>
                    <div><dt>Precisa</dt><dd>${escapeHTML(needs)}</dd></div>
                    <div><dt>Doações</dt><dd>${pix && pix.valido ? `PIX (${escapeHTML(pix.tipo)})` : `Via ${escapeHTML(ong.nome)}`}</dd></div>
                    <div><dt>Foto</dt><dd>${dropzone.hasFile() ? (blurSwitch.checked ? "Desfocada 🔒" : "Sem desfoque") : "Sem foto (avatar colorido)"}</dd></div>
                </dl>`;
        }
        const checkPixSilently = () => detectPix(pixInput.value);

        /* ---------- Rascunho automático ---------- */
        const draftNote = $("#draft-note");
        const DRAFT_FIELDS = ["local", "cidade", "datahora", "nome", "faixa", "aparencia", "historia", "pix", "contatoNome", "contatoTel"];
        let draftTimer = null;

        function saveDraft() {
            clearTimeout(draftTimer);
            draftTimer = setTimeout(() => {
                const data = new FormData(form);
                const draft = { coords, campos: {}, tipoLocal: data.get("tipoLocal"), urgencia: data.get("urgencia"), precisa: data.getAll("precisa") };
                DRAFT_FIELDS.forEach((name) => { draft.campos[name] = data.get(name) || ""; });
                const hasContent = Object.entries(draft.campos).some(([key, v]) => key !== "datahora" && v);
                if (hasContent) storage.set(DRAFT_KEY, draft);
            }, 400);
        }

        function restoreDraft() {
            const draft = storage.get(DRAFT_KEY, null);
            if (!draft || !draft.campos) return;
            DRAFT_FIELDS.forEach((name) => {
                const el = form.elements[name];
                if (el && draft.campos[name]) el.value = draft.campos[name];
            });
            const check = (selector) => { const el = $(selector, form); if (el) el.checked = true; };
            if (draft.tipoLocal) check(`input[name="tipoLocal"][value="${CSS.escape(draft.tipoLocal)}"]`);
            if (draft.urgencia) check(`input[name="urgencia"][value="${CSS.escape(draft.urgencia)}"]`);
            (draft.precisa || []).forEach((key) => check(`input[name="precisa"][value="${CSS.escape(key)}"]`));
            if (draft.coords) {
                coords = draft.coords;
                showMap(coords);
            }
            historia.dispatchEvent(new Event("input"));
            checkPix();
            draftNote.hidden = false;
        }

        function clearDraft() {
            clearTimeout(draftTimer);
            storage.remove(DRAFT_KEY);
            draftNote.hidden = true;
        }

        $("#btn-descartar").addEventListener("click", () => {
            clearDraft();
            resetForm();
            toast("Rascunho descartado.", { type: "info" });
        });

        form.addEventListener("input", saveDraft);
        form.addEventListener("change", saveDraft);

        function resetForm() {
            form.reset();
            dropzone.clear();
            coords = null;
            urgencyAutoSet = false;
            miniMap.hidden = true;
            setGeoStatus("");
            [alertUrgent, alertMinor].forEach((el) => { el.hidden = true; });
            blurSwitch.disabled = false;
            $$(".field.is-invalid", form).forEach((field) => field.classList.remove("is-invalid"));
            resetDate();
            checkPix();
            goTo(1, { focus: false });
        }

        /* ---------- Envio ---------- */
        form.addEventListener("submit", async (event) => {
            event.preventDefault(); // protótipo: nada é enviado a um servidor
            dateInput.max = nowLocalDateTime();

            // Revalida todos os passos e leva o usuário ao primeiro com erro
            for (const panel of panels) {
                const n = Number(panel.dataset.step);
                if (n === step) continue;
                panel.hidden = false;
                const ok = validateFields(panel);
                panel.hidden = n !== step;
                if (!ok) {
                    goTo(n);
                    validateFields(panel);
                    toast("Falta preencher algo neste passo.", { type: "error", title: "Quase lá!" });
                    return;
                }
            }
            if (!validateFields(panels[step - 1])) {
                toast("Revise os campos destacados antes de enviar.", { type: "error", title: "Quase lá!" });
                return;
            }

            setButtonLoading(btnSend, true);
            const foto = await dropzone.getImage();
            await wait(700); // simula o tempo de envio

            const data = new FormData(form);
            const pix = detectPix(data.get("pix"));
            const ong = ONGS[Number(data.get("ong"))] || ONGS[0];
            const person = {
                id: createId(),
                protocolo: createProtocol("MS"),
                nome: String(data.get("nome") || "").trim(),
                faixa: data.get("faixa"),
                aparencia: String(data.get("aparencia") || "").trim(),
                historia: String(data.get("historia")).trim(),
                tipoLocal: data.get("tipoLocal"),
                local: String(data.get("local")).trim(),
                cidade: String(data.get("cidade")).trim(),
                coords,
                vistoEm: new Date(data.get("datahora")).toISOString(),
                urgencia: data.get("urgencia"),
                precisa: data.getAll("precisa"),
                pix: pix && pix.valido ? String(data.get("pix")).trim() : "",
                pixTipo: pix && pix.valido ? pix.tipo : "",
                ong: pix && pix.valido ? null : { nome: ong.nome, url: ong.url },
                foto,
                contato: {
                    nome: String(data.get("contatoNome") || "").trim(),
                    telefone: String(data.get("contatoTel") || "").trim()
                },
                status: "aguardando",
                criadoEm: new Date().toISOString()
            };

            const saved = sightingsStore.add(person);
            setButtonLoading(btnSend, false);

            if (!saved) {
                toast("Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).", { type: "error", title: "Erro ao salvar" });
                return;
            }

            clearDraft();
            resetForm();
            mural.render({ highlightId: person.id });
            $("#mural").scrollIntoView({ behavior: scrollBehavior() });

            toast(`Protocolo ${person.protocolo}. O card aparece no mural e será verificado por voluntários.`, {
                title: "Obrigado por enxergar! 💛",
                duration: 9000
            });
        });

        restoreDraft();
        goTo(1, { focus: false });
    })();

    /* ==========================================================================
       10. CARROSSEL DE DOAÇÕES (SETAS, BOLINHAS, ARRASTAR E AUTOPLAY)
       ========================================================================== */
    (function initCarousel() {
        const root = $(".carousel");
        const track = $("#carousel-track");
        if (!root || !track) return;

        track.innerHTML = ITENS_DOACAO.map((item, i) => `
            <div class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${ITENS_DOACAO.length}">
                <div class="flip" tabindex="0" role="button" aria-pressed="false" aria-label="${escapeHTML(item.titulo)}: ver o que doar">
                    <div class="flip__front card-cor--${item.cor}">
                        <span class="flip__icon">${item.icone}</span>
                        <h3>${escapeHTML(item.titulo)}</h3>
                        <p>${escapeHTML(item.resumo)}</p>
                        <div class="meta"><span style="--meta:${item.meta}%"></span></div>
                        <small>${item.meta}% da meta de inverno · toque para ver</small>
                    </div>
                    <div class="flip__back">
                        <h3>${item.icone} O que doar</h3>
                        <ul>${item.dicas.map((d) => `<li>${escapeHTML(d)}</li>`).join("")}</ul>
                        <a class="btn btn--small btn--gradient" href="${ONG_PADRAO.url}" target="_blank" rel="noopener noreferrer">Quero doar</a>
                    </div>
                </div>
            </div>`).join("");

        const slides = $$(".slide", track);
        const dotsWrap = $(".carousel__dots", root);
        const viewport = $(".carousel__viewport", root);
        let index = 0;
        let timer = null;

        const perView = () => (window.innerWidth < 640 ? 1 : window.innerWidth < 1000 ? 2 : 3);
        const maxIndex = () => Math.max(0, slides.length - perView());

        function buildDots() {
            dotsWrap.innerHTML = Array.from({ length: maxIndex() + 1 }, (_, i) =>
                `<button type="button" aria-label="Ir para o slide ${i + 1}"></button>`).join("");
            $$("button", dotsWrap).forEach((dot, i) => dot.addEventListener("click", () => { go(i); restart(); }));
        }

        function go(i) {
            const max = maxIndex();
            index = i > max ? 0 : i < 0 ? max : i;
            const slideWidth = slides[0].getBoundingClientRect().width;
            const gap = parseFloat(getComputedStyle(track).gap) || 0;
            track.style.transform = `translateX(${-index * (slideWidth + gap)}px)`;
            $$("button", dotsWrap).forEach((dot, n) => dot.classList.toggle("is-active", n === index));
        }

        function start() {
            if (reducedMotion.matches) return;
            stop();
            timer = setInterval(() => go(index + 1), 4500);
        }
        function stop() { clearInterval(timer); }
        function restart() { stop(); start(); }

        $(".carousel__btn--prev", root).addEventListener("click", () => { go(index - 1); restart(); });
        $(".carousel__btn--next", root).addEventListener("click", () => { go(index + 1); restart(); });
        root.addEventListener("mouseenter", stop);
        root.addEventListener("mouseleave", start);
        root.addEventListener("focusin", stop);

        // Vira o card ao clicar / Enter / Espaço
        track.addEventListener("click", (event) => {
            if (event.target.closest("a")) return;
            const flip = event.target.closest(".flip");
            if (flip && !dragged) toggleFlip(flip);
        });
        track.addEventListener("keydown", (event) => {
            const flip = event.target.closest(".flip");
            if (flip && event.target === flip && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                toggleFlip(flip);
            }
        });
        function toggleFlip(flip) {
            const on = !flip.classList.contains("is-flipped");
            flip.classList.toggle("is-flipped", on);
            flip.setAttribute("aria-pressed", String(on));
        }

        // Arrastar com mouse ou dedo (pointer events)
        let startX = 0;
        let deltaX = 0;
        let dragging = false;
        let dragged = false;
        viewport.addEventListener("pointerdown", (event) => {
            if (event.target.closest("a, button")) return;
            dragging = true;
            dragged = false;
            startX = event.clientX;
            deltaX = 0;
            stop();
        });
        window.addEventListener("pointermove", (event) => {
            if (!dragging) return;
            deltaX = event.clientX - startX;
            if (Math.abs(deltaX) > 8) dragged = true;
        });
        window.addEventListener("pointerup", () => {
            if (!dragging) return;
            dragging = false;
            if (Math.abs(deltaX) > 50) go(index + (deltaX < 0 ? 1 : -1));
            setTimeout(() => { dragged = false; }, 0);
            start();
        });

        let resizeTimer = null;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { buildDots(); go(Math.min(index, maxIndex())); }, 150);
        });

        buildDots();
        go(0);
        new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(root);
    })();

    /* ==========================================================================
       11. ONGS, DOCUMENTÁRIOS E GALERIA EM MOVIMENTO
       ========================================================================== */
    $("#ongs-grid").innerHTML = ONGS.map((ong) => `
        <a class="ong reveal card-borda--${ong.cor}" href="${escapeHTML(ong.url)}" target="_blank" rel="noopener noreferrer" data-tilt>
            <span class="ong__sub">${escapeHTML(ong.sub)}</span>
            <h3>${escapeHTML(ong.nome)}</h3>
            <p>${escapeHTML(ong.descricao)}</p>
            <span class="ong__link">Visitar site ↗</span>
        </a>`).join("");

    $("#docs-grid").innerHTML = DOCUMENTARIOS.map((doc) => `
        <a class="doc reveal" href="${escapeHTML(doc.url)}" target="_blank" rel="noopener noreferrer" data-tilt>
            <div class="doc__capa card-cor--${doc.cor}"><span>▶</span></div>
            <div class="doc__corpo">
                <span class="doc__info">${escapeHTML(doc.info)}</span>
                <h3>${escapeHTML(doc.titulo)}</h3>
                <p>${escapeHTML(doc.descricao)}</p>
            </div>
        </a>`).join("");

    // Duplica as imagens para a faixa rolar sem emendas
    const marqueeImages = GALERIA.map((img) =>
        `<img src="${escapeHTML(img.src)}" alt="${escapeHTML(img.alt)}" loading="lazy">`).join("");
    $("#marquee-track").innerHTML = marqueeImages + marqueeImages.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');

    observeReveal();
    initTilt();

    /* ==========================================================================
       12. NEWSLETTER
       ========================================================================== */
    $("#newsletter-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const input = $("#news-email");
        if (!input.checkValidity()) {
            toast("Digite um e-mail válido.", { type: "error" });
            input.focus();
            return;
        }
        input.value = "";
        toast("Você receberá os alertas de campanhas e mutirões.", { title: "Inscrição feita!" });
    });
});
