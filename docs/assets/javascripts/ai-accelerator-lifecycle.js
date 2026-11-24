(() => {
  const phaseStages = [
    ["mining", "refining", "wafering"],
    ["design", "fab-build", "logic", "memory", "package"],
    ["logistics", "systems", "power"],
    ["operations", "recovery"]
  ];
  const wording = {
    es: {
      phases: ["Materiales", "Fabricación", "Entrega", "Uso"],
      shortStages: {mining: "Mina", refining: "Refinado", wafering: "Oblea", design: "Diseño", "fab-build": "Fábrica", logic: "Cálculo", memory: "Memoria", package: "Montaje", logistics: "Transporte", systems: "Servidores", power: "Energía y calor", operations: "Puesta en marcha", recovery: "Recuperación"},
      map: "Recorrido de la GPU", phasePicker: "Fases de la cadena", stepPicker: "Pasos de la fase",
      notes: "Detalles y fuentes", stageExplorer: "Consultar las 13 etapas y sus fuentes", transform: "De la entrada al resultado",
      inputs: "Con qué empieza", output: "Qué sale", companies: count => `Empresas (${count})`, actors: "Por ejemplo",
      directory: "Qué hace cada empresa en la cadena", stage: "Paso del recorrido", scope: "Qué confirma la fuente",
      search: "Buscar", all: "Todos los pasos", allScope: "Todos los tipos de fuente", geography: "País o región", source: "Fuente",
      filters: "Nombre, tarea o lugar", more: "Ver más fichas", noResults: "Prueba con otro nombre, tarea o lugar.",
      counts: (shown, total) => `${shown} de ${total} fichas`,
      scopeLabels: {capability: "Trabajo que realiza", relationship: "Acuerdo o relación pública", product: "Producto concreto"},
      count: (profiles, sites) => `${profiles} fichas de empresas y ${sites} entradas de fundición o refinado.`,
      disclosure: "Una ficha puede mostrar qué trabajo realiza la empresa, qué relación ha hecho pública o en qué producto participa. El lugar corresponde al ejemplo citado.",
      appendix: "Dónde se funden o refinan cuatro metales",
      appendixHelp: "Estas instalaciones figuran en el informe corporativo de NVIDIA de 2025 para estaño, tantalio, tungsteno y oro. El informe abarca la empresa en su conjunto.",
      metal: "Metal", sites: "Instalación o país", metals: {Tin: "Estaño", Tantalum: "Tantalio", Tungsten: "Tungsteno", Gold: "Oro"},
      loading: "Cargando el recorrido…", error: "El recorrido no se ha cargado. Vuelve a abrir la página para intentarlo."
    },
    en: {
      phases: ["Materials", "Production", "Delivery", "Use"],
      shortStages: {mining: "Mine", refining: "Refining", wafering: "Wafers", design: "Design", "fab-build": "Factory", logic: "Compute", memory: "Memory", package: "Assembly", logistics: "Transport", systems: "Servers", power: "Power and cooling", operations: "Commissioning", recovery: "Recovery"},
      map: "The GPU's journey", phasePicker: "Supply chain phases", stepPicker: "Steps in this phase",
      notes: "Details and sources", stageExplorer: "Browse the 13 stages and their sources", transform: "From input to result",
      inputs: "What goes in", output: "What comes out", companies: count => `Companies (${count})`, actors: "For example",
      directory: "What each company does in the chain", stage: "Step in the journey", scope: "What the source confirms",
      search: "Search", all: "All steps", allScope: "All source types", geography: "Country or region", source: "Source",
      filters: "Name, job, or place", more: "See more entries", noResults: "Try a different name, job, or place.",
      counts: (shown, total) => `${shown} of ${total} entries`,
      scopeLabels: {capability: "Work the company does", relationship: "Publicly reported relationship", product: "Specific product"},
      count: (profiles, sites) => `${profiles} company entries and ${sites} smelter or refinery listings.`,
      disclosure: "An entry can show what work a company does, a relationship it has made public, or a specific product it works on. The location is for the example cited.",
      appendix: "Where four metals are smelted or refined",
      appendixHelp: "NVIDIA's 2025 company-wide report lists these facilities for tin, tantalum, tungsten, and gold.",
      metal: "Metal", sites: "Facility or country", metals: {Tin: "Tin", Tantalum: "Tantalum", Tungsten: "Tungsten", Gold: "Gold"},
      loading: "Loading the journey…", error: "The journey could not load. Reopen the page to try again."
    }
  };

  function node(tag, value = "", className = "") {
    const item = document.createElement(tag);
    if (value) item.textContent = value;
    if (className) item.className = className;
    return item;
  }

  function link(value, url) {
    const item = node("a", value, "ac-life-link");
    item.href = url;
    return item;
  }

  function sourceLinks(data, ids) {
    const group = node("div", "", "ac-life-links");
    group.append(...ids.map(id => link(data.sources[id].title, data.sources[id].url)));
    return group;
  }

  function titledField(label, text) {
    const field = node("span");
    field.append(node("strong", label), document.createTextNode(text));
    return field;
  }

  // Each scene describes one observable change. Every name is also rendered as HTML text.
  const scenes = {
    mining:       { art: ["ridge", "shovel", "rocks"],      es: ["Yacimiento", "Extraer", "Mineral"],                 en: ["Deposit", "Extract", "Ore"] },
    refining:     { art: ["rocks", "furnace", "refined"],    es: ["Mineral", "Purificar", "Silicio y metales"],         en: ["Ore", "Refine", "Silicon and metals"] },
    wafering:     { art: ["ingot", "slice", "wafer"],       es: ["Silicio puro", "Cortar el cristal", "Oblea"],         en: ["Pure silicon", "Slice the crystal", "Wafer"] },
    design:       { art: ["circuit", "screen", "mask"],    es: ["Circuito", "Revisar el diseño", "Máscara"],           en: ["Circuit", "Check the design", "Mask"] },
    "fab-build":  { art: ["plan", "crane", "factory"],     es: ["Planos", "Construir y equipar", "Fábrica lista"],    en: ["Plans", "Build and equip", "Factory ready"] },
    logic:        { art: ["wafer", "print", "die"],        es: ["Oblea", "Construir circuitos", "Chips probados"],     en: ["Wafer", "Build circuits", "Tested chips"] },
    memory:       { art: ["loose", "bond", "stack"],       es: ["Chips de memoria", "Apilar y conectar", "Pila HBM"], en: ["Memory chips", "Stack and connect", "HBM stack"] },
    package:      { art: ["pair", "probe", "package"],     es: ["Chip y memoria", "Unir y probar", "Acelerador"],     en: ["Chip and memory", "Join and test", "Accelerator"] },
    logistics:    { art: ["crate", "truck", "dock"],       es: ["Carga embalada", "Transportar", "Carga recibida"],   en: ["Packed cargo", "Transport", "Cargo received"] },
    systems:      { art: ["board", "server", "rack"],      es: ["Placas y piezas", "Montar el servidor", "Rack listo"], en: ["Boards and parts", "Build the server", "Rack ready"] },
    power:        { art: ["grid", "cooling", "site"],      es: ["Red eléctrica", "Dar corriente y sacar calor", "Edificio listo"], en: ["Power grid", "Power and cool", "Facility ready"] },
    operations:   { art: ["rack", "check", "cluster"],     es: ["Racks instalados", "Comprobar el conjunto", "Clúster en marcha"], en: ["Installed racks", "Test the system", "Working cluster"] },
    recovery:     { art: ["board", "split", "salvage"],     es: ["Equipo retirado", "Revisar y separar", "Repuestos y metales"], en: ["Retired equipment", "Check and sort", "Spares and metals"] },
  };

  function artwork(kind) {
    const canvas = node("canvas", "", "ac-life-art");
    canvas.width = 288;
    canvas.height = 216;
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.scale(2, 2);
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const ink = "#18364b";
    const teal = "#087e74";
    const light = "#ceeee6";
    const cool = "#dce9f3";
    const stone = "#e4e6eb";
    const copper = "#99532e";
    const sand = "#eed7c4";

    function path(points, {fill, stroke = ink, close = false} = {}) {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      if (close) ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    function box(x, y, w, h, fill = cool, stroke = ink) {
      path([[x, y], [x+w, y], [x+w, y+h], [x, y+h]], {fill, stroke, close: true});
    }
    function circle(x, y, r, fill = light, stroke = ink) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    function arrow(from, to, stroke = teal) {
      const [x, y] = to;
      const angle = Math.atan2(y-from[1], x-from[0]);
      const tail = offset => [x - 6*Math.cos(angle+offset), y - 6*Math.sin(angle+offset)];
      path([from, to], {stroke});
      path([tail(.6), to, tail(-.6)], {stroke});
    }
    function rock(x, y, scale = 1, metal = false) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      path([[-18,9],[-21,-4],[-11,-18],[9,-19],[20,-8],[17,9],[0,16]],
        {fill: metal ? sand : stone, stroke: metal ? copper : ink, close:true});
      path([[-11,-18],[-4,-3],[17,9]], {stroke: metal ? copper : ink});
      path([[-4,-3],[9,-19]], {stroke: metal ? copper : ink});
      ctx.restore();
    }
    function chip(x,y,w=30,h=23) {
      box(x,y,w,h,light,teal);
      box(x+6,y+5,w-12,h-10,"#f7faf9",teal);
      [0.22,.5,.78].forEach(t => {
        path([[x+w*t,y-3],[x+w*t,y]], {stroke:teal});
        path([[x+w*t,y+h],[x+w*t,y+h+3]], {stroke:teal});
      });
    }
    function wafer(x,y,r,pattern=false) {
      circle(x,y,r,cool);
      if (pattern) {
        for (let i=-1;i<=1;i++) for (let j=-1;j<=1;j++) box(x+i*r*.48-r*.17,y+j*r*.48-r*.17,r*.34,r*.34,light,teal);
      }
      path([[x-r*.27,y+r*.97],[x+r*.27,y+r*.97]], {stroke:ink});
    }
    function ingot(x,y) {
      box(x,y-15,44,30,cool);
      circle(x,y,15,cool);
      circle(x+44,y,15,light,teal);
    }
    function stack(x,y,n=4,w=44) {
      for (let i=n-1;i>=0;i--) box(x,y+i*7,w,6,i%2 ? cool : light,teal);
    }
    function rack(x,y,w=28,h=59) {
      box(x,y,w,h,cool);
      for (let i=0;i<4;i++) {
        const yy=y+5+i*(h-5)/4;
        box(x+3,yy,w-6,(h-5)/4-3,"#f7faf9");
        circle(x+w-7,yy+3,1.4,teal,teal);
      }
    }
    function board(x,y,w=76,h=44) {
      box(x,y,w,h,light,teal);
      chip(x+9,y+10,25,20);
      for (let i=0;i<3;i++) path([[x+w*.57,y+10+i*8],[x+w-7,y+10+i*8]],{stroke:teal});
    }
    function parcel(x,y,w=37,h=35) {
      box(x,y,w,h,sand,copper);
      path([[x+w*.53,y],[x+w*.53,y+h*.45]],{stroke:copper});
    }
    function tick(x,y) {
      path([[x-8,y],[x-2,y+5],[x+10,y-8]],{stroke:teal});
    }

    const drawings = {
      ridge() {
        path([[15,77],[36,54],[55,60],[76,31],[91,41],[118,24],[130,77]],{fill:stone,close:true});
        path([[23,75],[50,68],[79,72],[108,61],[127,65]],{stroke:copper});
        rock(72,73,.55,true);
      },
      shovel() {
        rock(46,79,.62); rock(67,83,.42,true);
        path([[27,29],[46,27],[63,43],[85,39],[102,59]],{stroke:ink});
        path([[89,56],[102,56],[106,68],[90,69],[82,61]],{fill:light,stroke:teal,close:true});
        circle(31,29,4,cool);
        arrow([98,76],[128,76],copper);
      },
      rocks() { rock(40,61,.96); rock(75,47,.80,true); rock(106,69,.65); },
      furnace() {
        for (const [y, color, fill] of [[22,teal,light],[62,copper,sand]]) {
          box(49,y,46,26,cool);
          box(59,y+6,25,14,fill,color);
          path([[64,y+17],[70,y+10],[77,y+17]],{stroke:color});
          arrow([23,y+13],[43,y+13],color);
          arrow([101,y+13],[121,y+13],color);
        }
      },
      refined() {
        ingot(33,50);
        for (let i=0;i<3;i++) path([[83,69+i*6],[119,69+i*6]],{stroke:copper});
      },
      ingot() { ingot(48,55); },
      slice() {
        ingot(33,56); wafer(101,56,19);
        path([[83,25],[83,86]],{stroke:copper});
        arrow([92,30],[115,30]);
      },
      wafer() { wafer(72,54,32); },
      circuit() {
        chip(52,39,40,31);
        for (const y of [42,54,66]) {
          path([[26,y],[51,y]],{stroke:teal}); circle(25,y,3,light,teal);
          path([[93,y],[118,y]],{stroke:teal}); circle(120,y,3,light,teal);
        }
      },
      screen() {
        box(32,27,82,52,"#f6faf8"); chip(65,40,28,21);
        path([[72,79],[72,87],[94,87]]);
        tick(101,61);
      },
      mask() {
        box(48,26,54,54,cool);
        [[58,36],[79,37],[59,58],[80,57]].forEach(([x,y])=>box(x,y,13,12,light,teal));
        path([[102,32],[114,39],[114,88],[61,88],[48,80]]);
      },
      plan() {
        box(46,24,57,62,cool);
        box(55,35,38,33,"#f7faf9",teal);
        path([[68,35],[68,55],[92,55]],{stroke:teal});
        path([[56,75],[90,75]]);
      },
      crane() {
        path([[54,85],[54,25],[107,25],[54,38],[42,38],[54,25]]);
        path([[99,25],[99,53],[97,57]],{stroke:copper});
        box(78,61,42,20,cool); box(41,85,29,5,light,teal);
      },
      factory() {
        box(37,49,72,37,cool); box(49,33,16,16,cool);
        [48,70,91].forEach(x=>box(x,61,12,14,light,teal));
        path([[30,86],[118,86]]);
      },
      print() {
        wafer(73,64,28,true); box(49,21,48,13,cool);
        [57,70,83].forEach(x=>arrow([x,35],[x,48]));
      },
      die() { chip(42,34,60,44); tick(113,64); },
      loose() { chip(34,40,34,25); chip(80,40,34,25); },
      bond() { stack(51,48,4); arrow([72,20],[72,41]); path([[46,54],[46,80],[98,80],[98,54]],{stroke:copper}); },
      stack() { stack(42,40,5,60); },
      pair() { chip(30,40,47,37); stack(88,46,4,30); },
      probe() {
        box(41,68,61,10,cool); chip(51,49,38,18);
        arrow([85,24],[70,48],copper); tick(108,43);
      },
      package() {
        box(25,70,94,12,cool); chip(35,47,42,22); stack(88,49,3,24);
        path([[77,61],[88,61]],{stroke:teal});
      },
      crate() { parcel(47,32,49,50); path([[34,83],[110,83],[110,90],[34,90],[34,83]]); },
      truck() {
        box(22,39,62,34,cool); parcel(36,45,33,23);
        path([[84,48],[105,48],[119,61],[119,74],[84,74]],{fill:light,close:true});
        circle(44,76,7,stone); circle(101,76,7,stone);
      },
      dock() {
        box(29,34,64,51,cool); box(42,47,37,33,"#f7faf9");
        parcel(69,62,32,24); tick(113,56);
      },
      board() { board(31,33,82,46); },
      server() {
        box(24,35,97,46,cool); board(33,42,63,29);
        circle(109,50,5,light,teal); circle(109,65,3,teal);
      },
      rack() { rack(53,21,38,67); },
      grid() {
        path([[49,85],[68,24],[76,24],[97,85]]);
        path([[54,66],[89,66],[58,51],[86,51],[64,39],[81,39]]);
        path([[45,43],[98,43],[112,52]],{stroke:teal});
        path([[35,54],[107,54],[120,63]],{stroke:teal});
      },
      cooling() {
        rack(58,29,27,52);
        arrow([24,55],[51,55]); arrow([91,45],[117,45],copper);
        path([[120,45],[120,71],[100,71],[100,84],[51,84],[51,72],[25,72]],{stroke:copper});
        circle(24,55,4,light,teal);
      },
      site() {
        box(33,34,78,50,cool); box(42,43,59,32,"#f7faf9");
        rack(48,44,17,29); rack(77,44,17,29);
        path([[21,75],[34,75]],{stroke:teal}); tick(125,69);
      },
      check() { rack(43,26,32,62); circle(100,59,18,light,teal); tick(100,59); },
      cluster() {
        rack(23,27,25,58); rack(64,27,25,58); rack(105,27,25,58);
        path([[48,57],[64,57]],{stroke:teal}); path([[89,57],[105,57]],{stroke:teal});
      },
      split() {
        board(16,39,51,31);
        path([[67,55],[82,55],[82,34]],{stroke:teal}); arrow([82,34],[121,34]);
        path([[82,55],[82,77]],{stroke:copper}); arrow([82,77],[121,77],copper);
      },
      salvage() { chip(29,34,48,34); tick(62,78); rock(103,64,.67,true); },
    };
    drawings[kind]();
    return canvas;
  }

  function transformation(key, lang, label) {
    const scene = scenes[key];
    const figure = node("figure", "", "ac-life-transform");
    figure.setAttribute("aria-label", label);
    const flow = node("ol", "", "ac-life-flow");
    scene.art.forEach((drawing, index) => {
      const item = node("li", "", "ac-life-flow-step");
      item.append(artwork(drawing), node("span", scene[lang][index], "ac-life-flow-caption"));
      flow.append(item);
    });
    figure.append(flow);
    return figure;
  }

  function renderMap(root, data, lang, labels) {
    const container = node("section", "", "ac-life-content ac-life-visual-content");
    container.setAttribute("aria-label", labels.map);
    const phases = node("div", "", "ac-life-phase-selector");
    phases.setAttribute("role", "group");
    phases.setAttribute("aria-label", labels.phasePicker);
    const stageChoices = node("div", "", "ac-life-step-selector");
    stageChoices.setAttribute("role", "group");
    stageChoices.setAttribute("aria-label", labels.stepPicker);
    const detail = node("div", "", "ac-life-detail");
    const figure = node("div", "", "ac-life-scene");
    figure.setAttribute("aria-live", "polite");
    const actions = node("div", "", "ac-life-actions");
    detail.append(figure, actions);
    detail.id = `${root.id}-scene`;
    const phaseButtons = [], stageButtons = [], lists = [];

    function focusStage(key, phase) {
      const stage = data.stages[key];
      phaseButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === phase)));
      lists.forEach((list, index) => { list.hidden = index !== phase; });
      stageButtons.forEach(button => button.setAttribute("aria-pressed", String(button.value === key)));

      const actors = data.companies.filter(company => company.stage === key);
      const handoff = node("div", "", "ac-life-handoff");
      handoff.append(titledField(labels.inputs, stage.inputs[lang]), titledField(labels.output, stage.output[lang]));
      const examples = node("p", "", "ac-life-actors");
      examples.append(node("strong", labels.actors), document.createTextNode(actors.slice(0, 3).map(actor => actor.name).join(" · ")));

      const info = node("details", "", "ac-life-notes");
      info.append(node("summary", labels.notes), node("p", stage.detail[lang]), handoff, examples, sourceLinks(data, stage.sources));
      const atlas = link(labels.companies(actors.length), `../atlas/?stage=${key}#accelerator-companies`);
      atlas.classList.add("ac-life-directory-link");
      figure.replaceChildren(node("h3", stage.name[lang]), transformation(key, lang, labels.transform));
      actions.replaceChildren(atlas, info);
    }

    phaseStages.forEach((stageIds, index) => {
      const phase = node("button", labels.phases[index], "ac-life-phase-button");
      phase.type = "button";
      phase.addEventListener("click", () => focusStage(stageIds[0], index));
      phases.append(phase);
      phaseButtons.push(phase);

      const list = node("div", "", "ac-life-stage-list");
      for (const key of stageIds) {
        const button = node("button", labels.shortStages[key], "ac-life-stage");
        button.type = "button";
        button.value = key;
        button.setAttribute("aria-controls", detail.id);
        button.addEventListener("click", () => focusStage(key, index));
        list.append(button);
        stageButtons.push(button);
      }
      stageChoices.append(list);
      lists.push(list);
    });

    container.append(phases, stageChoices, detail);
    root.replaceChildren(container);
    focusStage("mining", 0);
  }

  function control(label, item) {
    const wrapper = node("label", label, "ac-life-filter");
    item.setAttribute("aria-label", label);
    wrapper.append(item);
    return wrapper;
  }

  function select(options, all) {
    const item = node("select");
    for (const [value, label] of [["", all], ...options]) {
      const option = node("option", label);
      option.value = value;
      item.append(option);
    }
    return item;
  }

  function search(placeholder) {
    const item = node("input");
    item.type = "search";
    item.placeholder = placeholder;
    return item;
  }

  function normalize(value) {
    return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  }

  function filteredList(filters, getMatches, renderItem, labels) {
    const status = node("p", "", "ac-life-status");
    status.setAttribute("role", "status");
    const list = node("div");
    const more = node("button", labels.more, "ac-life-more");
    more.type = "button";
    let limit = 10;
    function render() {
      const matches = getMatches();
      const visible = matches.slice(0, limit);
      list.replaceChildren(...visible.map(renderItem));
      status.textContent = matches.length > 0 ? labels.counts(visible.length, matches.length) : labels.noResults;
      more.hidden = limit >= matches.length;
    }
    for (const input of filters) input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => {
      limit = 10;
      render();
    });
    more.addEventListener("click", () => {
      limit += 10;
      render();
      if (more.hidden && list.lastElementChild) {
        list.lastElementChild.tabIndex = -1;
        list.lastElementChild.focus();
      }
    });
    render();
    return [status, list, more];
  }

  function org(name, subheading, detail, source, href) {
    const row = node("article", "", "ac-life-org");
    const identity = node("div");
    identity.append(node("strong", name), node("span", subheading));
    const description = node("div", detail);
    description.append(link(source, href));
    row.append(identity, description);
    return row;
  }

  function renderDirectory(root, data, lang, labels) {
    root.id = "accelerator-companies";
    const container = node("section", "", "ac-life-content");
    const lookup = search(labels.filters);
    const stage = select(Object.entries(data.stages).map(([id, s]) => [id, s.name[lang]]), labels.all);
    const scope = select(Object.entries(labels.scopeLabels), labels.allScope);
    const filter = node("div", "", "ac-life-filters");
    const stageHint = new URLSearchParams(location.search).get("stage");
    if (stageHint && data.stages[stageHint]) stage.value = stageHint;
    filter.append(control(labels.search, lookup), control(labels.stage, stage), control(labels.scope, scope));
    const companyList = filteredList([lookup, stage, scope], () => {
      const q = normalize(lookup.value.trim());
      return data.companies.filter(company =>
        (!stage.value || company.stage === stage.value) &&
        (!scope.value || company.scope === scope.value) &&
        normalize([company.name, company.region, company.role[lang]].join(" ")).includes(q));
    }, company => org(
      company.name, `${data.stages[company.stage].name[lang]} · ${company.region}`,
      `${labels.scopeLabels[company.scope]} · ${company.role[lang]}`,
      labels.source, data.sources[company.source].url
    ), labels);

    const appendix = node("section", "", "ac-life-appendix");
    const facilitySearch = search(labels.sites);
    const metal = select(Object.entries(labels.metals), labels.allScope);
    const filterSites = node("div", "", "ac-life-filters");
    filterSites.append(control(labels.search, facilitySearch), control(labels.metal, metal));
    const reference = data.sources[data.smelterSource];
    const siteList = filteredList([facilitySearch, metal], () => {
      const q = normalize(facilitySearch.value.trim());
      return data.smelters.filter(site =>
        (!metal.value || metal.value === site.metal) &&
        normalize(`${site.name} ${site.country}`).includes(q));
    }, site => org(site.name, site.country, labels.metals[site.metal], labels.source, reference.url), labels);
    const text = node("p", labels.appendixHelp + " ", "ac-life-lede");
    text.append(link(reference.title, reference.url));
    appendix.append(node("h3", labels.appendix), text, filterSites, ...siteList);
    const explorer = node("details", "", "ac-life-explorer");
    explorer.id = "accelerator-lifecycle";
    explorer.open = location.hash === "#accelerator-lifecycle";
    const map = node("div", "", "ac-life ac-life-visual");
    map.id = "accelerator-stage-picker";
    explorer.append(node("summary", labels.stageExplorer), map);
    renderMap(map, data, lang, labels);

    container.append(
      node("h2", labels.directory, "ac-life-title"),
      node("p", labels.count(data.companies.length, data.smelters.length), "ac-life-lede"),
      node("p", labels.disclosure, "ac-life-lede"), explorer, filter, ...companyList, appendix
    );
    root.replaceChildren(container);
    if (location.hash === "#accelerator-companies") root.scrollIntoView();
  }

  let corpus;
  async function mount(root) {
    if (root.dataset.acMounted) return;
    root.dataset.acMounted = "true";
    const lang = root.dataset.acLanguage === "en" ? "en" : "es";
    const labels = wording[lang];
    root.lang = lang;
    const loading = root.querySelector(".ac-life-loading");
    loading.textContent = labels.loading;
    try {
      corpus ??= fetch("/assets/data/ai-accelerator-lifecycle.json").then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
      const data = await corpus;
      if (root.dataset.acLife === "directory") renderDirectory(root, data, lang, labels);
      else renderMap(root, data, lang, labels);
    } catch (error) {
      loading.textContent = labels.error;
      console.error("Accelerator lifecycle:", error);
    }
  }

  for (const root of document.querySelectorAll("[data-ac-life]")) void mount(root);
})();
