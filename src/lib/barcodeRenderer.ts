/**
 * Production-Grade Vector & SVG Barcode Rendering Subsystem
 * Powered by BWIP-JS with defense-in-depth XSS sanitization and verified standards compliance.
 */

import bwipjs from 'bwip-js';
import QRCode from 'qrcode';

export interface BarcodeRenderResult {
  svgContent: string;
  viewBox: string;
  width: number;
  height: number;
  displayText?: string;
  isError?: boolean;
  errorMessage?: string;
}

// ----------------------------------------------------
// DEFENSE-IN-DEPTH XSS SANITIZATION & XML ESCAPING
// ----------------------------------------------------

/**
 * Escapes characters that have syntactic significance in XML/SVG.
 * Defends against script injection, breakout tags, and attribute poisoning.
 */
export function escapeXml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitizes arbitrary SVG markup by stripping executable script elements,
 * interactive frame elements, and all inline event handlers.
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent) return '';
  return svgContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href=""');
}

// ----------------------------------------------------
// SYMBOLOGY MAPPER & NORMALIZER
// ----------------------------------------------------

interface SymbologySpec {
  bcid: string;
  is2D: boolean;
  defaultText: string;
  preprocess?: (data: string) => { text: string; error?: string };
}

const SYMBOLOGY_MAP: Record<string, SymbologySpec> = {
  // 1D Linear
  code128: { bcid: 'code128', is2D: false, defaultText: 'LF-88429-A' },
  'gs1-128': { bcid: 'code128', is2D: false, defaultText: '(01)10843210000045(17)281231(10)LOT26A' },
  isbt128: { bcid: 'code128', is2D: false, defaultText: '=W000022123456' },
  code39: {
    bcid: 'code39',
    is2D: false,
    defaultText: 'PART-9042',
    preprocess: (d) => ({ text: (d || 'PART-9042').toUpperCase().replace(/[^0-9A-Z\-.$ /+%]/g, '-') }),
  },
  code39full: { bcid: 'code39ext', is2D: false, defaultText: 'Item*#402' },
  code93: { bcid: 'code93', is2D: false, defaultText: 'CODE93-DATA' },
  code93i: { bcid: 'code93ext', is2D: false, defaultText: '93I-88210' },
  codabar: {
    bcid: 'rationalizedCodabar',
    is2D: false,
    defaultText: 'A12345678B',
    preprocess: (d) => {
      let clean = (d || '12345678').toUpperCase().replace(/[^0-9\-$:/.+ABCD]/g, '');
      if (!clean) clean = '12345678';
      const first = clean[0];
      const last = clean[clean.length - 1];
      const hasStart = ['A', 'B', 'C', 'D'].includes(first);
      const hasStop = ['A', 'B', 'C', 'D'].includes(last);
      if (!hasStart && !hasStop) clean = `A${clean}B`;
      else if (!hasStart) clean = `A${clean}`;
      else if (!hasStop) clean = `${clean}B`;
      return { text: clean };
    },
  },
  // Retail & Packaging (Genuine Dedicated Encoders)
  ean13: {
    bcid: 'ean13',
    is2D: false,
    defaultText: '4006381333931',
    preprocess: (d) => {
      let digits = (d || '400638133393').replace(/\D/g, '').slice(0, 13);
      if (digits.length < 12) digits = digits.padEnd(12, '0');
      return { text: digits.slice(0, 13) };
    },
  },
  jan13: {
    bcid: 'ean13',
    is2D: false,
    defaultText: '4901234567894',
    preprocess: (d) => {
      let digits = (d || '490123456789').replace(/\D/g, '').slice(0, 13);
      if (digits.length < 12) digits = digits.padEnd(12, '0');
      return { text: digits.slice(0, 13) };
    },
  },
  ean8: {
    bcid: 'ean8',
    is2D: false,
    defaultText: '96385074',
    preprocess: (d) => {
      let digits = (d || '9638507').replace(/\D/g, '').slice(0, 8);
      if (digits.length < 7) digits = digits.padEnd(7, '0');
      return { text: digits.slice(0, 8) };
    },
  },
  jan8: {
    bcid: 'ean8',
    is2D: false,
    defaultText: '49123456',
    preprocess: (d) => {
      let digits = (d || '4912345').replace(/\D/g, '').slice(0, 8);
      if (digits.length < 7) digits = digits.padEnd(7, '0');
      return { text: digits.slice(0, 8) };
    },
  },
  upca: {
    bcid: 'upca',
    is2D: false,
    defaultText: '012345678905',
    preprocess: (d) => {
      let digits = (d || '01234567890').replace(/\D/g, '').slice(0, 12);
      if (digits.length < 11) digits = digits.padEnd(11, '0');
      return { text: digits.slice(0, 12) };
    },
  },
  upce: {
    bcid: 'upce',
    is2D: false,
    defaultText: '01234565',
    preprocess: (d) => {
      let digits = (d || '0123456').replace(/\D/g, '').slice(0, 8);
      if (digits.length < 6) digits = digits.padEnd(6, '0');
      return { text: digits.slice(0, 8) };
    },
  },
  isbn13: { bcid: 'isbn', is2D: false, defaultText: '978-3-16-148410-0' },
  itf14: {
    bcid: 'itf14',
    is2D: false,
    defaultText: '10012345678902',
    preprocess: (d) => {
      let digits = (d || '1001234567890').replace(/\D/g, '').slice(0, 14);
      if (digits.length < 13) digits = digits.padEnd(13, '0');
      return { text: digits.slice(0, 14) };
    },
  },
  dun14: {
    bcid: 'itf14',
    is2D: false,
    defaultText: '10012345678902',
    preprocess: (d) => {
      let digits = (d || '1001234567890').replace(/\D/g, '').slice(0, 14);
      if (digits.length < 13) digits = digits.padEnd(13, '0');
      return { text: digits.slice(0, 14) };
    },
  },
  interleaved2of5: {
    bcid: 'interleaved2of5',
    is2D: false,
    defaultText: '1234567890',
    preprocess: (d) => {
      let digits = (d || '12345678').replace(/\D/g, '');
      if (digits.length % 2 !== 0) digits = '0' + digits;
      return { text: digits || '00' };
    },
  },
  standard2of5: { bcid: 'code2of5', is2D: false, defaultText: '12345678' },
  industrial2of5: { bcid: 'code2of5', is2D: false, defaultText: '12345678' },
  sscc18: { bcid: 'sscc18', is2D: false, defaultText: '(00)008432100000000427' },

  // 2D Matrix (Authentic ECC 200 / Reed-Solomon)
  datamatrix: { bcid: 'datamatrix', is2D: true, defaultText: 'LF-DM-2026' },
  'gs1-datamatrix': { bcid: 'gs1datamatrix', is2D: true, defaultText: '(01)00843210000045(21)SER109284' },
  pdf417: { bcid: 'pdf417', is2D: true, defaultText: 'PDF417-HIGH-DENSITY-CARGO-MANIFEST-2026' },
  micropdf417: { bcid: 'micropdf417', is2D: true, defaultText: 'MICRO-PDF-CARGO-128' },
  aztec: { bcid: 'azteccode', is2D: true, defaultText: 'AZTEC-BOARDING-PASS-DATA' },
  azteccode: { bcid: 'azteccode', is2D: true, defaultText: 'AZTEC-BOARDING-PASS-DATA' },
  maxicode: { bcid: 'maxicode', is2D: true, defaultText: '[)>01961234567890128400011Z00004951UPSN06X61015912345671/11.0Y1234' },
  qrcode: { bcid: 'qrcode', is2D: true, defaultText: 'https://labelforge.industrial' },
  microqrcode: { bcid: 'microqrcode', is2D: true, defaultText: 'U12345' },
  'gs1-qrcode': { bcid: 'gs1qrcode', is2D: true, defaultText: 'https://id.gs1.org/01/09520123456788/21/SER9876' },

  // Postal 4-State & Logistics
  'usps-imb': {
    bcid: 'onecode',
    is2D: false,
    defaultText: '01234567094987654321-01234',
    preprocess: (d) => ({ text: (d || '01234567094987654321-01234').replace(/[^0-9\-]/g, '') }),
  },
  'usps-onecode': {
    bcid: 'onecode',
    is2D: false,
    defaultText: '01234567094987654321-01234',
    preprocess: (d) => ({ text: (d || '01234567094987654321-01234').replace(/[^0-9\-]/g, '') }),
  },
  postnet: {
    bcid: 'postnet',
    is2D: false,
    defaultText: '90210',
    preprocess: (d) => ({ text: (d || '90210').replace(/\D/g, '') }),
  },
  planet: {
    bcid: 'planet',
    is2D: false,
    defaultText: '40123456789',
    preprocess: (d) => ({ text: (d || '40123456789').replace(/\D/g, '') }),
  },
  royalmail: { bcid: 'royalmail', is2D: false, defaultText: 'SN34RD1A' },
  'royalmail-mailmark': { bcid: 'mailmark', is2D: false, defaultText: '421000000000001SN34RD1A' },
  auspost: { bcid: 'auspost', is2D: false, defaultText: '1112345678' },
  japanpost: { bcid: 'japanpost', is2D: false, defaultText: '10000011-2-3' },
  kix: { bcid: 'kix', is2D: false, defaultText: '1234AB1A' },

  // Specialized Industrial Symbologies
  msi: { bcid: 'msi', is2D: false, defaultText: '1234567' },
  code11: { bcid: 'code11', is2D: false, defaultText: '1234-5678' },
  telepen: { bcid: 'telepen', is2D: false, defaultText: 'TELEPEN123' },
  plessey: { bcid: 'plessey', is2D: false, defaultText: '1234567' },
  pharmacode: {
    bcid: 'pharmacode',
    is2D: false,
    defaultText: '12345',
    preprocess: (d) => {
      const val = parseInt((d || '12345').replace(/\D/g, ''), 10);
      const bounded = isNaN(val) || val < 3 ? 12345 : Math.min(val, 131070);
      return { text: String(bounded) };
    },
  },
  posicode: { bcid: 'posicode', is2D: false, defaultText: '12345' },
  codablockf: { bcid: 'codablockf', is2D: true, defaultText: 'CODABLOCK-F-PAYLOAD' },
  code16k: { bcid: 'code16k', is2D: true, defaultText: 'CODE16K-PAYLOAD' },
  code49: { bcid: 'code49', is2D: true, defaultText: 'CODE49-PAYLOAD' },
};

