const PRESETS = {
  "series:ia-pib-bienestar-energia": {
    opening: "seriesEnergy",
    sequence: ["gridPulse", "loopArrows", "gdpVsLife", "jCurve"],
    beats: {
      "01_electricidad": "gridPulse",
      "02_iatecnologia": "loopArrows",
      "03_pibbienestar": "gdpVsLife",
      "04_iapib": "jCurve",
    },
  },
  "article:01-electricidad-bienestar": {
    opening: "seriesEnergy",
    sequence: ["gridPulse", "healthCross", "pumpField", "plugWave", "thresholdBars", "warningBreak"],
    beats: {
      "01_correlacion": "gridPulse",
      "02_salud": "healthCross",
      "02_canales_salud": "healthCross",
      "03_logistica": "pumpField",
      "04_calidad": "plugWave",
      "04_cantidad_vs_calidad": "plugWave",
      "05_umbrales": "thresholdBars",
      "05_umbrales_mtf": "thresholdBars",
      "06_impuesto": "warningBreak",
      "06_coste_cortes": "warningBreak",
    },
  },
  "article:02-ia-tecnologia-electrica": {
    opening: "chipTraces",
    sequence: ["chipTraces", "queryFlow", "loopArrows", "supplyTriangle", "globeLoad", "thermoDrop"],
    beats: {
      "01_compute": "chipTraces",
      "02_compute": "chipTraces",
      "02_inferencia": "queryFlow",
      "03_inferencia": "queryFlow",
      "03_jevons": "loopArrows",
      "04_jevons": "loopArrows",
      "04_energia": "supplyTriangle",
      "05_energia_chips": "supplyTriangle",
      "05_chips_agua": "supplyTriangle",
      "06_geografia": "globeLoad",
      "07_agua": "thermoDrop",
    },
  },
  "article:03-pib-vs-bienestar": {
    opening: "gdpVsLife",
    sequence: ["gdpVsLife", "hiddenLayers", "happinessCurves", "splitOutcomes", "northStar", "frameworkGrid"],
    beats: {
      "01_pib_limite": "gdpVsLife",
      "01_pib_mide": "gdpVsLife",
      "02_fuera_pib": "hiddenLayers",
      "03_easterlin": "happinessCurves",
      "04_kahneman": "splitOutcomes",
      "05_divergencia": "northStar",
      "06_marcos": "frameworkGrid",
    },
  },
  "article:04-ia-pib-hoy": {
    opening: "jCurve",
    sequence: ["jCurve", "taskFlow", "helixFold", "valueMismatch", "adoptionNodes", "projectionFork"],
    beats: {
      "01_jcurve": "jCurve",
      "02_tareas": "taskFlow",
      "03_alphafold": "helixFold",
      "04_medicion": "valueMismatch",
      "05_señales": "adoptionNodes",
      "05_senales": "adoptionNodes",
      "06_proyecciones": "projectionFork",
    },
  },
  "series:datacenters-espacio": {
    opening: "seriesOrbit",
    sequence: ["computePressure", "coldTrap", "orbitSpectrum", "balanceMatrix"],
    beats: {
      "01_ahora": "computePressure",
      "02_calor": "coldTrap",
      "03_datacenter": "orbitSpectrum",
      "04_huella": "balanceMatrix",
    },
  },
  "article:01-por-que-ahora": {
    opening: "computePressure",
    sequence: ["computePressure", "gridWait", "landWaterPermit", "launchRocket", "seriesOrbit", "downlinkBeam"],
    beats: {
      "01_explosion_demanda": "computePressure",
      "02_red_electrica": "gridWait",
      "03_agua_suelo": "landWaterPermit",
      "04_coste_lanzamiento": "launchRocket",
      "05_musk_espacio_ia": "seriesOrbit",
      "06_downlink_ventaja": "downlinkBeam",
    },
  },
  "article:02-energia-calor-conectividad": {
    opening: "coldTrap",
    sequence: ["coldTrap", "radiatorGrid", "solarOrbit", "connectivityWindow", "crackedChip"],
    beats: {
      "01_mito_frio": "coldTrap",
      "02_radiadores": "radiatorGrid",
      "03_energia_solar": "solarOrbit",
      "04_conectividad": "connectivityWindow",
      "05_degradacion": "crackedChip",
    },
  },
  "article:03-que-es-datacenter-espacio": {
    opening: "orbitSpectrum",
    sequence: ["orbitSpectrum", "downlinkBeam", "gpuSatellite", "moonArchive", "crackedChip", "constellationGrid"],
    beats: {
      "01_espectro": "orbitSpectrum",
      "02_observacion": "downlinkBeam",
      "03_hardware_real": "gpuSatellite",
      "04_resiliencia": "moonArchive",
      "05_restricciones": "crackedChip",
      "06_megaproyectos": "constellationGrid",
    },
  },
  "article:04-huella-real-datacenter": {
    opening: "balanceMatrix",
    sequence: ["waterVsGolf", "thermoDrop", "rackHeat", "mineralChain", "recycleChip", "balanceMatrix"],
    beats: {
      "01_golf_vs_data": "waterVsGolf",
      "02_wue_tech": "thermoDrop",
      "03_energia_ia": "rackHeat",
      "04_cobalto": "mineralChain",
      "05_ewaste_circular": "recycleChip",
      "06_balance_espacio": "balanceMatrix",
    },
  },
  "series:from-cave-to-agi": {
    opening: "symbolCurve",
    sequence: ["tallyProxy", "gearLoom", "backpropNet", "attentionMesh", "worldLoop"],
    beats: {
      "01_representar": "tallyProxy",
      "02_mecanizar": "gearLoom",
      "03_aprender": "backpropNet",
      "04_escalar": "attentionMesh",
      "05_mas_alla": "worldLoop",
      "05_masalla": "worldLoop",
    },
  },
  "article:from-cave-to-agi/01-representar": {
    opening: "symbolCurve",
    sequence: ["tallyProxy", "zeroPlace", "algebraBalance", "symbolCurve", "calculusWave"],
    beats: {
      "01_muescas": "tallyProxy",
      "02_cero": "zeroPlace",
      "03_algebra": "algebraBalance",
      "04_notacion": "symbolCurve",
      "05_calculo": "calculusWave",
    },
  },
  "article:from-cave-to-agi/02-mecanizar": {
    opening: "gearLoom",
    sequence: ["gearLoom", "analyticalEngine", "logicCircuit", "turingTape", "storedProgram", "machineMind"],
    beats: {
      "01_pascalina_jacquard": "gearLoom",
      "02_babbage_lovelace": "analyticalEngine",
      "03_boole_shannon_circuitos": "logicCircuit",
      "04_turing_computar": "turingTape",
      "05_programa_almacenado": "storedProgram",
      "06_dartmouth_ia": "machineMind",
    },
  },
  "article:from-cave-to-agi/03-aprender": {
    opening: "ruleToData",
    sequence: ["ruleToData", "winterCurve", "optimizerLoop", "backpropNet", "scaleStack", "thresholdJump"],
    beats: {
      "01_reglas": "ruleToData",
      "02_inviernos": "winterCurve",
      "03_estadistica": "optimizerLoop",
      "04_backprop": "backpropNet",
      "05_renacimiento": "scaleStack",
      "06_alexnet": "thresholdJump",
    },
  },
  "article:from-cave-to-agi/04-escalar": {
    opening: "scaleStack",
    sequence: ["scaleStack", "attentionMesh", "pretrainHub", "powerLawCurve", "foundationShift"],
    beats: {
      "02_alexnet": "scaleStack",
      "03_transformer": "attentionMesh",
      "04_preentrenamiento": "pretrainHub",
      "05_leyes_escala": "powerLawCurve",
      "06_fundacionales": "foundationShift",
    },
  },
  "article:from-cave-to-agi/05-mas-alla": {
    opening: "worldLoop",
    sequence: ["limitWall", "searchBranch", "memoryVault", "worldLoop", "robotArm", "capitalFrontier"],
    beats: {
      "01_limites": "limitWall",
      "02_busqueda": "searchBranch",
      "03_memoria": "memoryVault",
      "04_worldmodels": "worldLoop",
      "05_robotica": "robotArm",
      "06_capital": "capitalFrontier",
    },
  },
  "series:fundamentos-ia-iag": {
    opening: "optimizerLoop",
    sequence: ["optimizerLoop", "embeddingClusters", "systemSplit", "agiSpectrum"],
    beats: {
      "01_que_es_ia": "optimizerLoop",
      "02_que_es_ia_generativa": "embeddingClusters",
      "03_ia_vs_ia_generativa": "systemSplit",
      "04_agi": "agiSpectrum",
    },
  },
  "article:fundamentos-ia-iag/01-que-es-ia": {
    opening: "optimizerLoop",
    sequence: ["optimizerLoop", "frameworkGrid", "learningSlope", "ruleToData", "timelineRibbon", "mlopsFlow"],
    beats: {
      "01_marco": "optimizerLoop",
      "02_familias": "frameworkGrid",
      "03_ajuste": "learningSlope",
      "04_software2": "ruleToData",
      "05_hitos": "timelineRibbon",
      "06_mlops": "mlopsFlow",
    },
  },
  "article:fundamentos-ia-iag/02-que-es-ia-generativa": {
    opening: "embeddingClusters",
    sequence: ["embeddingClusters", "attentionMesh", "capabilityRise", "controlKnobs", "promptBoundary"],
    beats: {
      "02_embeddings": "embeddingClusters",
      "03_transformer": "attentionMesh",
      "04_scaling": "capabilityRise",
      "05_configuraciones": "controlKnobs",
      "06_llmops": "promptBoundary",
    },
  },
  "article:fundamentos-ia-iag/03-ia-vs-ia-generativa": {
    opening: "systemSplit",
    sequence: ["systemSplit", "finiteInfinite", "deterministicDice", "fluentFalse", "coverageMatrix"],
    beats: {
      "01_confusion": "systemSplit",
      "02_entradas_salidas": "finiteInfinite",
      "03_determinismo": "deterministicDice",
      "04_alucinacion_explicabilidad": "fluentFalse",
      "05_matriz_fraude": "coverageMatrix",
    },
  },
  "article:fundamentos-ia-iag/04-agi": {
    opening: "agiSpectrum",
    sequence: ["agiSpectrum", "spectrumLadder", "limitProfile", "impactWave", "targetMisalign", "horizonLadder"],
    beats: {
      "01_definicion": "agiSpectrum",
      "02_definiciones": "spectrumLadder",
      "03_limitaciones": "limitProfile",
      "04_impacto": "impactWave",
      "05_alineacion": "targetMisalign",
      "06_horizonte": "horizonLadder",
    },
  },
  "series:modelos-razonadores": {
    opening: "reasonSplit",
    sequence: ["reasonSplit", "shortcutTrap", "candidateFunnel", "latencyGauge", "designControls"],
    beats: {
      "01_que_es_razonar": "reasonSplit",
      "02_fallos": "shortcutTrap",
      "03_test_time_compute": "candidateFunnel",
      "04_latencia_streaming": "latencyGauge",
      "05_riesgos": "designControls",
    },
  },
  "article:modelos-razonadores/01-que-es-razonar": {
    opening: "reasonSplit",
    sequence: ["reasonSplit", "thinkPath", "rewardLoop", "collapseLadder", "mirrorDebate", "operatorPanel"],
    beats: {
      "02_sistema2": "reasonSplit",
      "03_o1": "thinkPath",
      "04_rlvr": "rewardLoop",
      "05_apple": "collapseLadder",
      "06_debate": "mirrorDebate",
      "07_practica": "operatorPanel",
    },
  },
  "article:modelos-razonadores/02-fallos": {
    opening: "shortcutTrap",
    sequence: ["shortcutTrap", "sycophantMirror", "gameScore", "chainBreak", "fakeCot", "designControls"],
    beats: {
      "01_atajos": "shortcutTrap",
      "02_sycophancy": "sycophantMirror",
      "03_specification_gaming": "gameScore",
      "04_cadena": "chainBreak",
      "05_infidelidad_cot": "fakeCot",
      "06_mitigacion": "designControls",
    },
  },
  "article:modelos-razonadores/03-test-time-compute": {
    opening: "candidateFunnel",
    sequence: ["reasonSplit", "tokenMeter", "candidateFunnel", "treePrune", "latencyGauge", "budgetDial"],
    beats: {
      "01_segunda_ley": "reasonSplit",
      "02_mas_pasos": "tokenMeter",
      "03_candidatos": "candidateFunnel",
      "04_arbol": "treePrune",
      "05_latencia": "latencyGauge",
      "06_complementariedad": "budgetDial",
    },
  },
  "article:modelos-razonadores/04-latencia-streaming": {
    opening: "latencyGauge",
    sequence: ["latencyGauge", "ttftNeedle", "streamBars", "routerSwitch", "hiddenCost", "fallbackSwitch"],
    beats: {
      "01_umbrales": "latencyGauge",
      "02_ttft": "ttftNeedle",
      "03_streaming": "streamBars",
      "04_routellm": "routerSwitch",
      "05_coste": "hiddenCost",
      "06_fallbacks": "fallbackSwitch",
    },
  },
  "article:modelos-razonadores/05-riesgos": {
    opening: "overthinkLoop",
    sequence: ["overthinkLoop", "billStorm", "documentInjection", "shieldPoison", "designControls"],
    beats: {
      "01_overthinking": "overthinkLoop",
      "02_coste": "billStorm",
      "03_injection": "documentInjection",
      "04_taboorag": "shieldPoison",
      "05_diseno": "designControls",
    },
  },
  "series:multimodalidad-iag": {
    opening: "modalBundle",
    sequence: ["modalBundle", "pairAlignment", "crossAttention", "evaluationGrid", "documentInjection"],
    beats: {
      "01_el_problema": "modalBundle",
      "02_alineamiento": "pairAlignment",
      "03_arquitecturas": "crossAttention",
      "04_evaluacion": "evaluationGrid",
      "05_riesgos": "documentInjection",
    },
  },
  "article:multimodalidad-iag/01-el-problema": {
    opening: "modalBundle",
    sequence: ["modalBundle", "modalityFamily", "translateAlignStream", "capabilityHand", "hardSignal"],
    beats: {
      "02_mas_que_imagen": "modalBundle",
      "03_modalidad_no_es_input": "modalityFamily",
      "04_tres_niveles": "translateAlignStream",
      "05_cinco_capacidades": "capabilityHand",
      "06_dificultades": "hardSignal",
    },
  },
  "article:multimodalidad-iag/02-alineamiento": {
    opening: "pairAlignment",
    sequence: ["pairAlignment", "visionRefine", "sixModalOrbit", "groundingVsInstruction", "dataWins", "preferenceBias"],
    beats: {
      "01_pares_base": "pairAlignment",
      "02_refinamiento": "visionRefine",
      "03_imagebind": "sixModalOrbit",
      "04_instruccion_visual": "groundingVsInstruction",
      "05_calidad_datos": "dataWins",
      "06_preferencias": "preferenceBias",
    },
  },
  "article:multimodalidad-iag/03-arquitecturas": {
    opening: "crossAttention",
    sequence: ["systemSplit", "encoderBridge", "crossAttention", "nativeTokens", "omniStreaming", "benchmarkTradeoff"],
    beats: {
      "01_distincion": "systemSplit",
      "02_encoder_conector": "encoderBridge",
      "03_crossattention": "crossAttention",
      "04_tokenizacion_nativa": "nativeTokens",
      "05_omni_streaming": "omniStreaming",
      "06_tradeoffs": "benchmarkTradeoff",
    },
  },
  "article:multimodalidad-iag/04-evaluacion": {
    opening: "evaluationGrid",
    sequence: ["groundingCheck", "leakageFile", "questionLeak", "layoutCrash", "zeroBench", "metricCompass"],
    beats: {
      "01_grounding": "groundingCheck",
      "02_contaminacion": "leakageFile",
      "03_sesgo_linguistico": "questionLeak",
      "04_ocrbench_mmau": "layoutCrash",
      "05_zerobench_video": "zeroBench",
      "06_metricas": "metricCompass",
    },
  },
  "article:multimodalidad-iag/05-riesgos": {
    opening: "documentInjection",
    sequence: ["documentInjection", "systemLeak", "privacyLens", "poisonLoop", "actionChain", "complianceGrid"],
    beats: {
      "01_prompt_injection_visual": "documentInjection",
      "02_fugas_sistema": "systemLeak",
      "03_privacidad": "privacyLens",
      "04_envenenamiento": "poisonLoop",
      "05_agencia": "actionChain",
      "06_sesgos": "complianceGrid",
    },
  },
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function panelFrame() {
  return `
    <rect class="deco-panel-glow anim-fade" x="26" y="58" width="368" height="304" rx="44" />
    <rect class="deco-panel anim-fade" x="48" y="78" width="324" height="264" rx="36" />
    <path class="deco-grid anim-fade" d="M92 126H328M92 192H328M92 258H328M126 108V312M210 108V312M294 108V312" />
    <path class="deco-frame anim-fade" d="M82 110H132M82 110V160M338 110H288M338 110V160M82 310H132M82 310V260M338 310H288M338 310V260" />
  `;
}

function scene(content) {
  return `
    <div class="deco-scene">
      <svg class="deco-svg" viewBox="0 0 420 420" aria-hidden="true" focusable="false">
        ${panelFrame()}
        ${content}
      </svg>
    </div>
  `;
}

const MOTIFS = {
  glyphEcho: (glyph) => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="210" cy="210" r="92" />
    <text class="deco-glyph anim-pop" x="210" y="238" text-anchor="middle">${escapeHtml(glyph || "5σ")}</text>
  `),

  seriesEnergy: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M92 274H330" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M102 266C136 226 164 292 196 236C218 198 246 194 324 150" />
    <circle class="deco-node anim-pop" cx="102" cy="266" r="9" />
    <circle class="deco-node anim-pop" cx="196" cy="236" r="10" />
    <circle class="deco-node anim-pop" cx="324" cy="150" r="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="112" y="146" width="34" height="72" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="170" y="172" width="34" height="46" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="228" y="122" width="42" height="96" rx="10" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M292 112L272 164H304L270 230" />
  `),

  seriesOrbit: () => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="214" cy="210" r="34" />
    <g class="anim-rotate">
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="214" cy="210" rx="128" ry="68" pathLength="1" />
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="214" cy="210" rx="128" ry="68" transform="rotate(-32 214 210)" pathLength="1" />
    </g>
    <rect class="deco-fill deco-fill--strong anim-pop" x="286" y="138" width="42" height="26" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="116" y="258" width="54" height="30" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M164 222H246M206 182V262" />
    <circle class="deco-node anim-pop" cx="304" cy="152" r="8" />
    <circle class="deco-node anim-pop" cx="144" cy="272" r="8" />
  `),

  gridPulse: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M102 280H330" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="118" y="190" width="38" height="90" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="178" y="156" width="38" height="124" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="238" y="116" width="42" height="164" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M96 248C138 214 160 286 194 240C216 212 244 212 324 158" />
    <circle class="deco-node anim-pop" cx="118" cy="248" r="8" />
    <circle class="deco-node anim-pop" cx="194" cy="240" r="9" />
    <circle class="deco-node anim-pop" cx="302" cy="176" r="9" />
  `),

  healthCross: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M94 220H154L182 182L214 252L244 198H326" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="238" y="126" width="34" height="108" rx="12" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="198" y="166" width="114" height="30" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="116" y="152" width="42" height="76" rx="10" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M128 170H146M128 188H146M282 146C292 136 308 136 318 146C328 156 328 172 318 182L300 202" />
  `),

  pumpField: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M98 282H326" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M114 296L150 276L186 296L222 276L258 296L294 276" />
    <rect class="deco-fill deco-fill--soft anim-pop" x="142" y="156" width="62" height="74" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M174 156V126L244 140L214 180" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M214 208C244 210 266 230 276 260" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M250 120L286 104L300 132" />
  `),

  plugWave: () => scene(`
    <rect class="deco-fill deco-fill--strong anim-pop" x="108" y="168" width="86" height="92" rx="18" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M132 148V184M170 148V184M194 214H238C256 214 270 202 270 184V162" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M248 164C266 146 286 146 304 164C322 182 342 182 360 164" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M248 204C266 186 286 186 304 204C322 222 342 222 360 204" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M286 110V132M308 110V132M330 110V132" />
  `),

  thresholdBars: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M104 286H332" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="118" y="154" width="40" height="132" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="178" y="132" width="40" height="154" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="238" y="118" width="40" height="168" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="298" y="110" width="26" height="176" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M120 162C162 132 210 128 254 138C286 146 308 160 326 180" />
    <circle class="deco-node anim-pop" cx="156" cy="168" r="8" />
  `),

  warningBreak: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="112" y="154" width="76" height="92" rx="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="238" y="132" width="82" height="114" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M92 268H154L184 226L212 282L244 194L326 194" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M204 132L182 176H212L188 226" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M132 182H168M258 166H298M258 192H284" />
  `),

  chipTraces: () => scene(`
    <circle class="deco-node anim-pop" cx="116" cy="210" r="16" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M132 210H164" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="164" y="148" width="112" height="124" rx="18" />
    <rect class="deco-stroke anim-draw" x="182" y="166" width="76" height="88" rx="12" pathLength="1" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M182 130V148M220 130V148M258 130V148M182 272V290M220 272V290M258 272V290" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M138 174H164M138 210H164M138 246H164M276 174H304M276 210H304M276 246H304" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M300 138L280 176H308L278 230" />
  `),

  queryFlow: () => scene(`
    <circle class="deco-node anim-pop" cx="108" cy="154" r="12" />
    <circle class="deco-node anim-pop" cx="108" cy="210" r="12" />
    <circle class="deco-node anim-pop" cx="108" cy="266" r="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="168" y="150" width="92" height="120" rx="18" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M120 154H168M120 210H168M120 266H168" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M190 184H238M190 210H226M190 236H246" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="286" y="156" width="26" height="112" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="326" y="182" width="18" height="86" rx="8" />
  `),

  loopArrows: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="116" y="142" width="64" height="54" rx="12" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M138 158H158M138 176H170" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M150 228C170 170 226 146 278 164C306 174 326 194 336 222" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M298 194L338 224L290 248" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M284 262C260 288 224 300 186 294C148 288 118 264 102 232" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M138 262L96 232L144 206" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="266" y="118" width="30" height="112" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="304" y="162" width="18" height="68" rx="8" />
  `),

  supplyTriangle: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 128L292 254H128Z" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="192" y="148" width="36" height="40" rx="10" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M146 254C146 228 166 208 192 208C218 208 238 228 238 254" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M250 208L286 168M264 232L308 232M248 252L286 284" />
    <circle class="deco-node anim-pop" cx="210" cy="128" r="8" />
  `),

  globeLoad: () => scene(`
    <circle class="deco-stroke anim-draw" cx="148" cy="212" r="72" pathLength="1" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M76 212H220M94 174C124 188 172 188 204 174M94 250C124 236 172 236 204 250" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M148 140C174 168 174 256 148 284C122 256 122 168 148 140" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="258" y="220" width="24" height="68" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="294" y="184" width="24" height="104" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="330" y="118" width="24" height="170" rx="8" />
  `),

  gdpVsLife: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="112" y="196" width="34" height="92" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="164" y="160" width="34" height="128" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="216" y="122" width="34" height="166" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M286 178C286 152 306 132 332 132C358 132 378 152 378 178C378 208 332 240 332 240C332 240 286 208 286 178Z" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M318 170H346M332 156V184" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M102 296H258" />
  `),

  hiddenLayers: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="108" y="118" width="206" height="70" rx="16" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="124" y="204" width="176" height="60" rx="16" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="140" y="278" width="146" height="44" rx="16" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M110 152H270M140 234H262M164 300H246" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="318" y="122" width="40" height="176" rx="12" />
  `),

  happinessCurves: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M100 284V146H324" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M124 256C154 222 182 206 220 198C256 190 288 192 324 204" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M124 256C164 232 208 228 250 230C284 232 306 238 324 248" />
    <circle class="deco-node anim-pop" cx="224" cy="198" r="8" />
    <circle class="deco-node anim-pop" cx="250" cy="230" r="8" />
  `),

  splitOutcomes: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M116 278L190 220L190 142" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M190 220L284 150" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M190 220L324 238" />
    <circle class="deco-node anim-pop" cx="190" cy="220" r="11" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="284" cy="150" r="18" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="324" cy="238" r="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M272 150H296M312 238H336" />
  `),

  northStar: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="212" width="28" height="76" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="148" y="178" width="28" height="110" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="190" y="144" width="28" height="144" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M284 124L296 164L336 176L296 188L284 228L272 188L232 176L272 164Z" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M244 258C260 238 280 226 304 222C322 220 338 224 352 234" />
    <circle class="deco-node anim-pop" cx="284" cy="176" r="8" />
  `),

  frameworkGrid: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="116" y="124" width="84" height="72" rx="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="220" y="124" width="84" height="72" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="116" y="220" width="84" height="72" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="220" y="220" width="84" height="72" rx="14" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M158 208H262M210 160V256" />
  `),

  jCurve: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M100 148V296H328" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M128 176C150 214 176 254 204 272C232 290 264 276 292 238C308 216 320 188 328 150" />
    <circle class="deco-node anim-pop" cx="204" cy="272" r="9" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="126" y="110" width="28" height="34" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="168" y="110" width="28" height="34" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="210" y="110" width="28" height="34" rx="8" />
  `),

  taskFlow: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="108" y="136" width="132" height="164" rx="20" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M142 184H214M142 220H202M142 256H192" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M118 184L132 198L156 172M118 256L132 270L156 244" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M252 214H300" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="310" y="188" width="26" height="112" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="346" y="240" width="14" height="60" rx="7" />
  `),

  helixFold: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M132 128C174 128 174 202 210 202C246 202 246 128 288 128" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M132 292C174 292 174 220 210 220C246 220 246 292 288 292" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M132 128C132 188 288 232 288 292" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M288 128C288 188 132 232 132 292" />
    <circle class="deco-node anim-pop" cx="210" cy="210" r="10" />
  `),

  valueMismatch: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M104 284H328" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M120 166L168 214L214 180" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M232 162L276 118L320 148" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="122" y="224" width="30" height="60" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="166" y="206" width="30" height="78" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="210" y="244" width="30" height="40" rx="8" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M284 96L320 96M320 96L320 132" />
  `),

  adoptionNodes: () => scene(`
    <circle class="deco-node anim-pop" cx="118" cy="160" r="10" />
    <circle class="deco-node anim-pop" cx="178" cy="134" r="10" />
    <circle class="deco-node anim-pop" cx="246" cy="154" r="10" />
    <circle class="deco-node anim-pop" cx="304" cy="194" r="10" />
    <circle class="deco-node anim-pop" cx="150" cy="254" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="246" cy="274" r="34" />
    <circle class="deco-node anim-pop" cx="314" cy="286" r="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M118 160L178 134L246 154L304 194L314 286L246 274L150 254L118 160" />
  `),

  projectionFork: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M120 292L192 222L192 140" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M192 222L284 146" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M192 222L324 242" />
    <circle class="deco-node anim-pop" cx="192" cy="222" r="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="272" y="118" width="28" height="54" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="318" y="208" width="28" height="80" rx="8" />
  `),

  computePressure: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M94 126H330" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M192 126L204 110L216 126L228 110L240 126" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="116" y="212" width="46" height="92" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="186" y="168" width="46" height="136" rx="12" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="256" y="122" width="46" height="182" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M94 304H330" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M308 150L338 150M322 136V164" />
  `),

  gridWait: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="108" y="132" width="58" height="152" rx="12" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M124 148V268M150 148V268M108 174H166M108 212H166" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M166 206H254" />
    <circle class="deco-stroke anim-draw" cx="302" cy="206" r="54" pathLength="1" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M302 176V208L324 222" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M278 114H326" />
  `),

  landWaterPermit: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M104 284L148 248L194 268L238 234L284 254L330 216" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M148 152C148 126 168 106 194 106C220 106 240 126 240 152C240 182 194 214 194 214C194 214 148 182 148 152Z" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="266" y="144" width="70" height="94" rx="14" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M284 170H318M284 194H326M284 218H310" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M268 144L338 238M338 144L268 238" />
  `),

  launchRocket: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M100 294H334" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M110 250L168 212L224 178L286 140L332 122" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M148 238L168 212L194 226M206 190L224 178L244 196" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M280 114C306 128 324 154 328 192C296 198 266 220 248 252C228 220 220 194 222 168C224 140 242 122 280 114Z" />
  `),

  downlinkBeam: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="126" y="118" width="68" height="68" rx="12" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M146 138H174M146 156H174M146 174H166" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M194 152H246L276 184" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M246 152L276 120" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="266" y="108" width="62" height="28" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M296 138L252 286H340L296 138Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M210 146L246 146M214 162L240 162M220 178L234 178" />
    <circle class="deco-node anim-pop" cx="296" cy="286" r="10" />
  `),

  coldTrap: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M130 132L174 176M174 132L130 176M152 110V198M108 154H196" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M110 108L194 192M194 108L110 192" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="238" y="136" width="70" height="150" rx="14" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M258 154V268M282 154V268" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M316 170C334 156 344 142 348 122M316 214C334 200 346 182 350 162M316 258C336 244 348 226 352 206" />
  `),

  radiatorGrid: () => scene(`
    <rect class="deco-fill deco-fill--strong anim-pop" x="116" y="182" width="56" height="84" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M172 224H218" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="232" y="116" width="104" height="204" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M252 136V300M276 136V300M300 136V300M324 136V300" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M346 160C360 150 368 136 370 120M346 206C362 194 370 178 372 160M346 252C364 238 372 222 374 202" />
  `),

  solarOrbit: () => scene(`
    <circle class="deco-fill deco-fill--strong anim-pop" cx="126" cy="138" r="28" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M126 90V66M126 210V186M78 138H54M198 138H174M94 106L76 88M158 170L176 188M158 106L176 88M94 170L76 188" />
    <g class="anim-rotate">
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="250" cy="234" rx="114" ry="66" transform="rotate(-18 250 234)" pathLength="1" />
    </g>
    <rect class="deco-fill deco-fill--soft anim-pop" x="232" y="178" width="98" height="50" rx="8" transform="rotate(-18 232 178)" />
  `),

  connectivityWindow: () => scene(`
    <g class="anim-rotate">
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="214" cy="184" rx="112" ry="54" pathLength="1" />
    </g>
    <path class="deco-stroke anim-draw" pathLength="1" d="M100 184A112 54 0 0 1 132 150" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="176" y="156" width="80" height="34" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M214 192L176 294H252L214 192Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M150 294H278" />
  `),

  crackedChip: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="146" y="146" width="128" height="128" rx="18" />
    <rect class="deco-stroke anim-draw" x="164" y="164" width="92" height="92" rx="14" pathLength="1" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M214 138V164M214 256V282M138 210H164M256 210H282" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M228 174L198 204L220 216L192 250" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M286 138L332 184M332 138L286 184" />
  `),

  orbitSpectrum: () => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="210" cy="210" r="22" />
    <g class="anim-rotate">
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="210" cy="210" rx="132" ry="72" pathLength="1" />
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="210" cy="210" rx="100" ry="54" pathLength="1" />
    </g>
    <rect class="deco-fill deco-fill--soft anim-fade" x="100" y="194" width="30" height="46" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="194" y="142" width="32" height="62" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="302" y="182" width="42" height="72" rx="8" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M92 294H332" />
  `),

  gpuSatellite: () => scene(`
    <g class="anim-rotate">
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="214" cy="208" rx="114" ry="62" transform="rotate(-22 214 208)" pathLength="1" />
    </g>
    <rect class="deco-fill deco-fill--strong anim-pop" x="178" y="176" width="72" height="58" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="120" y="150" width="34" height="18" rx="6" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="274" y="248" width="34" height="18" rx="6" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M166 176L136 158M250 176L294 154M166 234L132 258M250 234L292 264" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M194 194H234M194 214H222" />
  `),

  moonArchive: () => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="126" cy="146" r="48" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="146" cy="136" r="40" />
    <rect class="deco-stroke anim-draw" x="204" y="180" width="110" height="102" rx="16" pathLength="1" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M222 210H296M222 238H280M222 266H260" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M258 156C286 160 308 178 320 204" />
  `),

  constellationGrid: () => scene(`
    <circle class="deco-node anim-pop" cx="110" cy="138" r="8" />
    <circle class="deco-node anim-pop" cx="172" cy="118" r="8" />
    <circle class="deco-node anim-pop" cx="250" cy="132" r="8" />
    <circle class="deco-node anim-pop" cx="318" cy="160" r="8" />
    <circle class="deco-node anim-pop" cx="128" cy="238" r="8" />
    <circle class="deco-node anim-pop" cx="214" cy="210" r="8" />
    <circle class="deco-node anim-pop" cx="298" cy="246" r="8" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="336" cy="286" r="20" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M110 138L172 118L250 132L318 160L298 246L214 210L128 238L110 138M128 238L336 286L298 246" />
  `),

  waterVsGolf: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M102 290H196" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M118 290C132 236 150 210 172 196C188 186 206 182 224 184" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M136 260C154 228 174 212 196 208" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="260" y="142" width="62" height="144" rx="14" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M280 160H304M280 184H304M280 208H304" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M334 126C334 152 314 172 294 190C274 172 254 152 254 126C254 104 272 90 294 90C316 90 334 104 334 126Z" />
  `),

  thermoDrop: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M170 130V246C188 256 200 274 200 292C200 320 178 342 150 342C122 342 100 320 100 292C100 274 112 256 130 246V130C130 118 138 110 150 110C162 110 170 118 170 130Z" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="150" cy="294" r="30" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M254 206C254 176 278 152 308 152C338 152 362 176 362 206C362 232 340 250 330 268C320 284 318 298 318 314" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M318 314C306 300 286 294 270 300C254 306 242 320 238 338" />
  `),

  rackHeat: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="114" y="150" width="52" height="150" rx="12" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="188" y="122" width="62" height="178" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="274" y="166" width="40" height="134" rx="12" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M126 132C118 110 124 92 138 78M216 104C206 80 214 58 230 44M292 146C284 124 290 106 304 90" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M102 310H330" />
  `),

  mineralChain: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M120 254L150 188L192 228L226 164L270 204L312 136" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M108 284H330" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M142 158L198 126L258 158L258 216L198 248L142 216Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M198 126V248M142 158L258 216M258 158L142 216" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="302" cy="286" r="18" />
  `),

  recycleChip: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="148" y="148" width="120" height="120" rx="18" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M176 208C176 184 194 166 218 166C234 166 248 174 256 188" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M256 188L278 178L272 204" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M244 216C244 240 226 258 202 258C186 258 172 250 164 236" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M164 236L142 246L148 220" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="316" cy="276" r="22" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M306 276H326M316 266V286" />
  `),

  balanceMatrix: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 118V292M138 156H282M154 156L120 250H188L154 156ZM266 156L232 250H300L266 156Z" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="250" width="90" height="24" rx="12" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="220" y="250" width="90" height="24" rx="12" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M308 122L334 122M320 110V134" />
  `),

  tallyProxy: () => scene(`
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M112 126V248M132 126V248M152 126V248M172 126V248M102 238L184 136" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M204 222C224 188 252 170 288 168C316 166 338 176 354 194" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="302" cy="214" r="42" />
    <circle class="deco-node anim-pop" cx="344" cy="198" r="12" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M274 250V288M298 252V292M326 248V286" />
  `),

  zeroPlace: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="146" width="56" height="128" rx="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="188" y="130" width="72" height="160" rx="18" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="284" y="146" width="56" height="128" rx="14" />
    <circle class="deco-stroke anim-draw" cx="224" cy="210" r="28" pathLength="1" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M138 168V252M220 116V132M220 288V304M312 168V252" />
  `),

  algebraBalance: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 118V168M136 168H284M170 168L128 258H212L170 168ZM250 168L208 258H292L250 168Z" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="132" y="214" width="36" height="30" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="248" y="200" width="28" height="44" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="286" y="214" width="20" height="30" rx="8" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M150 230H170M254 220H300" />
  `),

  symbolCurve: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M100 286V140H326" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M122 260C154 214 180 192 214 176C252 158 288 154 326 164" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="244" y="102" width="36" height="28" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="292" y="102" width="36" height="28" rx="8" />
    <circle class="deco-node anim-pop" cx="214" cy="176" r="9" />
  `),

  calculusWave: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M100 290V146H330" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M122 258C144 234 162 214 178 192C198 164 220 144 248 132C276 120 304 126 330 156" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M184 222L242 164" />
    <circle class="deco-node anim-pop" cx="214" cy="194" r="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="270" y="184" width="58" height="38" rx="10" />
  `),

  gearLoom: () => scene(`
    <circle class="deco-stroke anim-draw" cx="150" cy="208" r="42" pathLength="1" />
    <circle class="deco-stroke deco-stroke--thin anim-draw" cx="150" cy="208" r="18" pathLength="1" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M150 148V128M150 288V268M90 208H70M230 208H210M108 166L92 150M208 250L224 266M108 250L92 266M208 166L224 150" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="244" y="136" width="92" height="144" rx="14" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M266 160H314M266 194H314M266 228H314M282 146V270" />
    <circle class="deco-node anim-pop" cx="282" cy="176" r="5" />
    <circle class="deco-node anim-pop" cx="304" cy="210" r="5" />
    <circle class="deco-node anim-pop" cx="282" cy="244" r="5" />
  `),

  analyticalEngine: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="112" y="126" width="80" height="176" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M132 154H172M132 188H172M132 222H172M132 256H162" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M192 214H250" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="262" y="148" width="84" height="124" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M282 126V148M310 126V148M282 272V294M310 272V294" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M250 214L234 198M250 214L234 230" />
  `),

  logicCircuit: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="114" y="142" width="56" height="48" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="114" y="226" width="56" height="48" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M170 166H228C252 166 270 184 270 208C270 232 252 250 228 250H170" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M114 166H96M114 250H96M270 208H326" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="296" y="186" width="42" height="44" rx="10" />
  `),

  turingTape: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M94 232H330" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="118" y="198" width="40" height="68" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="164" y="198" width="40" height="68" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="210" y="198" width="40" height="68" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="256" y="198" width="40" height="68" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M230 144V198M190 144H270" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M190 144L176 124M270 144L284 124" />
  `),

  storedProgram: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="112" y="140" width="82" height="144" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M132 170H174M132 202H174M132 234H164" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M194 214H238" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="250" y="174" width="82" height="82" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M272 196H310M272 218H302M272 240H294" />
  `),

  machineMind: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="118" y="146" width="92" height="136" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M140 174H188M140 206H178M140 238H170" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 214H252" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="300" cy="214" r="48" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M284 196L300 178L316 196M284 226H316M292 246L308 262" />
  `),

  ruleToData: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="134" width="100" height="136" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M138 164H182M138 194H186M138 224H170" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 202H256" />
    <circle class="deco-node anim-pop" cx="286" cy="156" r="10" />
    <circle class="deco-node anim-pop" cx="324" cy="196" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="286" cy="252" r="28" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M286 156L324 196L286 252L242 214L286 156" />
  `),

  winterCurve: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M96 286H330" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M110 184C130 152 150 150 168 182C182 206 196 208 210 184C226 156 248 154 266 186C282 214 304 216 330 176" />
    <circle class="deco-node anim-pop" cx="168" cy="182" r="8" />
    <circle class="deco-node anim-pop" cx="266" cy="186" r="8" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M162 120L174 152L206 164L174 176L162 208L150 176L118 164L150 152ZM260 126L272 158L304 170L272 182L260 214L248 182L216 170L248 158Z" />
  `),

  optimizerLoop: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M120 250C150 162 236 134 304 178" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M304 178L326 174L320 198" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M126 286H330" />
    <circle class="deco-node anim-pop" cx="150" cy="220" r="8" />
    <circle class="deco-node anim-pop" cx="204" cy="182" r="8" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="264" cy="172" r="22" />
  `),

  backpropNet: () => scene(`
    <circle class="deco-node anim-pop" cx="120" cy="160" r="10" />
    <circle class="deco-node anim-pop" cx="120" cy="218" r="10" />
    <circle class="deco-node anim-pop" cx="120" cy="276" r="10" />
    <circle class="deco-node anim-pop" cx="206" cy="188" r="10" />
    <circle class="deco-node anim-pop" cx="206" cy="248" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="304" cy="218" r="18" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M130 160L196 188M130 218L196 188M130 218L196 248M130 276L196 248M216 188L286 218M216 248L286 218" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M278 252L214 276L134 246" />
  `),

  attentionMesh: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="132" width="34" height="34" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="160" y="132" width="34" height="34" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="214" y="132" width="34" height="34" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="268" y="132" width="34" height="34" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="254" width="34" height="34" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="160" y="254" width="34" height="34" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="214" y="254" width="34" height="34" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="268" y="254" width="34" height="34" rx="8" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M123 166L285 254M177 166L231 254M231 166L177 254M285 166L123 254" />
  `),

  pretrainHub: () => scene(`
    <circle class="deco-fill deco-fill--strong anim-pop" cx="210" cy="214" r="42" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="104" y="120" width="72" height="48" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="244" y="120" width="72" height="48" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="104" y="264" width="72" height="48" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="244" y="264" width="72" height="48" rx="12" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M176 144L182 152L188 160M244 144L238 152L232 160M176 288L184 278L192 268M244 288L236 278L228 268" />
  `),

  powerLawCurve: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M104 292V146H326" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M126 176C156 196 186 212 220 226C254 240 290 252 326 262" />
    <circle class="deco-node anim-pop" cx="170" cy="204" r="8" />
    <circle class="deco-node anim-pop" cx="230" cy="232" r="8" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="292" cy="252" r="20" />
  `),

  foundationShift: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="216" width="46" height="72" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="170" y="188" width="46" height="100" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="230" y="160" width="46" height="128" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="290" y="118" width="46" height="170" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M108 304H336" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M234 118L280 118" />
  `),

  limitWall: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="114" y="214" width="42" height="74" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="172" y="180" width="42" height="108" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="230" y="146" width="42" height="142" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M94 304H286" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M304 112V304" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M272 156L304 130L334 156" />
  `),

  searchBranch: () => scene(`
    <circle class="deco-node anim-pop" cx="210" cy="130" r="10" />
    <circle class="deco-node anim-pop" cx="148" cy="204" r="10" />
    <circle class="deco-node anim-pop" cx="210" cy="204" r="10" />
    <circle class="deco-node anim-pop" cx="272" cy="204" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="120" cy="286" r="16" />
    <circle class="deco-node anim-pop" cx="182" cy="286" r="10" />
    <circle class="deco-node anim-pop" cx="244" cy="286" r="10" />
    <circle class="deco-node anim-pop" cx="306" cy="286" r="10" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M210 140L148 194L120 274M210 140L148 194L182 276M210 140L210 194L244 276M210 140L272 194L306 276" />
  `),

  memoryVault: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="152" width="108" height="116" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M132 180H186M132 208H176M132 236H170" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M214 210H252" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="264" y="148" width="74" height="124" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M286 186V234M308 186V234M286 248H308" />
  `),

  worldLoop: () => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="134" cy="212" r="46" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="232" y="164" width="90" height="94" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M250 194H304M250 222H292" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M180 184C206 162 236 156 266 164M274 258C242 274 208 272 180 254" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M170 188L180 164L202 168M180 254L170 280L196 278" />
  `),

  robotArm: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="116" y="254" width="118" height="30" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M180 254V206L236 174L278 204L248 244" />
    <circle class="deco-node anim-pop" cx="180" cy="206" r="10" />
    <circle class="deco-node anim-pop" cx="236" cy="174" r="10" />
    <circle class="deco-node anim-pop" cx="278" cy="204" r="10" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M248 244L284 274M248 244L294 244" />
  `),

  capitalFrontier: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="114" y="226" width="34" height="62" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="162" y="196" width="34" height="92" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="210" y="160" width="34" height="128" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="258" y="118" width="38" height="170" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M102 304H336" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M300 146L332 114" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M314 114H332V132" />
  `),

  timelineRibbon: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M102 210H330" />
    <circle class="deco-node anim-pop" cx="128" cy="210" r="10" />
    <circle class="deco-node anim-pop" cx="186" cy="210" r="10" />
    <circle class="deco-node anim-pop" cx="244" cy="210" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="302" cy="210" r="20" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M128 176V138M186 244V282M244 176V138M302 244V282" />
  `),

  mlopsFlow: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="98" y="178" width="70" height="70" rx="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="198" y="162" width="78" height="102" rx="16" />
    <circle class="deco-node anim-pop" cx="328" cy="176" r="12" />
    <circle class="deco-node anim-pop" cx="328" cy="252" r="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M168 214H198M276 214H328M328 176V252" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M220 188H252M220 214H248M220 240H240" />
  `),

  embeddingClusters: () => scene(`
    <circle class="deco-node anim-pop" cx="132" cy="170" r="8" />
    <circle class="deco-node anim-pop" cx="156" cy="194" r="8" />
    <circle class="deco-node anim-pop" cx="178" cy="164" r="8" />
    <circle class="deco-node anim-pop" cx="250" cy="150" r="8" />
    <circle class="deco-node anim-pop" cx="274" cy="174" r="8" />
    <circle class="deco-node anim-pop" cx="298" cy="148" r="8" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="230" cy="260" r="30" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M132 170L156 194L178 164M250 150L274 174L298 148M178 164L230 260M250 150L230 260" />
  `),

  controlKnobs: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M110 164H330M110 214H330M110 264H330" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="166" cy="164" r="18" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="248" cy="214" r="18" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="292" cy="264" r="18" />
  `),

  promptBoundary: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="170" width="90" height="88" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M132 196H178M132 220H168M154 258L142 278" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M200 214H246" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M278 140C314 140 344 170 344 206C344 242 314 272 278 272H248V140Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M272 188H304M272 214H296M272 240H290" />
  `),

  systemSplit: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="142" width="98" height="136" rx="18" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="218" y="142" width="98" height="136" rx="18" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 118V302" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M128 176H180M128 210H172M240 176H292M240 210H286M240 244H274" />
  `),

  finiteInfinite: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="190" width="40" height="68" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="164" y="190" width="40" height="68" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="218" y="190" width="40" height="68" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M286 162C318 162 340 178 340 202C340 226 318 242 286 242C254 242 232 258 232 282" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M276 144L298 162L276 180" />
  `),

  deterministicDice: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="100" y="188" width="68" height="68" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M168 222H226" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="238" y="152" width="48" height="48" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="238" y="232" width="48" height="48" rx="12" />
    <circle class="deco-node anim-pop" cx="262" cy="176" r="6" />
    <circle class="deco-node anim-pop" cx="250" cy="244" r="6" />
    <circle class="deco-node anim-pop" cx="274" cy="268" r="6" />
  `),

  fluentFalse: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M110 170C110 146 128 128 152 128H220C244 128 262 146 262 170V214C262 238 244 256 220 256H170L138 286L144 256H152C128 256 110 238 110 214Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M136 164H230M136 194H216M136 224H202" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M306 142L338 238H274L306 142Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M306 174V206M306 222H306" />
  `),

  agiSpectrum: () => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="140" cy="210" r="44" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="210" cy="176" r="44" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="286" cy="226" r="52" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M118 292H324" />
  `),

  limitProfile: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M102 294H330" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="114" y="196" width="34" height="98" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="168" y="122" width="34" height="172" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="222" y="176" width="34" height="118" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="276" y="234" width="34" height="60" rx="10" />
  `),

  impactWave: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="230" width="34" height="58" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="158" y="196" width="34" height="92" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="206" y="154" width="34" height="134" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M242 258C262 208 288 180 320 168C340 160 354 162 366 170" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M244 146L272 118L306 136" />
  `),

  targetMisalign: () => scene(`
    <circle class="deco-stroke deco-stroke--soft anim-draw" cx="154" cy="212" r="58" pathLength="1" />
    <circle class="deco-stroke deco-stroke--thin anim-draw" cx="154" cy="212" r="28" pathLength="1" />
    <circle class="deco-node anim-pop" cx="154" cy="212" r="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M296 144L226 194" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M296 144L326 146L314 174" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="226" cy="194" r="16" />
  `),

  horizonLadder: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="244" width="34" height="44" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="158" y="220" width="34" height="68" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="206" y="188" width="34" height="100" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="254" y="146" width="40" height="142" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M100 304H330" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M296 154L332 120" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M312 120H332V140" />
  `),

  reasonSplit: () => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="136" cy="210" r="42" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M136 170L156 204H132L154 246" />
    <circle class="deco-node anim-pop" cx="258" cy="152" r="10" />
    <circle class="deco-node anim-pop" cx="314" cy="210" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="250" cy="272" r="18" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M176 210H230L258 152M230 210L314 210M230 210L250 272" />
  `),

  thinkPath: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="176" width="78" height="72" rx="14" />
    <circle class="deco-node anim-pop" cx="220" cy="176" r="10" />
    <circle class="deco-node anim-pop" cx="258" cy="214" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="316" cy="214" r="18" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M180 212H210L220 176L258 214H298" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M124 198H156M124 222H146" />
  `),

  rewardLoop: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="108" y="168" width="64" height="82" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M172 208H226" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="234" y="162" width="72" height="94" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M252 190H288M252 216H280M252 242H274" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M270 256C270 286 236 306 198 300C160 294 132 270 128 238" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M118 246L128 214L152 228" />
  `),

  collapseLadder: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M102 292H330" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="118" y="236" width="44" height="56" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="178" y="196" width="44" height="96" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="238" y="146" width="44" height="146" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M252 140L310 198L278 230L330 286" />
  `),

  mirrorDebate: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M210 128V292" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M120 162C120 142 136 126 156 126H186C206 126 222 142 222 162V196C222 216 206 232 186 232H164L136 256L142 232H156C136 232 120 216 120 196Z" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M300 162C300 142 284 126 264 126H234C214 126 198 142 198 162V196C198 216 214 232 234 232H256L284 256L278 232H264C284 232 300 216 300 196Z" />
  `),

  operatorPanel: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="104" y="136" width="220" height="156" rx="20" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M136 176H194M136 210H182M136 244H168M230 176H292M230 244H292" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="258" cy="210" r="20" />
    <circle class="deco-node anim-pop" cx="310" cy="210" r="10" />
  `),

  shortcutTrap: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M112 292L170 224L222 242L304 154" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M112 168L146 202L202 146" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="250" y="120" width="72" height="60" rx="14" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M268 148H304M286 130V166" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M214 204L256 246L324 188" />
  `),

  sycophantMirror: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M210 124V296" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M122 170C122 144 142 124 168 124H186C212 124 232 144 232 170V206C232 232 212 252 186 252H168C142 252 122 232 122 206Z" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M288 170C288 144 268 124 242 124H224C198 124 178 144 178 170V206C178 232 198 252 224 252H242C268 252 288 232 288 206Z" />
    <circle class="deco-node anim-pop" cx="166" cy="188" r="6" />
    <circle class="deco-node anim-pop" cx="244" cy="188" r="6" />
  `),

  gameScore: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="152" width="92" height="120" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M126 182H170M126 214H160M126 246H152" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M194 212H252L286 164" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="306" cy="148" r="24" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M294 148H318M306 136V160" />
  `),

  chainBreak: () => scene(`
    <circle class="deco-node anim-pop" cx="118" cy="210" r="16" />
    <circle class="deco-node anim-pop" cx="182" cy="210" r="16" />
    <circle class="deco-node anim-pop" cx="246" cy="210" r="16" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="320" cy="210" r="22" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M134 210H166M198 210H224" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M262 190L286 230M286 190L262 230" />
  `),

  fakeCot: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="154" width="122" height="112" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M126 182H200M126 208H186M126 234H194" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M224 210H266" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M266 178L314 150L340 192L296 236L334 274" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="296" cy="236" r="14" />
  `),

  designControls: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="146" width="220" height="140" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M136 178H304M136 216H304M136 254H304" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="180" cy="178" r="16" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="246" cy="216" r="16" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="284" cy="254" r="16" />
  `),

  tokenMeter: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M110 290H330" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="122" y="228" width="26" height="62" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="162" y="204" width="26" height="86" rx="8" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="202" y="174" width="26" height="116" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="242" y="148" width="26" height="142" rx="8" />
    <circle class="deco-stroke anim-draw" cx="316" cy="176" r="28" pathLength="1" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M316 176L328 158" />
  `),

  candidateFunnel: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="152" width="44" height="52" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="222" width="44" height="52" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="292" width="44" height="40" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M150 178H210L244 214M150 248H210L244 214M150 312H210L244 214" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="286" cy="214" r="26" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M312 214H338" />
  `),

  treePrune: () => scene(`
    <circle class="deco-node anim-pop" cx="210" cy="132" r="10" />
    <circle class="deco-node anim-pop" cx="156" cy="194" r="10" />
    <circle class="deco-node anim-pop" cx="264" cy="194" r="10" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="130" cy="270" r="16" />
    <circle class="deco-node anim-pop" cx="188" cy="270" r="10" />
    <circle class="deco-node anim-pop" cx="244" cy="270" r="10" />
    <circle class="deco-node anim-pop" cx="300" cy="270" r="10" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M210 142L156 184L130 258M210 142L156 184L188 260M210 142L264 184L244 260M210 142L264 184L300 260" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M268 220L292 246M292 220L268 246" />
  `),

  latencyGauge: () => scene(`
    <circle class="deco-stroke deco-stroke--soft anim-draw" cx="186" cy="214" r="82" pathLength="1" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M186 214L234 170" />
    <circle class="deco-node anim-pop" cx="186" cy="214" r="10" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M186 132V150M112 214H130M260 214H278M238 162L250 150" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="286" y="188" width="40" height="74" rx="12" />
  `),

  streamBars: () => scene(`
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M116 166H284M116 198H314M116 230H260M116 262H330" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="110" cy="166" r="10" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="110" cy="198" r="10" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="110" cy="230" r="10" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="110" cy="262" r="10" />
  `),

  routerSwitch: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="176" width="64" height="72" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M166 212H214L262 162M214 212L262 262" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="272" y="130" width="56" height="64" rx="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="272" y="230" width="68" height="82" rx="16" />
  `),

  hiddenCost: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="118" y="226" width="40" height="62" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="178" y="200" width="40" height="88" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="238" y="142" width="40" height="146" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="298" y="116" width="40" height="172" rx="10" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M108 304H338" />
  `),

  fallbackSwitch: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M118 210H210L244 178" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M210 210L244 242" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="254" y="146" width="62" height="54" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M276 248L314 286" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M304 146V200" />
  `),

  overthinkLoop: () => scene(`
    <circle class="deco-stroke deco-stroke--soft anim-draw" cx="210" cy="212" r="82" pathLength="1" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="210" cy="212" r="18" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 130L232 144L222 166" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 294L188 280L198 258" />
  `),

  billStorm: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="214" width="40" height="74" rx="10" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="166" y="180" width="40" height="108" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="222" y="132" width="40" height="156" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M286 130L330 174V286H274V130Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M296 176H320M296 206H318M296 236H312" />
  `),

  documentInjection: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M110 140H184L210 166V280H110Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M138 178H182M138 210H176M138 242H170" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 214H254" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="266" y="178" width="66" height="72" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M298 158L332 124L344 160" />
  `),

  shieldPoison: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 126L298 160V214C298 266 260 302 210 320C160 302 122 266 122 214V160Z" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M190 170L226 214L182 260" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M286 142L334 190M334 142L286 190" />
  `),

  modalBundle: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="164" width="64" height="54" rx="12" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="210" cy="144" r="26" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M282 136L322 150L330 198L294 226L252 212L244 166Z" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M166 190H184L210 170L254 188" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 170L210 246" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="210" cy="280" r="28" />
  `),

  modalityFamily: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="108" y="154" width="64" height="52" rx="12" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="210" cy="154" r="24" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M278 132L320 150L326 196L294 222L252 206L246 162Z" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="166" y="240" width="88" height="52" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M172 214L210 240M210 178V240M286 206L246 240" />
  `),

  translateAlignStream: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="100" y="178" width="62" height="68" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M162 212H204" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="214" y="166" width="62" height="92" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M276 212H316" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="326" y="154" width="36" height="116" rx="12" />
  `),

  capabilityHand: () => scene(`
    <circle class="deco-fill deco-fill--strong anim-pop" cx="210" cy="220" r="26" />
    <circle class="deco-node anim-pop" cx="130" cy="154" r="10" />
    <circle class="deco-node anim-pop" cx="182" cy="126" r="10" />
    <circle class="deco-node anim-pop" cx="240" cy="126" r="10" />
    <circle class="deco-node anim-pop" cx="292" cy="154" r="10" />
    <circle class="deco-node anim-pop" cx="320" cy="214" r="10" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M130 154L188 206L182 126M240 126L232 206L292 154L320 214L210 220" />
  `),

  hardSignal: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="104" y="146" width="118" height="134" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M132 180H194M132 210H186M132 240H176" />
    <circle class="deco-stroke anim-draw" cx="294" cy="210" r="50" pathLength="1" />
    <circle class="deco-node anim-pop" cx="294" cy="210" r="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M222 210H244" />
  `),

  pairAlignment: () => scene(`
    <circle class="deco-node anim-pop" cx="126" cy="174" r="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="166" y="152" width="62" height="44" rx="12" />
    <circle class="deco-node anim-pop" cx="126" cy="254" r="12" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="166" y="232" width="62" height="44" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M138 174H166M138 254H166" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M244 214H336" />
    <circle class="deco-node anim-pop" cx="286" cy="214" r="10" />
  `),

  visionRefine: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="104" y="146" width="96" height="128" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M128 176H176M128 208H170M128 240H162" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M200 210H244" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="292" cy="210" r="38" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M276 196H308M276 224H298" />
  `),

  sixModalOrbit: () => scene(`
    <circle class="deco-fill deco-fill--soft anim-fade" cx="210" cy="210" r="28" />
    <g class="anim-rotate">
      <ellipse class="deco-stroke deco-stroke--soft anim-draw" cx="210" cy="210" rx="116" ry="64" pathLength="1" />
    </g>
    <circle class="deco-node anim-pop" cx="110" cy="210" r="10" />
    <circle class="deco-node anim-pop" cx="154" cy="142" r="10" />
    <circle class="deco-node anim-pop" cx="266" cy="142" r="10" />
    <circle class="deco-node anim-pop" cx="310" cy="210" r="10" />
    <circle class="deco-node anim-pop" cx="266" cy="278" r="10" />
    <circle class="deco-node anim-pop" cx="154" cy="278" r="10" />
  `),

  groundingVsInstruction: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="96" y="152" width="94" height="116" rx="18" />
    <rect class="deco-stroke anim-draw" x="118" y="174" width="50" height="72" rx="10" pathLength="1" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M128 192H158M128 214H152M128 236H146" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="214" cy="210" r="18" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M190 210H246" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M214 196L238 170L258 194" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M258 150C258 134 270 122 286 122H320C336 122 348 134 348 150V184C348 200 336 212 320 212H302L280 236L284 212H286C270 212 258 200 258 184Z" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="286" y="146" width="42" height="22" rx="8" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M284 254L332 286M304 214L332 246" />
  `),

  dataWins: () => scene(`
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M92 304H332" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="104" y="214" width="52" height="74" rx="12" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="174" y="184" width="52" height="104" rx="12" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="252" y="126" width="56" height="162" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M108 196L150 154L194 182L236 146L286 118" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M150 154L152 126M236 146L238 114M286 118L320 86" />
    <circle class="deco-node anim-pop" cx="150" cy="154" r="8" />
    <circle class="deco-node anim-pop" cx="236" cy="146" r="8" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="320" cy="86" r="14" />
  `),

  preferenceBias: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="154" width="86" height="108" rx="18" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="234" y="154" width="90" height="108" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M126 184H164M126 212H156M126 240H170" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M258 184H298M258 212H306M258 240H288" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M188 208H234" />
    <circle class="deco-stroke anim-draw" cx="214" cy="208" r="22" pathLength="1" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="228" cy="208" r="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M214 230C236 246 266 256 304 260" />
  `),

  encoderBridge: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="100" y="154" width="78" height="116" rx="16" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M178 212H226" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="238" y="168" width="40" height="88" rx="12" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M278 212H326" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="336" y="146" width="32" height="132" rx="10" />
  `),

  crossAttention: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="100" y="154" width="90" height="104" rx="16" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="238" y="142" width="36" height="36" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="286" y="142" width="36" height="36" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="238" y="212" width="36" height="36" rx="8" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="286" y="212" width="36" height="36" rx="8" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M190 184L238 160M190 206L286 160M190 230L238 230M190 230L286 230" />
  `),

  nativeTokens: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="188" width="34" height="44" rx="8" />
    <circle class="deco-fill deco-fill--soft anim-fade" cx="172" cy="210" r="20" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M214 182L250 194L258 230L228 254L194 240L186 204Z" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="286" y="188" width="34" height="44" rx="8" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M136 210H152M192 210H194M258 210H286" />
  `),

  omniStreaming: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M104 214C126 180 148 180 170 214C192 248 214 248 236 214C258 180 280 180 302 214C324 248 346 248 368 214" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M112 266H274M112 292H330" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="106" cy="214" r="10" />
  `),

  benchmarkTradeoff: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="112" y="216" width="42" height="72" rx="10" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="172" y="176" width="42" height="112" rx="10" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M248 148L308 196L248 244" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M214 232L248 196H332" />
  `),

  evaluationGrid: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="138" width="90" height="72" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="224" y="138" width="90" height="72" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="234" width="90" height="72" rx="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="224" y="234" width="90" height="72" rx="14" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M155 222H269M212 174V270" />
  `),

  groundingCheck: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="150" width="114" height="120" rx="18" />
    <circle class="deco-stroke anim-draw" cx="294" cy="210" r="54" pathLength="1" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M214 210H240M280 210L292 222L314 194" />
    <circle class="deco-node anim-pop" cx="294" cy="210" r="10" />
  `),

  leakageFile: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M110 140H184L210 166V280H110Z" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M138 178H182M138 210H176M138 242H170" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="252" y="170" width="70" height="92" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 214H252M322 170L342 150" />
  `),

  questionLeak: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M124 170C124 146 142 128 166 128H202C226 128 244 146 244 170V198C244 222 226 240 202 240H184L154 266L160 240H166C142 240 124 222 124 198Z" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M244 198H292L326 164" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="286" y="136" width="54" height="54" rx="12" />
  `),

  layoutCrash: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="104" y="138" width="120" height="156" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M132 168H196M132 198H188M132 228H160M176 228H196M132 258H186" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M248 158L286 196L264 218L318 272" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="318" cy="272" r="16" />
  `),

  zeroBench: () => scene(`
    <circle class="deco-stroke anim-draw" cx="148" cy="212" r="64" pathLength="1" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="148" cy="212" r="20" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="246" y="150" width="84" height="124" rx="16" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M266 180H310M266 210H300M266 240H292" />
  `),

  metricCompass: () => scene(`
    <path class="deco-stroke anim-draw" pathLength="1" d="M210 126L226 182L282 198L226 214L210 270L194 214L138 198L194 182Z" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="210" cy="198" r="18" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M118 294H302" />
  `),

  systemLeak: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="152" width="94" height="120" rx="18" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M136 182H182M136 212H174M136 242H166" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M204 212H246L290 170" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="314" cy="156" r="18" />
  `),

  privacyLens: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="102" y="150" width="104" height="128" rx="18" />
    <circle class="deco-stroke anim-draw" cx="286" cy="204" r="42" pathLength="1" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M314 232L338 256" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="270" cy="190" r="10" />
  `),

  poisonLoop: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="106" y="176" width="70" height="92" rx="16" />
    <circle class="deco-fill deco-fill--strong anim-pop" cx="300" cy="214" r="30" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M176 214H236M236 214C236 176 268 146 308 146C348 146 380 176 380 214C380 252 348 282 308 282" />
    <path class="deco-stroke deco-stroke--soft anim-draw" pathLength="1" d="M300 282L280 266M300 282L314 258" />
  `),

  actionChain: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="100" y="184" width="54" height="60" rx="12" />
    <circle class="deco-node anim-pop" cx="214" cy="214" r="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="282" y="176" width="58" height="76" rx="14" />
    <path class="deco-stroke anim-draw" pathLength="1" d="M154 214H200M228 214H282" />
    <path class="deco-stroke deco-stroke--thin anim-draw" pathLength="1" d="M302 252L328 286" />
  `),

  complianceGrid: () => scene(`
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="138" width="68" height="68" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="196" y="138" width="68" height="68" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="282" y="138" width="68" height="68" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="110" y="228" width="68" height="68" rx="14" />
    <rect class="deco-fill deco-fill--strong anim-pop" x="196" y="228" width="68" height="68" rx="14" />
    <rect class="deco-fill deco-fill--soft anim-fade" x="282" y="228" width="68" height="68" rx="14" />
  `),
};

