"""Builds made-up test files in the same layout as the admin portal's answer export.

Every person here is invented. No real teen or mentor data.

The export layout copies the Vescent app's export code:
apps/api/app/routers/account.py, `_answers_export_rows` and `_answer_map`
(read October 5, 2026, survey version 2026-09-v2). Columns are named after
each question's wording, so the 8 lightning round taps, which share the
wording "Don't think - just tap", collapse into one column that keeps only
the last tap. That is how the export behaves today, so these files do too.

Run: python3 make_test_data.py
"""

import csv
import json
from pathlib import Path

HERE = Path(__file__).parent
QUESTIONS = json.loads((HERE / "onboarding_questions_2026-09-v2.json").read_text())["questions"]
BY_ID = {q["id"]: q for q in QUESTIONS}
SURVEY_VERSION = "2026-09-v2"

# Personality question IDs for each pair, first option = first letter.
PAIRS = {
    "EI": ["personality_01", "personality_02", "personality_03", "personality_13", "personality_14"],
    "SN": ["personality_04", "personality_05", "personality_06", "personality_15", "personality_16"],
    "TF": ["personality_07", "personality_08", "personality_09", "personality_17", "personality_18"],
    "JP": ["personality_10", "personality_11", "personality_12", "personality_19", "personality_20"],
}


def personality_answers(type_code, strength):
    """type_code like "ENFJ"; strength = how many of 5 answers go to that letter (3, 4 or 5)."""
    answers = {}
    for (pair, ids), letter, count in zip(PAIRS.items(), type_code, strength):
        first = letter == pair[0]
        for i, qid in enumerate(ids):
            options = BY_ID[qid]["options"]
            toward = options[0] if first else options[1]
            away = options[1] if first else options[0]
            answers[qid] = (toward if i < count else away)["id"]
    return answers


LIGHTNING = [f"lightning_{n:02d}" for n in range(1, 9)]


def lightning_answers(picks):
    """picks: string of 8 characters, "a" for the first option, "b" for the second."""
    return {qid: BY_ID[qid]["options"][0 if p == "a" else 1]["id"] for qid, p in zip(LIGHTNING, picks)}


def person(user_id, username, first, last, tier, type_code, strength, lightning, interests,
           interests_other, reply_pace, current_state, growth_goals, growth_other, lived, lived_other):
    values = {}
    values.update(personality_answers(type_code, strength))
    values.update(lightning_answers(lightning))
    values.update({
        "interests": interests,
        "interests_other": interests_other,
        "reply_pace": reply_pace,
        "current_state": current_state,
        "growth_goals": growth_goals,
        "growth_goals_other": growth_other,
        "lived_experience": lived,
        "lived_experience_other": lived_other,
    })
    return {
        "user_id": user_id, "username": username, "email": f"{username}@example.com",
        "first_name": first, "last_name": last, "tier": tier, "timezone": "America/New_York",
        "values": values, "type": type_code,
    }


# ---------------------------------------------------------------- teens
# Each teen tests something specific; see expected-results.md.
TEENS = [
    person("test-teen-0001", "testteen_ava", "Ava", "Testteen", "basic", "ENFJ", (4, 4, 5, 4),
           "aabbbbab", ["music", "animals", "shows_movies"], "", "pretty_fast_i_like_keeping_it_going",
           "pretty_good_i_want_someone_in_my_corner", ["confidence", "friend_stuff"], "",
           ["anxiety", "family_stress"], ""),
    person("test-teen-0002", "testteen_bella", "Bella", "Testteen", "premium", "ISTJ", (5, 3, 4, 5),
           "babaabaa", ["sports_moving", "being_outside"], "", "when_i_see_it_could_be_an_hour_or_tonight",
           "up_and_down_lately", ["less_stress"], "", ["none_of_these"], ""),
    person("test-teen-0003", "testteen_cora", "Cora", "Testteen", "basic", "INFP", (3, 4, 4, 3),
           "abbbbbbb", [], "", "when_i_have_the_energy_sometimes_a_day",
           "up_and_down_lately", ["feeling_less_alone"], "",
           ["switching_schools", "feeling_left_out", "parents_splitting_up"], ""),
    person("test-teen-0004", "testteen_dani", "Dani", "Testteen", "premium", "ESFP", (5, 4, 3, 4),
           "aaaaaaba", ["drawing_art", "fashion_thrifting", "music", "baking_cooking"], "pottery",
           "pretty_fast_i_like_keeping_it_going", "it_s_been_hard_for_a_while",
           ["less_stress", "feeling_less_alone"], "", ["losing_someone"],
           "My grandma passed away this summer."),
    person("test-teen-0005", "testteen_emma", "Emma", "Testteen", "basic", "ENTJ", (4, 5, 4, 4),
           "abaaabab", ["gaming", "reading_writing"], "", "when_i_see_it_could_be_an_hour_or_tonight",
           "pretty_good_i_want_someone_in_my_corner", ["my_future"], "", ["body_image", "anxiety"], ""),
]

