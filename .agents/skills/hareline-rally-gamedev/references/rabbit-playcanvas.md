# Rabbit and PlayCanvas contract

`sdk.init` must run before app/game construction so global errors can emit `rabbit:error`. `sdk.ready` is called once from the first `postrender`, after the title UI and scene exist. The canvas uses its container and `ResizeObserver`; DPR is capped at 2. Vite keeps relative base and permissive development CORS.

Rabbit pause is authoritative. `createPause` combines Studio messages, Escape/P, gamepad Start, and the HUD; Studio pause cannot be locally dismissed. Pause gates controls and audio. Blur, pause transitions, menus, finish, and restart clear held gameplay input. Rabbit mute must cover music, SFX, and engine voices.

Use Rabbit keyboard/gamepad/touch adapters to create one normalized analog snapshot. Touch remains multi-touch and provides joystick, Drift, Item, and a separate HUD pause button. Use `sdk.storage`, never direct `localStorage`.

Keep PlayCanvas in modern ESM mode: classes extend `pc.Script`; never use legacy `pc.createScript`. Reuse cached materials and pre-created entities. PlayCanvas Euler APIs use degrees. Keep camera near/far planes safe and treat the post effect as optional with a plain-render fallback.

Browser acceptance must use a GPU-backed browser. Check console and Rabbit messages, follow every menu screen, race via QA when useful, exercise pause/restart/mute and resize, then repeat against `vite preview`.
