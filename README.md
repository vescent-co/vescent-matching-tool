# Vescent Matching Tool

Suggests mentors for teens waiting to be matched in the Vescent app. A person on the Vescent team makes every match in the app's admin portal; this tool only suggests.

## Privacy

The tool runs entirely in your browser. Files you open are read on your own computer and are never uploaded, sent or saved. Closing or refreshing the page clears everything.

Never add real teen or mentor files to this repo. The repo is set to refuse data files other than the made-up test files.

## Try it with test data

1. Open the tool.
2. Choose `test-data/test-teens-export.csv` as the teen file.
3. Choose `test-data/test-mentors.csv` as the mentor file.
4. Compare the results with `test-data/expected-results.md`.

Every person in the test files is made up.

## Mentor form responses

Download the existing mentor response sheet using File > Download > CSV, then choose it as the mentor file. Admin mentor exports remain supported. The five mentor-worded personality questions map to the same scoring directions as the teen questions. Lightning answers are retained as staff context but remain unscored while the teen export lacks all eight taps. Bio, help-with answers, and other free text are also staff context, not points.

For multiple form responses with the same email (ignoring surrounding spaces and letter case), the newest timestamp is used and a notice identifies the mentor and selected response. Missing or invalid emails are excluded. Duplicate groups with invalid timestamps or a tied newest timestamp are excluded with a warning rather than guessed. Timestamps follow the response sheet's month/day/year format and timezone. Different email addresses are treated as different mentors; this cannot detect email typos or aliases.

`test-data/test-mentor-form.csv` is a real Google Sheets CSV download containing only one fictional Test Mentor response. It should load as ESFJ with no missing-answer warnings. It is separate from the five-mentor scoring fixture.

## Run checks

With Node.js available, run `node tests/mentor-form.test.cjs`. Checks use only fictional data and the preserved scoring answer key.
