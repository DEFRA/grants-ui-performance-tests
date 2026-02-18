import http from 'k6/http'
import { sleep, group } from 'k6'
import { describe, expect } from './lib/k6chaijs.js'
import { SharedArray } from 'k6/data'
import { Trend } from 'k6/metrics'

const journeyDuration = new Trend('journey_http_req_duration')

const DURATION_SECONDS = __ENV.DURATION_SECONDS || 180
const RAMPUP_SECONDS = __ENV.RAMPUP_SECONDS || 30
const VU_COUNT = __ENV.VU_COUNT || 100
const P95_THRESHOLD_MS = __ENV.P95_THRESHOLD_MS || 3000
const BASE_URL = __ENV.BASE_URL || 'https://grants-ui.perf-test.cdp-int.defra.cloud'

export const options = {
    scenarios: {
        journey: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: `${RAMPUP_SECONDS}s`, target: VU_COUNT },
                { duration: `${DURATION_SECONDS - RAMPUP_SECONDS}s`, target: VU_COUNT }
            ],
            gracefulRampDown: '0s',
            gracefulStop: '10s'
        },
    },
    thresholds: {
        // 95th percentile for journey requests should be less than P95_THRESHOLD_MS
        journey_http_req_duration: [`p(95)<${P95_THRESHOLD_MS}`]
    },
}

export default function () {
    describe('example-grant-with-auth', (t) => { performJourney() })
}

const users = new SharedArray('users', function () {
    const data = open('./users.csv').split('\n').slice(1) // Skip header
    return data.filter(line => line.trim()).map(line => line.trim())
})

function performJourney() {
    let response = null

    const navigateTo = function(url) {
        response = http.get(url)
        expect(response.status).to.equal(200)
    }

    const clickLink = function(text) {
        response = response.clickLink({ selector: `a:contains('${text}')` })
        expect(response.status).to.equal(200)
    }

    const submitForm = function (fields) {
        response = response.submitForm({ formSelector: 'form', fields: fields })
        expect(response.status).to.equal(200)
    }

    const submitJourneyForm = function (fields) {
        sleep(3) // Mimic human interaction
        fields = fields ?? {}
        let crumb = response.html().find(`input[name='crumb']`).attr('value')
        fields['crumb'] = crumb
        submitForm(fields)
        journeyDuration.add(response.timings.duration)
    }

    try {
        const crn = users[__VU % users.length]

        group('navigate', () => {
            navigateTo(`${BASE_URL}/example-grant-with-auth/start/`)
        })

        group('login', () => {
            submitForm({crn: crn, password: 'x'})
        })

        group('clear-state', () => {
            clickLink('Clear application state')
        })

        group('start', () => {
            submitJourneyForm()
        })

        group('yes-no-field', () => {
            submitJourneyForm({ yesNoField: 'true' })
        })

        group('autocomplete-field', () => {
            submitJourneyForm({ autocompleteField: 'ENG' })
        })

        group('radios-field', () => {
            submitJourneyForm({ radiosField: 'radiosFieldOption-A2' })
        })

        group('checkboxes-field', () => {
            submitJourneyForm({ checkboxesField: 'checkboxesFieldOption-A1' })
        })

        group('number-field', () => {
            submitJourneyForm({ numberField: '100000' })
        })

        group('date-parts-field', () => {
            submitJourneyForm({
                datePartsField__day: '01',
                datePartsField__month: '03',
                datePartsField__year: '2026'
            })
        })

        group('month-year-field', () => {
            submitJourneyForm({
                monthYearField__month: '12',
                monthYearField__year: '2025'
            })
        })

        group('select-field', () => {
            submitJourneyForm({ selectField: 'selectFieldOption-A1' })
        })

        group('multiline-text-field', () => {
            submitJourneyForm({ multilineTextField: 'Lorem ipsum' })
        })

        group('multi-field-form', () => {
            submitJourneyForm({
                applicantName: 'James Test-Farmer',
                applicantEmail: 'cl-defra-gae-test-applicant-email@equalexperts.com',
                applicantMobile: '07777 123456',
                applicantBusinessAddress__uprn: '',
                applicantBusinessAddress__addressLine1: 'Test Farm',
                applicantBusinessAddress__addressLine2: 'Cogenhoe',
                applicantBusinessAddress__town: 'Northampton',
                applicantBusinessAddress__county: 'Northamptonshire',
                applicantBusinessAddress__postcode: 'NN7 1NN'
            })
        })

        group('summary', () => {
            submitJourneyForm()
        })

        group('declaration', () => {
            submitJourneyForm()
        })

        group('confirmation', () => {
            expect(response.body).to.include('EGWA-')
        })
    } catch (error) {
        console.error(`Error for URL: ${response?.url}, error: ${error.message}`)
        throw error
    }
}
