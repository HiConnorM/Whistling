import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'

export interface WeeklyBriefProps {
  businessName: string
  periodLabel: string
  pulseScore: number
  pulsePrevious?: number
  biggestWin: string
  biggestRisk: string
  bestAction: string
  topComplaints: Array<{ topic: string; count: number; change?: number }>
  topPraises: Array<{ topic: string; count: number }>
  customerRequests: Array<{ request: string; count: number }>
  competitorHighlight?: string
  recommendedActions: Array<{ title: string; category: string; priority: string }>
  dashboardUrl: string
  reportUrl: string
  unsubscribeUrl: string
}

const PULSE_COLOR = (score: number) => {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#2563eb'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

export function WeeklyBrief({
  businessName,
  periodLabel,
  pulseScore,
  pulsePrevious,
  biggestWin,
  biggestRisk,
  bestAction,
  topComplaints,
  topPraises,
  customerRequests,
  competitorHighlight,
  recommendedActions,
  dashboardUrl,
  reportUrl,
  unsubscribeUrl,
}: WeeklyBriefProps) {
  const pulseChange = pulsePrevious !== undefined ? pulseScore - pulsePrevious : undefined
  const pulseColor = PULSE_COLOR(pulseScore)

  return (
    <Html>
      <Head />
      <Preview>
        {businessName} Weekly Intelligence Brief — {periodLabel}
      </Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] px-4 py-8">
            {/* Header */}
            <Section className="mb-6 text-center">
              <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Whistling.io
              </Text>
              <Heading className="mt-2 text-2xl font-bold text-gray-900">{businessName}</Heading>
              <Text className="text-sm text-gray-500">Weekly Intelligence Brief · {periodLabel}</Text>
            </Section>

            {/* Pulse Score */}
            <Section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Text className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-500">
                Business Pulse Score
              </Text>
              <Text
                className="text-6xl font-bold leading-none"
                style={{ color: pulseColor }}
              >
                {pulseScore}
              </Text>
              <Text className="mt-1 text-sm text-gray-400">/ 100</Text>
              {pulseChange !== undefined && (
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: pulseChange >= 0 ? '#16a34a' : '#dc2626' }}
                >
                  {pulseChange >= 0 ? '↑' : '↓'} {Math.abs(pulseChange)} points from last week
                </Text>
              )}
            </Section>

            {/* Three key cards */}
            <Section className="mb-6">
              <Row>
                <Column className="pr-2">
                  <Section className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                      Biggest Win
                    </Text>
                    <Text className="text-sm text-gray-800">{biggestWin}</Text>
                  </Section>
                </Column>
                <Column className="pl-2">
                  <Section className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                      Biggest Risk
                    </Text>
                    <Text className="text-sm text-gray-800">{biggestRisk}</Text>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* Best action */}
            <Section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Best Move This Week
              </Text>
              <Text className="text-sm text-gray-800">{bestAction}</Text>
            </Section>

            <Hr className="my-6 border-gray-200" />

            {/* Complaints */}
            <Section className="mb-6">
              <Heading className="mb-3 text-base font-semibold text-gray-900">
                Top Complaints
              </Heading>
              {topComplaints.slice(0, 5).map((c, i) => (
                <Row key={i} className="mb-2">
                  <Column className="w-8 text-sm font-medium text-gray-400">{i + 1}.</Column>
                  <Column className="flex-1">
                    <Text className="text-sm text-gray-800">{c.topic}</Text>
                  </Column>
                  <Column className="w-20 text-right">
                    <Text className="text-sm font-medium text-gray-600">
                      {c.count} mentions
                      {c.change !== undefined && c.change !== 0 && (
                        <span style={{ color: c.change > 0 ? '#dc2626' : '#16a34a', marginLeft: 4 }}>
                          {c.change > 0 ? '+' : ''}{c.change}%
                        </span>
                      )}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            {/* Praises */}
            <Section className="mb-6">
              <Heading className="mb-3 text-base font-semibold text-gray-900">
                What Customers Love
              </Heading>
              {topPraises.slice(0, 5).map((p, i) => (
                <Row key={i} className="mb-2">
                  <Column className="w-8 text-sm font-medium text-gray-400">{i + 1}.</Column>
                  <Column className="flex-1">
                    <Text className="text-sm text-gray-800">{p.topic}</Text>
                  </Column>
                  <Column className="w-20 text-right">
                    <Text className="text-sm font-medium text-green-600">{p.count} mentions</Text>
                  </Column>
                </Row>
              ))}
            </Section>

            {/* Customer Requests */}
            {customerRequests.length > 0 && (
              <Section className="mb-6 rounded-lg bg-gray-50 p-4">
                <Heading className="mb-3 text-base font-semibold text-gray-900">
                  Customers Are Asking For
                </Heading>
                {customerRequests.slice(0, 5).map((r, i) => (
                  <Text key={i} className="mb-1 text-sm text-gray-700">
                    · {r.request} ({r.count} mentions)
                  </Text>
                ))}
              </Section>
            )}

            {/* Competitor highlight */}
            {competitorHighlight && (
              <Section className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Competitor Intelligence
                </Text>
                <Text className="text-sm text-gray-800">{competitorHighlight}</Text>
              </Section>
            )}

            <Hr className="my-6 border-gray-200" />

            {/* Recommended Actions */}
            <Section className="mb-6">
              <Heading className="mb-3 text-base font-semibold text-gray-900">
                Recommended Actions
              </Heading>
              {recommendedActions.slice(0, 3).map((action, i) => (
                <Section
                  key={i}
                  className="mb-3 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <Row>
                    <Column className="flex-1">
                      <Text className="text-sm font-medium text-gray-900">{action.title}</Text>
                      <Text className="text-xs text-gray-500 capitalize">
                        {action.category} · {action.priority} priority
                      </Text>
                    </Column>
                  </Row>
                </Section>
              ))}
            </Section>

            {/* CTA */}
            <Section className="mb-8 text-center">
              <Button
                href={reportUrl}
                className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white"
              >
                View Full Report
              </Button>
              <Text className="mt-3 text-xs text-gray-400">
                Or open your{' '}
                <a href={dashboardUrl} className="text-gray-600 underline">
                  dashboard
                </a>
              </Text>
            </Section>

            {/* Footer */}
            <Hr className="border-gray-200" />
            <Section className="mt-4 text-center">
              <Text className="text-xs text-gray-400">
                Whistling.io · Customer Intelligence for Local Businesses
              </Text>
              <Text className="mt-1 text-xs text-gray-400">
                <a href={unsubscribeUrl} className="text-gray-400 underline">
                  Unsubscribe
                </a>{' '}
                · You're receiving this because you signed up for Whistling.io
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default WeeklyBrief
