POSKART Flutter → Visual Builder: Integration Brief
Below is the answer to every section of the builder prompt, grounded in the current code (lib). I'm flagging some mismatches between the builder spec and the actual Flutter app up front, then giving the YAML payload.

⚠️ Important deltas vs. the builder's assumptions
No LayoutSchema / Supabase integration exists yet. Grep for supabase, layout_schemas, or any HTTP/storage client returned zero matches in lib/. The Flutter app is 100% hard-coded flex layouts today. The overlay-renderer that consumes the JSON is work that still needs to be added.
Payment is NOT a ModalBottomSheet. It's a centered showGeneralDialog with a Material card constrained to maxWidth: 520, vertically centered, with a darkened barrier (#1B1B1B @ α 0.55). See payment_sheet.dart:17-44. The builder must model this as a centered dialog, not a bottom sheet, or we need to refactor Flutter to use a real bottom sheet.
There is an extra page the brief doesn't mention: /template (template picker between payment and camera). It introduces new semantic roles (template.select, template.continue, template.back). See template_picker_page.dart.
Photo count is dynamic (1–5), driven by the selected template — not a fixed 3. See PoskartConstants.photoCount default (constants.dart:8) and resetWithCount(template.photoCount) in template_picker_page.dart:21-25.
Orientation is not locked to landscape. All four orientations are allowed in kiosk_chrome.dart:6-12, although the design assumes landscape. The builder should pick a landscape canvas; for kiosk we should also lock the app to landscape only.
Landing has no "Start Session" button widget. The entire Scaffold body is a GestureDetector — the whole screen is the hit target (landing_page.dart:80-82). So landing.start_session should be either a fullscreen hotspot or a placeable rect that the builder pins anywhere.
AirmailBorder adds a 28px padded inset on every page (airmail_border.dart:14-31). Coordinates in the JSON must be in absolute screen logical pixels — i.e. the renderer should NOT re-apply that inset to incoming nodes; nodes are placed on top of the airmail border, not inside its padding.
Coordinates I list below are computed from flex layouts for a canonical canvas of 1280 × 800 (landscape, typical 10″ tablet). On a different device the layout reflows — that's exactly why we want builder-driven absolute coordinates and a Stack+Positioned overlay renderer instead.
Flutter overlay rendering contract (proposed)
To consume the LayoutSchema, Flutter will need a new feature, e.g. features/layout_overlay/, that:

Fetches the active schema from Supabase (layout_schemas where is_active = true), caches it locally.
Wraps each page body in LayoutBuilder → Stack with Positioned(left: node.x * scaleX, top: node.y * scaleY, width: node.width * scaleX, height: node.height * scaleY), where scaleX = MediaQuery.size.width / canvas.width and the same for Y (or min(scaleX, scaleY) if we want to letterbox).
Renders pageBackgrounds[page] (image/video) as the bottom layer.
For each node, looks up props.semanticRole in a Map<String, VoidCallback> registered by the page → renders a transparent GestureDetector at that rect when props.background == "transparent", or a styled button when not.
For payment nodes (and the payment background), the overlay should render inside the dialog content if coordinates_relative_to: modal, or skip the background image (because the dialog is small + has its own paper card) and just position the modal itself on the screen.
Recommendation: use coordinates_relative_to: screen everywhere for simplicity — the builder shows the modal as a ghosted reference rectangle on top of the camera/landing background, and Flutter just renders the dialog centered on screen but routes hotspot taps by absolute screen coords. Either choice works; pick one and we'll mirror.

YAML payload (canonical canvas 1280 × 800 landscape)
yaml
device_targets:
  # The app currently has no device-specific assets. Use the design canvas
  # 1280x800 as the canonical target; everything reflows via scaleX/scaleY
  # from MediaQuery.
  - name: "Design canvas (recommended canonical)"
    logical_width: 1280
    logical_height: 800
    dpr: 2.0
    default_orientation: landscape
    flutter_target_platform: android
  - name: "Redmi Pad 2"
    logical_width: 1280   # 2560 physical / 2.0 dpr
    logical_height: 800   # 1600 physical / 2.0 dpr
    dpr: 2.0
    default_orientation: landscape
    flutter_target_platform: android
  - name: "iPad (10th gen)"
    logical_width: 1180
    logical_height: 820
    dpr: 2.0
    default_orientation: landscape
    flutter_target_platform: ios

