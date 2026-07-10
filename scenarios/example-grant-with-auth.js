import http from 'k6/http'
import { sleep, group } from 'k6'
import { expect } from './lib/k6chaijs.js'
import { SharedArray } from 'k6/data'
import { Trend, Counter } from 'k6/metrics'

const HOST_URL = __ENV.HOST_URL || 'https://grants-ui.perf-test.cdp-int.defra.cloud'
const DURATION_SECONDS = __ENV.DURATION_SECONDS || 180
const RAMPUP_SECONDS = __ENV.RAMPUP_SECONDS || 30
const VU_COUNT = __ENV.VU_COUNT || 100
const P95_THRESHOLD_MS = __ENV.P95_THRESHOLD_MS || 3000

const successfulLogins = new Counter('successful_logins')

const durationStart = new Trend('duration_start')
const durationCheckDetails = new Trend('duration_check_details')
const durationUpdateDetails = new Trend('duration_update_details')
const durationYesNoField = new Trend('duration_yes_no_field')
const durationAutocompleteField = new Trend('duration_autocomplete_field')
const durationRadiosField = new Trend('duration_radios_field')
const durationTerminalPage = new Trend('duration_terminal_page')
const durationConditionalPage = new Trend('duration_conditional_page')
const durationCheckboxesField = new Trend('duration_checkboxes_field')
const durationNumberFieldValidation = new Trend('duration_number_field_validation')
const durationNumberTooHigh = new Trend('duration_number_too_high')
const durationNumberFieldRouting = new Trend('duration_number_field_routing')
const durationDatePartsField = new Trend('duration_date_parts_field')
const durationMonthYearField = new Trend('duration_month_year_field')
const durationSelectField = new Trend('duration_select_field')
const durationMultilineTextField = new Trend('duration_multiline_text_field')
const durationEmailAddressField = new Trend('duration_email_address_field')
const durationTelephoneNumberField = new Trend('duration_telephone_number_field')
const durationUkAddressField = new Trend('duration_uk_address_field')
const durationLocationComponents = new Trend('duration_location_components')
const durationHiddenField = new Trend('duration_hidden_field')
const durationMultiFieldForm = new Trend('duration_multi_field_form')
const durationRepeatPage = new Trend('duration_repeat_page')
const durationSelectLandParcel = new Trend('duration_select_land_parcel')
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
        duration_check_details: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_update_details: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_yes_no_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_terminal_page: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_autocomplete_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_radios_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_conditional_page: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_checkboxes_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_number_field_validation: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_number_too_high: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_number_field_routing: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_date_parts_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_month_year_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_select_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_multiline_text_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_email_address_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_telephone_number_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_uk_address_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_location_components: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_hidden_field: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_multi_field_form: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_repeat_page: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_select_land_parcel: [`p(95)<${Math.min(P95_THRESHOLD_MS * 1.5, 3000)}`],
        duration_summary: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_declaration: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_confirmation: [`p(95)<${P95_THRESHOLD_MS}`],
        duration_print_submitted_application: [`p(95)<${P95_THRESHOLD_MS}`],
        successful_logins: ['count>0'],
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
        response = response.submitForm({
            formSelector: `form:not([action='/cookies'])`,
            fields: fields
        })
    }

    const submitJourneyForm = function (fields) {
        // Assign the page trend before submitting so it is recorded against
        // the response produced by this page's form submission.
        sleep(3) // Mimic human interaction
        fields = fields ?? {}
        let crumb = response.html().find(`input[name='crumb']`).attr('value')
        fields['crumb'] = crumb
        submitForm(fields)
        if (pendingTrend) {
            pendingTrend.add(response.timings.duration)
            pendingTrend = null
        }
    }

    let pendingTrend = null

    try {
        const crn = users[__VU % users.length]

        group('login-and-clear-state', () => {
            navigateTo(`${HOST_URL}/example-grant-with-auth`)
            submitForm({ crn: crn, password: 'x' })
            if (response.url.includes('/organisations')) {
                const sbiValue = response.html().find('#sbi').first().attr('value')
                submitForm({ sbi: sbiValue })
            }
            expect(response.url).to.include(HOST_URL)
            successfulLogins.add(1)
            clickLink('Clear application state')
            navigateTo(`${HOST_URL}/example-grant-with-auth`)
        })

        group('start', () => {
            expect(response.url).to.include('start')
            pendingTrend = durationStart
            submitJourneyForm()
        })

        group('check-details', () => {
            expect(response.url).to.include('check-details')
            pendingTrend = durationCheckDetails
            submitJourneyForm({ detailsConfirmed: 'false' })
        })

        group('update-details', () => {
            expect(response.url).to.include('update-details')
            pendingTrend = durationUpdateDetails
            navigateTo(`${HOST_URL}/example-grant-with-auth/check-details`)
            submitJourneyForm({ detailsConfirmed: 'true' })
        })

        group('yes-no-field', () => {
            expect(response.url).to.include('yes-no-field')
            pendingTrend = durationYesNoField
            submitJourneyForm({ yesNoField: 'false' })
        })

        group('terminal-page', () => {
            expect(response.url).to.include('terminal-page')
            pendingTrend = durationTerminalPage
            navigateTo(`${HOST_URL}/example-grant-with-auth/yes-no-field`)
            submitJourneyForm({ yesNoField: 'true' })
        })

        group('autocomplete-field', () => {
            expect(response.url).to.include('autocomplete-field')
            pendingTrend = durationAutocompleteField
            submitJourneyForm({ autocompleteField: 'ENG' })
        })

        group('radios-field', () => {
            expect(response.url).to.include('radios-field')
            pendingTrend = durationRadiosField
            // Option one triggers the conditional-page branch
            submitJourneyForm({ radiosField: 'radiosFieldOption-A1' })
        })

        group('conditional-page', () => {
            expect(response.url).to.include('conditional-page')
            pendingTrend = durationConditionalPage
            submitJourneyForm()
        })

        group('checkboxes-field', () => {
            expect(response.url).to.include('checkboxes-field')
            pendingTrend = durationCheckboxesField
            submitJourneyForm({ checkboxesField: ['checkboxesFieldOption-A2', 'checkboxesFieldOption-A3'] })
        })

        group('checkboxes-follow-up', () => {
            expect(response.url).to.include('checkboxes-follow-up')
            submitJourneyForm()
        })

        group('number-field-validation', () => {
            expect(response.url).to.include('number-field-validation')
            pendingTrend = durationNumberFieldValidation
            submitJourneyForm({ numberFieldValidation: '100000' })
        })

        group('number-field-routing', () => {
            expect(response.url).to.include('number-field-routing')
            pendingTrend = durationNumberFieldRouting
            submitJourneyForm({ numberFieldRouting: '150000' })
        })

        group('number-too-high', () => {
            expect(response.url).to.include('number-too-high')
            pendingTrend = durationNumberTooHigh
            navigateTo(`${HOST_URL}/example-grant-with-auth/number-field-routing`)
            submitJourneyForm({ numberFieldRouting: '50000' })
        })

        group('date-parts-field', () => {
            expect(response.url).to.include('date-parts-field')
            pendingTrend = durationDatePartsField
            const { day, month, year } = todayParts()
            submitJourneyForm({
                datePartsField__day: day,
                datePartsField__month: month,
                datePartsField__year: year
            })
        })

        group('month-year-field', () => {
            expect(response.url).to.include('month-year-field')
            pendingTrend = durationMonthYearField
            submitJourneyForm({
                monthYearField__month: '12',
                monthYearField__year: '2025'
            })
        })

        group('select-field', () => {
            expect(response.url).to.include('select-field')
            pendingTrend = durationSelectField
            submitJourneyForm({ selectField: 'selectFieldOption-A3' })
        })

        group('multiline-text-field', () => {
            expect(response.url).to.include('multiline-text-field')
            pendingTrend = durationMultilineTextField
            submitJourneyForm({ multilineTextField: 'Lorem ipsum' })
        })

        group('email-address-field', () => {
            expect(response.url).to.include('email-address-field')
            pendingTrend = durationEmailAddressField
            submitJourneyForm({ emailAddressField: 'test@example.com' })
        })

        group('telephone-number-field', () => {
            expect(response.url).to.include('telephone-number-field')
            pendingTrend = durationTelephoneNumberField
            submitJourneyForm({ telephoneNumberField: '01234 567890' })
        })

        group('uk-address-field', () => {
            expect(response.url).to.include('uk-address-field')
            pendingTrend = durationUkAddressField
            submitJourneyForm({
                ukAddressField__addressLine1: '1 Example Street',
                ukAddressField__town: 'Exampleton',
                ukAddressField__postcode: 'EX1 1EX'
            })
        })

        group('location-components', () => {
            expect(response.url).to.include('location-components')
            pendingTrend = durationLocationComponents
            submitJourneyForm({
                eastingNorthingField__easting: '530000',
                eastingNorthingField__northing: '180000',
                osGridRefField: 'ST 678 678',
                nationalGridFieldNumberField: 'NG 1234 5678',
                latLongField__latitude: '51.519450',
                latLongField__longitude: '-0.127758',
                geospatialField: '[{"type":"Feature","properties":{"description":"Example location","coordinateGridReference":"ST 00001","centroidGridReference":"ST 00001"},"geometry":{"coordinates":[-2.5723699109417737,53.2380485215034],"type":"Point"},"id":"a"}]'
            })
        })

        group('hidden-field', () => {
            expect(response.url).to.include('hidden-field')
            pendingTrend = durationHiddenField
            submitJourneyForm()
        })

        group('multi-field-form', () => {
            expect(response.url).to.include('multi-field-form')
            pendingTrend = durationMultiFieldForm
            submitJourneyForm({
                projectName: 'Test project',
                projectDescription: 'Project description for the journey runner.',
                projectBudget: '50000'
            })
        })

        group('repeat-page', () => {
            expect(response.url).to.include('repeat-page')
            pendingTrend = durationRepeatPage
            // First submit adds the item
            submitJourneyForm({
                repeatItemName: 'Repeat item example',
                repeatItemAmount: '12000'
            })
            // Second submit confirms the list and continues
            submitJourneyForm()
        })

        group('select-land-parcel', () => {
            expect(response.url).to.include('select-land-parcel')
            pendingTrend = durationSelectLandParcel
            const firstParcel = response.html().find('input[name="landParcels"]').first().attr('value')
            submitJourneyForm({ landParcels: firstParcel })
        })

        group('summary', () => {
            expect(response.url).to.include('summary')
            pendingTrend = durationSummary
            submitJourneyForm()
        })

        group('declaration', () => {
            expect(response.url).to.include('declaration')
            pendingTrend = durationDeclaration
            submitJourneyForm()
        })

        group('confirmation', () => {
            expect(response.url).to.include('confirmation')
            // Confirmation has no form submission of its own; measure the
            // response that arrived from the declaration submission.
            durationConfirmation.add(response.timings.duration)
            expect(response.body).to.include('EGWA-')
        })

        group('print-submitted-application', () => {
            pendingTrend = durationPrintSubmittedApplication
            const printPath = response.html().find(`a:contains('View / Print submitted application')`).attr('href')
            response = http.get(`${HOST_URL}${printPath}`)
            expect(response.url).to.include('print-submitted-application')
            pendingTrend.add(response.timings.duration)
            pendingTrend = null
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
