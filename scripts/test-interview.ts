/**
 * Sprint 1 Test Script
 * Simulates a finance stakeholder interview end-to-end via HTTP API.
 *
 * Usage: npx tsx scripts/test-interview.ts
 *
 * Prerequisites:
 * - Server running on localhost:3000
 * - ANTHROPIC_API_KEY set in .env
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface ConversationResult {
  agent_message: string;
  rich_content: unknown[];
  section: string;
  session_status: string;
  contour_completeness: number;
}

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function log(label: string, data: unknown) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('═'.repeat(60));
  if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Sequential stakeholder responses — the agent drives section transitions
const STAKEHOLDER_MESSAGES = [
  // Section 1: Business Overview
  "We're organized into three main business lines: Commercial Banking, Retail Banking, and Wealth Management. Commercial is the biggest. They all roll up to the CEO but have their own P&Ls.",
  "Yes that's right. Commercial Banking has two sub-units: Corporate Lending and Trade Finance. Retail has Consumer Deposits and Mortgage. Wealth Management is a single group, no sub-units.",
  "We went through a reorg last year — Treasury Services used to be its own division but got folded into Commercial Banking in Q3 2025. That looks correct, let's move on.",

  // Section 2: System Authority
  "SAP is our ERP — it's the source of truth for cost centers, GL, and legal entities. HR hierarchy comes from Workday. Customer segmentation lives in Salesforce. Board reporting is mostly Excel maintained by the CFO's team.",
  "For legal entities, definitely SAP. We have 12 legal entities across 4 countries. There's sometimes a mismatch between SAP and Workday on department codes but SAP wins. Let's move on.",

  // Section 3: Dimensional Walkthrough
  "Those cost centers look right for Commercial Banking. Treasury Services should be under Commercial now, like I mentioned.",
  "The department list from Workday is correct. Geography is US, UK, Singapore, and Cayman Islands. Profit centers match our three business lines.",
  "We don't do ASC 280 segment reporting differently — our segments are the same as the business lines. I think that covers the dimensions, let's keep going.",

  // Section 4: Management Reporting
  "The board sees it by business line with a column for Corporate/Shared Services allocated out. The CFO adds manual adjustments for intercompany eliminations that don't flow through SAP cleanly.",
  "Key metrics: Revenue, Net Interest Income, Operating Expenses, and PPNR (Pre-Provision Net Revenue) by business line. Headcount too. That's the board view, let's move on.",

  // Section 5: Pain Points
  "Quarter-end close takes forever because we have to manually reconcile the legal entity P&L to the management view. That's easily a 3-day process.",
  "The other big pain is when someone asks 'show me Commercial Banking revenue by geography' — that requires pulling from three different systems and joining in Excel. Takes half a day.",
  "If I could have one report it would be: management P&L by business line by geography, with drill-down to cost center. If that just worked, I'd be thrilled. I think that covers everything.",
];

async function runInterview() {
  console.log('\n🏦 DCL Onboarding Agent — Test Interview');
  console.log('Simulating: Sarah Chen, VP of Finance at Meridian Financial Group\n');

  // 1. Create session
  const session = await api('POST', '/api/sessions', {
    customer_id: 'meridian-001',
    customer_name: 'Meridian Financial Group',
    stakeholder_name: 'Sarah Chen',
    stakeholder_role: 'VP of Finance & FP&A',
  });

  log('Session Created', {
    id: session.id,
    status: session.status,
    section: session.current_section,
  });

  const sessionId = session.id;

  // 2. Kick off
  log('STAKEHOLDER', 'Hi, ready to get started.');
  let result: ConversationResult = await api('POST', `/api/sessions/${sessionId}/messages`, {
    content: 'Hi, ready to get started.',
  });
  log(`AGENT [Section ${result.section}]`, result.agent_message);
  if (result.rich_content.length > 0) log('Rich Content', result.rich_content);

  // 3. Walk through all stakeholder messages sequentially
  for (const message of STAKEHOLDER_MESSAGES) {
    log(`STAKEHOLDER [Section ${result.section}]`, message);

    result = await api('POST', `/api/sessions/${sessionId}/messages`, {
      content: message,
    });

    log(`AGENT [Section ${result.section}]`, result.agent_message);

    if (result.rich_content.length > 0) {
      log('Rich Content', result.rich_content);
    }

    console.log(
      `  📊 Completeness: ${result.contour_completeness}% | Status: ${result.session_status} | Section: ${result.section}`,
    );

    if (result.session_status === 'COMPLETE') {
      console.log('\n🎉 Session marked COMPLETE by agent!');
      break;
    }
  }

  // 4. Fetch final contour map
  const contourMap = await api('GET', `/api/sessions/${sessionId}/contour`);
  log('Final Contour Map', {
    hierarchy_nodes: contourMap.organizational_hierarchy?.length ?? 0,
    sor_entries: contourMap.sor_authority_map?.length ?? 0,
    conflicts: contourMap.conflict_register?.length ?? 0,
    management_overlay_nodes: contourMap.management_overlay?.length ?? 0,
    vocabulary_entries: contourMap.vocabulary_map?.length ?? 0,
    priority_queries: contourMap.priority_queries?.length ?? 0,
    follow_up_tasks: contourMap.follow_up_tasks?.length ?? 0,
    completeness: contourMap.metadata?.completeness_score ?? 0,
  });

  // 5. Fetch follow-ups
  const followUps = await api('GET', `/api/sessions/${sessionId}/followups`);
  if (followUps.length > 0) {
    log('Follow-Up Tasks', followUps);
  }

  // 6. Final session state
  const finalSession = await api('GET', `/api/sessions/${sessionId}`);
  log('Final Session State', {
    status: finalSession.status,
    current_section: finalSession.current_section,
    section_status: finalSession.section_status,
  });

  console.log('\n✅ Test interview complete!\n');
}

runInterview().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
