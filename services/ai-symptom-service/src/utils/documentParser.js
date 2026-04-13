import axios from 'axios';
import pdfParse from 'pdf-parse';
import { logger } from './logger.js';

/**
 * Processes up to 3 medical report objects from the frontend.
 * Each report has: { title, category, fileUrl, mimeType }
 *
 * PDFs   → downloaded from Cloudinary, text extracted via pdf-parse,
 *           added to extractedText string passed in the prompt
 * Images → Cloudinary URL passed directly to OpenAI Vision API
 *
 * Returns:
 *   extractedText — combined text from all PDFs (empty string if none)
 *   imageUrls     — array of OpenAI vision content objects for images
 */
export const processMedicalReports = async (reports = []) => {
    let extractedText = '';
    const imageUrls   = [];

    // Cap at 3 to prevent prompt bloat and token overuse
    const capped = reports.slice(0, 3);

    for (const report of capped) {
        const url = report.fileUrl;

        if (!url) continue;

        const isPDF   = report.mimeType === 'application/pdf' || url.toLowerCase().includes('.pdf');
        const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(report.mimeType) ||
                        url.match(/\.(jpeg|jpg|png|webp)$/i);

        if (isPDF) {
            try {
                // Download PDF buffer from Cloudinary
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout:      10000, // 10s — Cloudinary is fast but PDFs can be large
                });

                const pdfData = await pdfParse(response.data);

                extractedText += `\n--- ${report.category}: ${report.title} ---\n${pdfData.text}\n`;

                logger.info(`[ai-symptom-service] PDF parsed: ${report.title}`);
            } catch (err) {
                logger.warn(`[ai-symptom-service] Failed to parse PDF "${report.title}": ${err.message}`);
                // Non-blocking — skip this file, continue with others
            }

        } else if (isImage) {
            // Pass URL directly to OpenAI Vision
            imageUrls.push({
                type:      'image_url',
                image_url: { url },
            });

            logger.info(`[ai-symptom-service] Image queued for vision: ${report.title}`);
        }
    }

    return { extractedText, imageUrls };
};
