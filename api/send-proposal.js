const { jsPDF } = require("jspdf");
const nodemailer = require("nodemailer");

// --- NODEMAILER CONFIGURATION ---
// This is where you configure your email service (e.g., SendGrid, Gmail)
// We use Environment Variables so your password is NOT in the code.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,     // e.g., "smtp.sendgrid.net" or "smtp.gmail.com"
  port: process.env.EMAIL_PORT,     // e.g., 465 or 587
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for others
  auth: {
    user: process.env.EMAIL_USER, // Your email username (e.g., "apikey" for SendGrid)
    pass: process.env.EMAIL_PASS, // Your email password or API Key
  },
});
// ----------------------------------

// This is the main function Vercel will run
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const formData = req.body;

  try {
    // --- 1. GENERATE PDF ON THE SERVER ---
    const doc = new jsPDF();

    // NOTE: We cannot use the local "pdf-header-image" here.
    // For simplicity, I've removed it.

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(22, 53, 77);
    doc.text("EUNOIA", 105, 50, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Prepared for: ${formData.company}`, 105, 57, { align: 'center' });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 53, 77);
    doc.text("Client Details", 20, 75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("To,", 20, 83);
    doc.text(`${formData.name}`, 20, 89);
    doc.text(`${formData.designation}`, 20, 95);
    doc.text(`${formData.company}`, 20, 101);
    doc.text(`${formData.contact}`, 20, 107);

    const hasCeoDinner = formData.initiatives.some(item => item.isCeoDinner === true);
    let tripType = "1 Day Stress Management & Mindfulness Retreat Program";
    let hotel = "Not Applicable";
    if (hasCeoDinner) {
        tripType = "Stress Management & Mindfulness Retreat Program (Overnight Stay)";
        hotel = "Hotel Accommodation Included (TBD)";
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 53, 77);
    doc.text("Event Overview", 20, 115);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Trip Type: ${tripType}`, 20, 123);
    doc.text(`Preferred Date: TBD (To be discussed)`, 20, 129);
    doc.text(`Event Timings: TBD (To be discussed)`, 20, 135);

    let yPos = 135;
    if (hotel !== 'Not Applicable') {
        yPos += 6;
        doc.text(`Accommodation: ${hotel}`, 20, yPos);
    }

    yPos += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 53, 77);
    doc.text("Proposed Itinerary", 20, yPos);
    yPos += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Breakfast (Included)", 25, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    formData.initiatives.forEach(item => {
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.text(item.name, 25, yPos);
        yPos += 7;
    });

    if (yPos > 266) {
        doc.addPage();
        yPos = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Lunch (Included)", 25, yPos);
    yPos += 7;
    doc.text("Dinner (Included)", 25, yPos);

    // Get the PDF as a buffer
    const pdfBuffer = doc.output('arraybuffer');

    // --- 2. SEND EMAIL 1 (To the User) ---
    await transporter.sendMail({
      from: `"EUNOIA" <${process.env.VERIFIED_SENDER_EMAIL}>`, // Your "from" address
      to: formData.email, // The user's email
      subject: "Your Custom EUNOIA Proposal is Here!",
      html: `
        <p>Hi ${formData.name},</p>
        <p>Thank you for your interest in our Mindfulness & Leadership programs. Please find your custom proposal attached.</p>
        <p>Our team will reach out to you within 24 hours to discuss the next steps.</p>
        <br>
        <p>Best Regards,</p>
        <p>HR Yaar</p>
      `,
      attachments: [
        {
          filename: 'EUNOIA-Proposal.pdf',
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf',
        },
      ],
    });

    // --- 3. SEND EMAIL 2 (To You/Admin) ---
    await transporter.sendMail({
      from: `"New Proposal Bot" <${process.env.VERIFIED_SENDER_EMAIL}>`,
      to: process.env.MY_EMAIL, // **YOUR** email address
      subject: `New Proposal Request from: ${formData.company}`,
      html: `
        <p>A new proposal request has been generated.</p>
        <p>Please reply within 24 hours.</p>
        <hr>
        <h3>Client Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${formData.name}</li>
          <li><strong>Company:</strong> ${formData.company}</li>
          <li><strong>Designation:</strong> ${formData.designation}</li>
          <li><strong>Email:</strong> ${formData.email}</li>
          <li><strong>Contact:</strong> ${formData.contact}</li>
        </ul>
        <hr>
        <p>The generated PDF is attached for your reference.</p>
      `,
      attachments: [
        {
          filename: 'EUNOIA-Proposal.pdf',
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf',
        },
      ],
    });

    // --- 4. SEND SUCCESS RESPONSE ---
    res.status(200).json({ message: "Proposal sent successfully!" });

  } catch (error) {
    console.error("Error generating PDF or sending email:", error);
    res.status(500).json({ message: "An error occurred. Please try again." });
  }
}