import html2canvas from 'html2canvas';

const colorCache = new Map<string, string>();
let tempCanvas: HTMLCanvasElement | null = null;
let tempCtx: CanvasRenderingContext2D | null = null;

function convertColorToRgba(colorStr: string): string {
  if (!colorStr) return colorStr;
  
  // Detect oklch, oklab or color-mix functions which crash the html2canvas stylesheet parser
  if (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('color-mix')) {
    return colorStr;
  }
  
  if (colorCache.has(colorStr)) {
    return colorCache.get(colorStr)!;
  }
  
  if (!tempCanvas) {
    tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    tempCtx = tempCanvas.getContext('2d');
  }
  
  if (!tempCtx) return colorStr;
  
  try {
    tempCtx.clearRect(0, 0, 1, 1);
    tempCtx.fillStyle = colorStr;
    tempCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = tempCtx.getImageData(0, 0, 1, 1).data;
    const rgbaStr = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    colorCache.set(colorStr, rgbaStr);
    return rgbaStr;
  } catch (e) {
    return colorStr;
  }
}

export default async function safeHtml2Canvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
  const originalGetComputedStyle = window.getComputedStyle;
  
  // Override window.getComputedStyle with a Proxy-based filter intercepting colors
  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): any {
    const style = originalGetComputedStyle(elt, pseudoElt);
    
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            return convertColorToRgba(val);
          };
        }
        
        const value = Reflect.get(target, prop);
        
        if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab') || value.includes('color-mix'))) {
          return convertColorToRgba(value);
        }
        
        if (typeof value === 'function') {
          return value.bind(target);
        }
        
        return value;
      }
    });
  };
  
  try {
    const result = await html2canvas(element, options);
    return result;
  } finally {
    // Restore original window.getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;
  }
}