# Global chrome layered on every page.
chrome:
  airmail_border:
    thickness_px: 28        # AirmailBorder default
    background_color: "#F5F1E8"
    note: |
      The airmail border is drawn by Flutter (CustomPainter), not by the
      builder. The builder should leave a 28px gutter on all sides when
      placing hotspots, OR rely on the renderer to letterbox the overlay
      inside the bordered area. Coordinates below are ABSOLUTE SCREEN
      logical pixels (including the 28px border).
  scaffold_background_color: "#F5F1E8"
  paper_color: "#FAF8F2"

pages:

  landing:
    background: solid_color   # currently #FAF8F2 paper card on cream scaffold;
                              # no image/video. Builder can later override with
                              # pageBackgrounds.landing.image / .video.
    fullscreen_tappable: true # The entire screen is one GestureDetector that
                              # opens the payment dialog (see _start()).
    elements:
      - id: start_session_hotspot
        type: hotspot
        semantic_role: landing.start_session
        x: 0
        y: 0
        width: 1280
        height: 800
        note: |
          Whole-screen tap. The "Click anywhere to start!" text at
          (60, 752 .. ~92, 776) is informational only.
      # Decorative-only (NOT interactive):
      - id: stamp_top_left
        type: decoration
        x: 52        # 28 border + 24 inset
        y: 52
        width: 180
        height: 130
      - id: stamp_bottom_right
        type: decoration
        x: 1058      # 1280 - 28 - 36 - 150 ≈ 1066, +rotation slop
        y: 569
        width: 150
        height: 175
      - id: poskart_title_center
        type: decoration
        x: 0
        y: 0
        width: 1280
        height: 800
        note: "Logo is centered via Center() — no fixed rect."

  payment:
    modal_type: centered_dialog       # NOT a bottom_sheet (see deltas above).
    modal_dismissible: false          # barrierDismissible: false
    barrier_color: "#1B1B1B"
    barrier_opacity: 0.55
    modal_height_ratio: null          # intrinsic height (mainAxisSize.min)
    modal_height_px_approx: 600       # measured from the column at design size
    modal_width_max_px: 520
    modal_border_radius: 20
    modal_background: "#FAF8F2"
    # The dialog is Center()-ed, so the rect on a 1280x800 canvas is:
    modal_rect:
      x: 380       # (1280 - 520) / 2
      y: 100       # (800 - 600) / 2
      width: 520
      height: 600
    coordinates_relative_to: screen   # builder + Flutter both use absolute
                                      # screen pixels; the dialog is drawn at
                                      # modal_rect and hotspots are placed
                                      # over it.
    background_behind_modal_visible: true   # landing paper card stays visible
                                            # behind the barrier.
    elements:
      - id: qr_display
        type: qr-placeholder
        semantic_role: payment.qr_display
        x: 530       # modal.x (380) + padding 32 + qr inner pad 14 + slight indent
        y: 360
        width: 220
        height: 220
        note: |
          Real QRIS payload generated by qr_flutter from
          'qris://poskart/pay/<sessionId>?amount=25000'. Builder should
          render a placeholder; Flutter will overlay the real QR widget.
      - id: amount_label
        type: text
        x: 380
        y: 295
        width: 520
        height: 60
        text_value: "Rp 25.000"
      - id: confirm_button
        type: button
        semantic_role: payment.confirm
        x: 776       # right edge of dialog - 32 padding - 96 button
        y: 580       # near bottom of dialog
        width: 96
        height: 96
        label: "Sudah Bayar"
      - id: cancel_button
        type: button
        semantic_role: payment.cancel
        x: 412       # left edge + 32 padding
        y: 608
        width: 86
        height: 52
        label: "Batal"

  camera:
    photo_count_dynamic: true            # 1..5 depending on template
    default_photo_count: 3               # PoskartConstants.photoCount
    countdown_seconds: 3                 # PoskartConstants.captureCountdown
    flash_duration_ms: 220
    # Camera preview is inside a 4:3 AspectRatio card on the left flex=6 column.
    # Computed for the 1280x800 canvas with AirmailBorder(28) + outer
    # Padding(40,28,40,80) and a 36px column gap.
    camera_preview:
      # Outer postcard card (cream backing + 18px inner padding):
      card:
        x: 68
        y: 125
        width: 665
        height: 499
      # Inner CameraPreview area (what the camera widget actually fills):
      preview:
        x: 86
        y: 143
        width: 629
        height: 463
      aspect_ratio: "4:3"
      crop_strategy: "BoxFit.cover from controller.previewSize"
    countdown_overlay_rect:
      # CountdownOverlay is positioned to fill the camera preview rect.
      x: 86
      y: 143
      width: 629
      height: 463
    flash_overlay_rect:
      x: 86
      y: 143
      width: 629
      height: 463
    elements:
      - id: shutter_button
        type: button
        semantic_role: camera.take_photo
        x: 915       # right column center (769 + (443-150)/2)
        y: 299       # vertical center of right column (374) - 75
        width: 150
        height: 150
        label: "Take Photo"
        enabled_when: "cameraReady && !countingDown && !session.isComplete"
      - id: continue_button
        type: button
        semantic_role: camera.continue
        x: 935       # roughly centered below slots, only visible when complete
        y: 590
        width: 110
        height: 110
        label: "Lanjutkan"
        visible_when: "session.isComplete"
        note: |
          Y depends on number of slots (Wrap of 1..5). 590 is an
          approximation for the 3-photo template. Layout reflows; expose
          this hotspot as a flex placeholder in the builder.
      - id: photo_slots
        type: dynamic_group
        semantic_role: camera.photo_slots
        x: 769       # right column.x
        y: 470       # below shutter + 28 gap
        width: 443
        height: ~140 # Wrap, 110px or 96px square slots depending on count
        per_slot_role: "camera.retake"   # tapping the X on a slot retakes it
        note: |
          Each slot has a small (X) delete handle in its top-right that
          maps to camera.retake on that slot index. The slot count is
          driven by the selected template at runtime.
      - id: photo_counter_label
        type: text
        x: 769
        y: 615
        width: 443
        height: 24
        text_value: "{filled}/{total} captured"
      - id: poskart_handle_label
        type: text
        x: 60        # 28 border + 32
        y: 744       # bottom: 28, height ~28
        width: 140
        height: 28
        text_value: "@poskart"

  preview:
    # Outer Padding(56, 40, 56, 40) inside AirmailBorder(28).
    # Header row eats ~72 px, then a Row(flex 6 : 4 with 24px gap).
    # Inner work area: (84, 68) .. (1196, 732) = 1112 × 664.
    # After header (+ 16 gap): top of body ≈ 156.
    frame_preview_area:
      # Left flex=6 column holds FittedBox(FrameTemplatePreview) + label row.
      x: 84
      y: 156
      width: 660
      height: 510
      crop_strategy: "BoxFit.contain"
    qr_panel:
      # Right flex=4 column holds the QR + 2 stamp buttons.
      x: 768
      y: 156
      width: 428
      height: 510
    elements:
      - id: download_qr
        type: qr-placeholder
        semantic_role: preview.qr_download
        x: 894       # qr_panel.x + (428-180)/2 - padding
        y: 250
        width: 180
        height: 180
        note: "Real QR built from session.shareUrl (https://poskart.app/s/<id>)."
      - id: print_button
        type: button
        semantic_role: preview.print
        x: 870
        y: 540
        width: 92
        height: 92
        label: "Print"
      - id: finish_button
        type: button
        semantic_role: preview.finish
        x: 978
        y: 540
        width: 92
        height: 92
        label: "Finish"
      # NOTE: there is currently NO "Share" or "Retake" button on the
      # preview page. Adding them is straightforward but they don't
      # exist today — mark these roles as "planned" in the builder.
    planned_elements:
      - id: share_button
        semantic_role: preview.share
        status: not_implemented
      - id: retake_button
        semantic_role: preview.retake
        status: not_implemented
        note: |
          Retake is currently done on the CAMERA page via per-slot X
          buttons, not on the preview page.

  template:
    # NEW page not in the original builder spec.
    # Outer Padding(56, 32, 56, 24) inside AirmailBorder(28).
    big_preview_area:
      x: 84
      y: 148
      width: 600
      height: 540
    template_grid:
      x: 712
      y: 148
      width: 484
      height: 540
      columns: 2
      tile_aspect_ratio: 0.92
      tile_count: "kFrameTemplates.length"
      per_tile_role: "template.select"
    elements:
      - id: continue_button
        type: button
        semantic_role: template.continue
        x: 1060
        y: 700
        width: 110
        height: 110
        label: "Lanjutkan"
      - id: back_button
        type: button
        semantic_role: template.back
        x: 84
        y: 720
        width: 110
        height: 36
        label: "Kembali"

  thanks:
    auto_redirect_seconds: 8              # PoskartConstants.thanksAutoReturn
    tap_to_skip: false
    # Outer Padding(0) but a horizontal Padding(64) + Row(flex 5:3, gap 32) inside.
    # Center column has the typography block; right column has the mini
    # FrameTemplatePreview (max 200 x 340).
    elements:
      - id: return_home_hotspot
        type: hotspot
        semantic_role: thanks.return_home
        # There's no visible button — the page auto-returns. If the
        # builder wants to add a manual return tap, allocate a hotspot.
        x: 0
        y: 0
        width: 1280
        height: 800
        status: planned
        note: |
          Currently no manual "Return to Home" button exists; the page
          relies entirely on the 8s auto-return Timer in
          @lib/features/thanks/thanks_page.dart:36-39. Recommend adding
          a visible StampButton if we want users to skip.
      - id: thanks_typography_block
        type: decoration
        x: 116
        y: 220
        width: 580
        height: 360
      - id: mini_template_preview
        type: decoration
        x: 880
        y: 230
        width: 200
        height: 340

