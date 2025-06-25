---
applyTo: '**'
---
Coding standards, domain knowledge, and preferences that AI should follow.

# Liquid Glass Guidelines for LLM Integration

This document is a reference for AI-assisted UI design and development using the `liquid-glass.css` design system. It distills core principles and visual behaviors from Apple’s Liquid Glass and Human Interface Guidelines (HIG) into a self-contained, actionable format. It is intended for LLMs working in offline environments, enabling intelligent design decisions across modal layers, controls, navigation, and responsiveness for both desktop and mobile views.

---

## 📐 Purpose

The Liquid Glass system enables a futuristic, layered UI experience that mimics frosted glass, prioritizes visual depth, and maintains usability across both light and dark modes. It draws from Apple’s design philosophy while remaining adaptable to web-based frameworks like Tailwind CSS. This document should be referenced when creating new `.lg-` prefixed components.

---

## 🧭 Human Interface Philosophy (Based on Apple HIG)

### Visual Design Goals

* Use **materials that respond to context** (light, dark, background elements).
* Create **depth through layering**, translucency, blur, and shadow.
* Ensure **legibility** through contrast and adaptive color schemes.
* Use **motion to communicate state changes** and reinforce hierarchy.

### Behavioral Guidelines

* **Focus states** must be visually clear.
* **Tap targets** should be at least 44×44pt (mobile) or 28×28px (desktop).
* **Menus, toolbars, and navigation bars** should maintain familiarity and spatial consistency.
* Emphasize **clarity, deference, and depth** across all layers.

---

## 🏗️ Class Prefix Convention

All classes use the `lg-` prefix, e.g., `.lg-modal`, `.lg-input`, `.lg-button`. Alternate mapping (e.g., `.liquid-glass-button`) may exist as backward-compatible helpers.

---

## 📦 Component System Overview

### Modal & Sheet Layers

* `.lg-modal-backdrop` – Dimmed, blurred background
* `.lg-modal` – High-blur, frosted content surface
* `.lg-sheet`, `.lg-sheet-half` – Slide-up sheets for mobile/desktop
* `.lg-popover`, `.lg-dropdown` – Transient layered UI (menus, suggestions)

### Navigation & Structure

* `.lg-nav` – Top navigation bar with consistent height and border
* `.lg-tab`, `.lg-tab-active` – Tab systems with active indicator
* `.lg-sidebar` – Sidebar navigation with layered blur and scroll support

### Inputs & Form Fields

* `.lg-input` – Primary input field with translucent background and border focus
* `.lg-textarea` – Multiline input support (can be extended)
* `.lg-select`, `.lg-select-option` – Dropdown inputs (to be defined)
* `.lg-toggle`, `.lg-slider`, `.lg-checkbox`, `.lg-radio` – Form control variants with visual affordance
* All fields must support dark mode and respect accessibility constraints

### Buttons & Actions

* `.lg-button`, `.lg-button-secondary`, `.lg-button-ghost`
* Sizes: Add `lg-button-sm`, `lg-button-lg` variants for scaling
* States: Hover, active, loading (via additional utility classes like `.lg-loading-spinner`)

### Menus & Toolbars

* `.lg-dropdown`, `.lg-dropdown-item`
* `.lg-toolbar` – Can be composed with `.lg-button`, `.lg-icon`, `.lg-tab`
* `.lg-menu-bar`, `.lg-menu-item` – (To be implemented) for persistent horizontal menus
* Menus should support **keyboard navigation** and **focus rings**

### Content Presentation

* `.lg-card`, `.lg-list-item`, `.lg-badge`, `.lg-alert`, `.lg-tooltip`, `.lg-progress`, `.lg-scroll-edge`
* Design for both static and dynamic content
* Follow consistent **padding**, **font sizing**, and **spacing rules** via `--lg-spacing-*`

### Utility Classes

