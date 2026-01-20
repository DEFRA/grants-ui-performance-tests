import http from 'k6/http'
import { sleep } from 'k6'
import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.3/index.js'
import { SharedArray } from 'k6/data'

export const options = {
    scenarios: {
        journey: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '120s', target: 10 }
            ],
            gracefulRampDown: '0s',
            gracefulStop: '30s'
        },
    },
    thresholds: {
        http_req_duration: ['p(99)<1500'], // 99% of requests should be below 1500ms
    }
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
        sleep(3) // Mimic human interaction
        response = response.submitForm({ formSelector: 'form', fields: fields })
        expect(response.status).to.equal(200)
    }

    const submitJourneyForm = function (fields) {
        fields = fields ?? {}
        let crumb = response.html().find(`input[name='crumb']`).attr('value')
        fields['crumb'] = crumb
        submitForm(fields)
    }

    try {
        const crn = users[__VU % users.length]

        navigateTo('https://grants-ui.perf-test.cdp-int.defra.cloud/example-grant-with-auth/start/')

        // Defra ID
        submitForm({crn: crn, password: 'x'})
        
        clickLink('Clear application state')

        // start
        submitJourneyForm()

        // yes-no-field
        submitJourneyForm({ yesNoField: 'true' })

        // autocomplete-field
        submitJourneyForm({ autocompleteField: 'ENG' })

        // radios-field
        submitJourneyForm({ radiosField: 'radiosFieldOption-A2' })

        // checkboxes-field
        submitJourneyForm({ checkboxesField: 'checkboxesFieldOption-A1' })

        // number-field
        submitJourneyForm({ numberField: '100000' })

        // date-parts-field
        submitJourneyForm({
            datePartsField__day: '01',
            datePartsField__month: '03',
            datePartsField__year: '2026'
        })

        // month-year-field
        submitJourneyForm({
            monthYearField__month: '12',
            monthYearField__year: '2025'
        })

        // select-field
        submitJourneyForm({ selectField: 'selectFieldOption-A1' })

        // multiline-text-field
        submitJourneyForm({ multilineTextField: 'Lorem ipsum' })

        // multi-field-form
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

        // summary
        submitJourneyForm()

        // declaration
        submitJourneyForm()

        // confirmation
        expect(response.body).to.include('EGWA-')
    } catch (error) {
        console.error(`Error for URL: ${response?.url}, error: ${error.message}`)
        throw error
    }
}
