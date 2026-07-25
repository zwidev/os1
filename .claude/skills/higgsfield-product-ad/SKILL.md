---
name: higgsfield-product-ad
description: >
  Produce a complete short-form video ad (TikTok/Reels, 30-60s, 9:16) on
  Higgsfield using the shot-by-shot pipeline proven on the OS1 shopping ad:
  cast a consistent lead with a reference image, build per-shot start frames,
  animate with Kling 3.0 pro (native dialogue audio), stitch with
  explainer_video, fix flawed shots surgically, and finish with a 4K upscale.
  Use this skill whenever the user asks to create, generate, or iterate on a
  video ad, commercial, or promo spot with Higgsfield — including "make the
  ad", "do Concept B", "create an ad for a product", re-rolling a shot,
  changing a dialogue line, or upscaling a finished cut. Also use it when
  revising any ad whose job IDs are logged in
  docs/marketing/os1-ad-concepts-viral.md.
---

# Higgsfield shot-by-shot product ad pipeline

This skill produces a finished vertical video ad from a shot list, on the
Higgsfield MCP. It was developed producing the OS1 shopping ad (v1→v5 + 4K);
the version history and all job IDs live in
`docs/marketing/os1-ad-concepts-viral.md` — read it before revising an
existing cut so you re-roll single shots instead of regenerating the ad.

Cost calibration (Ultra plan): ~17.5 credits per 7s Kling pro shot with audio,
~1 credit per start frame, assembly free, 4K upscale ~30-60 credits. A full
7-shot ad lands around 150-250 credits including one round of fixes. Preflight
with `get_cost: true` if the user seems cost-sensitive.

## Step 0 — Script before pixels

**Capability check first:** every ability the ad shows the product using must
be one the product actually has. This killed a fully-produced concept once:
the script had OS1 (a voice-only agent, no camera) judging outfits visually,
and the whole ad had to be abandoned after rendering. For OS1 that means:
hearing, memory, reminders, note-taking, background research — never sight,
and never phone calls, so it cannot book cabs, tables, or appointments.
If a limitation is charming, use it ("I can't see you. But you sound ready.")
rather than pretending it away. OS1 also never acts unilaterally: it proposes
and the user says the word ("Say the word and I'll move your eight o'clock" —
"Move it." — "Done."), so never script it silently moving appointments or
booking things unasked. Confirm the concept with the user before spending
render credits.

Write (or load from the brief) a shot table before generating anything:
7 shots × 5-8s ≈ 45s. Hook dialogue inside the first 2 seconds. Each shot
needs: duration, visual description, dialogue lines, ambience notes.

**Write dialogue for TTS, not for print.** The Kling voice track mangles
words the model reads ambiguously — these failures forced re-rolls on OS1:

- "aisles" was pronounced "isels" → use "rows" in supermarket dialogue.
- "That's five forty two aisles over" ran together as "five forty-two" →
  never let a number butt against another number/quantity; break the
  sentence: "That's five forty. You'll find it on sale two rows over."
- Write money and quantities as words ("five forty", "twelve dollars under"),
  not digits.

