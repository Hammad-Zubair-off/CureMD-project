import { GoogleGenerativeAI } from '@google/generative-ai';
import { patientClient } from '../config/services.js';
import SERVICES from '../config/services.js';
import { processMedicalReports } from '../utils/documentParser.js';
import { logger } from '../utils/logger.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helpers

/**
 * Gemini requires images to be passed as base64 inline data, not raw URLs.
 * This helper fetches a Cloudinary URL and formats it for the Gemini SDK.
 */
const urlToGeminiPart = async (url, mimeType) => {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: mimeType || 'image/jpeg' // Default fallback
            }
        };
    } catch (error) {
        logger.error(`[ai-symptom-service] Failed to fetch image for Gemini: ${url}`);
        return null;
    }
};

// Controllers

export const askMedicalAssistant = async (req, res, next) => {
    try {
        const { question, reports = [] } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({
                success: false,
                error: 'question is required.',
            });
        }

        const aiToken = req.headers['x-ai-token'];

        if (!aiToken) {
            return res.status(401).json({
                success: false,
                error: 'AI history token is required. Generate one via POST /api/patients/history-token.',
            });
        }

        if (reports.length > 3) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 3 reports can be shared per message.',
            });
        }

        // Step 1: Fetch anonymized history
        let patientHistory = [];
        try {
            const historyResponse = await patientClient.get(
                SERVICES.patient.endpoints.historyForAI(),
                { headers: { Authorization: aiToken } }
            );
            patientHistory = historyResponse.data?.history ?? [];
        } catch (err) {
            logger.warn(`[ai-symptom-service] Could not fetch patient history: ${err.message}`);
        }

        // Step 2: Process attached reports
        // Assuming processMedicalReports returns { extractedText: "...", imageUrls: ["url1", "url2"] }
        const { extractedText, imageUrls = [] } = await processMedicalReports(reports);

        // Fetch Cloudinary URLs and convert to Gemini base64 parts
        const geminiImageParts = await Promise.all(
            imageUrls.map(url => urlToGeminiPart(url, 'image/jpeg')) // Adjust mimeType if your parser knows it
        );
        const validImageParts = geminiImageParts.filter(part => part !== null);

        // Step 3: Build the prompt
        const hasHistory = patientHistory.length > 0;
        const hasReports = extractedText.length > 0 || validImageParts.length > 0;

        const textContent = [
            hasHistory
                ? `Anonymized Patient Medical History:\n${JSON.stringify(patientHistory, null, 2)}`
                : 'No medical history available for this patient.',

            hasReports && extractedText
                ? `\nExtracted Medical Report Content:\n${extractedText}`
                : '',

            `\nPatient Question: ${question.trim()}`,
        ].join('\n');

        // Step 4: Call Gemini
        // We use gemini-2.5-flash as it is fast, free, and natively multimodal
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are a clinical AI assistant for a healthcare platform.
You are provided with anonymized patient medical history and optionally text extracted from their uploaded medical reports.
Answer questions strictly based on the provided data.
Never provide definitive diagnoses.
Always recommend the patient consult their doctor for medical decisions.
Be concise, clear, and empathetic.
If you do not have enough data to answer, say so honestly.`,
        });

        // Combine text context with any processed image buffers
        const promptData = [textContent, ...validImageParts];

        const completion = await model.generateContent(promptData);
        const answer = completion.response.text();

        logger.info(`[ai-symptom-service] Question answered by Gemini for user: ${req.user.id}`);

        // ── Step 5: Respond ────────────────────────────────────────────────
        res.status(200).json({
            success: true,
            answer,
            context: {
                historySnapshotsUsed: patientHistory.length,
                reportsProcessed: reports.slice(0, 3).length,
                hasExtractedText: extractedText.length > 0,
                hasImages: validImageParts.length > 0,
            },
        });
    } catch (err) {
        logger.error(`[ai-symptom-service] Error: ${err.message}`);
        next(err);
    }
};