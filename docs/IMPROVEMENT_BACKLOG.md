# Legitimate Contribution Backlog

This backlog turns future GitHub activity into useful, reviewable project work instead of random commit noise. Each item should be implemented with tests or verification notes before it is committed.

## API and backend reliability

1. Add explicit date-range validation for transaction and summary filters.
2. Add a server-side CSV export endpoint for automation and external tools.
3. Add an API-level category filter test for case-insensitive matching.
4. Add pagination to `/api/transactions` for larger ledgers.
5. Add stable sort options for date, amount, category, and created time.
6. Add duplicate-transaction detection hints for same date, description, and amount.
7. Add structured error codes alongside human-readable validation messages.
8. Add a database backup CLI command that writes timestamped SQLite copies.
9. Add a database restore CLI command with path validation.
10. Add SQLite integrity-check reporting to `/api/database`.

## Data model and money handling

11. Add optional merchant/payee fields to transactions.
12. Add recurring transaction templates for bills and income.
13. Add account labels such as checking, credit card, and savings.
14. Add transfer records that do not count as income or expenses.
15. Add soft-delete support for recoverable transaction removals.
16. Add tags for cross-category reporting.
17. Add import-source metadata for CSV imports.
18. Add a `currency_code` column for future multi-currency records.
19. Add migration notes for changing the SQLite schema safely.
20. Add tests for maximum amount, text length, and note length boundaries.

## Dashboard and UX

21. Add quick filter chips for this month, last month, and last 90 days.
22. Add category filter controls to the visible ledger toolbar.
23. Add an empty-state walkthrough for first-time users with no transactions.
24. Add edit-in-place support for existing transactions.
25. Add a confirmation undo window after deleting a transaction.
26. Add keyboard shortcuts for refresh, export, and adding a transaction.
27. Add accessible reduced-motion handling for chart and toast behavior.
28. Add inline budget warnings when a new expense would exceed a limit.
29. Add a printable monthly report layout.
30. Add a compact mobile summary for faster one-handed scanning.

## Charts and insights

31. Add a rolling 30-day spending trend.
32. Add average daily expense and average transaction size insights.
33. Add budget remaining totals by category.
34. Add month-over-month income and expense deltas.
35. Add top merchant or description analysis once payees exist.
36. Add savings-rate trendline thresholds.
37. Add category drill-down from chart segment to filtered ledger.
38. Add a net-worth placeholder panel for future account balances.
39. Add chart fallback tables for environments where Chart.js fails.
40. Add tests for summary aggregation edge cases across year boundaries.

## Quality, docs, and delivery

41. Add GitHub Actions CI for Python tests and JavaScript syntax checks.
42. Add a screenshot-driven visual QA checklist to the README.
43. Add a local smoke-test script that starts Flask and checks key endpoints.
44. Add API examples for budgets, deletes, filters, and database status.
45. Add a troubleshooting guide for common Windows startup issues.
46. Add DB Browser screenshots or step-by-step export instructions.
47. Add `.editorconfig` for consistent formatting across contributors.
48. Add pre-commit hooks for trailing whitespace and Python formatting.
49. Add release notes documenting user-facing changes per milestone.
50. Add contribution guidelines that require meaningful commits and validation evidence.
