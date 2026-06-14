const config = window.FINANCE_TRACKER || {};
const currencyCode = config.currency || "USD";

const state = {
  cashflowChart: null,
  categoryChart: null,
  transactions: [],
  categories: { income: [], expense: [] },
  databaseFingerprint: null,
  loading: false,
  filterDebounce: null,
  pollTimer: null,
};

const formatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: currencyCode,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

const selectors = {
  form: document.querySelector("#transaction-form"),
  budgetForm: document.querySelector("#budget-form"),
  filterForm: document.querySelector("#filter-form"),
  toast: document.querySelector("#toast"),
  syncStatus: document.querySelector("#sync-status"),
  refreshButton: document.querySelector("#refresh-button"),
  exportButton: document.querySelector("#export-button"),
  clearFiltersButton: document.querySelector("#clear-filters-button"),
  categoryInput: document.querySelector("#category"),
  budgetCategoryInput: document.querySelector("#budget-category"),
  categoryOptions: document.querySelector("#category-options"),
  transactionRows: document.querySelector("#transaction-rows"),
  budgetList: document.querySelector("#budget-list"),
  dbFile: document.querySelector("#db-file"),
  dbTableCount: document.querySelector("#db-table-count"),
  dbTransactionCount: document.querySelector("#db-transaction-count"),
  dbBudgetCount: document.querySelector("#db-budget-count"),
  dbTableList: document.querySelector("#db-table-list"),
  saveButton: document.querySelector("#save-transaction-button"),
  saveBudgetButton: document.querySelector("#save-budget-button"),
};

function money(value) {
  return formatter.format(Number(value || 0));
}

function asDateLabel(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function setStatus(message) {
  selectors.syncStatus.textContent = message;
}

function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => selectors.toast.classList.remove("show"), 3200);
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw payload;
  }
  return payload;
}

function buildFilterQuery() {
  const data = new FormData(selectors.filterForm);
  const params = new URLSearchParams();
  for (const [key, value] of data.entries()) {
    if (String(value).trim()) {
      params.set(key, String(value).trim());
    }
  }
  return params.toString();
}

function updateMetrics(summary) {
  const totals = summary.totals || {};
  const netCard = document.querySelector(".metric-card-accent");

  document.querySelector("#metric-income").textContent = money(totals.income);
  document.querySelector("#metric-expenses").textContent = money(totals.expenses);
  document.querySelector("#metric-net").textContent = money(totals.net);
  document.querySelector("#metric-savings-rate").textContent = percentFormatter.format(totals.savings_rate || 0);
  document.querySelector("#metric-transaction-count").textContent = `${totals.transaction_count || 0} transactions`;

  netCard.classList.toggle("metric-negative", Number(totals.net || 0) < 0);
}

function chartDefaults() {
  const cssValue = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  return {
    color: cssValue("--color-muted", "#69766c"),
    green: cssValue("--color-green", "#006b4f"),
    pink: cssValue("--color-pink", "#9b2367"),
    blue: cssValue("--color-blue", "#2f5f98"),
    yellow: cssValue("--color-yellow", "#ffd43b"),
    surface: cssValue("--color-canvas", "#fffdf4"),
    font: {
      family: "Arial, Segoe UI Variable, Segoe UI, system-ui, sans-serif",
    },
    grid: "rgba(31, 36, 31, 0.1)",
  };
}

function renderCashflowChart(monthly) {
  const summaryText = document.querySelector("#cashflow-summary-text");
  if (!window.Chart) {
    summaryText.textContent = "Chart.js could not be loaded, but dashboard data is still available in the table.";
    return;
  }

  const labels = monthly.map((item) => item.month);
  const income = monthly.map((item) => item.income);
  const expenses = monthly.map((item) => item.expenses);
  const net = monthly.map((item) => item.net);
  const defaults = chartDefaults();

  window.Chart.defaults.color = defaults.color;
  window.Chart.defaults.font.family = defaults.font.family;

  if (state.cashflowChart) {
    state.cashflowChart.data.labels = labels;
    state.cashflowChart.data.datasets[0].data = income;
    state.cashflowChart.data.datasets[1].data = expenses;
    state.cashflowChart.data.datasets[2].data = net;
    state.cashflowChart.data.datasets[0].backgroundColor = defaults.green;
    state.cashflowChart.data.datasets[1].backgroundColor = defaults.pink;
    state.cashflowChart.data.datasets[2].borderColor = defaults.blue;
    state.cashflowChart.options.scales.x.grid.color = defaults.grid;
    state.cashflowChart.options.scales.y.grid.color = defaults.grid;
    state.cashflowChart.update("none");
  } else {
    state.cashflowChart = new window.Chart(document.querySelector("#cashflow-chart"), {
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Income",
            data: income,
            backgroundColor: defaults.green,
            borderRadius: 0,
            borderSkipped: false,
            maxBarThickness: 38,
          },
          {
            type: "bar",
            label: "Expenses",
            data: expenses,
            backgroundColor: defaults.pink,
            borderRadius: 0,
            borderSkipped: false,
            maxBarThickness: 38,
          },
          {
            type: "line",
            label: "Net",
            data: net,
            borderColor: defaults.blue,
            backgroundColor: "rgba(47, 95, 152, 0.12)",
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.36,
            fill: false,
          },
        ],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        responsive: true,
        resizeDelay: 120,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { usePointStyle: true, boxWidth: 9, boxHeight: 9 } },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${money(context.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { grid: { color: defaults.grid } },
          y: {
            beginAtZero: true,
            grid: { color: defaults.grid },
            ticks: { callback: (value) => money(value) },
          },
        },
      },
    });
  }

  const latest = monthly.at(-1);
  summaryText.textContent = latest
    ? `Latest month ${latest.month}: income ${money(latest.income)}, expenses ${money(latest.expenses)}, net ${money(latest.net)}.`
    : "No monthly cashflow data yet.";
}

