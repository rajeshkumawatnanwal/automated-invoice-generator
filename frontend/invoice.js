// invoice.js
async function sendInvoiceEmail(email, fileName) {
  try {
    const response = await fetch('/send-invoice-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, invoiceFileName: fileName })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Invoice sent successfully!');
    } else {
      alert(`Failed to send invoice: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error sending invoice:', error);
    alert('Error sending invoice.');
  }
}
