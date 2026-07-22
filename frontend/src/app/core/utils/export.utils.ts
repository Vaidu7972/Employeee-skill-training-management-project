export function formatExportFilename(reportTitle: string, filterContext?: string): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const cleanTitle = reportTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
  const cleanFilter = filterContext ? "_" + filterContext.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_") : "";
  return `${cleanTitle}${cleanFilter}_${dateStr}`;
}

export function exportToCsv(headers: string[], rows: any[][], fileName: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((val) => {
          const escaped = String(val ?? "").replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(headers: string[], rows: any[][], fileName: string) {
  let html = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
  rows.forEach((row) => {
    html += `<tr>${row.map((val) => `<td>${val ?? ""}</td>`).join("")}</tr>`;
  });
  html += "</tbody></table>";

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.xls`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printTable(headers: string[], rows: any[][], title: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
          th { background: #eee; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>${row.map((val) => `<td>${val ?? ""}</td>`).join("")}</tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
}

export function exportToPdf(headers: string[], rows: any[][], fileName: string) {
  const cdnJsPdf = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  const cdnAutoTable = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js";
  
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  Promise.resolve().then(async () => {
    if (!(window as any).jspdf) {
      await loadScript(cdnJsPdf);
    }
    if (!(window as any).jspdf.jsPDF.API.autoTable) {
      await loadScript(cdnAutoTable);
    }
    
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text(fileName, 14, 20);
    
    // Table
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 25,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [94, 114, 228] }
    });
    
    doc.save(`${fileName}.pdf`);
  });
}

export function exportHtmlToPdf(elementId: string, fileName: string) {
  const cdnHtml2Canvas = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  const cdnJsPdf = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  Promise.resolve().then(async () => {
    if (!(window as any).html2canvas) {
      await loadScript(cdnHtml2Canvas);
    }
    if (!(window as any).jspdf) {
      await loadScript(cdnJsPdf);
    }
    
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const html2canvas = (window as any).html2canvas;
    const { jsPDF } = (window as any).jspdf;
    
    html2canvas(element, { scale: 2, useCORS: true, logging: false }).then((canvas: any) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${fileName}.pdf`);
    });
  });
}