function renderCategoryChart(categories) {
  const summaryText = document.querySelector("#category-summary-text");
  if (!window.Chart) {
    summaryText.textContent = "Chart.js could not be loaded, but category totals are available through the API.";
    return;
  }

  const hasData = categories.length > 0;
  const labels = hasData ? categories.map((item) => item.category) : ["No expenses yet"];
  const values = hasData ? categories.map((item) => item.amount) : [1];
  const defaults = chartDefaults();
  const palette = [defaults.green, defaults.pink, defaults.blue, "#7d6420", "#587569", "#6f4b78", "#9d5733", "#8b938d"];
  const surfaceColor = defaults.surface;

  if (state.categoryChart) {
    state.categoryChart.data.labels = labels;
    state.categoryChart.data.datasets[0].data = values;
    state.categoryChart.data.datasets[0].backgroundColor = labels.map((_, index) =>
      hasData ? palette[index % palette.length] : "#d8ded7",
    );
    state.categoryChart.data.datasets[0].borderColor = surfaceColor;
    state.categoryChart.data.datasets[0].hoverOffset = hasData ? 6 : 0;
    state.categoryChart.update("none");
  } else {
    state.categoryChart = new window.Chart(document.querySelector("#category-chart"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map((_, index) => (hasData ? palette[index % palette.length] : "#d8ded7")),
            borderColor: surfaceColor,
            borderWidth: 4,
            hoverOffset: hasData ? 6 : 0,
          },
        ],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        responsive: true,
        resizeDelay: 120,
        cutout: "70%",
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 9, boxHeight: 9 } },
          tooltip: {
            callbacks: {
              label: (context) => (hasData ? `${context.label}: ${money(context.parsed)}` : "No expense data yet"),
            },
          },
        },
      },
    });
  }

  const top = categories[0];
  summaryText.textContent = top
    ? `Largest expense category is ${top.category} at ${money(top.amount)}.`
    : "No expense categories yet.";
}

function renderBudgets(budgets) {
  if (!budgets.length) {
    selectors.budgetList.innerHTML = `<p class="empty-state">No budgets yet. Add a category limit to start tracking guardrails.</p>`;
    return;
  }

  selectors.budgetList.innerHTML = budgets
    .map((budget) => {
      const percentage = Math.min(Math.round((budget.usage_ratio || 0) * 100), 100);
      const statusText = budget.status === "over" ? "Over limit" : budget.status === "watch" ? "Watch" : "On track";
      return `
        <article class="budget-item">
          <div class="budget-row">
            <span class="budget-name">${escapeHtml(budget.category)}</span>
            <span class="budget-meta">${money(budget.spent)} of ${money(budget.monthly_limit)} - ${statusText}</span>
          </div>
          <div class="progress-track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}" aria-label="${escapeHtml(budget.category)} budget usage">
            <div class="progress-value ${budget.status}" style="width: ${percentage}%"></div>
          </div>
          <div class="budget-actions">
            <span class="budget-meta">${percentage}% used</span>
            <button class="remove-budget-button" type="button" data-delete-budget-id="${budget.id}" aria-label="Delete ${escapeHtml(budget.category)} budget">Remove</button>
          </div>
        </article>`;
    })
    .join("");
}

