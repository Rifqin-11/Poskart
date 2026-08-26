/**
 * Ready-to-paste prompt for AI design tools (Lovable, Stitch, v0, etc.).
 *
 * It describes every kiosk page in a Poskart theme, what each page does,
 * and which builder nodes are available — so users don't have to re-explain
 * the whole flow every time they brainstorm a new theme design.
 */
export const THEME_BRAINSTORM_PROMPT = `I'm designing a UI theme for "Poskart", a self-service photobooth kiosk app running on a tablet (default canvas 1280x800, landscape — portrait is also possible). Please help me brainstorm and mock up a cohesive visual theme (colors, typography, backgrounds, decorations, layout) across the following screens. The flow is: Landing → Tutorial (optional) → Template (frame picker) → Camera → Preview → Thanks.

=== PAGES & THEIR PURPOSE ===

1. LANDING
   - The idle/attract screen shown while waiting for customers.
   - Usually contains: big headline/branding text, a "Start" button, decorative background (image or video), social handle.
   - Goal: attract people to start a photo session.

2. TUTORIAL (optional, can be disabled)
   - Short how-to screen explaining the steps before starting.
   - Usually contains: step illustrations/text, a "Continue" button.

3. TEMPLATE (frame picker)
   - Customer picks a photo frame/template for their photos.
   - Usually contains: a grid/list of frame templates (template-list node), a large preview of the selected template (template-preview node), a confirm/next button, and a session countdown.

4. CAMERA
   - The live capture screen.
   - Usually contains: live camera view (camera-view node), capture countdown number (camera-timer), shot counter like "Photo 2 of 4" (camera-shot-counter), flash toggle (camera-flash), captured photo result slots (photo-result), session countdown.

5. PREVIEW
   - Customer reviews the final composed result before finishing.
   - Usually contains: final frame preview (frame-preview node), a photo/video toggle (preview-media-toggle), QR code to download the result (qr / qr-placeholder), receipt preview, confirm/finish button, session countdown.
   - A payment dialog (QRIS) may appear here as a centered modal with its own countdown (payment-countdown).

6. THANKS
   - Closing screen after the session ends.
   - Usually contains: thank-you message, QR code for downloading photos, social handle, and an auto-return countdown (return-countdown) that sends the kiosk back to Landing.

=== AVAILABLE NODES (building blocks I can place on each page) ===

Generic: text, image, button, background, background-decoration, social-handle
QR: qr, qr-link, qr-placeholder
Template page: template-list (grid of frames), template-preview (large selected-frame panel)
Camera page: camera-view (live feed), camera-timer (capture countdown), camera-shot-counter ("Photo X of Y"), camera-flash (flash toggle), photo-result (captured photo slots)
Preview page: frame-preview (final composed result), preview-media-toggle (photo/video switch), receipt-preview
Countdowns: session-countdown (total session time, shown on template/camera/preview/thanks), return-countdown (thanks page auto-return), payment-countdown (QRIS payment dialog)

=== THEME CAPABILITIES ===

- Per-page background image or video, plus a global background color.
- Custom fonts can be imported.
- Page transitions: fade / slide-horizontal / slide-vertical / zoom / none.
- Nodes support position, size, rotation, opacity, and z-index.

=== WHAT I NEED FROM YOU ===

Design a visually consistent theme concept across all 6 pages: propose a color palette, font pairing, background style/decoration ideas, and a layout mockup for each page using only the nodes listed above. Theme direction/mood: [DESCRIBE YOUR THEME HERE, e.g. "retro 90s arcade", "elegant wedding", "cute pastel"].`;
