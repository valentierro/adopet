/**
 * Utilitários para exportar relatórios em CSV e PDF (com logo e formatação).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CSV_SEP = ';';
const CSV_BOM = '\uFEFF';

function escapeCsvCell(value: string): string {
  const s = String(value ?? '').replace(/"/g, '""');
  return s.includes(CSV_SEP) || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const headerLine = headers.map(escapeCsvCell).join(CSV_SEP);
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(CSV_SEP));
  const csv = CSV_BOM + [headerLine, ...dataLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PDF_TITLE_FONT_SIZE = 18;
const PDF_HEADER_FONT_SIZE = 11;
const PDF_BRAND = 'Adopet';
const PDF_MARGIN = 20;
/** A4 em mm: retrato 210x297, paisagem 297x210 */
const A4_W = 210;
const A4_H = 297;

type TableColumn = { header: string; dataKey: string; align?: 'left' | 'center' | 'right' };

function addPdfHeader(doc: jsPDF, reportTitle: string, yStart: number): number {
  doc.setFontSize(PDF_TITLE_FONT_SIZE);
  doc.setFont('helvetica', 'bold');
  doc.text(PDF_BRAND, PDF_MARGIN, yStart);
  doc.setFontSize(PDF_HEADER_FONT_SIZE);
  doc.setFont('helvetica', 'normal');
  doc.text(reportTitle, PDF_MARGIN, yStart + 8);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, PDF_MARGIN, yStart + 14);
  return yStart + 22;
}

export function downloadPdfWithTable(
  filename: string,
  reportTitle: string,
  columns: TableColumn[],
  rows: Record<string, string | number>[],
  options?: { landscape?: boolean }
): void {
  const doc = new jsPDF(options?.landscape ? { orientation: 'landscape' } : {});
  const y = addPdfHeader(doc, reportTitle, 20);

  const headers = columns.map((c) => c.header);
  const body = rows.map((row) => columns.map((col) => String(row[col.dataKey] ?? '')));

  autoTable(doc, {
    startY: y,
    head: [headers],
    body,
    theme: 'striped',
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    styles: { fontSize: 9 },
  });

  const pageCount = doc.getNumberOfPages();
  const isLandscape = options?.landscape ?? false;
  const pageW = isLandscape ? A4_H : A4_W;
  const pageH = isLandscape ? A4_W : A4_H;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount} • ${PDF_BRAND}`,
      pageW / 2,
      pageH - 10,
      { align: 'center' }
    );
  }

  doc.save(filename);
}

/** Gera PDF de resumo (estatísticas) com blocos de texto/tabela pequena */
export function downloadPdfSummary(
  filename: string,
  reportTitle: string,
  sections: { title: string; rows: [string, string | number][] }[]
): void {
  const doc = new jsPDF();
  let y = addPdfHeader(doc, reportTitle, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const section of sections) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(section.title, PDF_MARGIN, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const [label, value] of section.rows) {
      doc.text(`${label}: ${value}`, PDF_MARGIN + 5, y);
      y += 6;
    }
    y += 8;
  }

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `${PDF_BRAND} • Gerado em ${new Date().toLocaleString('pt-BR')}`,
    PDF_MARGIN,
    A4_H - 10
  );
  doc.save(filename);
}