function renderTransactions(transactions) {
  state.transactions = transactions;

  if (!transactions.length) {
    selectors.transactionRows.innerHTML = `<tr><td colspan="6" class="empty-cell">No transactions match the current filters.</td></tr>`;
    return;
  }

  selectors.transactionRows.innerHTML = transactions
    .map((transaction) => {
      const signedAmount = transaction.kind === "income" ? transaction.amount : -transaction.amount;
      return `
        <tr>
          <td data-label="Date">${asDateLabel(transaction.occurred_on)}</td>
          <td data-label="Description">
            <strong>${escapeHtml(transaction.description)}</strong>
            ${transaction.notes ? `<br><small>${escapeHtml(transaction.notes)}</small>` : ""}
          </td>
          <td data-label="Category">${escapeHtml(transaction.category)}</td>
          <td data-label="Type"><span class="kind-pill ${transaction.kind}">${transaction.kind}</span></td>
          <td data-label="Amount" class="amount-cell">${money(signedAmount)}</td>
          <td data-label="Action"><button class="delete-button" type="button" data-delete-id="${transaction.id}" aria-label="Delete ${escapeHtml(transaction.description)}">Delete</button></td>
        </tr>`;
    })
    .join("");
}

function renderDatabaseStatus(database) {
  const tables = database.tables || [];
  const transactionTable = tables.find((table) => table.name === "transactions");
  const budgetTable = tables.find((table) => table.name === "budgets");

  selectors.dbFile.textContent = database.path || "SQLite database";
  selectors.dbTableCount.textContent = `${tables.length}`;
  selectors.dbTransactionCount.textContent = `${transactionTable?.row_count ?? 0}`;
  selectors.dbBudgetCount.textContent = `${budgetTable?.row_count ?? 0}`;
  state.databaseFingerprint = database.fingerprint || state.databaseFingerprint;

  selectors.dbTableList.innerHTML = tables.length
    ? tables
        .map(
          (table) => `
            <div class="db-row">
              <strong>${escapeHtml(table.name)}</strong>
              <span>${table.row_count} rows</span>
            </div>`,
        )
        .join("")
    : `<p class="empty-state">No database tables were found.</p>`;
}

function populateCategoryOptions() {
  const selectedKind = selectors.form.querySelector('input[name="kind"]:checked')?.value || "expense";
  const values = [...new Set([...(state.categories[selectedKind] || []), ...(state.categories.expense || [])])];
  selectors.categoryOptions.innerHTML = values.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  if (!selectors.categoryInput.value && values.length) {
    selectors.categoryInput.placeholder = values[0];
  }
  if (selectors.budgetCategoryInput && values.length) {
    selectors.budgetCategoryInput.placeholder = values[0];
  }
}

function clearFieldErrors() {
  document.querySelectorAll(".field-error").forEach((node) => {
    node.textContent = "";
  });
}

function showFieldErrors(errors = {}) {
  clearFieldErrors();
  for (const [field, message] of Object.entries(errors)) {
    const nodes = document.querySelectorAll(`[data-error-for="${field}"], [data-error-for="budget-${field}"]`);
    nodes.forEach((node) => {
      node.textContent = message;
    });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDashboard({ silent = false } = {}) {
  if (state.loading) return;

  const query = buildFilterQuery();
  const suffix = query ? `?${query}` : "";
  state.loading = true;

  if (!silent) {
    setStatus("Loading");
    selectors.refreshButton.disabled = true;
  }

  try {
    const [summary, transactionPayload, databasePayload] = await Promise.all([
      apiFetch(`/api/summary${suffix}`),
      apiFetch(`/api/transactions${suffix}`),
      apiFetch("/api/database"),
    ]);

    state.categories = summary.categories || { income: [], expense: [] };
    populateCategoryOptions();
    updateMetrics(summary);
    renderCashflowChart(summary.monthly || []);
    renderCategoryChart(summary.category_breakdown || []);
    renderBudgets(summary.budgets || []);
    renderTransactions(transactionPayload.transactions || []);
    renderDatabaseStatus(databasePayload.database || {});
    setStatus(silent ? "Live updated" : "Up to date");
  } catch (error) {
    setStatus("Needs attention");
    showToast(error.error || "Something went wrong while loading data.");
  } finally {
    state.loading = false;
    if (!silent) {
      selectors.refreshButton.disabled = false;
    }
  }
}

function scheduleFilterReload() {
  window.clearTimeout(state.filterDebounce);
  state.filterDebounce = window.setTimeout(() => loadDashboard(), 220);
}

async function pollForExternalChanges() {
  if (document.visibilityState === "hidden" || state.loading) return;

  try {
    const payload = await apiFetch("/api/database");
    const database = payload.database || {};
    const fingerprint = database.fingerprint;

    if (!fingerprint) return;

    if (!state.databaseFingerprint) {
      renderDatabaseStatus(database);
      return;
    }

    if (fingerprint !== state.databaseFingerprint) {
      await loadDashboard({ silent: true });
    }
  } catch {
    setStatus("Waiting for database");
  }
}

function startLivePolling() {
  window.clearInterval(state.pollTimer);
  state.pollTimer = window.setInterval(pollForExternalChanges, 4000);
}

function payloadFromTransactionForm() {
  const data = new FormData(selectors.form);
  return {
    kind: data.get("kind"),
    description: data.get("description"),
    amount: data.get("amount"),
    occurred_on: data.get("occurred_on"),
    category: data.get("category"),
    notes: data.get("notes"),
  };
}

function payloadFromBudgetForm() {
  const data = new FormData(selectors.budgetForm);
  return {
    category: data.get("category"),
    monthly_limit: data.get("monthly_limit"),
  };
}

async function handleTransactionSubmit(event) {
  event.preventDefault();
  clearFieldErrors();
  selectors.saveButton.disabled = true;
  selectors.saveButton.textContent = "Saving...";

  try {
    await apiFetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify(payloadFromTransactionForm()),
    });
    selectors.form.reset();
    setDefaultDate();
    populateCategoryOptions();
    showToast("Transaction saved.");
    await loadDashboard();
  } catch (error) {
    showFieldErrors(error.field_errors || {});
    showToast(error.error || "Transaction could not be saved.");
  } finally {
    selectors.saveButton.disabled = false;
    selectors.saveButton.textContent = "Save transaction";
  }
}

