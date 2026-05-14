import { Router } from "express";
import OpenAI from "openai";

const router = Router();

// Use AI Integrations if available, otherwise fall back to direct OPENAI_API_KEY
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined;

const openai = new OpenAI({
  apiKey,
  baseURL,
});

const SYSTEM_PROMPT = `You are Dio, the friendly AI assistant for Diolab - a diagnostic center management system for Indian healthcare providers.

Your primary responsibilities:
1. Help users understand Diolab's features and capabilities
2. Collect user feedback and suggestions
3. Guide users on how to get started and use different features
4. Answer questions about pricing, trial periods, and support

Key Information about Diolab:
- 60 Days Free Trial - no credit card required
- Core Features:
  * Patient Management with AI-powered duplicate detection
  * POS Billing System - generate invoices in under 30 seconds
  * Sample Tracking - real-time status from collection to reporting
  * AI-Powered Reports with patient-friendly summaries
  * Inventory Management with low stock alerts
  * Multi-Branch Support - manage multiple centers from one platform

- Advanced Features (New):
  * Online Booking Portal for patient self-service
  * Home Sample Collection with address capture
  * Custom Branding - upload logo, set custom colors
  * Mobile Responsive - works on tablets and phones
  * Affiliate Program - earn rewards for referrals
  * Advanced Analytics dashboards
  * AI Test Suggestions based on symptoms
  * Billing Anomaly Detection

Getting Started Steps:
1. Sign up for a free account (60 days trial)
2. Set up your organization details
3. Add your branches and staff
4. Configure your test catalog
5. Start registering patients and generating bills

When collecting feedback:
- Thank the user warmly for their feedback
- Acknowledge their specific points
- Let them know their feedback helps improve Diolab
- Ask if there's anything else they'd like to share

Keep responses:
- Friendly and conversational
- Concise (2-3 short paragraphs max)
- Helpful and informative
- Professional but warm

If asked about technical issues or bugs, recommend contacting support at the Contact Us page.`;

router.post("/dio-assistant", async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    console.log("Dio Assistant request received:", { message: message?.substring(0, 50) });

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Check if any OpenAI API key is configured
    if (!apiKey) {
      console.error("Dio Assistant: No API key configured. AI_INTEGRATIONS_OPENAI_API_KEY:", !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY, "OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY);
      return res.status(500).json({ error: "AI service not configured" });
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: message });

    console.log("Dio Assistant: Calling OpenAI API...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

    console.log("Dio Assistant: Response received successfully");

    res.json({ response });
  } catch (error: any) {
    console.error("Dio Assistant error:", error?.message || error);
    console.error("Dio Assistant error details:", {
      name: error?.name,
      status: error?.status,
      code: error?.code,
    });
    
    // Provide more specific error messages
    let errorMessage = "Failed to get response from assistant";
    if (error?.status === 401) {
      errorMessage = "AI service authentication failed";
    } else if (error?.status === 429) {
      errorMessage = "AI service is busy. Please try again in a moment.";
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      errorMessage = "Could not connect to AI service. Please try again.";
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
