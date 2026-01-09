// Next.js imports
import { NextResponse } from "next/server";

// Third-party imports
import sgMail from "@sendgrid/mail";

/**
 * Sends email using SendGrid service
 *
 * @param userEmail - Recipient email address
 * @param subject - Email subject line
 * @param message - HTML email content
 * @returns Promise<NextResponse | void> - Error response if sending fails
 */
export const sendEmail = async (
  userEmail: string,
  subject: string,
  message: string
) => {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

    const mailOptions = {
      from: {
        name: "GEOstatus.cc AI Visibility",
        email: process.env.SMTP_FROM_EMAIL as string,
      },
      to: userEmail,
      subject,
      html: message,
    };
    await sgMail.send(mailOptions);
  } catch (error) {
    return new NextResponse("Error in sending email " + error, { status: 500 });
  }
};