semantic_role_mapping:
  # ✅ already wired in code; ❌ planned but not implemented.
  landing.start_session: "_start()  → showPaymentSheet → /template"   # ✅
  payment.confirm:       "Navigator.pop(true)  → /template"           # ✅
  payment.cancel:        "Navigator.pop(false) → stays on landing"    # ✅
  payment.qr_display:    "QrImageView(qrisPayloadPrefix/...)"         # ✅ (display only)
  template.select:       "selectedTemplateProvider.notifier.select"   # ✅ (NEW role)
  template.continue:     "_onContinue → /camera"                      # ✅ (NEW role)
  template.back:         "_onBack → /landing"                         # ✅ (NEW role)
  camera.take_photo:     "_onCapturePressed → countdown → _performCapture" # ✅
  camera.retake:         "sessionProvider.notifier.replaceAt(i, null)"     # ✅
                                                                            # (per-slot, not a single button)
  camera.continue:       "_onContinue → /preview"                     # ✅
  preview.print:         "_onPrint (SnackBar mock)"                   # ✅ (mocked)
  preview.finish:        "context.go(/thanks)"                        # ✅
  preview.qr_download:   "QrImageView(session.shareUrl)"              # ✅ (display only)
  preview.share:         "—"                                          # ❌ not implemented
  preview.retake:        "—"                                          # ❌ not implemented (slot-X on camera page does this)
  thanks.return_home:    "Timer(8s) → sessionProvider.reset + /landing" # ✅ (auto only, no button)

