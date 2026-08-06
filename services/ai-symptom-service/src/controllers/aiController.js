import { GoogleGenerativeAI } from '@google/generative-ai';
import AITriageSession from '../models/AITriageSession.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import pdfParse from 'pdf-parse';

const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY);

if (!isGeminiConfigured) {
    logger.error('[ai-symptom-service] GEMINI_API_KEY not found in environment variables. AI triage will be unavailable.');
}

const geminiClient = isGeminiConfigured ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const callGemini = async (modelName, systemInstruction, promptData, generationConfig) => {
    const model = geminiClient.getGenerativeModel({ model: modelName, systemInstruction });
    const completion = await model.generateContent({
        contents: [{ role: 'user', parts: promptData }],
        generationConfig,
    });
    return completion.response.text();
};

// Helpers

/**
 * Processes selected files from Cloudinary.
 * PDFs → extracted as text (cheaper tokens).
 * Images → converted to base64 inline data for Gemini Vision.
*/
const processSelectedFiles = async (selectedReports) => {
    let extractedText = '';
    const imageParts = [];

    for (const report of selectedReports) {
        const url = report.fileUrl;
        if (!url) continue;

        const isPDF = report.mimeType === 'application/pdf' || url.toLowerCase().includes('.pdf');
        const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(report.mimeType) ||
            url.match(/\.(jpeg|jpg|png|webp)$/i);

        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                maxRedirects: 5,
            });
            logger.info(`[ai-symptom-service] Downloaded "${report.title}" — status: ${response.status} | content-type: ${response.headers['content-type']} | bytes: ${response.data.byteLength}`);

            if (isPDF) {
                const pdfData = await pdfParse(response.data);
                extractedText += `\n--- Document: ${report.title} ---\n${pdfData.text}\n`;
            } else if (isImage) {
                const buffer = Buffer.from(response.data);
                imageParts.push({
                    inlineData: {
                        data: buffer.toString('base64'),
                        mimeType: report.mimeType || 'image/jpeg',
                    },
                });
            }
        } catch (err) {
            logger.warn(`[ai-symptom-service] Failed to process file "${report.title}": ${err.message}`);
            // Non-blocking — skip this file, continue with others
        }
    }

    return { extractedText, imageParts };
};

// Controllers

/**
 * @desc    Get all sessions for the logged-in patient.
 * @route   GET /api/ai/sessions
 * @access  Private — patient
 */
