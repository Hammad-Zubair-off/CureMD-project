/**
 * Payment receipt email — sent after appointment.confirmed event
 */
export const paymentReceiptTemplate = ({
    patientFullName,
    doctorFullName,
    specialty,
    appointmentDate,
    timeSlot,
    consultationFee,
    appointmentId,
}) => {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const formattedAmount = `LKR ${Number(consultationFee).toLocaleString('en-LK', {
        minimumFractionDigits: 2,
    })}`;

    return {
        subject: `Payment Confirmed — Appointment with ${doctorFullName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
            
            <h2 style="color: #2e7d32;">✅ Payment Confirmed</h2>
            
            <p>Dear <strong>${patientFullName}</strong>,</p>
            <p>Your payment has been received and your appointment is confirmed. Here are your details:</p>

            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Doctor</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${doctorFullName}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Specialty</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${specialty}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${formattedDate}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${timeSlot}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Paid</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${formattedAmount}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reference</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${appointmentId}</td>
                </tr>
            </table>

            <p style="color: #555;">Please arrive 10 minutes before your scheduled time.</p>
            <p style="color: #555;">If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">This is an automated message from Healthcare Platform. Please do not reply to this email.</p>
        </div>
        `,
    };
};