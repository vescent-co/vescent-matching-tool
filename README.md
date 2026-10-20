# Vescent Matching Tool

Suggests mentors for teens waiting to be matched in the Vescent app. A person on the Vescent team makes every match in the app's admin portal; this tool only suggests.

## Privacy

The public GitHub page is a starting page only. Open the staff matching tool there, then sign in and load answer files on the staff page. Answer files are read temporarily in your browser. Recording a decision saves identities, scores, reason, and status to the private team Google Sheet; the tool does not assign anyone in the admin portal.

Never add real teen or mentor files to this repo. The repo is set to refuse data files other than the made-up test files.

## Try it with test data

1. Open the GitHub page, enter your approved Google account email, click **Open staff matching tool**, and sign in with that account.
2. On the staff page, choose `test-data/test-teens-export.csv` as the teen file.
3. Choose `test-data/test-mentors.csv` as the mentor file.
4. Compare the results with `test-data/expected-results.md`.

Every person in the test files is made up.

## Sign-in account selection

The public entry form sends the entered email to Google as the `authuser` account selector. It does not save the email in the page or grant access. The staff tool still checks the exact email allowlist and spreadsheet permissions.

On October 20, Cindy completed consent for `cindy@vescent.co`, but the account-neutral tool URL kept returning to the Google authorization page after another signed-in account had been selected earlier. Opening the same deployment with `?authuser=cindy%40vescent.co` loaded the tool and confirmed history for Cindy without another consent grant. This verified account routing as the cause of her loop; it does not establish why Google requested fresh consent initially, or verify any other staff account.

Google documents that multiple simultaneous Google accounts can cause Apps Script access problems: https://developers.google.com/apps-script/guides/support/troubleshooting#issues_with_multiple_google_accounts. If account selection still fails, use a private browser window signed in only to the approved account. Do not change the deployment to run as its owner or remove staff access checks to work around sign-in issues.

## Mentor form responses

Download the existing mentor response sheet using File > Download > CSV, then choose it as the mentor file. Admin mentor exports remain supported. The five mentor-worded personality questions map to the same scoring directions as the teen questions. Lightning answers are retained as staff context but remain unscored while the teen export lacks all eight taps. Bio, help-with answers, and other free text are also staff context, not points.

For multiple form responses with the same email (ignoring surrounding spaces and letter case), the newest timestamp is used and a notice identifies the mentor and selected response. Missing or invalid emails are excluded. Duplicate groups with invalid timestamps or a tied newest timestamp are excluded with a warning rather than guessed. Timestamps follow the response sheet's month/day/year format and timezone. Different email addresses are treated as different mentors; this cannot detect email typos or aliases.

`test-data/test-mentor-form.csv` is a real Google Sheets CSV download containing only one fictional Test Mentor response. It should load as ESFJ with no missing-answer warnings. It is separate from the five-mentor scoring fixture.

## Run checks

With Node.js available, run `node tests/mentor-form.test.cjs`. Checks use only fictional data and the preserved scoring answer key.

## Private staff match history

`apps-script/` provides a Google-hosted version of this tool with automatically saved match-decision history in a private team Google Sheet. The public page directs staff to this version; file loading and matching take place on the staff page. Its source interface and scoring are in `apps-script/matching.html`. See `apps-script/README.md` for setup, workflow, and validation status.
