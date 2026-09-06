/**
 * Label Preflight & Barcode Quality Assurance Engine
 * Production-ready inspection for geometry boundaries, barcode standards,
 * XSS payload detection, thermal printhead resolutions, and contrast validation.
 */

import { LabelDocument, PreflightIssue, PreflightResult } from '../types';
import { getSymbologyById } from './barcodeCatalog';

export function runPreflight(doc: LabelDocument): PreflightResult {
  const errors: PreflightIssue[] = [];
  const warnings: PreflightIssue[] = [];
  const info: PreflightIssue[] = [];

  // 1. Media Specifications
  if (doc.width <= 10 || doc.height <= 10) {
    errors.push({
      type: 'error',
      message: `Label dimensions (${doc.width}x${doc.height} mm) are unusually small for standard thermal print media.`,
      suggestion: 'Verify media width and height in document settings.',
    });
  }

  // 2. Global Variable Security Audit (XSS Inspection)
  for (const [key, val] of Object.entries(doc.variables || {})) {
    if (/[<>&"']/.test(val)) {
      warnings.push({
        type: 'warning',
        message: `Variable "${key}" contains special markup characters (< > & " ').`,
        suggestion: 'Ensure variables injected into barcodes or text streams are properly sanitized for production export.',
      });
    }
  }

  // 3. Element-Level QA & Verification
  for (const obj of doc.objects) {
    if (obj.hidden) continue;

    // Geometric Boundary & Margin Checks
    if (obj.x < 0 || obj.y < 0) {
      warnings.push({
        type: 'warning',
        objectId: obj.id,
        objectName: obj.name,
        message: `Object "${obj.name}" has negative coordinates (${obj.x.toFixed(1)}, ${obj.y.toFixed(1)} mm).`,
        suggestion: 'Move object onto printable canvas surface.',
      });
    }

    if (obj.x + obj.width > doc.width + 0.5 || obj.y + obj.height > doc.height + 0.5) {
      errors.push({
        type: 'error',
        objectId: obj.id,
        objectName: obj.name,
        message: `Object "${obj.name}" extends beyond the label edge (${(obj.x + obj.width).toFixed(1)} > ${doc.width} mm). Content will be clipped.`,
        suggestion: 'Resize or reposition the object inside the label boundaries.',
      });
    }

    // Thermal Margin Violation
    if (
      obj.x < doc.margins.left ||
      obj.y < doc.margins.top ||
      obj.x + obj.width > doc.width - doc.margins.right ||
      obj.y + obj.height > doc.height - doc.margins.bottom
    ) {
      warnings.push({
        type: 'warning',
        objectId: obj.id,
        objectName: obj.name,
        message: `Object "${obj.name}" infringes on printer non-printable uncalibrated margin tolerances.`,
        suggestion: `Keep objects inside margin safe zone (${doc.margins.left}mm left, ${doc.margins.top}mm top).`,
      });
    }

    // Barcode Symbology Rules
    if (obj.type === 'barcode') {
      const sym = getSymbologyById(obj.symbologyId);
      const data = obj.data.trim();

      if (!data) {
        errors.push({
          type: 'error',
          objectId: obj.id,
          objectName: obj.name,
          message: `Barcode "${obj.name}" has empty data payload.`,
          suggestion: 'Provide literal data or link a variable field.',
        });
        continue;
      }

      // XSS payload detector
      if (/<[^>]*>|javascript:|onerror=/i.test(data)) {
        warnings.push({
          type: 'warning',
          objectId: obj.id,
          objectName: obj.name,
          message: `Barcode "${obj.name}" payload contains HTML/script patterns. Sanitization is active.`,
          suggestion: 'Remove HTML or script syntax from raw barcode data.',
        });
      }

      // EAN-13 & JAN-13
      if (sym.id === 'ean13' || sym.id === 'jan13') {
        const digits = data.replace(/\D/g, '');
        if (digits.length < 12 || digits.length > 13) {
          errors.push({
            type: 'error',
            objectId: obj.id,
            objectName: obj.name,
            message: `EAN-13 / JAN-13 requires exactly 12 or 13 numeric digits. Found ${data.length}.`,
            suggestion: 'Enter 12 digits (check digit will auto-calculate) or 13 digits.',
          });
        }
      }
      // Dedicated EAN-8 & JAN-8
      else if (sym.id === 'ean8' || sym.id === 'jan8') {
        const digits = data.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 8) {
          errors.push({
            type: 'error',
            objectId: obj.id,
            objectName: obj.name,
            message: `EAN-8 / JAN-8 requires exactly 7 or 8 numeric digits. Found ${data.length}.`,
            suggestion: 'Enter 7 digits (checksum auto-calculated) or full 8 digits.',
          });
        }
      }
      // Dedicated UPC-A
      else if (sym.id === 'upca') {
        const digits = data.replace(/\D/g, '');
        if (digits.length < 11 || digits.length > 12) {
          errors.push({
            type: 'error',
            objectId: obj.id,
            objectName: obj.name,
            message: `UPC-A requires 11 or 12 numeric digits. Found ${data.length}.`,
            suggestion: 'Enter 11 digits (checksum auto-calculated) or full 12 digits.',
          });
        }
      }
      // Dedicated UPC-E
      else if (sym.id === 'upce') {
        const digits = data.replace(/\D/g, '');
        if (digits.length < 6 || digits.length > 8) {
          errors.push({
            type: 'error',
            objectId: obj.id,
            objectName: obj.name,
            message: `UPC-E requires 6, 7, or 8 numeric digits. Found ${data.length}.`,
            suggestion: 'Enter 6 zero-suppressed digits or 8 full digits.',
          });
        }
      }
      // Interleaved 2 of 5 & ITF-14
      else if (sym.id === 'interleaved2of5' || sym.id === 'itf14' || sym.id === 'dun14') {
        if (!/^\d+$/.test(data.replace(/[\s-]/g, ''))) {
          errors.push({
            type: 'error',
            objectId: obj.id,
            objectName: obj.name,
            message: `ITF / Interleaved 2 of 5 only accepts numeric digits (0-9).`,
            suggestion: 'Remove non-numeric characters from the barcode payload.',
          });
        }
      }
      // Code 39
      else if (sym.id === 'code39') {
        const invalidChars = data.toUpperCase().replace(/[0-9A-Z\-.$ /+%]/g, '');
        if (invalidChars.length > 0) {
          errors.push({
            type: 'error',
            objectId: obj.id,
            objectName: obj.name,
            message: `Code 39 (Regular) contains invalid characters: "${invalidChars}".`,
            suggestion: 'Use Code 39 Full ASCII or restrict to A-Z, 0-9, and standard symbols.',
          });
        }
      }
      // Codabar
      else if (sym.id === 'codabar') {
        const invalidChars = data.toUpperCase().replace(/[0-9\-$:/.+ABCD]/g, '');
        if (invalidChars.length > 0) {
          errors.push({
            type: 'error',
            objectId: obj.id,
            objectName: obj.name,
            message: `Codabar contains invalid characters: "${invalidChars}".`,
            suggestion: 'Codabar only accepts 0-9, -$:/+ and start/stop characters A, B, C, D.',
          });
        }
      }
      // USPS Postal
      else if (sym.id === 'usps-imb' || sym.id === 'usps-onecode') {
        const digitsOnly = data.replace(/\D/g, '');
        if (![20, 25, 29, 31].includes(digitsOnly.length)) {
          warnings.push({
            type: 'warning',
            objectId: obj.id,
            objectName: obj.name,
            message: `USPS Intelligent Mail Barcode typically expects 20, 25, 29, or 31 digits. Found ${digitsOnly.length}.`,
            suggestion: 'Check tracking code + routing ZIP code lengths per USPS standard.',
          });
        }
      }

      // Minimum height check for laser/imager scanning
      if (obj.height < 6) {
        warnings.push({
          type: 'warning',
          objectId: obj.id,
          objectName: obj.name,
          message: `Barcode height (${obj.height} mm) is under recommended 6 mm for industrial scanning.`,
          suggestion: 'Increase barcode height to improve first-pass scan rate.',
        });
      }
    }

    // 2D QR / DataMatrix resolution tolerances
    if (obj.type === 'qrcode' || obj.type === 'datamatrix') {
      if (obj.width < 8 || obj.height < 8) {
        warnings.push({
          type: 'warning',
          objectId: obj.id,
          objectName: obj.name,
          message: `2D symbol "${obj.name}" (${obj.width}x${obj.height} mm) may be difficult to scan on lower resolution (203 DPI) thermal printheads.`,
          suggestion: 'Recommended minimum size for 2D symbols is 10x10 mm on 203 DPI printers.',
        });
      }
    }

    // Text object validation
    if (obj.type === 'text') {
      if (!obj.text.trim()) {
        warnings.push({
          type: 'warning',
          objectId: obj.id,
          objectName: obj.name,
          message: `Text element "${obj.name}" is empty.`,
          suggestion: 'Provide label text or remove unused element.',
        });
      }

      // Minimum font size for thermal ribbon
      if (obj.fontSize < 4) {
        warnings.push({
          type: 'warning',
          objectId: obj.id,
          objectName: obj.name,
          message: `Font size (${obj.fontSize} pt) on "${obj.name}" is below 4 pt thermal printhead legibility threshold.`,
          suggestion: 'Increase font size to 5 pt or above to ensure crisp thermal transfer.',
        });
      }

      // Contrast rule: dark text on dark fill
      if (obj.color === '#000000' && doc.backgroundColor === '#000000') {
        errors.push({
          type: 'error',
          objectId: obj.id,
          objectName: obj.name,
          message: `Black text "${obj.name}" on black canvas background is invisible.`,
          suggestion: 'Change text color or label background color.',
        });
      }
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    info.push({
      type: 'info',
      message: 'All elements conform to thermal print layout standards and boundary tolerances.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}