# ---------------------------------------------------------------- mentors
# Mentors answer the same questions. The app has no mentor survey yet, so this file
# stands in for the mentor form. Column names use the teen wording, by decision
# (October 5, 2026), so both files share one layout. Reply pace uses the mentor
# options from the August 19 question document. Mentors skip the 4H screen.
M_FAST = "Same day, usually within a couple of hours"
M_EVENING = "Every evening - I check in once a day"
M_DAYS = "Every couple of days, reliably"

MENTORS = [
    person("test-mentor-0001", "testmentor_maya", "Maya", "Testmentor", "", "ENFJ", (5, 4, 4, 4),
           "aabbbbab", ["music", "animals", "reading_writing"], "", M_FAST, None, [], "",
           ["anxiety", "family_stress"], ""),
    person("test-mentor-0002", "testmentor_nora", "Nora", "Testmentor", "", "INFJ", (4, 4, 5, 3),
           "bbbbbbaa", ["shows_movies", "drawing_art"], "", M_EVENING, None, [], "",
           ["anxiety", "switching_schools", "feeling_left_out"], ""),
    person("test-mentor-0003", "testmentor_olive", "Olive", "Testmentor", "", "ISTP", (4, 3, 4, 4),
           "babaabba", ["sports_moving", "being_outside", "gaming"], "", M_DAYS, None, [], "",
           [], ""),
    person("test-mentor-0004", "testmentor_priya", "Priya", "Testmentor", "", "ESFJ", (3, 4, 4, 5),
           "aaaaaaab", ["fashion_thrifting", "music", "baking_cooking", "faith_community"], "", M_FAST, None, [], "",
           ["losing_someone", "body_image"], ""),
    person("test-mentor-0005", "testmentor_quinn", "Quinn", "Testmentor", "", "INFP", (4, 4, 3, 4),
           "abbbbbbb", ["reading_writing", "gaming", "drawing_art"], "", M_EVENING, None, [], "",
           ["parents_splitting_up", "switching_schools", "body_image"], ""),
]


def answer_list(values):
    """Answers in survey order, shaped like the app stores them (normalize_survey_answers)."""
    stored = []
    for q in QUESTIONS:
        if q["id"] not in values:
            continue
        value = values[q["id"]]
        labels = {o["id"]: o["label"] for o in q.get("options", [])}
        if isinstance(value, list):
            display = [labels.get(v, v) for v in value]
        elif isinstance(value, str):
            display = labels.get(value, value)
        else:
            display = value
        stored.append({"questionId": q["id"], "questionPrompt": q["prompt"], "value": value, "displayValue": display})
    return stored


def answer_map(answers):
    """Copy of the app's `_answer_map`: one column per question wording, later answers overwrite earlier ones."""
    mapped = {}
    for answer in answers:
        question = BY_ID.get(answer["questionId"], {})
        header = str(answer.get("questionPrompt") or question.get("prompt") or answer["questionId"]).strip()
        value = answer.get("displayValue", answer.get("value"))
        labels = {o["id"]: o["label"] for o in question.get("options", [])}
        if isinstance(value, list):
            mapped[header] = ", ".join(labels.get(str(v), str(v)) for v in value)
        elif value is None:
            mapped[header] = ""
        else:
            mapped[header] = labels.get(str(value), str(value))
    return mapped


def write_export(people, path):
    """Copy of the app's `_answers_export_rows` plus the csv writer."""
    base = ["user_id", "username", "email", "first_name", "last_name", "tier", "timezone", "survey_version"]
    maps = [answer_map(answer_list(p["values"])) for p in people]
    headers = []
    for m in maps:
        for h in m:
            if h not in headers:
                headers.append(h)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=base + headers, extrasaction="ignore")
        writer.writeheader()
        for p, m in zip(people, maps):
            row = {k: p[k] for k in base if k in p}
            row["survey_version"] = SURVEY_VERSION
            row.update(m)
            writer.writerow(row)


if __name__ == "__main__":
    write_export(TEENS, HERE / "test-teens-export.csv")
    write_export(MENTORS, HERE / "test-mentors.csv")
    print("Wrote test-teens-export.csv and test-mentors.csv")
