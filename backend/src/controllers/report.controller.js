const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../models/db');
const waterService = require('../services/water.service');

const generateElectricityReport = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'xlsx' } = req.query;
    const start = startDate || '2025-01-01';
    const end = endDate || '2025-12-31';

    const [data] = await db.query(
      `SELECT e.*, a.name as asset_name FROM electricity_data e
       LEFT JOIN assets a ON e.asset_id = a.id
       WHERE e.date BETWEEN ? AND ? ORDER BY e.date`,
      [start, end]
    );

    if (format === 'pdf') {
      return generatePDF(res, 'Electricity Report', data, [
        { label: 'Date', key: 'date' },
        { label: 'Asset', key: 'asset_name' },
        { label: 'Energy (kWh)', key: 'energy_kWh' },
        { label: 'Cost', key: 'cost' }
      ]);
    }

    return generateExcel(res, 'Electricity Report', data, [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Asset', key: 'asset_name', width: 20 },
      { header: 'Energy (kWh)', key: 'energy_kWh', width: 15 },
      { header: 'Cost', key: 'cost', width: 12 },
      { header: 'Peak kW', key: 'peak_kW', width: 12 },
      { header: 'Off-Peak kWh', key: 'off_peak_kWh', width: 15 }
    ]);
  } catch (error) { next(error); }
};

const generateWaterReport = async (req, res, next) => {
  try {
    await waterService.ensureTable();

    const { startDate, endDate, format = 'xlsx' } = req.query;
    const start = startDate || '2025-01-01';
    const end = endDate || '2025-12-31';

    const [data] = await db.query(
      `SELECT * FROM dbo.water_meter_data WHERE date BETWEEN ? AND ? ORDER BY date`,
      [start, end]
    );

    if (format === 'pdf') {
      return generatePDF(res, 'Water Meter Report', data, [
        { label: 'Date', key: 'date' },
        { label: 'Intake', key: 'intake' },
        { label: 'PPU', key: 'ppu_reading' },
        { label: 'FPU', key: 'fpu_reading' }
      ]);
    }

    return generateExcel(res, 'Water Meter Report', data, [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Intake', key: 'intake', width: 12 },
      { header: 'PPU Reading', key: 'ppu_reading', width: 15 },
      { header: 'FPU Reading', key: 'fpu_reading', width: 15 },
      { header: 'Chiller', key: 'chiller', width: 12 },
      { header: 'Cooling Tower', key: 'cooling_tower', width: 15 },
      { header: 'Cost', key: 'cost', width: 12 }
    ]);
  } catch (error) { next(error); }
};

const generateProductionReport = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'xlsx' } = req.query;
    const start = startDate || '2025-01-01';
    const end = endDate || '2025-12-31';

    const [data] = await db.query(
      `SELECT * FROM production_target_new WHERE date BETWEEN ? AND ? ORDER BY date, line_id`,
      [start, end]
    );

    if (format === 'pdf') {
      return generatePDF(res, 'Production Report', data, [
        { label: 'Date', key: 'date' },
        { label: 'Line', key: 'line_id' },
        { label: 'Product', key: 'product_group' },
        { label: 'Target', key: 'target' },
        { label: 'Actual', key: 'actual' },
        { label: 'Eff%', key: 'efficiency' }
      ]);
    }

    return generateExcel(res, 'Production Report', data, [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Line ID', key: 'line_id', width: 12 },
      { header: 'Product Group', key: 'product_group', width: 20 },
      { header: 'Unit', key: 'production_unit', width: 12 },
      { header: 'Target', key: 'target', width: 12 },
      { header: 'Actual', key: 'actual', width: 12 },
      { header: 'Efficiency %', key: 'efficiency', width: 15 }
    ]);
  } catch (error) { next(error); }
};

const generateScheduleReport = async (req, res, next) => {
  try {
    const { year, month, format = 'xlsx' } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;

    const [data] = await db.query(
      `SELECT * FROM work_schedule WHERE YEAR(day) = ? AND MONTH(day) = ? ORDER BY day`,
      [y, m]
    );

    if (format === 'pdf') {
      return generatePDF(res, 'Work Schedule Report', data, [
        { label: 'Day', key: 'day' },
        { label: 'Holiday', key: 'is_holiday' },
        { label: 'PPU Plan', key: 'ppu_planned' },
        { label: 'PPU Act', key: 'ppu_actual' }
      ]);
    }

    return generateExcel(res, 'Work Schedule Report', data, [
      { header: 'Day', key: 'day', width: 15 },
      { header: 'Holiday', key: 'is_holiday', width: 10 },
      { header: 'Holiday Name', key: 'holiday_name', width: 20 },
      { header: 'PPU Planned', key: 'ppu_planned', width: 12 },
      { header: 'PPU Actual', key: 'ppu_actual', width: 12 },
      { header: 'FPU Planned', key: 'fpu_planned', width: 12 },
      { header: 'FPU Actual', key: 'fpu_actual', width: 12 },
      { header: 'FMU Planned', key: 'fmu_planned', width: 12 },
      { header: 'FMU Actual', key: 'fmu_actual', width: 12 }
    ]);
  } catch (error) { next(error); }
};

// Helper: Generate PDF
function generatePDF(res, title, data, columns) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s/g, '_')}.pdf"`);
  doc.pipe(res);

  // Title
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toISOString().split('T')[0]}`, { align: 'right' });
  doc.moveDown();

  // Table header
  const startX = 40;
  const colWidth = (doc.page.width - 80) / columns.length;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  columns.forEach((col, i) => {
    doc.text(col.label, startX + i * colWidth, y, { width: colWidth, align: 'left' });
  });

  y += 20;
  doc.moveTo(startX, y).lineTo(doc.page.width - 40, y).stroke();
  y += 5;

  // Table rows
  doc.font('Helvetica').fontSize(8);
  data.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    columns.forEach((col, i) => {
      const val = row[col.key] != null ? String(row[col.key]) : '-';
      doc.text(val, startX + i * colWidth, y, { width: colWidth, align: 'left' });
    });
    y += 15;
  });

  doc.end();
}

// Helper: Generate Excel
async function generateExcel(res, title, data, columns) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FUPMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title);
  sheet.columns = columns;

  // Style header
  sheet.getRow(1).font = { bold: true, size: 11 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data
  data.forEach(row => {
    const rowData = {};
    columns.forEach(col => {
      rowData[col.key] = row[col.key];
    });
    sheet.addRow(rowData);
  });

  // Auto-filter
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s/g, '_')}.xlsx"`);
  
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { generateElectricityReport, generateWaterReport, generateProductionReport, generateScheduleReport };