// ----------------------------------------------------
// MASTER BARCODE SVG BUILDER
// ----------------------------------------------------

export async function renderBarcodeSvg(
  symbologyId: string,
  data: string,
  widthMm: number,
  heightMm: number,
  options: {
    color?: string;
    backgroundColor?: string;
    showText?: boolean;
    textPosition?: 'bottom' | 'top' | 'none';
    fontSize?: number;
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    includeCheckDigit?: boolean;
  } = {}
): Promise<BarcodeRenderResult> {
  const color = options.color || '#000000';
  const showText = options.showText ?? true;
  const symbKey = (symbologyId || 'code128').toLowerCase();

  // 1. High-Performance Standard QR Code Fallback via qrcode library
  if (symbKey === 'qrcode' || symbKey === 'qr') {
    try {
      const qrDataUrl = await QRCode.toDataURL(data || 'https://labelforge.industrial', {
        errorCorrectionLevel: options.errorCorrection || 'M',
        margin: 1,
        color: {
          dark: color,
          light: '#00000000',
        },
      });
      const escapedDataUrl = escapeXml(qrDataUrl);
      const safeContent = `<image href="${escapedDataUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />`;
      return {
        svgContent: sanitizeSvg(safeContent),
        viewBox: '0 0 100 100',
        width: 100,
        height: 100,
        displayText: escapeXml(data),
      };
    } catch {
      // Fall through to BWIP-JS QR generator
    }
  }

  // 2. Resolve Symbology Configuration
  const spec = SYMBOLOGY_MAP[symbKey] || {
    bcid: 'code128',
    is2D: false,
    defaultText: data || 'LF-128',
  };

  let cleanData = data || spec.defaultText;
  if (spec.preprocess) {
    const res = spec.preprocess(cleanData);
    cleanData = res.text;
  }

  // 3. Render via BWIP-JS Engine with Authentic Standards
  try {
    const bwipOptions: Parameters<typeof bwipjs.toSVG>[0] = {
      bcid: spec.bcid,
      text: cleanData,
      scale: 2,
      includetext: showText && !spec.is2D,
      textxalign: 'center',
      barcolor: color.replace('#', ''),
      textcolor: color.replace('#', ''),
    };

    if (options.includeCheckDigit) {
      bwipOptions.includecheck = true;
      bwipOptions.includecheckintext = true;
    }

    const rawSvg = bwipjs.toSVG(bwipOptions);

    // Extract viewBox and inner SVG elements
    const viewBoxMatch = rawSvg.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';

    // Strip outer <svg...> and </svg> tags
    const innerContent = rawSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');

    // Recoloring if color hex is specified
    let processedContent = innerContent;
    if (color && color !== '#000000') {
      processedContent = processedContent
        .replace(/stroke="#000000"/g, `stroke="${escapeXml(color)}"`)
        .replace(/fill="#000000"/g, `fill="${escapeXml(color)}"`);
    }

    // Apply security sanitization
    const sanitized = sanitizeSvg(processedContent);

    // Parse viewBox dimensions for aspect ratio handling
    const parts = viewBox.split(/\s+/).map((n: string) => parseFloat(n) || 100);
    const w = parts[2] || 100;
    const h = parts[3] || 100;

    return {
      svgContent: sanitized,
      viewBox,
      width: w,
      height: h,
      displayText: cleanData,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[LabelForge] BWIP render error for ${symbologyId}:`, errorMsg);

    // Defensive fallback: Render an informative, safe, vector error indicator
    const safeMsg = escapeXml(errorMsg.replace(/bwipp\.\w+:\s*/, ''));
    const safeTitle = escapeXml(symbKey.toUpperCase());
    const safeData = escapeXml(cleanData);

    const fallbackSvg = `
      <rect x="1" y="1" width="198" height="78" fill="#18181b" stroke="#ef4444" stroke-width="1.5" rx="3" />
      <text x="10" y="24" fill="#ef4444" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="bold">INVALID ${safeTitle}</text>
      <text x="10" y="44" fill="#a1a1aa" font-family="'JetBrains Mono', monospace" font-size="9">${safeMsg || 'Data does not match symbology charset'}</text>
      <text x="10" y="64" fill="#e4e4e7" font-family="'JetBrains Mono', monospace" font-size="10">"${safeData}"</text>
    `;

    return {
      svgContent: sanitizeSvg(fallbackSvg),
      viewBox: '0 0 200 80',
      width: 200,
      height: 80,
      displayText: cleanData,
      isError: true,
      errorMessage: safeMsg,
    };
  }
}
