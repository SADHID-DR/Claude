import html2canvas from './html2canvasHelper';
import { jsPDF } from 'jspdf';

export async function exportToPdf(elementId: string, filename: string = 'document.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Temporarily modify styles for better printing if needed
    const originalPrintClass = element.className;
    // ensure element isn't hidden by overflow when capturing
    element.className = element.className.replace('max-h-[80vh]', '').replace('overflow-y-auto', '');

    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    element.className = originalPrintClass; // Restore

    const imgData = canvas.toDataURL('image/png');
    
    // Calculate aspect ratio
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const ratio = canvasWidth / canvasHeight;
    const padding = 10; // mm
    
    let imgWidth = pdfWidth - (padding * 2);
    let imgHeight = imgWidth / ratio;
    
    let yPos = padding;
    let pageHeightLeft = imgHeight;
    const pageMaxHeight = pdfHeight - (padding * 2);
    
    // Single page vs multi page handling
    if (imgHeight <= pageMaxHeight) {
      pdf.addImage(imgData, 'PNG', padding, yPos, imgWidth, imgHeight);
    } else {
      // Need multi-page handling
      let sourceY = 0;
      let currImgHeight = imgHeight;
      
      pdf.addImage(imgData, 'PNG', padding, yPos, imgWidth, imgHeight);
      currImgHeight -= pageMaxHeight;
      
      while (currImgHeight > 0) {
        yPos = yPos - pageMaxHeight; // Shift image up
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', padding, yPos, imgWidth, imgHeight);
        currImgHeight -= pageMaxHeight;
      }
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF", error);
    alert("Hubo un error al generar el PDF. Por favor intente más tarde.");
  }
}