MOTIFS.scaleStack = MOTIFS.computePressure;
MOTIFS.thresholdJump = MOTIFS.thresholdBars;
MOTIFS.learningSlope = MOTIFS.optimizerLoop;
MOTIFS.capabilityRise = MOTIFS.capitalFrontier;
MOTIFS.coverageMatrix = MOTIFS.frameworkGrid;
MOTIFS.spectrumLadder = MOTIFS.horizonLadder;
MOTIFS.budgetDial = MOTIFS.controlKnobs;
MOTIFS.ttftNeedle = MOTIFS.latencyGauge;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferVariantFromBeat(beatId, headline = "") {
  const key = `${normalize(beatId)} ${normalize(headline)}`;

  if (/(correlacion|kilovatios|bienestar real|mecanismo)/.test(key)) return "gridPulse";
  if (/(vacuna|parto|pulmon|salud)/.test(key)) return "healthCross";
  if (/(bomba electrica|cosecha|irrig|logistica)/.test(key)) return "pumpField";
  if (/(conexion|electricidad|suministro|corte diario|voltaje|red electrica)/.test(key)) return "plugWave";
  if (/(primer kilovatio|umbral|mtf|mil[eé]simo|kwh)/.test(key)) return "thresholdBars";
  if (/(impuesto invisible|apag|cortes son)/.test(key)) return "warningBreak";
  if (/(infraestructura habilitante|mismas dependencias|quir[oó]fano|dependencias que un)/.test(key)) return "seriesEnergy";

  if (/(consulta|detras de cada consulta|compute|tecnologia electrica)/.test(key)) return "chipTraces";
  if (/(servirlos|inferencia|coste real)/.test(key)) return "queryFlow";
  if (/(jevons|mas eficiente|mas consumo)/.test(key)) return "loopArrows";
  if (/(hardware mas escaso|energia chips|chips agua|mineral|agua para refrigeracion)/.test(key)) return "supplyTriangle";
  if (/(80%|consumido por servidores|irlanda|geografia)/.test(key)) return "globeLoad";
  if (/(07_agua|millones de litros|cada dia por centro|cada día por centro)/.test(key)) return "thermoDrop";

  if (/(pib mide|actividad no vida|pib limite|mide actividad)/.test(key)) return "gdpVsLife";
  if (/(produccion invisible|fuera pib|40%)/.test(key)) return "hiddenLayers";
  if (/(easterlin|misma vida|mas renta)/.test(key)) return "happinessCurves";
  if (/(kahneman|ambos tenian razon|subpoblaciones)/.test(key)) return "splitOutcomes";
  if (/(finlandia|mas rica|divergencia)/.test(key)) return "northStar";
  if (/(gpi|marcos|better life|idh)/.test(key)) return "frameworkGrid";

  if (/(jcurve|j-curve|llega tarde|crecimiento llega tarde|tecnologia llega)/.test(key)) return "jCurve";
  if (/(tareas|pib no lo ve|productividad por tarea)/.test(key)) return "taskFlow";
  if (/(alphafold|antes imposible|proteic)/.test(key)) return "helixFold";
  if (/(vale mas|cuesta menos|pib baja|valor mal medido)/.test(key)) return "valueMismatch";
  if (/(solo el 1%|ha llegado de verdad|adopcion|senal)/.test(key)) return "adoptionNodes";
  if (/(0,53|15 billones|proyecciones|goldman|acemoglu|pwc)/.test(key)) return "projectionFork";

  if (/(350000|350.000|cu[mó]mputo|revienta los limites del suelo|explosion demanda)/.test(key)) return "computePressure";
  if (/(doce a[nñ]os|conectarse a la red|grid)/.test(key)) return "gridWait";
  if (/(agua suelo permiso|agua suelo calor|tres no|terreno y planificacion|recursos que no escalan)/.test(key)) return "landWaterPermit";
  if (/(88.000|200 el kilo|coste lanzamiento|starship)/.test(key)) return "launchRocket";
  if (/(sol nunca se apaga|orbita ventaja|energia solar orbital|solar en orbita)/.test(key)) return "solarOrbit";
  if (/(mercado orbital|100 gw|millon de satelites|mercado orbital|orbital data center system)/.test(key)) return "constellationGrid";
  if (/(musk|ia mas barata|espacio sera mas barato|el espacio sera mas barato)/.test(key)) return "seriesOrbit";
  if (/(procesar arriba|bajar solo lo que importa|downlink|0,001)/.test(key)) return "downlinkBeam";

  if (/(espacio es frio|vacio no enfria|trampa fisica|mito frio)/.test(key)) return "coldTrap";
  if (/(radiadores|kilovatios|megavatios)/.test(key)) return "radiatorGrid";
  if (/(ventaja real|energia solar|heliosincrona)/.test(key)) return "solarOrbit";
  if (/(conectado solo cuando pasa|ventanas de enlace|latencia|conectividad)/.test(key)) return "connectivityWindow";
  if (/(no se repara|degradacion|radiacion|lo que se lanza)/.test(key)) return "crackedChip";

  if (/(datacenter orbital|espectro|concepto unico)/.test(key)) return "orbitSpectrum";
  if (/(h100|hardware real|entrena ia)/.test(key)) return "gpuSatellite";
  if (/(ningun desastre|archivo|resiliencia|lunar)/.test(key)) return "moonArchive";
  if (/(millon de satelites|100 gw|megaproyectos|constelacion)/.test(key)) return "constellationGrid";
  if (/(viabilidad|no resuelve tus cuellos|no resuelve)/.test(key)) return "balanceMatrix";

  if (/(campos de golf|32 campos|golf vs data)/.test(key)) return "waterVsGolf";
  if (/(botella de agua|wue|consulta|refrigeracion)/.test(key)) return "thermoDrop";
  if (/(120 kw|rack|energia ia|densidad)/.test(key)) return "rackHeat";
  if (/(cobalto|mineral invisible|cadena)/.test(key)) return "mineralChain";
  if (/(h100 vale|circular|ewaste|recicl)/.test(key)) return "recycleChip";
  if (/(resuelve dos|contradice los titulares|balance real|huella)/.test(key)) return "balanceMatrix";

  if (/(muesca|oveja|lebombo|ishango|simbolo ausente)/.test(key)) return "tallyProxy";
  if (/(ausencia|cero|posicional|brahmagupta)/.test(key)) return "zeroPlace";
  if (/(algebra|desconocid|ecuacion|despejar|khwarizmi)/.test(key)) return "algebraBalance";
  if (/(notacion|comprime el pensamiento|viete|descartes)/.test(key)) return "symbolCurve";
  if (/(calculo|ecuaciones|variacion continua|newton|leibniz)/.test(key)) return "calculusWave";

  if (/(pascalina|jacquard|programar)/.test(key)) return "gearLoom";
  if (/(maquina general|babbage|lovelace)/.test(key)) return "analyticalEngine";
  if (/(cablearse|boole|shannon|circuit)/.test(key)) return "logicCircuit";
  if (/(turing|puede calcular|computar una maquina)/.test(key)) return "turingTape";
  if (/(programa almacenado|programa entra dentro)/.test(key)) return "storedProgram";
  if (/(aprender a pensar|dartmouth|maquina aprender)/.test(key)) return "machineMind";

  if (/(regla por regla|reglas a mano|software 2|logica ya no se escribe)/.test(key)) return "ruleToData";
  if (/(invierno|sin aire|dos veces)/.test(key)) return "winterCurve";
  if (/(equivocarse menos|optimizar en lugar|estadistica|ajuste)/.test(key)) return "optimizerLoop";
  if (/(backprop|error viaja hacia atras)/.test(key)) return "backpropNet";
  if (/(masa critica|escala como|gpus y escala|renacimiento)/.test(key)) return "scaleStack";
  if (/(alexnet|umbral que cambio|umbral que cambio la direccion)/.test(key)) return "thresholdJump";
  if (/(transformer|recurrencia|atencion)/.test(key)) return "attentionMesh";
  if (/(preentrenamiento|cientos de tareas|base general)/.test(key)) return "pretrainHub";
  if (/(ley de potencia|leyes de escala|power law)/.test(key)) return "powerLawCurve";
  if (/(fundacionales|centro de gravedad)/.test(key)) return "foundationShift";
  if (/(escalar mas no|limites del escalado|limites del transformer)/.test(key)) return "limitWall";
  if (/(busqueda|no llega en un solo paso)/.test(key)) return "searchBranch";
  if (/(contexto largo no es memoria|memoria)/.test(key)) return "memoryVault";
  if (/(imaginar el mundo|world model)/.test(key)) return "worldLoop";
  if (/(robotica|necesita un cuerpo)/.test(key)) return "robotArm";
  if (/(dinero senala|proxima frontera|capital)/.test(key)) return "capitalFrontier";

  if (/(optimiza no piensa|que es la ia|marco)/.test(key)) return "optimizerLoop";
  if (/(cuatro cajas|familias)/.test(key)) return "frameworkGrid";
  if (/(setenta anos|setenta anos en una linea|hitos)/.test(key)) return "timelineRibbon";
  if (/(mlops|modelo entrenado no es un producto|ciclo de vida)/.test(key)) return "mlopsFlow";
  if (/(significado convertido en geometria|embeddings)/.test(key)) return "embeddingClusters";
  if (/(nadie programo estas capacidades|scaling|capacidades emergentes)/.test(key)) return "capabilityRise";
  if (/(configuraciones|dificil de controlar|temperatura|controlar)/.test(key)) return "controlKnobs";
  if (/(prompt tuyo|modelo es externo|llmops|rag)/.test(key)) return "promptBoundary";
  if (/(mismo nombre|maquinas distintas|confusion)/.test(key)) return "systemSplit";
  if (/(salida finita|espacio ilimitado|entradas salidas)/.test(key)) return "finiteInfinite";
  if (/(mismo input|respuesta diferente|determinismo)/.test(key)) return "deterministicDice";
  if (/(factualmente falso|alucinacion|explicabilidad)/.test(key)) return "fluentFalse";
  if (/(ninguna tecnologia lo cubre todo|matriz)/.test(key)) return "coverageMatrix";
  if (/(nadie sabe que significa agi|que significa agi|definicion agi)/.test(key)) return "agiSpectrum";
  if (/(cognitiva|economica|espectro de seis|definiciones)/.test(key)) return "spectrumLadder";
  if (/(limites precisos|brillantes y con limites|limitaciones)/.test(key)) return "limitProfile";
  if (/(industrializacion|impacto)/.test(key)) return "impactWave";
  if (/(optimizando lo equivocado|alineacion)/.test(key)) return "targetMisalign";
  if (/(horizonte se duplica|cada siete meses)/.test(key)) return "horizonLadder";

  if (/(rapido no es lo mismo|sistema 2|que es razonar)/.test(key)) return "reasonSplit";
  if (/(pensar antes de responder|o1)/.test(key)) return "thinkPath";
  if (/(rlvr|aprender a acertar)/.test(key)) return "rewardLoop";
  if (/(colapso|apple|illusion of thinking)/.test(key)) return "collapseLadder";
  if (/(debate|ilusion tambien puede ser ilusion)/.test(key)) return "mirrorDebate";
  if (/(ni experto humano ni caja vacia|practica)/.test(key)) return "operatorPanel";
  if (/(roto en produccion|atajo|fallos)/.test(key)) return "shortcutTrap";
  if (/(da la razon|sycophancy)/.test(key)) return "sycophantMirror";
  if (/(ganar la partida|specification gaming)/.test(key)) return "gameScore";
  if (/(error pequeno|conclusion falsa|cadena)/.test(key)) return "chainBreak";
  if (/(razonamiento visible miente|infidelidad cot)/.test(key)) return "fakeCot";
  if (/(mitigacion|se gestionan|presupuestos duros|abstencion)/.test(key)) return "designControls";
  if (/(mas tokens para pensar|mas pasos)/.test(key)) return "tokenMeter";
  if (/(muchas respuestas|candidatos)/.test(key)) return "candidateFunnel";
  if (/(explorar ramas|podar)/.test(key)) return "treePrune";
  if (/(latencia|secuencial por construccion|diez segundos|usuario ya se fue)/.test(key)) return "latencyGauge";
  if (/(ttft|tarde al empezar)/.test(key)) return "ttftNeedle";
  if (/(streaming|ver construirse)/.test(key)) return "streamBars";
  if (/(routellm|modelo grande|router)/.test(key)) return "routerSwitch";
  if (/(tokens que el usuario nunca ve|coste oculto|tambien cuestan)/.test(key)) return "hiddenCost";
  if (/(fallback|cuando parar)/.test(key)) return "fallbackSwitch";
  if (/(overthinking|sobrepensamiento|produce respuestas peores)/.test(key)) return "overthinkLoop";
  if (/(facturas impredecibles|slos|coste)/.test(key)) return "billStorm";
  if (/(documento que redirige|prompt injection|injection)/.test(key)) return "documentInjection";
  if (/(taboorag|usar la seguridad del modelo contra el|seguridad contra el)/.test(key)) return "shieldPoison";

  if (/(llm que ve no es suficiente|mas que imagen)/.test(key)) return "modalBundle";
  if (/(documento audio robot|familia distinta|modalidad no es input)/.test(key)) return "modalityFamily";
  if (/(traducir alinear mantener|tres niveles)/.test(key)) return "translateAlignStream";
  if (/(cinco verbos|cinco capacidades)/.test(key)) return "capabilityHand";
  if (/(senal mas dificil|elude la senal|grounding dificil)/.test(key)) return "hardSignal";
  if (/(cerca si van juntos|pares base)/.test(key)) return "pairAlignment";
  if (/(no era el texto era la vision|refinamiento)/.test(key)) return "visionRefine";
  if (/(seis modalidades|imagebind|cero pares directos)/.test(key)) return "sixModalOrbit";
  if (/(representar no es seguir instrucciones|instruccion visual)/.test(key)) return "groundingVsInstruction";
  if (/(datos ganan|arquitectura pierde|calidad de datos)/.test(key)) return "dataWins";
  if (/(preferencias|sesgo no esta en los pixeles)/.test(key)) return "preferenceBias";
  if (/(entender no es generar|capas distintas)/.test(key)) return "systemSplit";
  if (/(conector lo es todo|encoder conector)/.test(key)) return "encoderBridge";
  if (/(volver a mirar mientras se genera|crossattention)/.test(key)) return "crossAttention";
  if (/(espacio de tokens|tokenizacion nativa)/.test(key)) return "nativeTokens";
  if (/(omni|silencio inicial|streaming multimodal)/.test(key)) return "omniStreaming";
  if (/(benchmarks no eligen|tradeoffs)/.test(key)) return "benchmarkTradeoff";
  if (/(acertar sin haber mirado|grounding)/.test(key)) return "groundingCheck";
  if (/(examen ya estaba|contaminacion)/.test(key)) return "leakageFile";
  if (/(pregunta revela la respuesta|sesgo linguistico)/.test(key)) return "questionLeak";
  if (/(layout complejo|ocrbench|mmau|36%)/.test(key)) return "layoutCrash";
  if (/(cero por ciento|zerobench|video)/.test(key)) return "zeroBench";
  if (/(exactitud no es lo mismo que comprension|metricas)/.test(key)) return "metricCompass";
  if (/(fugas de sistema|manipulacion de herramientas|fuga sistema)/.test(key)) return "systemLeak";
  if (/(privacidad|exif|metadatos)/.test(key)) return "privacyLens";
  if (/(envenenamiento|aprendizaje continuo|rag multimodal)/.test(key)) return "poisonLoop";
  if (/(actua|agencia|propagacion|accion irreversible)/.test(key)) return "actionChain";
  if (/(eu ai act|sesgos demograficos|cumplimiento normativo)/.test(key)) return "complianceGrid";

  return null;
}

