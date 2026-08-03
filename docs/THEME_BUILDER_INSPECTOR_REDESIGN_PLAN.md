# Theme Builder Inspector Redesign Plan

## Status

Planning only. This document does not change the builder implementation.

## Context

The right-side inspector currently mixes several levels of configuration in one
vertical stream:

1. Canvas controls are always rendered first.
2. The selected node header is rendered below the canvas controls.
3. Transform controls are rendered for every selected node.
4. Text controls are rendered for editable text nodes.
5. Button, media, QR, countdown, grid, and appearance controls are appended
   after the generic controls.
6. Technical data, such as semantic roles, SVG, custom fonts, and schema data,
   is displayed close to normal design controls.

This makes the panel difficult to scan. A SaaS user should not need to
understand the internal node type or Flutter binding model before editing a
button label, image, color, or position.

## Current Implementation Map

- Inspector shell: `features/builder/components/visual-properties-sidebar.tsx`
- Node property routing: `features/builder/components/visual-properties-panel.tsx`
- Canvas controls: `features/builder/components/visual-canvas-controls.tsx`
- Shared collapsible section: `features/builder/components/visual-properties-primitives.tsx`
- Transform controls: `features/builder/components/properties/visual-transform-properties.tsx`
- Text controls: `features/builder/components/properties/visual-text-properties.tsx`
- Button controls: `features/builder/components/properties/visual-button-properties.tsx`
- Media controls: `features/builder/components/visual-media-properties.tsx`
- Background removal/color key: `features/builder/components/color-key-controls.tsx`
- Responsive bottom sheet: `features/builder/shared/builder-responsive-workspace.tsx`

## Design Principles

### 1. Progressive disclosure

Show the common design decisions first. Keep technical or infrequent controls
behind an `Advanced` section.

### 2. One context at a time

Do not show Canvas settings and Node settings as two long sections at once.
The inspector should have an explicit context switch.

### 3. User language first

Use labels such as `Button label`, `Action`, `Text color`, and `Position`.
Keep internal terms such as `semanticRole`, node IDs, and Flutter bindings in
Advanced settings.

### 4. Preserve the current contract

This redesign should only reorganize the inspector UI. Existing node property
names, default values, upload paths, and rendering behavior must remain
unchanged.

## Proposed Inspector Structure

### No node selected: Canvas context

```text
PROPERTIES
Canvas
Device | Background | Motion

[active tab content]
```

Canvas sections:

- `Device`: preset, orientation, width, height.
- `Background`: current page background, replace/upload, remove asset, URL,
  and image tools.
- `Motion`: page transition, duration, and animation curve.

### Node selected: Node context

```text
PROPERTIES
< back to Canvas       BUTTON
Continue button                    ...
Button

Content | Style | Layout | Advanced

[active tab content]
```

The header should display a friendly name and a small node type label. The raw
node ID should move to Advanced settings.

## Node Tabs

### Content

Content is what the user wants the node to say or do.

- Text node: text content and `Edit on canvas` action.
- Button: button label and action/semantic intent.
- Image/media: upload, replace, source URL, and media type warning.
- QR: link/share behavior and QR-specific user-facing options.
- Countdown: label, global/device value, and override duration.
- Template grid: sample count and data/layout intent.
- Photo result: sample photo count and result layout intent.

### Style

Style controls the visual treatment.

- Typography: font family, size, weight, letter spacing, line height.
- Text alignment and bold/italic/underline.
- Text, background, QR, and card colors.
- Radius, opacity, object fit, and button design.
- Icon appearance and position.
- Template and photo-result visual colors.

### Layout

Layout controls placement and size.

- X and Y position.
- Width and height.
- Aspect-ratio lock.
- Rotation.
- Opacity if it is not placed in Style.
- Future alignment presets can be added here without changing the node
  contract.

The `Edit text on canvas` action must move out of Transform and into Content.

### Advanced

Advanced is collapsed by default and contains implementation-sensitive options:

- Flutter semantic role/binding.
- Custom font import and loaded custom font list.
- Source URL when it is not part of the normal media workflow.
- Raw SVG markup.
- Color-key technical settings when the user needs precise control.
- Node ID and other diagnostics.

## Button-Specific Layout

Button properties should no longer appear as a separate block below Text.
They should be distributed as follows:

```text
Content
- Button label
- Action / intent
- Edit on canvas

Style
- Solid color or custom image
- Text color
- Radius
- Typography
- Icon and icon position

Layout
- X, Y, W, H, rotation, opacity

Advanced
- Semantic role
- Raw SVG markup
- Source URL and upload diagnostics
```

The existing node properties (`label`, `semanticRole`, `src`, `iconSvg`,
`iconPosition`, etc.) remain unchanged.

## Background and Remove Background

There are two different actions that must not share the same label:

1. Removing the page background asset.
2. Removing a color from an image using color-key processing.

### Page background asset

