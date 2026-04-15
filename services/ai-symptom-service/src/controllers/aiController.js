import { GoogleGenerativeAI } from '@google/generative-ai';
import AITriageSession from '../models/AITriageSession.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import pdfParse from 'pdf-parse';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1);

// Helpers

/**
 * Processes selected files from Cloudinary.
 * PDFs → extracted as text (cheaper tokens).
 * Images → converted to base64 inline data for Gemini Vision.
 * Max 3 files — enforced in the route validator.
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
            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });

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
 *          Sorted by most recently updated — most recent chat appears first.
 *          Used to render the session list in the sidebar.
 *
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
 *          Patient can start as many sessions as they want.
 *          Optionally accepts a title and initial vitals context.
 *
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
 *
 *          The session must belong to the logged-in patient.
 *          Patient can continue any session at any time — there is no
 *          concept of a "completed" or "locked" session from the backend.
 *          If isEmergency is true in the response, the FRONTEND is responsible
 *          for showing the emergency alert and blocking further input.
 *          The backend stores the outcome but does not lock the session.
 *
 *          Request body:
 *          {
 *            message:         string          — required
 *            selectedReports: MedicalReport[] — optional, max 3
 *              [{ title, fileUrl, mimeType }]
 *          }
 *
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

        // Call Gemini with strict JSON output
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are a highly analytical clinical AI triage assistant. Analyze the CURRENT ROLLING SUMMARY and the NEW PATIENT MESSAGE. You MUST return a raw JSON object with EXACTLY this structure:
{
  "isEmergency": boolean,
  "triageLevel": "Pending" | "Routine" | "Urgent" | "Emergency",
  "suggestedDepartment": "string" or null,
  "rollingSummary": "string (A concise summary of ALL symptoms discussed so far, max 4 sentences)",
  "userFacingMessage": "string"
}

CRITICAL CLINICAL LOGIC & RULES:
1. DEFINITIVE EMERGENCY (isEmergency: true): ONLY trigger this if symptoms unambiguously indicate an immediate life threat (e.g., crushing chest pain, sudden facial drooping/paralysis, active heavy bleeding, explicit suicidal intent). -> userFacingMessage: DO NOT ask follow-up questions. Advise immediate emergency care.
2. AMBIGUOUS / POTENTIAL EMERGENCY (isEmergency: false, triageLevel: "Urgent"): If symptoms might be serious but are mild or vague, do NOT trigger emergency. -> userFacingMessage: Ask 1-2 targeted rule-out questions.
3. ROUTINE (isEmergency: false, triageLevel: "Routine" or "Pending"): -> userFacingMessage: Provide an empathetic reply and ask ONE relevant follow-up question.
4. ROLLING SUMMARY RETENTION: Always retain patient age, gender, known conditions, and allergies in rollingSummary if present. Never delete baseline profile data.

Do not wrap the JSON in markdown blocks. Return only raw JSON.`,
        });

        const promptData = [{ text: promptText }, ...imageParts];

        const completion = await model.generateContent({
            contents: [{ role: 'user', parts: promptData }],
            generationConfig: { responseMimeType: 'application/json' },
        });

        const aiResponse = JSON.parse(completion.response.text());

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
        next(err);
    }
};

/**
 * @desc    Delete a specific session by ID.
 *          Verifies session existence and patient ownership before deletion.
 *
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