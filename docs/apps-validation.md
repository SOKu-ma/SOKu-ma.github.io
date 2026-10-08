# Apps showcase validation

Validated on 2026-10-08. The showcase is static HTML/CSS/JavaScript served at `/apps/` by the existing GitHub Pages main/root deployment. No mobile app source, account permissions, or hosting configuration was changed.

## Automated and desktop checks

- Existing 10 Node state tests passed: regional language fallback, stable IDs and aliases, malformed query input, OS store priority, allowed HTTPS store hosts, image/copy fallback, source separation, and translated headings.
- Static build passed for 5 apps and 18 language/region choices. Runtime paths resolved under `/apps/`; all 43 unique CSS/JS/JSON/image references existed in source and build output.
- Mac Chrome: 5 source apps × 18 choices × 320/390/768/1440px, 360 cases. Each valid source appears once above four distinct other apps, without source-card store buttons. Unknown/empty/malformed sources show the full collection.
- Manual language changes preserve source/platform; Back/Forward follows the selected language. The all-apps link removes source only. Images, keyboard controls, reduced motion, and long copy were checked.
- The decorative hero arrow was changed from a font glyph to an aria-hidden, non-focusable SVG after Safari showed a missing-glyph symbol in English/Arabic. Its rendering and absence of page overflow were rechecked in Chrome across Japanese/English/Arabic and the four widths.

## Simulator and physical device

- iPhone 16e Simulator, iOS 26.3.1 Safari: actual Japanese/English/Arabic page rendering, RTL layout, source context, collection anchor, images, and the corrected SVG arrow were checked. URL navigation and screenshots were used; this does not establish manual touch/history/orientation behavior.
- Physical SO-53C, Android 14 Chrome: Japanese page, English/Arabic native language selection, Back, two source contexts (Starting XI and Batting Log), vertical scroll, gallery horizontal swipe, Google Play priority, Batting Log store destination, and return to Chrome were checked.
- The physical device's existing Chrome automatic translation affected some text. Those checks establish operation/layout; original translation wording was assessed separately in Safari and desktop Chrome. No browser preference was changed.
- The Android emulator's Chrome first-run agreement was not accepted. Physical-device testing used its separate existing browser session.
- Testing stopped when the physical device was used by another session; it resumed only after repeated read-only observations showed a stable, unlocked, inactive session. The temporary USB localhost forwarding was removed afterward. No install, uninstall, purchase, login, or debug-permission change was performed.

## Remaining limitations

- iPhone physical-device touch language selection, Back, orientation, and store taps need final user confirmation. Simulator input controls were unavailable through the computer-use surface.
- VoiceOver/TalkBack, Android landscape, every store link tapped on hardware, each region's purchase/install availability, and native-speaker proofreading of every UI translation were not verified.
- Store links and IDs were compared with official store data retrieved on 2026-10-07. DartLog has only the verified Google Play link; no unknown iOS listing is invented.

Production HTTP/assets and representative query behavior must also be checked after deployment; local checks alone do not prove CDN delivery.
