# Skill Registry

Generated for project: `cashi-app`
Detected at: 2026-05-10

## Project Conventions

### Source: `C:\Users\walte\.config\opencode\AGENTS.md`
- Respuestas cortas por defecto, ampliar solo cuando aporte valor real.
- Verificar claims técnicos antes de afirmarlos.
- Un máximo de una pregunta por vez, y frenar después de preguntar.
- Sin build automático después de cambios.
- Commits convencionales, sin `Co-Authored-By`.
- Persistencia obligatoria en Engram para decisiones, descubrimientos y cambios de configuración.

## Available Skills (non-SDD)

> Scope note: no project-local skills were found in this repository. Entries below are user-level skills.

### `branch-pr`
- **Trigger**: crear/abrir/preparar PRs.
- **Path**: `C:\Users\walte\.config\opencode\skills\branch-pr\SKILL.md`
- Requiere issue aprobado enlazado en el PR.
- Requiere exactamente un label `type:*`.
- Exige branch naming `type/description` con regex estricta.
- Usa template de PR con resumen, tabla de cambios y test plan.

### `chained-pr`
- **Trigger**: PRs > 400 líneas, stacked/chained reviews.
- **Path**: `C:\Users\walte\.config\opencode\skills\chained-pr\SKILL.md`
- Obliga dividir PRs grandes salvo excepción explícita `size:exception`.
- Cada PR debe ser una unidad verificable con alcance claro.
- No mezclar estrategias de cadena después de elegir una.

### `comment-writer`
- **Trigger**: comentarios en PR/issues/chat.
- **Path**: `C:\Users\walte\.config\opencode\skills\comment-writer\SKILL.md`
- Mensajes cortos, directos, accionables y con razón técnica.
- Idioma del hilo; en español usar voseo rioplatense.
- Evitar pile-ons y evitar em dash.

### `cognitive-doc-design`
- **Trigger**: docs de guías/RFC/README/review.
- **Path**: `C:\Users\walte\.config\opencode\skills\cognitive-doc-design\SKILL.md`
- Liderar con la respuesta y usar disclosure progresivo.
- Estructura orientada a escaneo: quick path, detalles, checklist.
- Diseñar docs para reducir carga cognitiva del reviewer.

### `go-testing`
- **Trigger**: tests Go, cobertura, teatest/golden.
- **Path**: `C:\Users\walte\.config\opencode\skills\go-testing\SKILL.md`
- Table-driven tests por defecto en casos múltiples.
- Tests sobre comportamiento y transiciones, no trivia de implementación.
- Golden determinístico y flujo de update controlado.

### `issue-creation`
- **Trigger**: crear issues de bug/feature.
- **Path**: `C:\Users\walte\.config\opencode\skills\issue-creation\SKILL.md`
- Issue-first discipline con validaciones previas.
- Estructura de issue clara para triage y ejecución.

### `judgment-day`
- **Trigger**: dual review/adversarial review.
- **Path**: `C:\Users\walte\.config\opencode\skills\judgment-day\SKILL.md`
- Aplica revisión ciega dual, confirma hallazgos y re-juzga.
- Enfocado en separar señal real de falso positivo.

### `skill-creator`
- **Trigger**: crear/documentar nuevas skills.
- **Path**: `C:\Users\walte\.config\opencode\skills\skill-creator\SKILL.md`
- Skill como contrato operativo LLM-first.
- Estructura obligatoria y frontmatter válido.

### `work-unit-commits`
- **Trigger**: planificar commits por unidades revisables.
- **Path**: `C:\Users\walte\.config\opencode\skills\work-unit-commits\SKILL.md`
- Mantener tests/docs junto a la unidad que verifican.
- Priorización de commits pequeños, trazables y con rollback claro.
