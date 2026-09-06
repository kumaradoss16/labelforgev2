# LabelForge Studio

Enterprise-grade label design, industrial barcode generation, and thermal print management platform designed for warehouse tablets, production cleanrooms, and desktop workstations.

![LabelForge Studio](public/favicon.svg)

## Overview

LabelForge Studio is a high-performance web-based software suite engineered to deliver BarTender-class label creation, compliance validation, and direct thermal printer stream generation without requiring legacy desktop installations or proprietary licensing dongles.

### Core Capabilities

- **84 Verified Symbologies**: Authentic 1D linear, 2D matrix (DataMatrix ECC 200, QR Code, Aztec, PDF417), GS1 Application Identifiers, Postal 4-State (USPS IMB, Postnet, Royal Mail), and retail standards (EAN-13, EAN-8, UPC-A, UPC-E) powered by BWIP-JS with defense-in-depth vector sanitization.
- **WYSIWYG Milimetric Canvas**: Exact physical millimeter dimensions, sub-millimeter snap-to-grid, physical rulers, interactive drag-handles, multi-layer ordering, and variable data interpolation.
- **Direct Thermal Drivers**: Native code generation for Zebra ZPL II (`^XA...^XZ`), TSC TSPL (`SIZE...PRINT`), and high-resolution raster PDF streams at 203, 300, and 600 DPI.
- **Built-in Quality Assurance Preflight**: Automated boundary collision checks, minimum thermal printhead scanning heights, barcode format digit validation, contrast checks, and script payload detection.
- **Production-Grade Resilience**: React error boundary with one-click workspace recovery, non-blocking toast messaging, strict TypeScript type safety, and zero external runtime dependencies on unsupported browser dialogs.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Delete` / `Backspace` | Delete selected element |
| `Escape` | Deselect active element |
| `Arrow Keys` | Nudge selected element by 1 mm |
| `Shift + Arrow Keys` | Nudge selected element by 5 mm |
| `Ctrl + Z` / `Cmd + Z` | Undo last change |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo change |
| `Ctrl + D` / `Cmd + D` | Duplicate selected element |
| `Ctrl + P` / `Cmd + P` | Open Print Dialog |

---

## Architecture & Technology Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript 5 (Strict Mode enabled)
- **Styling**: Tailwind CSS with custom enterprise industrial neutral theme (`#121214`, `#18181b`, `#27272a`, amber-500 accents)
- **Barcode & Vector Engine**: BWIP-JS vector generator with SVG sanitization and pure XML escaping
- **Typography**: Plus Jakarta Sans (UI labels) and JetBrains Mono (data payloads, coordinates, and raw driver streams)

---

## Development & Build

```bash
# Install dependencies
npm install

# Start local development server on port 3000
npm run dev

# Run strict TypeScript type-checking
npm run lint

# Build production distribution
npm run build
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
