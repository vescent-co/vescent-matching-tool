# Matching Tool Test Data: Expected Results

For the Vescent team to check the tool against. Every person in these files is made up.

## The files

| File | What it is |
|---|---|
| `test-teens-export.csv` | 5 made-up teens, laid out exactly like the admin portal's answer export (survey version 2026-09-v2) |
| `test-mentors.csv` | 5 made-up mentors in the same layout, standing in for the mentor form until mentors take the survey in the app |
| `onboarding_questions_2026-09-v2.json` | A copy of the app's question list, used to build the files |
| `make_test_data.py` | Rebuilds both files. Copies the app's export logic |

**Lightning round:** today's export keeps only 1 of the 8 taps (all 8 share the column "Don't think - just tap"). So these files do too, and the tool should show "Lightning round: not available in this export." Points possible are 85, not 100, so match percentages are worked out of 85. Whether to score it later is a pending team decision.

## How each score is worked out

Rules: Vescent's internal scoring rules, locked October 5, 2026.

- **Personality (25):** each shared letter 25, each different 10, then × 25 ÷ 100. 4 shared = 25, 3 = 21.25, 2 = 17.5, 1 = 13.75, 0 = 10.
- **Lived experiences (30):** her picks the mentor also picked ÷ her picks × 30. Zero if she picked nothing.
- **Interests (30):** same as lived experiences.
- **Lightning round (15):** not available in this export.

Worked example, Ava and Maya: personality ENFJ and ENFJ, 4 shared = 25. Lived experiences, both of Ava's 2 shared = 2 ÷ 2 × 30 = 30. Interests, 2 of Ava's 3 shared = 2 ÷ 3 × 30 = 20. Total 75.

## What each teen tests

| Teen | Type | What she tests |
|---|---|---|
| Ava | ENFJ | A clear best match: Maya shares her type, both experiences and most interests |
| Bella | ISTJ | Picked "none of these" for lived experiences: label shows, the signal scores 0 for every mentor |
| Cora | INFP | Picked no interests: label shows, the signal scores 0 for every mentor |
| Dani | ESFP | Answered "It's been hard for a while": must be highlighted at the top. Also has an "other" interest (pottery) and a note to the team, which the team reads but are not scored |
| Emma | ENTJ | Interests and experiences outweigh personality: the best personality fit (Maya) is not her top match |

## Expected rankings

Match % = total points ÷ 85 possible × 100, as a whole number (decided October 5, 2026).

| Teen | 1st | 2nd | 3rd |
|---|---|---|---|
| Ava | Maya 88% | Nora 54% | Priya 37% |
| Bella | Olive 60% | Nora 21% and Priya 21% (tie) | |
| Cora | Quinn 53% | Nora 49% | Maya 21% and Olive 21% (tie) |
| Dani | Priya 87% | Maya 29% and Quinn 29% (tie) | |
| Emma | Quinn 69% | Maya 60% | Nora 38% and Priya 38% (tie) |

Ties (decided October 5, 2026): no tiebreaker. Tied mentors show the same score, all mentors tied at third place show, listed alphabetically.

## Full scores

| Teen | Mentor | Type | Personality | Lived experiences shared | Lived points | Interests shared | Interest points | Total (of 85) | Match |
|---|---|---|---|---|---|---|---|---|---|
| Ava | Maya | ENFJ | 25 | anxiety, family stress | 30 | music, animals | 20 | 75 | 88% |
| Ava | Nora | INFJ | 21.25 | anxiety | 15 | shows + movies | 10 | 46.25 | 54% |
| Ava | Priya | ESFJ | 21.25 | none | 0 | music | 10 | 31.25 | 37% |
| Ava | Quinn | INFP | 17.5 | none | 0 | none | 0 | 17.5 | 21% |
| Ava | Olive | ISTP | 10 | none | 0 | none | 0 | 10 | 12% |
| Bella | Olive | ISTP | 21.25 | not used | 0 | sports + moving, being outside | 30 | 51.25 | 60% |
| Bella | Nora | INFJ | 17.5 | not used | 0 | none | 0 | 17.5 | 21% |
| Bella | Priya | ESFJ | 17.5 | not used | 0 | none | 0 | 17.5 | 21% |
| Bella | Maya | ENFJ | 13.75 | not used | 0 | none | 0 | 13.75 | 16% |
| Bella | Quinn | INFP | 13.75 | not used | 0 | none | 0 | 13.75 | 16% |
| Cora | Quinn | INFP | 25 | switching schools, parents splitting up | 20 | not used | 0 | 45 | 53% |
| Cora | Nora | INFJ | 21.25 | switching schools, feeling left out | 20 | not used | 0 | 41.25 | 49% |
| Cora | Maya | ENFJ | 17.5 | none | 0 | not used | 0 | 17.5 | 21% |
| Cora | Olive | ISTP | 17.5 | none | 0 | not used | 0 | 17.5 | 21% |
| Cora | Priya | ESFJ | 13.75 | none | 0 | not used | 0 | 13.75 | 16% |
| Dani | Priya | ESFJ | 21.25 | losing someone | 30 | fashion + thrifting, music, baking + cooking | 22.5 | 73.75 | 87% |
| Dani | Maya | ENFJ | 17.5 | none | 0 | music | 7.5 | 25 | 29% |
| Dani | Quinn | INFP | 17.5 | none | 0 | drawing + art | 7.5 | 25 | 29% |
| Dani | Nora | INFJ | 13.75 | none | 0 | drawing + art | 7.5 | 21.25 | 25% |
| Dani | Olive | ISTP | 17.5 | none | 0 | none | 0 | 17.5 | 21% |
| Emma | Quinn | INFP | 13.75 | body image | 15 | gaming, reading + writing | 30 | 58.75 | 69% |
| Emma | Maya | ENFJ | 21.25 | anxiety | 15 | reading + writing | 15 | 51.25 | 60% |
| Emma | Nora | INFJ | 17.5 | anxiety | 15 | none | 0 | 32.5 | 38% |
| Emma | Priya | ESFJ | 17.5 | body image | 15 | none | 0 | 32.5 | 38% |
| Emma | Olive | ISTP | 13.75 | none | 0 | gaming | 15 | 28.75 | 34% |
