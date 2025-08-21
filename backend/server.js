import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import { dirname } from "path";



const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Use a connection pool - this is more robust for web apps
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1234", // Make sure this is your correct password
  database: "invoice_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("✅ MySQL Connection Pool created");

// =======================
// 📌 API ROUTES
// =======================

// POST: Create new invoice
app.post("/api/invoices", async (req, res) => {
  const { clientName, email, phone, address, payment_status, items, total } = req.body;

  // Use a connection from the pool for the transaction
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const invoiceSql = `INSERT INTO invoices (clientName, email, phone, address, total, payment_status) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await connection.query(invoiceSql, [clientName, email, phone, address, total, payment_status]);
    const invoiceId = result.insertId;

    if (items && items.length > 0) {
      const itemSql = `INSERT INTO invoice_items (invoice_id, itemName, quantity, price, total) VALUES ?`;
      const itemValues = items.map(item => [invoiceId, item.itemName, item.quantity, item.price, item.total]);
      await connection.query(itemSql, [itemValues]);
    }

    await connection.commit();
    res.status(201).json({ message: "✅ Invoice saved successfully!", newInvoiceId: invoiceId });
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error during invoice creation:", err);
    res.status(500).json({ error: "Database error during transaction" });
  } finally {
    connection.release(); 
  }
});


app.get("/api/invoices", async (req, res) => {
  try {
   
    const [rows] = await pool.query("SELECT * FROM invoices ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching invoices:", err);
    res.status(500).json({ error: "Database error" });
  }
});


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

// 5️⃣ Download PDF with table borders

app.get("/api/invoices/:id/pdf", async (req, res) => {
  try {
    const [invoiceRows] = await pool.query("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    if (invoiceRows.length === 0) return res.status(404).send("Invoice not found");
    const invoice = invoiceRows[0];

    const [items] = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = ?", [req.params.id]);

    const templatePath = path.resolve("invoice-template.html");
    let html = await fs.readFile(templatePath, 'utf-8');

    html = html.replace('{{clientName}}', invoice.clientName)
      .replace('{{address}}', invoice.address || 'N/A')
      .replace('{{email}}', invoice.email)
      .replace('{{id}}', invoice.id)
      .replace('{{date}}', new Date(invoice.created_at).toLocaleDateString())
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

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice.id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Error generating PDF:", err);
    res.status(500).send("Error generating PDF");
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});