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
const durationSelectLandParcel = new Trend('duration_select_land_parcel')
const durationMultiFieldForm = new Trend('duration_multi_field_form')
const durationCheckDetails = new Trend('duration_check_details')
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
        duration_select_land_parcel: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_multi_field_form: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_check_details: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_summary: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_declaration: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_confirmation: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_print_submitted_application: [`p(95)<${P95_THRESHOLD_MS}`],
        checks: ['rate==1'],
        http_req_failed: ['rate==0']
    }
}

const users = new SharedArray('users', function () {
    const data = open('./dal-users.csv').split('\n').slice(1) // Skip header
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

        group('login-and-clear-state', () => {
            navigateTo(`${HOST_URL}/example-grant-with-auth/start`)
            submitForm({ crn: crn, password: 'x' })
            if (response.url.includes('/organisations')) {
                const sbiValue = response.html().find('#sbi').first().attr('value')
                submitForm({ sbi: sbiValue })
            }
            clickLink('Clear application state')
            navigateTo(`${HOST_URL}/example-grant-with-auth/start`)
        })

        group('start', () => {
            expect(response.url).to.include('start')
            durationStart.add(response.timings.duration)
            submitJourneyForm()
        })

        group('yes-no-field', () => {
            expect(response.url).to.include('yes-no-field')
            durationYesNoField.add(response.timings.duration)
            submitJourneyForm({ yesNoField: 'true' })
        })

        group('autocomplete-field', () => {
            expect(response.url).to.include('autocomplete-field')
            durationAutocompleteField.add(response.timings.duration)
            submitJourneyForm({ autocompleteField: 'ENG' })
        })

        group('radios-field', () => {
            expect(response.url).to.include('radios-field')
            durationRadiosField.add(response.timings.duration)
            submitJourneyForm({ radiosField: 'radiosFieldOption-A2' })
        })

        group('checkboxes-field', () => {
            expect(response.url).to.include('checkboxes-field')
            durationCheckboxesField.add(response.timings.duration)
            submitJourneyForm({ checkboxesField: 'checkboxesFieldOption-A1' })
        })

        group('number-field', () => {
            expect(response.url).to.include('number-field')
            durationNumberField.add(response.timings.duration)
            submitJourneyForm({ numberField: '100000' })
        })

        group('date-parts-field', () => {
            expect(response.url).to.include('date-parts-field')
            durationDatePartsField.add(response.timings.duration)
            const { day, month, year } = todayParts()
            submitJourneyForm({
                datePartsField__day: day,
                datePartsField__month: month,
                datePartsField__year: year
            })
        })

        group('month-year-field', () => {
            expect(response.url).to.include('month-year-field')
            durationMonthYearField.add(response.timings.duration)
            submitJourneyForm({
                monthYearField__month: '12',
                monthYearField__year: '2025'
            })
        })

        group('select-field', () => {
            expect(response.url).to.include('select-field')
            durationSelectField.add(response.timings.duration)
            submitJourneyForm({ selectField: 'selectFieldOption-A1' })
        })

        group('multiline-text-field', () => {
            expect(response.url).to.include('multiline-text-field')
            durationMultilineTextField.add(response.timings.duration)
            submitJourneyForm({ multilineTextField: 'Lorem ipsum' })
        })

        group('select-land-parcel', () => {
            expect(response.url).to.include('select-land-parcel')
            durationSelectLandParcel.add(response.timings.duration)
            const firstParcel = response.html().find('input[name="landParcels"]').first().attr('value')
            submitJourneyForm({ landParcels: firstParcel })
        })

        group('multi-field-form', () => {
            expect(response.url).to.include('multi-field-form')
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

        group('check-details', () => {
            expect(response.url).to.include('check-details')
            durationCheckDetails.add(response.timings.duration)
            submitJourneyForm({ detailsConfirmed: 'true' })
        })

        group('summary', () => {
            expect(response.url).to.include('summary')
            durationSummary.add(response.timings.duration)
            submitJourneyForm()
        })

        group('declaration', () => {
            expect(response.url).to.include('declaration')
            durationDeclaration.add(response.timings.duration)
            submitJourneyForm()
        })

        group('confirmation', () => {
            expect(response.url).to.include('confirmation')
            durationConfirmation.add(response.timings.duration)
            expect(response.body).to.include('EGWA-')
        })

        group('print-submitted-application', () => {
            const printPath = response.html().find(`a:contains('View / Print submitted application')`).attr('href')
            response = http.get(`${HOST_URL}${printPath}`)
            expect(response.url).to.include('print-submitted-application')
            durationPrintSubmittedApplication.add(response.timings.duration)
        })
    } catch (error) {
        console.error(`Error for URL: ${response?.url}, error: ${error.message}`)
        throw error
    }
}

function todayParts() {
    const today = new Date()
    return {
        day: String(today.getDate()).padStart(2, '0'),
        month: String(today.getMonth() + 1).padStart(2, '0'),
        year: String(today.getFullYear())
    }
}