Keep the AI-assistant voice likable: it reports and helps; the human gets the
reactions and the laughs. (User feedback replaced the AI's smug "You're
welcome" with the human laughing "Thank you.")

## Step 1 — Check the workflow catalog, then go manual

Call `get_workflow_instructions` (no args) per the MCP's contract. As of July
2026 the catalog has no cinematic product-ad flow (`tv-ad` is referenced but
not loadable), so this shot-by-shot pipeline is the way. Re-check the catalog
each time — if a real ad workflow appears, weigh it against this pipeline.

## Step 2 — Cast the lead (identity anchor)

Generate ONE reference portrait with `soul_2`, 9:16: age, hair, wardrobe,
one distinctive accessory (e.g. a single white earbud — it explains who the
AI voice talks through), lighting mood. Save the job ID; every human shot
derives from it. Distinctive-but-simple wardrobe keeps identity stable
across scenes.

## Step 3 — Start frames (one per shot)

Generate each shot's first frame with `nano_banana_2`, 9:16, passing the
actress reference in `medias` (role `image`). Prompt pattern:
"Same woman from the reference photo, cinematic vertical film still: <scene,
pose, expression, lighting>". This is what makes a 7-shot ad hold one actress
— Kling only accepts a start frame, so identity must be baked in here.

**Screens and product UI must come from a real asset, never imagination.**
If a shot shows the product's screen/UI, get the real image: check
`show_medias` for a recent user upload (they drop files like
"os1 voice hero.webp" into their library), or ask them to upload via
`media_upload_widget`. Pass it as a second reference with prompt language
like "the phone's screen displays EXACTLY the interface in the second
reference image — reproduce it faithfully". Warn the user that reproduction
is close but not pixel-perfect; frame-accurate branding needs a compositing
pass in an editor.

End cards: product device on a background matched to the brand color, real
UI on screen, wordmark + tagline below, and instruct "motion happens ONLY
inside the screen; text stays static and sharp".

## Step 4 — Animate with Kling 3.0 pro

`generate_video` with `model: kling3_0`, `mode: pro`, `sound: "on"`,
`aspect_ratio: "9:16"`, per-shot `duration`, and the start frame in `medias`
(role `start_image`). Put dialogue in quotes inside the prompt and describe
who speaks and how ("warm female AI voice says dryly in her earbud: …",
"she laughs and says: …"), plus ambience (store noise, receipt printer,
soft synth when the AI speaks).

**Door/entrance geography:** Kling reliably scrambles spatial continuity on
any shot where someone enters or exits a building — doors flip orientation,
people walk out and back in. On entrance/exit shots, always lock the
blocking in the prompt: state the camera position explicitly ("locked-off
camera on the sidewalk facing the doors"), give ONE walk direction for the
whole shot ("she walks TOWARD the camera for the entire shot"), and forbid
the failure mode outright ("she never turns around, the door geometry never
changes"). Both such shots in one production needed this fix.

**Preset interception:** these prompts often trigger a
`preset_recommendation` notice (e.g. "IN THE DARK") instead of a job. The
user wants literal generation — immediately retry the identical call with
`declined_preset_id` set to the offered preset id.

Launch all shots in parallel; Kling pro takes 5-10 minutes. Poll with
`job_display`. Never busy-wait: use a background `sleep` via Bash
`run_in_background` plus a ScheduleWakeup fallback, and cancel the wakeup
(`stop: true`) once delivered.

## Step 5 — Assemble

`explainer_video` with the clips in play order (`items: [{video: job_id}]`,
NO `audio` field — omitting it keeps each clip's native dialogue), width and
height from the clips (Kling pro outputs 1080×1920). Assembly is free and
takes ~1-2 minutes.

## Step 6 — Review loop: surgical re-rolls only

When the user flags a problem ("at 21 seconds she says…"), map the timestamp
to its shot via the cumulative durations, re-roll ONLY that shot — same
start frame, same model settings, corrected prompt — then re-assemble. Never
regenerate untouched shots; every re-roll risks losing a take the user
already approved. After each new cut, append the version, changed job IDs,
and one-line reason to the manifest doc and commit.

## Step 7 — Finish

On approval: `upscale_video` with `provider: bytedance`,
`preset: "aigc"` (built for AI-generated footage), `resolution: "4k"`,
source `width`/`height` required (1080/1920), fps 30. Record the 4K job ID
as the delivery master in the manifest.

## Delivering results to the user

`job_display` renders an inline player — that is the primary delivery. The
sandbox proxy usually blocks the Higgsfield CDN (`*.cloudfront.net`), so do
NOT promise to attach the mp4; instead give the raw URL and point to the
Higgsfield app's generations history (newest video, cite the job ID) as the
reliable download path. State plainly which shots changed and at what
timestamps — the user reviews by scrubbing.
