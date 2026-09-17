# First-party post-click measurement

This contract measures what happens after a visit reaches 5sigmas without treating Search Console clicks as sessions and without collecting form contents or identity data.

## Activation model

`docs/assets/javascripts/measurement.js` is loaded on both locales by the existing global runtime loader. The runtime is **fail-closed**: it sends no network request unless an approved collector is configured through `window.__S5_MEASUREMENT__.endpoint` or `<meta name="s5-measurement-endpoint">`.

The collector must be same-origin, HTTPS when the page is HTTPS, and accept credential-free JSON POSTs. Until such an endpoint is provisioned, the runtime stays inert and no session/conversion values should be reported.

## Payload contract

Every accepted event uses schema version 1 and contains only:

- `event_name`, random `event_id`, and UTC `occurred_at`;
- random per-tab/session `session_id` stored in `sessionStorage` only;
- `landing_path` and `page_path` as URL paths only, never query strings or fragments;
- locale (`es` or `en`);
- acquisition `traffic_channel`: `direct`, `internal`, `organic_search`, `ai_referral`, or `referral`;
- `referrer_host` only, never the referring URL/path/query;
- an allowlisted event context with identifiers such as `tool_id`, field name, action, target path, video id, or engagement milestone.

The browser runtime does not send form/input values, URL queries/fragments, cookies, local-storage identifiers, user IDs, email addresses, full referrers, or browser credentials. The collector must not persist transport IP addresses or request headers as analytics dimensions.

## Event semantics

| Event | Meaning |
| --- | --- |
| `page_view` | A rendered route became the current page. Distinct `session_id` values can be aggregated as sessions; this is not a Search Console click. |
| `tool_open` | A page exposing a `data-s5-tool` root was opened. |
| `meaningful_input_change` | First change to a named `data-field` for a tool on the current route. The input value is never collected. |
| `scenario_completed` | A tool form was explicitly submitted, or a tool emits this event through the measurement API after a real scenario completes. |
| `result_rendered` | Explicit tool event when a meaningful result has actually been produced. It is deliberately not inferred from arbitrary DOM changes. |
| `share` | A tool share action was used. |
| `export` | A tool export/download action was used. |
| `source_click` | A contextual primary-source link was followed. Only the target path is retained for same-site paths; external query data is discarded. |
| `related_content_click` | A contextual related-content/navigation link was followed. |
| `video_play` / `video_complete` | A video started or reached the native `ended` event. |
| `article_engagement` | Article scroll depth crossed 50% or 90% once per route. |

Tools that need deterministic completion/result semantics can call:

```js
window.s5Measurement?.track('scenario_completed', {
  tool_id: 'example-tool',
  result_kind: 'scenario',
});

window.s5Measurement?.track('result_rendered', {
  tool_id: 'example-tool',
  result_kind: 'estimate',
});
```

Only documented event names and context keys are accepted; unknown events and arbitrary context fail closed.

## Attribution boundaries

`organic_search` sessions and Search Console web clicks are separate metrics and must remain separate when joined by normalized landing path/date. `ai_referral` means a browser referral from a known AI assistant host; it is **not** evidence of visibility or impressions inside Google AI search experiences. Google-origin traffic remains normal organic search unless a dedicated, official measurement source provides a separate dimension.

## Backend aggregation target

Once an approved collector exists, the private operational layer should aggregate by date + normalized landing path + locale + traffic channel and expose at least:

- sessions and pageviews;
- engaged sessions derived from meaningful tool/article/video events;
- scenario/result completions and other explicitly chosen key events;
- tool opens, meaningful changes, shares/exports, source clicks, related-content clicks and video engagement;
- AI-referral sessions as their own post-click channel.

The resulting landing-page table can be joined alongside GSC page metrics, but GSC `clicks` and first-party `sessions` must keep separate columns and semantics.

## Human activation dependency

One external action remains before collection can become live: provision the approved same-origin first-party collector endpoint (including the site's required retention/consent handling) and configure its endpoint in the deployed site. Until then, capability state is `NOT_CONNECTED`; never replace it with zero-valued analytics.
