import { Resend } from 'resend'
import { render } from '@react-email/components'
import type { WeeklyBriefProps } from './templates/WeeklyBrief.js'
import { WeeklyBrief } from './templates/WeeklyBrief.js'
import * as React from 'react'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env['RESEND_API_KEY']
    if (!key) throw new Error('RESEND_API_KEY not set')
    _resend = new Resend(key)
  }
  return _resend
}

export async function sendWeeklyBrief(
  to: string,
  props: WeeklyBriefProps,
): Promise<{ id: string }> {
  const resend = getResend()
  const from = process.env['EMAIL_FROM'] ?? 'intelligence@whistling.io'

  const html = await render(React.createElement(WeeklyBrief, props))
  const text = buildTextVersion(props)

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `${props.businessName} — ${props.periodLabel} Intelligence Brief`,
    html,
    text,
    headers: {
      'X-Entity-Ref-ID': `report-${Date.now()}`,
    },
  })

  if (error) throw new Error(`Email send failed: ${error.message}`)
  if (!data) throw new Error('Email send returned no data')

  return { id: data.id }
}

function buildTextVersion(props: WeeklyBriefProps): string {
  return `
${props.businessName} — Weekly Intelligence Brief
${props.periodLabel}

PULSE SCORE: ${props.pulseScore}/100${props.pulsePrevious !== undefined ? ` (was ${props.pulsePrevious})` : ''}

BIGGEST WIN:
${props.biggestWin}

BIGGEST RISK:
${props.biggestRisk}

BEST MOVE THIS WEEK:
${props.bestAction}

TOP COMPLAINTS:
${props.topComplaints.slice(0, 5).map((c, i) => `${i + 1}. ${c.topic} (${c.count} mentions)`).join('\n')}

WHAT CUSTOMERS LOVE:
${props.topPraises.slice(0, 5).map((p, i) => `${i + 1}. ${p.topic} (${p.count} mentions)`).join('\n')}

CUSTOMERS ARE ASKING FOR:
${props.customerRequests.slice(0, 5).map((r) => `· ${r.request} (${r.count} mentions)`).join('\n')}

${props.competitorHighlight ? `COMPETITOR INTELLIGENCE:\n${props.competitorHighlight}\n` : ''}

RECOMMENDED ACTIONS:
${props.recommendedActions.slice(0, 3).map((a, i) => `${i + 1}. ${a.title}`).join('\n')}

View full report: ${props.reportUrl}
Dashboard: ${props.dashboardUrl}

---
Unsubscribe: ${props.unsubscribeUrl}
Whistling.io — Customer Intelligence for Local Businesses
`.trim()
}
