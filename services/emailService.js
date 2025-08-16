import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // Use 'true' if port is 465 (SSL/TLS), 'false' otherwise
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("Email transporter configuration error:", error);
    } else {
        console.log("Email transporter is ready");
    }
});

// Helper function to create a common email template
const createEmailTemplate = (subject, contentHtml, contentText) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .email-container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }
            .email-header {
                background-color: #624a82; /* Deep purple from your gradients */
                padding: 20px 30px;
                color: #ffffff;
                text-align: center;
            }
            .email-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }
            .email-body {
                padding: 30px;
                color: #333333;
                line-height: 1.6;
                font-size: 16px;
            }
            .email-body p {
                margin-bottom: 15px;
            }
            .email-button-container {
                text-align: center;
                margin: 25px 0;
            }
            .email-button {
                display: inline-block;
                padding: 12px 25px;
                background-color: #6a0dad; /* Purple for button */
                color: #ffffff !important; /* !important to override client styles */
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
            }
            .email-footer {
                background-color: #f0f0f0;
                padding: 20px 30px;
                text-align: center;
                font-size: 12px;
                color: #777777;
                border-top: 1px solid #e0e0e0;
            }
            .email-footer a {
                color: #6a0dad;
                text-decoration: none;
            }
            .highlight {
                color: #6a0dad;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <h1>InQuizitive Club</h1>
            </div>
            <div class="email-body">
                ${contentHtml}
            </div>
            <div class="email-footer">
                <p>If you have any questions, please contact us at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>
                <p>&copy; ${new Date().getFullYear()} InQuizitive Club. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};


export const sendVerificationEmail = async (email, verificationLink) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email credentials are missing in .env");
    }

    const subject = "Verify Your Email for InQuizitive Club";
    const htmlContent = `
        <p>Hello there,</p>
        <p>Thank you for registering with <strong>InQuizitive Club</strong>! To activate your account and start your quiz journey, please verify your email address by clicking the button below:</p>
        <div class="email-button-container">
            <a href="${verificationLink}" class="email-button">Verify Email Address</a>
        </div>
        <p>This link is valid for a limited time.</p>
        <p>If you did not register for an account, please ignore this email.</p>
        <p>Best regards,</p>
        <p>The InQuizitive Club Team</p>
    `;
    const textContent = `
        Hello there,

        Thank you for registering with InQuizitive Club! To activate your account, please verify your email address by clicking the link below:

        ${verificationLink}

        This link is valid for a limited time.

        If you did not register for an account, please ignore this email.

        Best regards,
        The InQuizitive Club Team
    `;

    const mailOptions = {
        from: `InQuizitive Club <${process.env.EMAIL_USER}>`, // FIX: Better "from" display name
        to: email,
        subject: subject,
        text: textContent, // Always include a plain text version for email clients that don't render HTML
        html: createEmailTemplate(subject, htmlContent, textContent),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Verification email sent: " + info.response);
        console.log("Sending verification email to:", email);
        return info;
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw new Error("Failed to send verification email");
    }
};

export const sendresetpassword = async (email, link) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email credentials are missing in .env");
    }

    const subject = "InQuizitive Club: Reset Your Password";
    const htmlContent = `
        <p>Hello,</p>
        <p>You have requested to reset your password for your InQuizitive Club account. Please click the button below to reset your password:</p>
        <div class="email-button-container">
            <a href="${link}" class="email-button">Reset Password</a>
        </div>
        <p>This link is valid for 15 minutes. If you did not request a password reset, please ignore this email.</p>
        <p>You can get a new code after 5 minutes if this one expires.</p>
        <p>Best regards,</p>
        <p>The InQuizitive Club Team</p>
    `;
    const textContent = `
        Hello,

        You have requested to reset your password for your InQuizitive Club account. Please use the link below to reset your password:

        ${link}

        This link is valid for 15 minutes. You can get a new code after 5 minutes if this one expires.

        If you did not request a password reset, please ignore this email.

        Best regards,
        The InQuizitive Club Team
    `;

    const mailOptions = {
        from: `InQuizitive Club <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        text: textContent,
        html: createEmailTemplate(subject, htmlContent, textContent),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Password reset email sent: " + info.response);
        return info;
    } catch (error) {
        console.error("Error sending reset email:", error);
        throw new Error("Failed to send reset email");
    }
};

export const sendNotificationEmail = async (email, subject, content) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email credentials are missing in .env");
    }

    // For notification, you might just want plain text or a very simple template
    const htmlContent = `<p>Hello,</p><p>${content.replace(/\n/g, '<br/>')}</p><p>Best regards,</p><p>The InQuizitive Club Team</p>`;
    const textContent = `Hello,\n\n${content}\n\nBest regards,\nThe InQuizitive Club Team`;

    const mailOptions = {
        from: `InQuizitive Club <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        text: textContent,
        html: createEmailTemplate(subject, htmlContent, textContent), // Use general template
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Notification email sent: " + info.response);
        return info;
    } catch (error) {
        console.error("Error sending notification email:", error);
        throw new Error("Failed to send notification email");
    }
};