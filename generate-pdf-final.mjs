import { readFileSync, writeFileSync } from 'fs';

const md = readFileSync('validacion-fase13-final.md', 'utf8');

function mdToHtml(md) {
  let html = md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```bash\n([\s\S]*?)```/g, '<pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: Consolas, monospace; font-size: 13px;">$1</pre>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: Consolas, monospace; font-size: 13px;">$2</pre>')
    .replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: Consolas, monospace; font-size: 13px;">$1</code>')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim()).filter(c => c);
      if (cells.every(c => c.match(/^-+$/))) return '';
      return '<tr>' + cells.map(c => `<td style="padding: 10px; border: 1px solid #ddd;">${c}</td>`).join('') + '</tr>';
    })
    .replace(/^- (.*$)/gm, '<li style="margin: 4px 0;">$1</li>')
    .replace(/^  - (.*$)/gm, '<li style="margin: 4px 0 4px 20px;">$1</li>')
    .replace(/^---$/gm, '<hr style="border: none; border-top: 2px solid #1e3a5f; margin: 25px 0;">')
    .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
    .replace(/\n/g, '<br>');

  return html;
}

const htmlContent = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Validación Fase 13 - CFDIGITAL</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 210mm; margin: 0 auto; padding: 0; line-height: 1.6; color: #333; font-size: 11pt; }
    h1 { color: #1e3a5f; border-bottom: 3px solid #c41e3a; padding-bottom: 10px; font-size: 22pt; margin-top: 0; }
    h2 { color: #1e3a5f; margin-top: 25px; font-size: 14pt; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
    h3 { color: #4a5568; font-size: 12pt; margin-top: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
    tr:first-child { background: #1e3a5f; color: white; }
    tr:first-child td { border-color: #1e3a5f; font-weight: bold; }
    tr:nth-child(even):not(:first-child) { background: #f9f9f9; }
    td { padding: 10px; border: 1px solid #ddd; }
    ul { padding-left: 20px; margin: 10px 0; }
    code { font-family: 'Consolas', 'Courier New', monospace; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: Consolas, monospace; font-size: 9pt; line-height: 1.4; white-space: pre-wrap; }
    hr { border: none; border-top: 2px solid #1e3a5f; margin: 25px 0; }
    strong { color: #1e3a5f; }
    .header-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header-info">
    <p style="margin: 0;"><strong>Fecha:</strong> 28 de agosto de 2026, 19:30 UTC</p>
    <p style="margin: 5px 0 0 0;"><strong>Proyecto:</strong> Inmobiliaria_v4 (CFDIGITAL)</p>
    <p style="margin: 5px 0 0 0;"><strong>Repositorio:</strong> github.com/proyectoinmobiliaria2026-rgb/inmobiliario_4</p>
  </div>
  ${htmlContent}
  <p style="margin-top: 40px; font-size: 9pt; color: #666; text-align: center;">
    Generado por Claude Code | 28/08/2026 19:30 UTC
  </p>
</body>
</html>`;

writeFileSync('validacion-fase13-final.html', fullHtml);
console.log('HTML generado: validacion-fase13-final.html');
console.log('Para convertir a PDF: abrir en Chrome -> Ctrl+P -> Guardar como PDF');