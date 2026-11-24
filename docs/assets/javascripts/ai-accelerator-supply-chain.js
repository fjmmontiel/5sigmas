(() => {
  const copy = {
    es: {
      loading: "Cargando el atlas…", error: "El atlas no se ha cargado. Vuelve a abrir la página para intentarlo.",
      hero: "Busca por material, chip o empresa", inventoryLink: "Buscar un material", compareLink: "Comparar chips", companyLink: "Ver quién hace cada trabajo",
      summary: (items, platforms) => `${items} materiales e insumos · ${platforms} chips y sistemas`,
      evidence: count => count === 1 ? "Ver la fuente" : `Ver ${count} fuentes`,
      asOf: "Última consulta", compare: "Qué lleva cada acelerador", select: "Elegir qué equipos comparar",
      compareHelp: "Elige los equipos que quieres ver. Las cifras de memoria se refieren a un acelerador salvo que la ficha indique el sistema entero. El ancho de banda indica cuántos datos puede mover la memoria por segundo.",
      material: "Dónde se usa cada material", materialHelp: "Busca una sustancia o abre un paso de la fabricación. Cada ficha explica para qué sirve el material. La composición de cada chip depende de cómo y dónde se fabrica.",
      search: "Buscar", placeholder: "Cuarzo, cobre, estaño…", family: "Paso", role: "Qué hace",
      allFamilies: "Todos los pasos", allRoles: "Todos los usos", use: "Para qué sirve",
      count: (visible, total) => `${visible} de ${total} materiales`,
      more: "Ver más materiales", noMatches: "Prueba con otro material o quita un filtro.", field: "Qué queremos saber",
      fields: {maturity: "Cuándo está disponible", logic: "Chip que hace los cálculos", hbm: "Memoria rápida (HBM)", packaging: "Cómo se unen las piezas", test: "Quién lo prueba"},
      statuses: {documented: "Dato publicado", disclosed: "Consulta el alcance", undisclosed: "Sin dato público en estas fuentes"}
    },
    en: {
      loading: "Loading the atlas…", error: "The atlas could not load. Reopen the page to try again.",
      hero: "Search by material, chip, or company", inventoryLink: "Look up a material", compareLink: "Compare chips", companyLink: "See who does each job",
      summary: (items, platforms) => `${items} materials and inputs · ${platforms} chips and systems`,
      evidence: count => count === 1 ? "See source" : `See ${count} sources`,
      asOf: "Sources checked through", compare: "What each accelerator contains", select: "Choose equipment to compare",
      compareHelp: "Choose the equipment you want to compare. Memory figures are per accelerator unless the entry refers to the whole system. Bandwidth tells you how much data the memory can move per second.",
      material: "Where each material is used", materialHelp: "Look up a substance or open a manufacturing step. Each entry explains what the material does. The exact makeup of a chip depends on how and where it is made.",
      search: "Search", placeholder: "Quartz, copper, tin…", family: "Step", role: "What it does",
      allFamilies: "All steps", allRoles: "All uses", use: "What it's used for",
      count: (visible, total) => `${visible} of ${total} materials`,
      more: "See more materials", noMatches: "Try another material or clear a filter.", field: "What we want to know",
      fields: {maturity: "When it's available", logic: "Chip that does the calculations", hbm: "Fast memory (HBM)", packaging: "How the parts connect", test: "Who tests it"},
      statuses: {documented: "Published information", disclosed: "See what the source covers", undisclosed: "Unspecified in these sources"}
    }
  };
  const pageSize = 6;

  function element(tag, value = "", className = "") {
    const node = document.createElement(tag);
    if (value) node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function tableRegion(title, style) {
    const region = element("div", "", "ac-scroll");
    region.tabIndex = 0;
    region.setAttribute("role", "region");
    region.setAttribute("aria-label", title);
    const table = element("table", "", `ac-table ${style}`);
    region.append(table);
    return { region, table };
  }

  function header(text, scope) {
    const cell = element("th", text);
    cell.scope = scope;
    return cell;
  }

  function evidenceLinks(data, references, labels) {
    const group = element("details", "", "ac-evidence");
    group.append(element("summary", labels.evidence(references.length)));
    for (const key of references) {
      const source = data.sources[key];
      const link = element("a", source.title);
      link.href = source.url;
      link.title = [source.date, source.locator].filter(Boolean).join(" · ");
      group.append(link);
    }
    return group;
  }

  function compareMemory(platform, maximum) {
    const track = element("div", "", "ac-memory");
    track.setAttribute("aria-hidden", "true");
    track.style.setProperty("--ac-memory-share", `${100 * platform.memoryCapacityGb / maximum}%`);
    track.append(element("span"));
    return track;
  }

  function comparison(data, lang, labels, date) {
    const section = element("section", "", "ac-section");
    section.id = "accelerator-comparison";
    const title = element("h2", labels.compare);
    const buttons = element("div", "", "ac-choice");
    buttons.setAttribute("role", "group");
    buttons.setAttribute("aria-label", labels.select);
    const { region, table } = tableRegion(labels.compare, "ac-matrix");
    const selected = new Set(data.platforms.slice(0, 2).map(platform => platform.id));
    const maxCapacity = Math.max(...data.platforms.map(platform => platform.memoryCapacityGb || 0));

    function render() {
      const visible = data.platforms.filter(platform => selected.has(platform.id));
      for (const button of buttons.children) {
        const active = selected.has(button.value);
        button.setAttribute("aria-pressed", active);
        button.setAttribute("aria-disabled", active && selected.size === 1);
      }
      const top = element("thead");
      const heading = element("tr");
      heading.append(header(labels.field, "col"));
      for (const platform of visible) {
        const titleCell = header(platform.name, "col");
        titleCell.append(element("span", platform.kind, "ac-secondary"));
        heading.append(titleCell);
      }
      top.append(heading);
      const body = element("tbody");
      for (const [field, label] of Object.entries(labels.fields)) {
        const row = element("tr");
        row.append(header(label, "row"));
        for (const platform of visible) {
          const claim = platform[field];
          const cell = element("td");
          const status = element("span", labels.statuses[claim.status], "ac-status");
          status.dataset.status = claim.status;
          cell.append(status);
          if (field === "hbm" && platform.memoryCapacityGb) cell.append(compareMemory(platform, maxCapacity));
          cell.append(document.createTextNode(claim.text[lang]), evidenceLinks(data, claim.sources, labels));
          row.append(cell);
        }
        body.append(row);
      }
      table.replaceChildren(top, body);
    }

    for (const platform of data.platforms) {
      const button = element("button", platform.name, "ac-toggle");
      button.type = "button";
      button.value = platform.id;
      button.addEventListener("click", () => {
        if (selected.has(platform.id)) {
          if (selected.size === 1) return;
          selected.delete(platform.id);
        } else {
          selected.add(platform.id);
        }
        render();
      });
      buttons.append(button);
    }
    section.append(
      title,
      element("p", labels.compareHelp, "ac-lede"),
      element("span", `${labels.asOf} · ${date}`, "ac-asof"),
      buttons,
      region
    );
    render();
    return section;
  }

  function filterSelect(title, all, options, lang) {
    const label = element("label", title);
    const select = element("select");
    const everyOption = element("option", all);
    everyOption.value = "";
    select.append(everyOption);
    for (const [key, name] of Object.entries(options)) {
      const option = element("option", name[lang]);
      option.value = key;
      select.append(option);
    }
    label.append(select);
    return { label, select };
  }

  function normalize(value) {
    return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  }

  function inventory(data, lang, labels) {
    const section = element("section", "", "ac-section");
    section.id = "accelerator-materials";
    const layout = element("div", "", "ac-inventory-layout");
    const stages = element("nav", "", "ac-stages");
    stages.setAttribute("aria-label", labels.family);
    const results = element("div", "", "ac-material-results");
    const filters = element("div", "", "ac-filters");

    const searchLabel = element("label", labels.search);
    const query = element("input");
    query.type = "search";
    query.placeholder = labels.placeholder;
    searchLabel.append(query);
    const family = filterSelect(labels.family, labels.allFamilies, data.families, lang);
    family.label.classList.add("ac-mobile-stage");
    const role = filterSelect(labels.role, labels.allRoles, data.roles, lang);
    filters.append(searchLabel, family.label, role.label);

    const count = element("p", "", "ac-count");
    count.setAttribute("role", "status");
    const list = element("div", "", "ac-inventory");
    const more = element("button", labels.more, "ac-toggle ac-more");
    more.type = "button";
    const index = data.materials.map(item => ({
      item,
      terms: normalize([
        item.name.es, item.name.en, item.use.es, item.use.en,
        data.families[item.family][lang], data.roles[item.role][lang]
      ].join(" "))
    }));
    let limit = pageSize;

    function render() {
      const term = normalize(query.value.trim());
      const matched = index.filter(({ item, terms }) =>
        (!family.select.value || item.family === family.select.value) &&
        (!role.select.value || item.role === role.select.value) &&
        terms.includes(term)
      );
      for (const button of stages.children) {
        button.setAttribute("aria-pressed", button.value === family.select.value);
      }
      const records = matched.slice(0, limit).map(({ item }) => {
        const row = element("article", "", "ac-record");
        const identity = element("div");
        identity.append(
          element("strong", item.name[lang], "ac-material-name"),
          element("span", `${data.families[item.family][lang]} · ${data.roles[item.role][lang]}`, "ac-secondary")
        );
        const use = element("div", item.use[lang]);
        use.append(evidenceLinks(data, item.sources, labels));
        row.append(identity, use);
        return row;
      });
      list.replaceChildren(...records);
      count.textContent = records.length ? labels.count(records.length, matched.length) : labels.noMatches;
      more.hidden = limit >= matched.length;
    }

    function resetPage() {
      limit = pageSize;
      render();
    }

    for (const option of family.select.options) {
      const stage = element("button", option.textContent, "ac-stage");
      stage.type = "button";
      stage.value = option.value;
      stage.addEventListener("click", () => {
        family.select.value = stage.value;
        resetPage();
      });
      stages.append(stage);
    }
    for (const [control, event] of [[query, "input"], [family.select, "change"], [role.select, "change"]]) {
      control.addEventListener(event, resetPage);
    }
    more.addEventListener("click", () => {
      limit += pageSize;
      render();
      if (more.hidden) {
        const last = list.lastElementChild;
        last.tabIndex = -1;
        last.focus();
      }
    });
    results.append(filters, count, list, more);
    layout.append(stages, results);
    section.append(element("h2", labels.material), element("p", labels.materialHelp, "ac-lede"), layout);
    render();
    return section;
  }

  function cover(data, labels) {
    const hero = element("header", "", "ac-cover");
    const image = element("img", "", "ac-cover-image");
    image.src = "/assets/images/ai-accelerator-supply-chain/package-cutaway.webp";
    image.alt = "";
    image.decoding = "async";
    const nav = element("div", "", "ac-nav");
    for (const [text, href] of [[labels.inventoryLink, "#accelerator-materials"], [labels.compareLink, "#accelerator-comparison"], [labels.companyLink, "#accelerator-companies"]]) {
      const link = element("a", text, "ac-nav-link");
      link.href = href;
      nav.append(link);
    }
    hero.append(image, element("h2", labels.hero), element("p", labels.summary(data.materials.length, data.platforms.length), "ac-countline"), nav);
    return hero;
  }

  async function mount(root) {
    if (root.dataset.acMounted) return;
    root.dataset.acMounted = "true";
    const lang = root.dataset.acAtlas === "en" ? "en" : "es";
    const labels = copy[lang];
    root.setAttribute("lang", lang);
    const loading = root.querySelector(".ac-loading");
    loading.textContent = labels.loading;
    try {
      const response = await fetch("/assets/data/ai-accelerator-supply-chain.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const date = new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-GB", {
        dateStyle: "long", timeZone: "UTC"
      }).format(new Date(data.asOf));
      loading.replaceWith(
        cover(data, labels),
        inventory(data, lang, labels),
        comparison(data, lang, labels, date)
      );
    } catch (error) {
      loading.textContent = labels.error;
      console.error("AI accelerator atlas:", error);
    }
  }

  for (const root of document.querySelectorAll("[data-ac-atlas]")) void mount(root);
})();