In `Canvas > Background`:

```text
Background
Current background preview

[ Replace ] [ Remove ]
```

`Remove` clears the current page image/video through the existing
`setPageBackground` behavior.

### Image color-key tool

The current `Remove background` component is a color-key tool, not a full
background segmentation feature. It should be renamed and contextualized:

```text
Image tools

[ ] Remove a color from image

Color to remove
[ color input ] [ hex input ] [ eyedropper ]

Cleanup strength
-------------- slider

Applied permanently when the theme is saved.
```

Rules:

- Show it only for a usable image source, never for video.
- Keep it collapsed or disabled by default.
- Make the enable state explicit before exposing color and cleanup controls.
- Use `Remove a color from image` instead of `Remove background` to avoid
  confusing it with deleting the page background.
- Preserve the existing `colorKey` property and bake-on-save behavior.

The same contextual image tool can be reused for media nodes and custom button
images where the current node contract supports `colorKey`.

## Inspector Header Actions

The header should contain:

- A back/context button to return to Canvas.
- Friendly node name.
- Small node type label.
- Duplicate action.
- A compact overflow menu for diagnostics and less frequent actions.
- Delete action with destructive styling and confirmation if needed.

The header should remain visible while the tab content scrolls.

## Component Plan

### Phase 1: Inspector shell

Update `visual-properties-sidebar.tsx` and
`visual-properties-primitives.tsx`:

- Add `InspectorContext` state: `canvas` or `node`.
- Add context header and tab primitives.
- Add sticky inspector header.
- Add empty state for no selection.
- Keep the existing schema/debug section behind a developer-only disclosure.

### Phase 2: Property routing

Update `visual-properties-panel.tsx`:

- Accept the active inspector tab.
- Route existing controls into Content, Style, Layout, and Advanced.
- Render only one tab content at a time.
- Keep node-specific components mounted only when their relevant tab is active
  where safe, or preserve local state if a component requires it.

### Phase 3: Split existing property components

Refactor existing components with a small `section` prop or focused child
components rather than duplicating update logic:

- `visual-text-properties.tsx`: content, typography/style, custom font/
  semantic advanced.
- `visual-button-properties.tsx`: content action, style, advanced binding/SVG.
- `visual-media-properties.tsx`: content/upload, style/object fit, image tools.
- `visual-transform-properties.tsx`: layout only.
- Countdown/QR/grid/photo-result controls: map their existing controls into
  the new tabs.

### Phase 4: Canvas controls

Update `visual-canvas-controls.tsx`:

- Split current Canvas section into Device, Background, and Motion tabs.
- Move page background removal into the Background tab.
- Keep URL/upload behavior unchanged.
- Reuse the updated color-key treatment only for image sources.

### Phase 5: Responsive behavior

Update `builder-responsive-workspace.tsx`:

- Use the same inspector context and tab model in desktop and bottom-sheet
  modes.
- Keep the drag-to-resize behavior.
- Keep the inspector header and tabs visible while the sheet content scrolls.
- Ensure the bottom sheet does not render Canvas and Node content together.

## Accessibility and Interaction Requirements

- Tabs use `role="tablist"`, `role="tab"`, and `aria-selected`.
- The active tab has a visible focus state.
- Every icon-only action has an accessible label.
- Destructive actions are visually separated from normal editing controls.
- Inputs must retain the current keyboard behavior and value update paths.
- Tab changes must not change the selected node or canvas data.

## Validation Plan

### Node coverage

- Text.
- Button.
- Image and video media.
- QR, QR link, and QR placeholder.
- Countdown variants.
- Template grid.
- Photo result.
- Background/canvas with and without an asset.

### Interaction coverage

- Select and deselect a node.
- Switch Canvas and Node context.
- Switch every node tab.
- Edit text on canvas.
- Upload and replace media.
- Remove page background asset.
- Enable color-key removal and change color/tolerance.
- Duplicate and delete a node.
- Save, autosave, load, and publish a theme.

### Responsive coverage

- Desktop right sidebar.
- Tablet portrait builder bottom sheet.
- Touch tab switching.
- Drag-to-resize sheet.
- Keyboard focus and scrolling inside the inspector.

### Commands

```bash
npx eslint features/builder
npx tsc --noEmit
git diff --check
```

If a property contract or default is changed during implementation, perform a
web/Flutter parity review before merging. A UI-only reorganization should not
require Flutter changes.

## Acceptance Criteria

- Canvas controls and selected-node controls are never shown as one long stack.
- A user can find button label editing without opening Transform or knowing
  the internal node type.
- A user can find position and size under Layout.
- Common visual controls are visible under Style without exposing technical
  bindings.
- Advanced technical fields are hidden by default.
- Page background removal and image color removal have different labels and
  different visual actions.
- The same information hierarchy works on desktop and mobile builder modes.
- Existing saved themes round-trip without schema migration.
