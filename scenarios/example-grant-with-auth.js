import http from 'k6/http'
import { sleep, group } from 'k6'
import { expect } from './lib/k6chaijs.js'
import { SharedArray } from 'k6/data'
import { Trend } from 'k6/metrics'

const HOST_URL = __ENV.HOST_URL || 'https://grants-ui.perf-test.cdp-int.defra.cloud'
const DURATION_SECONDS = __ENV.DURATION_SECONDS || 180
const RAMPUP_SECONDS = __ENV.RAMPUP_SECONDS || 30
const VU_COUNT = __ENV.VU_COUNT || 100
const P95_THRESHOLD_MS = __ENV.P95_THRESHOLD_MS || 3000

const durationStart = new Trend('duration_start')
const durationYesNoField = new Trend('duration_yes_no_field')
const durationAutocompleteField = new Trend('duration_autocomplete_field')
const durationRadiosField = new Trend('duration_radios_field')
const durationCheckboxesField = new Trend('duration_checkboxes_field')
const durationNumberField = new Trend('duration_number_field')
const durationDatePartsField = new Trend('duration_date_parts_field')
const durationMonthYearField = new Trend('duration_month_year_field')
const durationSelectField = new Trend('duration_select_field')
const durationMultilineTextField = new Trend('duration_multiline_text_field')
const durationMultiFieldForm = new Trend('duration_multi_field_form')
const durationSummary = new Trend('duration_summary')
const durationDeclaration = new Trend('duration_declaration')
const durationConfirmation = new Trend('duration_confirmation')
const durationPrintSubmittedApplication = new Trend('duration_print_submitted_application')

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
        duration_start: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_yes_no_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_autocomplete_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_radios_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_checkboxes_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_number_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_date_parts_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_month_year_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_select_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_multiline_text_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_multi_field_form: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_summary: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_declaration: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_confirmation: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_print_submitted_application: [`p(95)<${P95_THRESHOLD_MS}`],
        http_req_failed: ['rate==0']
    }
}

const users = new SharedArray('users', function () {
    const data = open('./users.csv').split('\n').slice(1) // Skip header
    return data.filter(line => line.trim()).map(line => line.trim())
})

export default function () {
    let response = null

    const navigateTo = function (url) {
        response = http.get(url)
    }

    const clickLink = function (text) {
        response = response.clickLink({ selector: `a:contains('${text}')` })
    }

    const submitForm = function (fields) {
        response = response.submitForm({ formSelector: 'form', fields: fields })
    }

    const submitJourneyForm = function (fields) {
        sleep(3) // Mimic human interaction
        fields = fields ?? {}
        let crumb = response.html().find(`input[name='crumb']`).attr('value')
        fields['crumb'] = crumb
        submitForm(fields)
    }

    try {
        const crn = users[__VU % users.length]

        group('navigate', () => {
            navigateTo(`${HOST_URL}/example-grant-with-auth/start`)
        })

        group('login', () => {
            submitForm({ crn: crn, password: 'x' })
        })

        group('organisations', () => {
            if (response.url.includes('/organisations')) {
                const sbiValue = response.html().find('#sbi').first().attr('value')
                submitForm({ sbi: sbiValue })
            }
        })

        group('clear-state', () => {
            clickLink('Clear application state')
        })

        group('start', () => {
            durationStart.add(response.timings.duration)
            submitJourneyForm()
        })

        group('yes-no-field', () => {
            durationYesNoField.add(response.timings.duration)
            submitJourneyForm({ yesNoField: 'true' })
        })

        group('autocomplete-field', () => {
            durationAutocompleteField.add(response.timings.duration)
            submitJourneyForm({ autocompleteField: 'ENG' })
        })

        group('radios-field', () => {
            durationRadiosField.add(response.timings.duration)
            submitJourneyForm({ radiosField: 'radiosFieldOption-A2' })
        })

        group('checkboxes-field', () => {
            durationCheckboxesField.add(response.timings.duration)
            submitJourneyForm({ checkboxesField: 'checkboxesFieldOption-A1' })
        })

        group('number-field', () => {
            durationNumberField.add(response.timings.duration)
            submitJourneyForm({ numberField: '100000' })
        })

        group('date-parts-field', () => {
            durationDatePartsField.add(response.timings.duration)
            submitJourneyForm({
                datePartsField__day: '01',
                datePartsField__month: '03',
                datePartsField__year: '2026'
            })
        })

        group('month-year-field', () => {
            durationMonthYearField.add(response.timings.duration)
            submitJourneyForm({
                monthYearField__month: '12',
                monthYearField__year: '2025'
            })
        })

        group('select-field', () => {
            durationSelectField.add(response.timings.duration)
            submitJourneyForm({ selectField: 'selectFieldOption-A1' })
        })

        group('multiline-text-field', () => {
            durationMultilineTextField.add(response.timings.duration)
            submitJourneyForm({ multilineTextField: 'Lorem ipsum' })
        })

        group('multi-field-form', () => {
            durationMultiFieldForm.add(response.timings.duration)
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
            durationSummary.add(response.timings.duration)
            submitJourneyForm()
        })

        group('declaration', () => {
            durationDeclaration.add(response.timings.duration)
            submitJourneyForm()
        })

        group('confirmation', () => {
            durationConfirmation.add(response.timings.duration)
            expect(response.body).to.include('EGWA-')
        })

        group('print-submitted-application', () => {
            const printPath = response.html().find(`a:contains('View / Print submitted application')`).attr('href')
            response = http.get(`${HOST_URL}${printPath}`)
            durationPrintSubmittedApplication.add(response.timings.duration)
        })
    } catch (error) {
        console.error(`Error for URL: ${response?.url}, error: ${error.message}`)
        throw error
    }
}
