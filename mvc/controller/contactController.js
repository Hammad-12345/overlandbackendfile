const nodemailer = require("nodemailer");

const sendContactEmail = async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "Overlandssolutions@gmail.com",
        pass: "lszx yrsi myco tuwj",
      },
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: `Overlandssolutions@gmail.com`,
      subject: "New Contact Form Submission",
      html: `
        <div style="max-width: 600px; margin: auto; font-family: 'Poppins', sans-serif; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0d1321; padding: 30px 20px; text-align: center;">
            <img src="https://d3hwx9f38knfi9.cloudfront.net/logodesign.png" alt="Overland Solutions Logo" style="height: 50px; margin-bottom: 10px;" />
            <h1 style="color: #ffffff; font-size: 24px; margin: 0;">New Contact Form Submission</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #0d1321; font-size: 22px;">Contact Details</h2>
            <div style="margin-top: 20px;">
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
                <strong style="color: #0d1321;">Name:</strong> ${name}
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
                <strong style="color: #0d1321;">Email:</strong>
                <a href="mailto:${email}" style="color: #0052cc; text-decoration: none;">${email}</a>
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
                <strong style="color: #0d1321;">Phone:</strong> ${phone}
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 15px;">
                <strong style="color: #0d1321;">Message:</strong>
              </p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 10px;">
                <p style="font-size: 16px; color: #333; line-height: 1.6; white-space: pre-wrap; margin: 0;">
                  ${message}
                </p>
              </div>
            </div>
          </div>
          <div style="background-color: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            &copy; 2025 Overland Solutions. All rights reserved.
            <a href="https://overlandsolutions.net/policy" style="color: #999; text-decoration: none;">Privacy Policy</a> |
            <a href="https://overlandsolutions.net/policy" style="color: #999; text-decoration: none;">Support</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = {
  sendContactEmail,
};