function resolveVariant(scopeKey, beatId, beatType, beatIndex = -1, headline = "") {
  const fallbackScopeKey = scopeKey.startsWith("article:") ? `article:${scopeKey.split("/").pop()}` : scopeKey;
  const preset = PRESETS[scopeKey] || PRESETS[fallbackScopeKey] || {};
  if (beatType === "opening") return preset.opening || inferVariantFromBeat(beatId, headline) || "glyphEcho";
  return inferVariantFromBeat(beatId, headline) || preset.beats?.[beatId] || preset.sequence?.[beatIndex] || preset.opening || "glyphEcho";
}

export function renderVideoDeco({ scopeKey, beatId, beatType, beatIndex = -1, headline = "", glyph = "" }) {
  const variant = resolveVariant(scopeKey, beatId, beatType, beatIndex, headline);
  const renderer = MOTIFS[variant] || MOTIFS.glyphEcho;
  return stabilizeVideoSvgMarkup(renderer(glyph));
}

export function stabilizeVideoSvgMarkup(svg, { minFontSize = 10 } = {}) {
  const textMatches = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)];
  const textCount = textMatches.length;
  const numericLabels = textMatches.filter(([, text]) => /\d/.test(String(text || ""))).length;
  const detailLevel =
    textCount >= 12 || numericLabels >= 5 ? "dense"
    : textCount >= 7 || numericLabels >= 3 ? "medium"
    : "normal";
  const resolvedMinFontSize =
    detailLevel === "dense" ? Math.max(minFontSize, 10.5)
    : detailLevel === "medium" ? Math.max(minFontSize, 9.5)
    : minFontSize;
  let next = svg;

  next = next.replace(/font-size="([0-9.]+)"/g, (_match, raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return _match;
    return `font-size="${Math.max(value, resolvedMinFontSize)}"`;
  });

  next = next.replace(/font-size='([0-9.]+)'/g, (_match, raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return _match;
    return `font-size='${Math.max(value, resolvedMinFontSize)}'`;
  });

  next = next.replace(/style="([^"]*?)font-size:\s*([0-9.]+)px([^"]*)"/g, (_match, before, raw, after) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return _match;
    return `style="${before}font-size:${Math.max(value, resolvedMinFontSize)}px${after}"`;
  });

  next = next.replace(/style='([^']*?)font-size:\s*([0-9.]+)px([^']*)'/g, (_match, before, raw, after) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return _match;
    return `style='${before}font-size:${Math.max(value, resolvedMinFontSize)}px${after}'`;
  });

  next = next.replace(/font-size:\s*([0-9.]+)px/g, (_match, raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return _match;
    return `font-size:${Math.max(value, resolvedMinFontSize)}px`;
  });

  next = next.replace(/<text\b([^>]*)>/g, (match, attrs) => {
    let nextAttrs = attrs;
    if (!/\bfont-size=/.test(nextAttrs) && !/\bfont-size\s*:/.test(nextAttrs)) nextAttrs += ` font-size="${resolvedMinFontSize}"`;
    if (!/\bpaint-order=/.test(nextAttrs)) nextAttrs += ` paint-order="stroke"`;
    if (!/\bstroke=/.test(nextAttrs)) nextAttrs += ` stroke="rgba(11,18,32,0.88)"`;
    if (!/\bstroke-width=/.test(nextAttrs)) nextAttrs += ` stroke-width="2.2"`;
    if (!/\bstroke-linejoin=/.test(nextAttrs)) nextAttrs += ` stroke-linejoin="round"`;
    if (!/\bfont-weight=/.test(nextAttrs)) nextAttrs += ` font-weight="700"`;
    if (!/\bfill=/.test(nextAttrs)) nextAttrs += ` fill="#f0f4ff"`;
    return `<text${nextAttrs}>`;
  });

  next = next.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    let nextAttrs = attrs;
    if (!/\bclass=/.test(nextAttrs)) {
      nextAttrs += ` class="deco-svg"`;
    } else if (!/\bdeco-svg\b/.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\bclass=(["'])([^"']*)(\1)/, (_m, quote, value) => `class=${quote}${value} deco-svg${quote}`);
    }
    if (!/\bdata-detail=/.test(nextAttrs)) nextAttrs += ` data-detail="${detailLevel}"`;
    if (!/\bdata-text-count=/.test(nextAttrs)) nextAttrs += ` data-text-count="${textCount}"`;
    if (!/\bpreserveAspectRatio=/.test(nextAttrs)) nextAttrs += ` preserveAspectRatio="xMidYMid meet"`;
    return `<svg${nextAttrs}>`;
  });

  const contentTransform =
    detailLevel === "dense" ? `translate(-28 -24) scale(1.16)`
    : detailLevel === "medium" ? `translate(-14 -12) scale(1.08)`
    : "";

  if (contentTransform) {
    next = next.replace(
      /(<path\b[^>]*class="deco-frame[^"]*"[^>]*\/>)([\s\S]*?)(<\/svg>)/i,
      (_match, shellEnd, content, svgEnd) => {
        if (!content.trim() || /data-deco-content=/.test(content)) {
          return `${shellEnd}${content}${svgEnd}`;
        }
        return `${shellEnd}\n<g data-deco-content="true" transform="${contentTransform}">${content}</g>\n${svgEnd}`;
      },
    );
  }

  return next;
}