supabase:
  url: null            # not configured yet in the Flutter app
  anon_key: null
  table: "layout_schemas"
  active_filter: "is_active = true"
  status: NOT_INTEGRATED
  note: |
    No Supabase client (supabase_flutter) is currently in pubspec.yaml.
    To wire this up we need to:
      1. Add `supabase_flutter: ^2.x` to pubspec.yaml.
      2. Initialize in main.dart with the admin builder's project URL
         + anon key (same env as the admin, please confirm).
      3. Create features/layout_overlay/ with a Riverpod
         FutureProvider that fetches and caches the active LayoutSchema.
      4. Wrap each page's Scaffold body with a LayoutOverlayHost that
         consumes the schema and renders Positioned hotspots.

flutter_runtime:
  flutter_min_sdk: ^3.11.5      # from pubspec.yaml: environment.sdk
  android_min_sdk: 21
  package_id_android: "com.example.poskart_app"   # TODO before publish
  package_id_ios: "$(PRODUCT_BUNDLE_IDENTIFIER)"  # not yet customized
  orientation_lock: "all four orientations currently allowed (see kiosk_chrome.dart)"
  system_ui: "immersiveSticky"
  gestures_outside_buttons: "none (landing is the only fullscreen tap)"
  splash_screen: "default Flutter platform splash only — no custom widget"
Suggested follow-ups before the builder ships
Decide whether to refactor payment to an actual showModalBottomSheet (matches the builder's mental model and supports swipe-down dismiss), or keep the centered dialog and update the builder to render a "centered dialog" surface.
Lock the kiosk app to landscape only — edit kiosk_chrome.dart:7-12 to keep just landscapeLeft + landscapeRight.
Add supabase_flutter to pubspec.yaml and create features/layout_overlay/ (provider + LayoutOverlayHost widget). I can draft this in Code mode when you're ready — switch out of Ask mode and I'll implement.
Add the missing preview.share and preview.retake (or thanks.return_home) buttons if the builder expects them to be placeable. Otherwise tag them as status: not_implemented in the schema so the admin UI hides them.
Confirm the canonical canvas with the builder team — I used 1280×800 landscape. If they want a portrait-first canvas like 1080×1920 (per their JSON example), all the x/y/w/h above must be regenerated.
Let me know which of these you want me to actually implement, and switch to Code mode so I can edit files.
