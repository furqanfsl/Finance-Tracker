const config = window.FINANCE_TRACKER || {};
const currencyCode = config.currency || "USD";

const state = {
  cashflowChart: null,
  categoryChart: null,
  transactions: [],
  categories: { income: [], expense: [] },
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
  filterForm: document.querySelector("#filter-form"),
  toast: document.querySelector("#toast"),
  syncStatus: document.querySelector("#sync-status"),
  refreshButton: document.querySelector("#refresh-button"),
  exportButton: document.querySelector("#export-button"),
  clearFiltersButton: document.querySelector("#clear-filters-button"),
  categoryInput: document.querySelector("#category"),
  categoryOptions: document.querySelector("#category-options"),
  transactionRows: document.querySelector("#transaction-rows"),
  budgetList: document.querySelector("#budget-list"),
  saveButton: document.querySelector("#save-transaction-button"),
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
  return {
    color: "#cbd5e1",
    font: {
      family: "Fira Sans, Segoe UI, system-ui, sans-serif",
    },
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

  if (state.cashflowChart) {
    state.cashflowChart.destroy();
  }

  window.Chart.defaults.color = chartDefaults().color;
  window.Chart.defaults.font.family = chartDefaults().font.family;

  state.cashflowChart = new window.Chart(document.querySelector("#cashflow-chart"), {
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Income",
          data: income,
          backgroundColor: "rgba(52, 211, 153, 0.72)",
          borderRadius: 10,
        },
        {
          type: "bar",
          label: "Expenses",
          data: expenses,
          backgroundColor: "rgba(248, 113, 113, 0.66)",
          borderRadius: 10,
        },
        {
          type: "line",
          label: "Net",
          data: net,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.16)",
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.36,
          fill: false,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
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
        x: { grid: { color: "rgba(255, 255, 255, 0.06)" } },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.07)" },
          ticks: { callback: (value) => money(value) },
        },
      },
    },
  });

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

  if (state.categoryChart) {
    state.categoryChart.destroy();
  }

  const labels = categories.map((item) => item.category);
  const values = categories.map((item) => item.amount);
  const palette = ["#60a5fa", "#34d399", "#f87171", "#fbbf24", "#a78bfa", "#22d3ee", "#fb7185", "#cbd5e1"];

  state.categoryChart = new window.Chart(document.querySelector("#category-chart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, index) => palette[index % palette.length]),
          borderColor: "rgba(15, 23, 42, 0.92)",
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      cutout: "68%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 9, boxHeight: 9 } },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${money(context.parsed)}`,
          },
        },
      },
    },
  });

  const top = categories[0];
  summaryText.textContent = top
    ? `Largest expense category is ${top.category} at ${money(top.amount)}.`
    : "No expense categories yet.";
}

function renderBudgets(budgets) {
  if (!budgets.length) {
    selectors.budgetList.innerHTML = `<p class="empty-state">No budgets yet. Seed data adds starter limits for common spending categories.</p>`;
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
            <span class="budget-meta">${money(budget.spent)} of ${money(budget.monthly_limit)} · ${statusText}</span>
          </div>
          <div class="progress-track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}" aria-label="${escapeHtml(budget.category)} budget usage">
            <div class="progress-value ${budget.status}" style="width: ${percentage}%"></div>
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
          <td>${asDateLabel(transaction.occurred_on)}</td>
          <td>
            <strong>${escapeHtml(transaction.description)}</strong>
            ${transaction.notes ? `<br><small>${escapeHtml(transaction.notes)}</small>` : ""}
          </td>
          <td>${escapeHtml(transaction.category)}</td>
          <td><span class="kind-pill ${transaction.kind}">${transaction.kind}</span></td>
          <td class="amount-cell">${money(signedAmount)}</td>
          <td><button class="delete-button" type="button" data-delete-id="${transaction.id}" aria-label="Delete ${escapeHtml(transaction.description)}">Delete</button></td>
        </tr>`;
    })
    .join("");
}

function populateCategoryOptions() {
  const selectedKind = selectors.form.querySelector('input[name="kind"]:checked')?.value || "expense";
  const values = state.categories[selectedKind] || [];
  selectors.categoryOptions.innerHTML = values.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  if (!selectors.categoryInput.value && values.length) {
    selectors.categoryInput.placeholder = values[0];
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
    const node = document.querySelector(`[data-error-for="${field}"]`);
    if (node) {
      node.textContent = message;
    }
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

async function loadDashboard() {
  const query = buildFilterQuery();
  const suffix = query ? `?${query}` : "";
  setStatus("Loading dashboard data");
  selectors.refreshButton.disabled = true;

  try {
    const [summary, transactionPayload] = await Promise.all([
      apiFetch(`/api/summary${suffix}`),
      apiFetch(`/api/transactions${suffix}`),
    ]);

    state.categories = summary.categories || { income: [], expense: [] };
    populateCategoryOptions();
    updateMetrics(summary);
    renderCashflowChart(summary.monthly || []);
    renderCategoryChart(summary.category_breakdown || []);
    renderBudgets(summary.budgets || []);
    renderTransactions(transactionPayload.transactions || []);
    setStatus("Dashboard data is up to date");
  } catch (error) {
    setStatus("Could not load dashboard data");
    showToast(error.error || "Something went wrong while loading data.");
  } finally {
    selectors.refreshButton.disabled = false;
  }
}

function payloadFromForm() {
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

async function handleTransactionSubmit(event) {
  event.preventDefault();
  clearFieldErrors();
  selectors.saveButton.disabled = true;
  selectors.saveButton.textContent = "Saving...";

  try {
    await apiFetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify(payloadFromForm()),
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

async function handleDelete(event) {
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
  selectors.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadDashboard();
  });
  selectors.clearFiltersButton.addEventListener("click", () => {
    selectors.filterForm.reset();
    loadDashboard();
  });
  selectors.refreshButton.addEventListener("click", loadDashboard);
  selectors.exportButton.addEventListener("click", exportCsv);
  selectors.transactionRows.addEventListener("click", handleDelete);
  selectors.form.querySelectorAll('input[name="kind"]').forEach((input) => {
    input.addEventListener("change", populateCategoryOptions);
  });
}

setDefaultDate();
bindEvents();
loadDashboard();