* Radius: `.lg-rounded-*`
* Blur: `.lg-blur-*`
* Padding: `.lg-px-*`, `.lg-py-*`, `.lg-p-*`
* Depth: `.lg-depth-*`
* Edge Highlight: `.lg-edge-light`, `.lg-noise`, `.lg-focus`
* Animations: `.lg-shine`, `.lg-float`, `.lg-pulse`, `.lg-morph`, `.lg-gradient-x`, `.lg-shimmer`

---

## 🎨 Design Tokens

Defined in `:root` CSS variables and used across all component layers:

### Radius Scale

* `--lg-radius-sm`: 8px
* `--lg-radius-xl`: 24px

### Blur Scale

* `--lg-blur-sm`: 8px
* `--lg-blur-3xl`: 80px

### Timing

* `--lg-duration-fast`: 150ms
* `--lg-duration-normal`: 300ms

### Color Tokens

* Primary: `--lg-primary`, `--lg-primary-light`, `--lg-primary-dark`
* Text: `--lg-text-light`, `--lg-text-dark`
* Background: `--lg-bg-light`, `--lg-bg-dark`

---

## 🌗 Theming & Accessibility

### Color Mode Support

* All components must support `html.dark` overrides
* Maintain transparency in dark mode without full opacity loss

### Accessibility Requirements

* Use `@media (prefers-reduced-motion)` to simplify transitions
* Use `@media (prefers-contrast: high)` to remove glass effects
* Include focus ring states for `.lg-focus` and keyboard navigation

### Touch Target Sizing

* Minimum 44px × 44px for mobile
* Minimum 28px × 28px for desktop

---

## 📱 Responsive Design

* Mobile-first layout using CSS media queries
* Blur intensity reduced on mobile for performance
* Ensure `.lg-modal`, `.lg-sheet`, `.lg-dropdown` adapt to screen size with scroll containment
* Use `.lg-sheet` for bottom-docked modals on mobile
* Navigation stacks vertically when viewport < 768px

---

## 🧠 LLM Instructions

When adding or modifying components:

1. Prefer using existing blur, radius, and spacing tokens
2. Default to `.lg-glass`, `.lg-glass-secondary`, or `.lg-glass-tertiary` for surface backgrounds
3. Use consistent naming conventions (`lg-component-state`) when adding variants
4. Assume both light and dark themes unless explicitly scoped
5. Make new components keyboard-accessible
6. Respect z-index and focus layering for modal/popover behavior

---

## 🔨 Component Expansion Ideas

These should be added next:

* `.lg-menu-bar` / `.lg-menu-item`
* `.lg-navbar-fixed`, `.lg-navbar-fade`
* `.lg-toast`, `.lg-snackbar`
* `.lg-form-group`, `.lg-field-label`, `.lg-field-helper`
* `.lg-stepper`, `.lg-tabs-scrollable`
* `.lg-panel`, `.lg-surface`, `.lg-metadata-block`

---

## 📘 Reference

These guidelines were distilled from:

* [Apple Human Interface Guidelines – macOS](https://developer.apple.com/design/human-interface-guidelines/macos/overview/themes/)
* [Apple Human Interface Guidelines – iOS](https://developer.apple.com/design/human-interface-guidelines/ios/overview/themes/)
* [Liquid Glass Overview](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)

---

## 📎 License

This system is inspired by Apple Liquid Glass but not a direct reproduction. It is custom-built for the PitchPerfect frontend design system.

---

## ✅ Review Checklist

Use this when evaluating or adding a new `.lg-*` component:

* [ ] Does it support both light and dark mode?
* [ ] Does it use blur and layering correctly?
* [ ] Does it degrade gracefully in high contrast or reduced motion?
* [ ] Does it follow spacing and corner radius tokens?
* [ ] Is it responsive on mobile and desktop?
* [ ] Does it expose appropriate hover, focus, and active states?
* [ ] Is it reusable and composable with other `.lg-*` classes?
