import nodemailer from 'nodemailer';

// This function will be called by your server.js
export async function sendInvoiceEmail(to, subject, text, filePath) {
  // 1. Configure Nodemailer with your email service provider
  // IMPORTANT: For Gmail, you must enable 2-Factor Authentication and create an "App Password".
  // Do NOT use your regular password here.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'rk0931850@gmail.com',       // 👈 Replace with your Gmail address
      pass: 'jsln qmir lqqd emqb'    // 👈 Replace with your 16-character App Password
    }
  });

  // 2. Define the email options
  const mailOptions = {
    from: '"Your Company Name" <YOUR_EMAIL@GMAIL.COM>', // Sender address
    to: to,               // Recipient's email address from the form
    subject: subject,     // Subject line
    text: text,           // Plain text body
    attachments: [
      {
        filename: 'invoice.pdf',
        path: filePath,   // The full path to the PDF file on your server
        contentType: 'application/pdf'
      }
    ]
  };

  // 3. Send the email and handle success or errors
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully! Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Throw the error so the calling function in server.js knows it failed
    throw new Error('Failed to send email via Nodemailer.');
  }
}