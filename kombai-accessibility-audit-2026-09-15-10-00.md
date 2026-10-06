# Accessibility audit

The automated audit was run after the dashboard preview checks. The returned document context was `about:blank` rather than the Vite page, so the document-level findings below are not representative of the rendered trading journal surface:

- `document-title`
- `html-has-lang`
- `landmark-one-main`
- `page-has-heading-one`

The page-level checks could not be trusted from this audit run. The rendered dashboard controls were separately verified with accessible names for chart expansion, month navigation, calendar options, and day cells. The chart dialog closes with Escape and calendar cells expose date/trade summaries through `aria-label`.
