/**
 * Refund confirmation email — sent after payment.refunded event
 */
export const refundConfirmationTemplate = ({
    patientFullName,
    amount,
    paymentId,
    refundedAt,
}) => {
    const formattedDate = new Date(refundedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const formattedAmount = `$${Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
    })}`;

    return {
        subject: `Refund Processed — ${formattedAmount} Returned`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">

            <h2 style="color: #1565c0;">💳 Refund Processed</h2>

            <p>Dear <strong>${patientFullName}</strong>,</p>
            <p>Your refund has been successfully processed. Here are the details:</p>

            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Refund Amount</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${formattedAmount}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Processed On</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${formattedDate}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reference</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${paymentId}</td>
                </tr>
            </table>

            <p style="color: #555;">Please allow 5–10 business days for the refund to appear in your account, depending on your bank.</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">This is an automated message from Healthcare Platform. Please do not reply to this email.</p>
        </div>
        `,
    };
};