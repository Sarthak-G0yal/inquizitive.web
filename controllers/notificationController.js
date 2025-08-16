import { sendNotificationEmail } from '../services/emailService.js';

export const sendNotification = async (req, res) => {
  const { email, subject, content } = req.body;
  try {
    await sendNotificationEmail(email, subject, content);
    return res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
};