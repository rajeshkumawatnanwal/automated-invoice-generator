

import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import puppeteer from "puppeteer";
import { sendInvoiceEmail } from './emailService.js';
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "invoice_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("✅ MySQL Connection Pool created");


app.post("/api/invoices", async (req, res) => {
  const { clientName, email, phone, address, payment_status, items, total ,tax_rate, tax_amount} = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const invoiceSql = `INSERT INTO invoices (clientName, email, phone, address, total, payment_status, tax_rate, tax_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await connection.query(invoiceSql, [clientName, email, phone, address, total, payment_status, tax_rate, tax_amount]);
    const invoiceId = result.insertId;

    if (items && items.length > 0) {
      const itemSql = `INSERT INTO invoice_items (invoice_id, itemName, quantity, price, total) VALUES ?`;
      const itemValues = items.map(item => [invoiceId, item.itemName, item.quantity, item.price, item.total]);
      await connection.query(itemSql, [itemValues]);
    }

    await connection.commit();

    const invoicesDir = path.join(__dirname, 'public', 'invoices');
    await fs.mkdir(invoicesDir, { recursive: true });

    const relativePdfPath = `invoices/invoice-${invoiceId}.pdf`;
    const fullPdfPath = path.join(__dirname, 'public', relativePdfPath);

    let html = await fs.readFile("invoice-template.html", 'utf-8');
    
    // --- THIS IS THE UPDATED REPLACEMENT LOGIC ---
    const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
    html = html.replace('{{clientName}}', clientName)
      .replace('{{address}}', address || 'N/A')
      .replace('{{email}}', email)
      .replace('{{id}}', invoiceId)
      .replace('{{date}}', new Date().toLocaleDateString())
      .replace('{{subtotal}}', `₹${subtotal.toFixed(2)}`)
      .replace('{{taxRate}}', tax_rate)
      .replace('{{taxAmount}}', `₹${Number(tax_amount).toFixed(2)}`)
      .replace('{{grandTotal}}', `₹${Number(total).toFixed(2)}`);

    const itemsHtml = items.map(item => `
      <tr>
        <td>${item.quantity}</td>
        <td>${item.itemName}</td>
        <td class="text-right">₹${Number(item.price).toFixed(2)}</td>
        <td class="text-right">₹${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join('');
    html = html.replace('{{items}}', itemsHtml);
    // --- END OF UPDATED LOGIC ---

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    await fs.writeFile(fullPdfPath, pdfBuffer);
    console.log(`✅ PDF created at: ${fullPdfPath}`);

    // === 3. SEND RESPONSE WITH PDF PATH ===
    res.status(201).json({
      message: "Invoice saved and PDF generated successfully!",
      newInvoiceId: invoiceId,
      pdfPath: relativePdfPath
    });

  } catch (err) {
    await connection.rollback();
    console.error("❌ Error during invoice creation:", err);
    res.status(500).json({ error: "Database or PDF generation error" });
  } finally {
    connection.release();
  }
});

// POST: Send invoice email
app.post("/api/send-invoice", async (req, res) => {
  const { to, pdfPath } = req.body;

  if (!to || !pdfPath) {
    return res.status(400).send('Email (to) pdfPath are required.');
  }

  const fullFilePath = path.join(__dirname, 'public', pdfPath);
  console.log(`Attempting to send email with attachment: ${fullFilePath}`);

  try {
    await sendInvoiceEmail(
      to,
      'Your Invoice',
      'Please find your invoice attached.',
      fullFilePath
    );
    res.status(200).json('Invoice sent successfully!');
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    res.status(500).json('Failed to send invoice.');
  }
});

// GET: All invoices
app.get("/api/invoices", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM invoices ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching invoices:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET: Single invoice
app.get("/api/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceSql = "SELECT * FROM invoices WHERE id = ?";
    const [invoiceRows] = await pool.query(invoiceSql, [id]);
    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    const invoice = invoiceRows[0];
    const itemsSql = "SELECT * FROM invoice_items WHERE invoice_id = ?";
    const [items] = await pool.query(itemsSql, [id]);
    invoice.items = items;
    res.json(invoice);
  } catch (err) {
    console.error("❌ Error fetching single invoice:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT: Update an existing invoice
app.put("/api/invoices/:id", async (req, res) => {
  const { id } = req.params;
  const { clientName, email, phone, address, payment_status, items, total } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const invoiceSql = `UPDATE invoices SET clientName=?, email=?, phone=?, address=?, payment_status=?, total=? WHERE id=?`;
    await connection.query(invoiceSql, [clientName, email, phone, address, payment_status, total, id]);
    await connection.query("DELETE FROM invoice_items WHERE invoice_id=?", [id]);
    if (items && items.length > 0) {
      const itemSql = `INSERT INTO invoice_items (invoice_id, itemName, quantity, price, total) VALUES ?`;
      const itemValues = items.map(item => [id, item.itemName, item.quantity, item.price, item.total]);
      await connection.query(itemSql, [itemValues]);
    }
    await connection.commit();
    res.json({ message: "✅ Invoice updated successfully!" });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error updating invoice:", err);
    res.status(500).json({ error: "Database transaction error" });
  } finally {
    connection.release();
  }
});

// DELETE: Delete an invoice
app.delete("/api/invoices/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM invoices WHERE id=?", [req.params.id]);
    res.json({ message: "✅ Invoice deleted successfully!" });
  } catch (err) {
    console.error("❌ Error deleting invoice:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// Add this route to your server.js

// GET: Generate and download a PDF for a specific invoice
app.get("/api/invoices/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch invoice and item data from the database
    const [invoiceRows] = await pool.query("SELECT * FROM invoices WHERE id = ?", [id]);
    if (invoiceRows.length === 0) {
      return res.status(404).send("Invoice not found");
    }
    const invoice = invoiceRows[0];

    const [items] = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = ?", [id]);

    // 2. Read your HTML template
    const templatePath = path.resolve("invoice-template.html");
    let html = await fs.readFile(templatePath, 'utf-8');

    // 3. Replace placeholders with actual data
    const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
    html = html.replace('{{clientName}}', invoice.clientName)
      .replace('{{address}}', invoice.address || 'N/A')
      .replace('{{email}}', invoice.email)
      .replace('{{id}}', invoice.id)
      .replace('{{date}}', new Date(invoice.created_at).toLocaleDateString())
      .replace('{{subtotal}}', `$${subtotal.toFixed(2)}`)
      .replace('{{taxRate}}', invoice.tax_rate)
      .replace('{{taxAmount}}', `$${Number(invoice.tax_amount).toFixed(2)}`)
      .replace('{{grandTotal}}', `$${Number(invoice.total).toFixed(2)}`);

    const itemsHtml = items.map(item => `
      <tr>
        <td>${item.quantity}</td>
        <td>${item.itemName}</td>
        <td class="text-right">$${Number(item.price).toFixed(2)}</td>
        <td class="text-right">$${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join('');
    html = html.replace('{{items}}', itemsHtml);

    // 4. Use Puppeteer to create the PDF buffer
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // 5. Send the PDF back to the browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice.id}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ Error generating PDF:", err);
    res.status(500).send("Error generating PDF");
  }
});





app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});