export function videoDecoStyles() {
  return `
  .beat-inner {
    position: relative;
    z-index: 1;
    padding-right: var(--copy-right-pad, 820px);
  }

  .opening .beat-inner {
    padding-right: var(--opening-copy-right-pad, 760px);
  }

  .cta-beat .beat-inner {
    padding-right: 160px;
  }

  .deco {
    position: absolute;
    right: var(--deco-right, 36px);
    top: var(--deco-top, 304px);
    width: var(--deco-size, 500px);
    height: var(--deco-size, 500px);
    display: block;
    pointer-events: none;
    user-select: none;
    z-index: 0;
    opacity: 1;
    overflow: hidden;
  }

  .opening .deco {
    top: var(--deco-opening-top, 146px);
    right: var(--deco-opening-right, 36px);
    width: var(--deco-opening-size, 560px);
    height: var(--deco-opening-size, 560px);
    opacity: 0.98;
    overflow: hidden;
  }

  .opening .main-title {
    max-width: var(--opening-title-max, 1020px);
  }

  .opening .subtitle {
    max-width: var(--opening-subtitle-max, 760px);
  }

  .deco-scene {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 52px;
  }

  .deco-component {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 52px;
    filter: drop-shadow(0 30px 90px rgba(3, 10, 22, 0.55));
  }

  .deco-snippet-shell {
    position: absolute;
    inset: 24px;
    border-radius: 40px;
    overflow: hidden;
    background: rgba(11, 18, 32, 0.92);
    border: 1px solid rgba(240, 244, 255, 0.1);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
  }

  .deco-snippet-shell::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(255,255,255,.05) 0%, transparent 16%),
      radial-gradient(circle at 82% 18%, rgba(124,199,255,.08) 0%, transparent 28%);
    pointer-events: none;
    z-index: 0;
  }

  .deco-snippet-stage {
    position: absolute;
    inset: 14px;
    z-index: 1;
  }

  .deco-snippet-image {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 22px;
    object-fit: contain;
    object-position: center center;
    background: #0b1220;
    filter: saturate(1.08) contrast(1.12) brightness(1.12);
  }

  .deco-svg {
    width: 100%;
    height: 100%;
    color: var(--c);
    overflow: hidden;
    transform-origin: 50% 50%;
    filter: drop-shadow(0 30px 90px rgba(3, 10, 22, 0.55));
  }

  .beat:not(.opening) .deco:has(.deco-svg[data-detail="medium"]) {
    right: 36px;
    top: 300px;
    width: 580px;
    height: 580px;
  }

  .beat:not(.opening) .deco:has(.deco-svg[data-detail="dense"]) {
    right: 28px;
    top: 272px;
    width: 660px;
    height: 660px;
  }

  .beat:not(.opening) .deco:has(.deco-component[data-detail="snippet"]) {
    right: 18px;
    top: 244px;
    width: 720px;
    height: 640px;
  }

  .opening .deco:has(.deco-component[data-detail="snippet"]) {
    top: 138px;
    right: 28px;
    width: 760px;
    height: 660px;
  }

  .beat:not(.opening) .deco:has(.deco-component[data-layout="wide"]) {
    right: 8px;
    top: 248px;
    width: 820px;
    height: 612px;
  }

  .beat:not(.opening) .deco:has(.deco-component[data-layout="square"]) {
    right: 16px;
    top: 236px;
    width: 700px;
    height: 660px;
  }

  .beat:not(.opening) .deco:has(.deco-component[data-layout="tall"]) {
    right: 26px;
    top: 188px;
    width: 620px;
    height: 744px;
  }

  .opening .deco:has(.deco-component[data-layout="wide"]) {
    top: 128px;
    right: 18px;
    width: 820px;
    height: 620px;
  }

  .opening .deco:has(.deco-component[data-layout="square"]) {
    top: 132px;
    right: 18px;
    width: 730px;
    height: 680px;
  }

  .deco-svg[data-detail="medium"] {
    width: 102%;
    height: 102%;
    transform: translate(-1%, -1%);
  }

  .deco-svg[data-detail="dense"] {
    width: 106%;
    height: 106%;
    transform: translate(-3%, -3%);
  }

  .deco-svg[data-detail="medium"] .deco-grid,
  .deco-svg[data-detail="dense"] .deco-grid {
    opacity: 0.42;
  }

  .deco-svg text {
    font-family: "SF Mono", "JetBrains Mono", "Courier New", monospace;
    letter-spacing: 0.01em;
    paint-order: stroke;
    stroke: rgba(11, 18, 32, 0.88);
    stroke-width: 2.2px;
    stroke-linejoin: round;
  }

  .deco-panel-glow {
    fill: currentColor;
    fill-opacity: 0.13;
  }

  .deco-panel {
    fill: rgba(16, 26, 46, 0.82);
    stroke: rgba(240, 244, 255, 0.08);
    stroke-width: 2;
  }

  .deco-grid {
    fill: none;
    stroke: rgba(240, 244, 255, 0.034);
    stroke-width: 1.5;
  }

  .deco-frame {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-opacity: 0.3;
    stroke-linecap: round;
  }

  .deco-stroke {
    fill: none;
    stroke: currentColor;
    stroke-width: 7;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-opacity: 0.95;
  }

  .deco-stroke--soft {
    stroke-width: 5;
    stroke-opacity: 0.64;
  }

  .deco-stroke--thin {
    stroke-width: 3.5;
    stroke-opacity: 0.78;
  }

  .deco-fill {
    fill: currentColor;
    fill-opacity: 0.14;
  }

  .deco-fill--soft {
    fill-opacity: 0.11;
  }

  .deco-fill--strong {
    fill-opacity: 0.32;
  }

  .deco-node {
    fill: currentColor;
    fill-opacity: 0.94;
  }

  .deco-glyph {
    fill: currentColor;
    fill-opacity: 0.24;
    font-family: "SF Mono", "JetBrains Mono", "Courier New", monospace;
    font-size: 132px;
    font-weight: 900;
    letter-spacing: -0.06em;
  }

  .deco .anim-draw {
    stroke-dasharray: 1.05;
    stroke-dashoffset: 1.05;
    opacity: 0.05;
  }

  .deco .anim-pop,
  .deco .anim-float,
  .deco .anim-rotate,
  .deco .anim-fade {
    opacity: 0.05;
    transform-box: fill-box;
    transform-origin: center;
  }
  `;
}
