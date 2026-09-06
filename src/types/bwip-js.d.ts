declare module 'bwip-js' {
  export interface RenderOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: 'offleft' | 'left' | 'center' | 'right' | 'offright' | 'justify';
    textyalign?: 'below' | 'center' | 'above';
    textsize?: number;
    barcolor?: string;
    textcolor?: string;
    backgroundcolor?: string;
    includecheck?: boolean;
    includecheckintext?: boolean;
    parse?: boolean;
    parsefnc?: boolean;
    rotate?: 'N' | 'R' | 'L' | 'I';
  }

  export function toSVG(opts: RenderOptions): string;
  export function toCanvas(canvas: HTMLCanvasElement | OffscreenCanvas | string, opts: RenderOptions): HTMLCanvasElement;

  const bwipjs: {
    toSVG(opts: RenderOptions): string;
    toCanvas(canvas: HTMLCanvasElement | OffscreenCanvas | string, opts: RenderOptions): HTMLCanvasElement;
  };

  export default bwipjs;
}