async function handleBudgetSubmit(event) {
  event.preventDefault();
  clearFieldErrors();
  selectors.saveBudgetButton.disabled = true;
  selectors.saveBudgetButton.textContent = "Saving...";

  try {
    await apiFetch("/api/budgets", {
      method: "POST",
      body: JSON.stringify(payloadFromBudgetForm()),
    });
    selectors.budgetForm.reset();
    showToast("Budget saved.");
    await loadDashboard();
  } catch (error) {
    showFieldErrors(error.field_errors || {});
    showToast(error.error || "Budget could not be saved.");
  } finally {
    selectors.saveBudgetButton.disabled = false;
    selectors.saveBudgetButton.textContent = "Save budget";
  }
}

async function handleTransactionDelete(event) {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const confirmed = window.confirm("Delete this transaction? This cannot be undone.");
  if (!confirmed) return;

  button.disabled = true;
  try {
    await apiFetch(`/api/transactions/${button.dataset.deleteId}`, { method: "DELETE" });
    showToast("Transaction deleted.");
    await loadDashboard();
  } catch (error) {
    showToast(error.error || "Transaction could not be deleted.");
  } finally {
    button.disabled = false;
  }
}

async function handleBudgetDelete(event) {
  const button = event.target.closest("[data-delete-budget-id]");
  if (!button) return;

  const confirmed = window.confirm("Delete this budget? Transactions will stay in the ledger.");
  if (!confirmed) return;

  button.disabled = true;
  try {
    await apiFetch(`/api/budgets/${button.dataset.deleteBudgetId}`, { method: "DELETE" });
    showToast("Budget deleted.");
    await loadDashboard();
  } catch (error) {
    showToast(error.error || "Budget could not be deleted.");
  } finally {
    button.disabled = false;
  }
}

function exportCsv() {
  if (!state.transactions.length) {
    showToast("There are no transactions to export.");
    return;
  }

  const headers = ["Date", "Description", "Category", "Type", "Amount", "Notes"];
  const rows = state.transactions.map((transaction) => [
    transaction.occurred_on,
    transaction.description,
    transaction.category,
    transaction.kind,
    transaction.kind === "income" ? transaction.amount : -transaction.amount,
    transaction.notes || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "finance-transactions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("CSV export ready.");
}

function setDefaultDate() {
  const dateInput = document.querySelector("#occurred_on");
  dateInput.value = new Date().toISOString().slice(0, 10);
}

function bindEvents() {
  selectors.form.addEventListener("submit", handleTransactionSubmit);
  selectors.budgetForm.addEventListener("submit", handleBudgetSubmit);
  selectors.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadDashboard();
  });
  selectors.filterForm.addEventListener("change", scheduleFilterReload);
  selectors.clearFiltersButton.addEventListener("click", () => {
    selectors.filterForm.reset();
    loadDashboard();
  });
  selectors.refreshButton.addEventListener("click", () => loadDashboard());
  selectors.exportButton.addEventListener("click", exportCsv);
  selectors.transactionRows.addEventListener("click", handleTransactionDelete);
  selectors.budgetList.addEventListener("click", handleBudgetDelete);
  selectors.form.querySelectorAll('input[name="kind"]').forEach((input) => {
    input.addEventListener("change", populateCategoryOptions);
  });
}

setDefaultDate();
bindEvents();
loadDashboard().then(startLivePolling);
