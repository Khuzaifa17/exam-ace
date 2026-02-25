

## Plan: Exam Selection Screen + Practice Session Resume

### What's changing

Three improvements:

1. **Practice page without exam** — When user clicks "Practice" in navbar (no `?exam=` param), instead of redirecting to `/exams`, show a nice "Select an Exam" screen with list of available exams right there.

2. **Mock Test page without exam** — Same treatment for `/mock` — show exam selection instead of redirecting away.

3. **Practice session resume** — Save practice progress to the database (`tests` + `test_questions` tables which already exist). When user returns to practice for the same exam, resume from where they left off.

---

### Technical Details

#### 1. Exam Selection Component (shared)

Create a new reusable component `src/components/ExamSelector.tsx`:
- Fetches active exams from `exams` table
- Shows a card grid with exam titles and descriptions
- Each card links to `/practice?exam={id}` or `/mock?exam={id}` depending on a `mode` prop
- Shows loading skeletons while fetching

#### 2. Practice.tsx changes

- Remove the `navigate('/exams')` redirect when `!examId`
- Instead, render the `ExamSelector` component with `mode="practice"`
- On mount (when examId exists), check for an incomplete session in `tests` table:
  - Query: `tests` where `user_id = current user`, `exam_id = examId`, `is_mock = false`, `completed_at IS NULL`
  - If found, load the associated `test_questions` with their `selected_option` and `is_correct` values
  - Restore `currentIndex` to the first unanswered question, and `answers` state from saved data
- On each answer submission (after `check_answer` succeeds), upsert the answer into `test_questions` table
- On first question of a new session, create a new `tests` row
- On session complete (finish/demo end), update `tests.completed_at`

#### 3. MockTest.tsx changes

- Remove the `navigate('/exams')` redirect when `!examId`
- Instead, render the `ExamSelector` component with `mode="mock"`
- Mock tests are time-bound and don't need resume (user starts fresh each time — existing behavior is fine)

#### 4. Database

No new tables needed. The existing `tests` and `test_questions` tables already have the right schema:
- `tests`: `user_id`, `exam_id`, `is_mock`, `completed_at` (null = in progress)
- `test_questions`: `test_id`, `question_id`, `order_index`, `selected_option`, `is_correct`, `answered_at`

RLS policies already allow users to create/update/view their own data.

#### 5. Files to create/modify

| File | Action |
|------|--------|
| `src/components/ExamSelector.tsx` | **Create** — reusable exam picker |
| `src/pages/Practice.tsx` | **Modify** — show ExamSelector when no exam, add session save/resume logic |
| `src/pages/MockTest.tsx` | **Modify** — show ExamSelector when no exam |

