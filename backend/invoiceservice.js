import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateInvoice = (invoiceData, outputFileName) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const outputPath = path.join('./', outputFileName);

    doc.pipe(fs.createWriteStream(outputPath));

    doc.fontSize(25).text('Invoice', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text(`Invoice Number: ${invoiceData.invoiceNumber}`);
    doc.text(`Customer Name: ${invoiceData.customerName}`);
    doc.text(`Email: ${invoiceData.email}`);
    doc.text(`Date: ${invoiceData.date}`);
    doc.moveDown();

    doc.text('Items:');
    invoiceData.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.name} - ${item.quantity} x $${item.price} = $${item.quantity * item.price}`);
    });

    doc.moveDown();
    const total = invoiceData.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    doc.text(`Total: $${total}`, { align: 'right' });

    doc.end();

    doc.on('finish', () => resolve(outputPath));
    doc.on('error', reject);
  });
};
