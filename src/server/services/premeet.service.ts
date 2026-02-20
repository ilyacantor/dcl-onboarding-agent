import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import type { IntelBrief } from '../types/intel.types.js';
import type { PreMeetRequest } from '../types/intel.types.js';

const anthropic = new Anthropic();

/**
 * Generate a pre-meeting request email based on the intel brief.
 * Returns the structured request with email content.
 */
export async function generatePreMeetRequest(
  sessionId: string,
  customerName: string,
  stakeholderName: string,
  stakeholderRole: string,
  stakeholderEmail: string,
  intelBrief: IntelBrief | null,
  portalBaseUrl: string,
): Promise<PreMeetRequest> {
  const uploadUrl = `${portalBaseUrl}/premeet/${sessionId}`;

  // Use Claude to generate a personalized, professional email
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Generate a professional pre-meeting email for an enterprise data onboarding session.

Context:
- Customer: ${customerName}
- Stakeholder: ${stakeholderName} (${stakeholderRole})
- Upload portal: ${uploadUrl}
${intelBrief ? `- Known systems: ${intelBrief.known_systems.join(', ') || 'None identified'}` : ''}
${intelBrief ? `- Known structure: ${intelBrief.public_structure.join(', ') || 'None identified'}` : ''}

The email should:
1. Be concise and professional (under 200 words)
2. Explain we're preparing for a data configuration interview
3. Request specific artifacts that would speed up the session
4. Include the upload portal link
5. Be warm but efficient

Return a JSON object with:
{
  "subject": "Email subject line",
  "body": "Full email body text",
  "requested_artifacts": ["List of specific artifacts requested"]
}

Return ONLY valid JSON, no markdown.`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      session_id: sessionId,
      stakeholder_email: stakeholderEmail,
      subject: parsed.subject || `Preparing for your ${customerName} data onboarding session`,
      body: parsed.body || getDefaultEmailBody(stakeholderName, customerName, uploadUrl),
      requested_artifacts: parsed.requested_artifacts || getDefaultArtifacts(),
      upload_portal_url: uploadUrl,
    };
  } catch {
    return {
      session_id: sessionId,
      stakeholder_email: stakeholderEmail,
      subject: `Preparing for your ${customerName} data onboarding session`,
      body: getDefaultEmailBody(stakeholderName, customerName, uploadUrl),
      requested_artifacts: getDefaultArtifacts(),
      upload_portal_url: uploadUrl,
    };
  }
}

/**
 * Send the pre-meeting request email via SMTP.
 */
export async function sendPreMeetEmail(
  request: PreMeetRequest,
): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || 'onboarding@autonomos.ai';

  if (!smtpHost || !smtpUser) {
    // No SMTP configured — log and return without error
    console.log('SMTP not configured. Pre-meeting email content:');
    console.log(`  To: ${request.stakeholder_email}`);
    console.log(`  Subject: ${request.subject}`);
    console.log(`  Body: ${request.body.slice(0, 200)}...`);
    return {
      sent: false,
      error: 'SMTP not configured. Email logged to console.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const info = await transporter.sendMail({
      from: fromEmail,
      to: request.stakeholder_email,
      subject: request.subject,
      text: request.body,
      html: formatEmailHtml(request),
    });

    return { sent: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { sent: false, error: message };
  }
}

function getDefaultEmailBody(
  stakeholderName: string,
  customerName: string,
  uploadUrl: string,
): string {
  return `Hi ${stakeholderName},

We're preparing for your upcoming data configuration session for ${customerName}. To make the most of our time together, it would be helpful if you could share a few documents ahead of our meeting.

If you have any of the following readily available, please upload them here:
${uploadUrl}

Helpful documents:
- Chart of accounts or cost center listing (Excel/CSV)
- Organizational chart or reporting structure
- List of key systems and their purposes
- Any recent org structure changes or planned reorganizations

Don't worry if you don't have all of these — we'll work with whatever is available. Even a quick screenshot of your org chart would be helpful.

Looking forward to our session!

Best regards,
DCL Onboarding Team`;
}

function getDefaultArtifacts(): string[] {
  return [
    'Chart of accounts or cost center listing',
    'Organizational chart',
    'List of key enterprise systems',
    'Recent restructuring documentation',
  ];
}

function formatEmailHtml(request: PreMeetRequest): string {
  const artifacts = request.requested_artifacts
    .map((a) => `<li>${a}</li>`)
    .join('\n');

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  ${request.body.split('\n').map((line) => `<p style="margin: 8px 0;">${line}</p>`).join('')}

  <div style="margin: 20px 0; padding: 16px; background: #f7f7f7; border-radius: 8px;">
    <strong>Upload your files here:</strong><br>
    <a href="${request.upload_portal_url}" style="color: #2563eb;">${request.upload_portal_url}</a>
  </div>

  <p style="color: #666; font-size: 13px;">
    Accepted formats: Excel (.xlsx, .csv), PDF, images (screenshots), Word documents
  </p>
</div>`;
}