export const getAllSessions = async (req, res, next) => {
    try {
        const sessions = await AITriageSession.find({ patientId: req.user.id })
            .sort({ updatedAt: -1 })
            .select('_id title rollingSummary triageOutcome createdAt updatedAt') // exclude full messages array for list view
            .lean();

        res.status(200).json({ success: true, total: sessions.length, sessions });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a single session by ID including full message history.
 *          Used when patient opens a specific chat to continue it.
 *
 * @route   GET /api/ai/sessions/:sessionId
 * @access  Private — patient (own sessions only)
 */
export const getSessionById = async (req, res, next) => {
    try {
        const session = await AITriageSession.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found.' });
        }

        if (session.patientId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You are not authorized to view this session.' });
        }

        res.status(200).json({ success: true, session });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create a new chat session.
 * @route   POST /api/ai/sessions
 * @access  Private — patient
 */
export const createSession = async (req, res, next) => {
    try {
        const { title = null, vitals = null } = req.body;

        const session = new AITriageSession({
            patientId: req.user.id,
            title,
        });

        // Seed the rolling summary with patient vitals if provided by the frontend.
        // This gives the AI baseline context (age, gender, conditions, allergies)
        // without pulling the full medical history from patient-service.
        if (vitals) {
            session.rollingSummary = [
                'Patient initialized a new symptom check.',
                `Age/Gender: ${vitals.age || 'Unknown'} / ${vitals.gender || 'Unknown'}.`,
                vitals.chronicConditions?.length ? `Known Conditions: ${vitals.chronicConditions.join(', ')}.` : '',
                vitals.allergies?.length ? `Allergies: ${vitals.allergies.join(', ')}.` : '',
            ].filter(Boolean).join(' ');
        }

        await session.save();

        logger.info(`[ai-symptom-service] New session created: ${session._id} | patient: ${req.user.id}`);

        res.status(201).json({ success: true, session });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Send a message to a specific session.
 * @route   POST /api/ai/sessions/:sessionId/message
 * @access  Private — patient (own sessions only)
 */
export const sendMessage = async (req, res, next) => {
    try {
        const { message, selectedReports = [] } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, error: 'message is required.' });
        }

        if (selectedReports.length > 3) {
            return res.status(400).json({ success: false, error: 'Maximum 3 reports can be shared per message.' });
        }

        if (!isGeminiConfigured) {
            return res.status(503).json({
                success: false,
                error: 'AI triage is temporarily unavailable. Please try again later or contact a doctor directly.',
            });
        }

        // Load session and verify ownership
        const session = await AITriageSession.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found.' });
        }

        if (session.patientId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You are not authorized to message this session.' });
        }

        // Save user message immediately
        session.messages.push({ role: 'user', content: message });
        await session.save();

        // Process any attached files
        const { extractedText, imageParts } = await processSelectedFiles(selectedReports);

        // Build the lean prompt — rolling summary + new message + any file content
        const promptText = `
            CURRENT ROLLING SUMMARY:
            ${session.rollingSummary}

            NEW PATIENT MESSAGE:
            "${message.trim()}"
            ${extractedText ? `\nATTACHED DOCUMENT TEXT:\n${extractedText}` : ''}
        `.trim();

        // Call Gemini — automatically rotates through all API keys on 429
        const systemInstruction = `You are a highly analytical clinical AI triage assistant. Analyze the CURRENT ROLLING SUMMARY and the NEW PATIENT MESSAGE. You MUST return a raw JSON object with EXACTLY this structure:
        {
        "isEmergency": boolean,
        "triageLevel": "Pending" | "Routine" | "Urgent" | "Emergency",
        "suggestedDepartment": "string" or null,
        "rollingSummary": "string",
        "userFacingMessage": "string"
        }

        CRITICAL CLINICAL LOGIC & RULES:

        1. THE ROLLING SUMMARY (CRITICAL): 
        - You MUST retain patient age, gender, known conditions, and allergies if present. 
        - You MUST summarize current active symptoms.
        - You MUST record "pertinent negatives" (e.g., "Patient denies pain, redness, or itching"). If a patient says "no" to a symptom, save that "no" here so you don't ask again.

        2. CONVERSATIONAL TONE:
        - Be conversational, natural, and professional. 
        - DO NOT repeat phrases like "Thank you for letting us know" or "To help us understand this better." Vary your responses natively. 
        - Acknowledge their answer briefly, then move on.

        3. TRIAGE PHASES & EXIT CONDITION:
        - DEFINITIVE EMERGENCY: Trigger if symptoms unambiguously indicate a life threat (crushing chest pain, active heavy bleeding, etc.). isEmergency: true. userFacingMessage: DO NOT ask follow-up questions. Advise immediate emergency care.
        - GATHERING INFO (triageLevel: "Pending"): If you still need 1-2 critical pieces of info to safely triage, ask ONE targeted question. Do NOT ask about symptoms the patient has already denied.
        - TRIAGE COMPLETE (triageLevel: "Routine" or "Urgent"): ONCE YOU HAVE ENOUGH INFO to understand the situation, STOP ASKING QUESTIONS. Your userFacingMessage should provide a brief, reassuring clinical assessment of what might be happening (e.g., contact dermatitis from cashew oil) and advise them on next steps or which doctor to see. 

        Do not wrap the JSON in markdown blocks. Return only raw JSON.`;

        const promptData = [{ text: promptText }, ...imageParts];

        const rawText = await callGemini(
            'gemini-flash-latest',
            systemInstruction,
            promptData,
            { responseMimeType: 'application/json' }
        );

        const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

        let aiResponse;
        try {
            aiResponse = JSON.parse(cleaned);
        } catch (parseErr) {
            logger.error(`[ai-symptom-service] Gemini returned non-JSON: ${rawText.slice(0, 300)}`);
            return res.status(502).json({
                success: false,
                error: 'The AI returned an unexpected response. Please try again.',
            });
        }

        // Update session with AI response
        session.rollingSummary = aiResponse.rollingSummary;
        session.triageOutcome = {
            isEmergency: aiResponse.isEmergency,
            triageLevel: aiResponse.triageLevel,
            suggestedDepartment: aiResponse.suggestedDepartment,
        };
        session.messages.push({ role: 'ai', content: aiResponse.userFacingMessage });

        await session.save();

        logger.info(`[ai-symptom-service] Message processed | session: ${session._id} | emergency: ${aiResponse.isEmergency}`);

        res.status(200).json({ success: true, session });
    } catch (err) {
        logger.error(`[ai-symptom-service] sendMessage error: ${err.message}`);

        // Gemini rate limit — surface clearly to frontend
        if (err.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'AI service is currently busy. Please try again in a few moments.',
            });
        }

        // Invalid/expired API key — surface as a service-unavailable, not a generic 500
        const msg = String(err.message || '').toLowerCase();
        if (err.status === 400 || err.status === 403 || msg.includes('api key')) {
            return res.status(503).json({
                success: false,
                error: 'AI triage is temporarily unavailable. Please try again later or contact a doctor directly.',
            });
        }

        next(err);
    }
};

/**
 * @desc    Delete a specific session by ID.
 * @route   DELETE /api/ai/sessions/:sessionId
 * @access  Private — patient (own sessions only)
 */
export const deleteSession = async (req, res, next) => {
    try {
        const session = await AITriageSession.findById(req.params.sessionId);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found.' });
        }

        if (session.patientId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You are not authorized to delete this session.' });
        }

        await AITriageSession.findByIdAndDelete(req.params.sessionId);

        logger.info(`[ai-symptom-service] Session deleted: ${req.params.sessionId} | patient: ${req.user.id}`);

        res.status(200).json({ success: true, message: 'Session deleted successfully.' });
    } catch (err) {
        next(err);
    }
};