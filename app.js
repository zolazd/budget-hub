const STORAGE_KEY = "zola-budget-hub-v3";
const PRIOR_STORAGE_KEY = "zola-budget-hub-v2";
const LEGACY_STORAGE_KEY = "zola-budget-hub-v1";
const CATEGORY_SIGN = {
  Income: 1,
  Bills: -1,
  Expenses: -1,
  Savings: -1,
  Debt: -1,
  Transfer: 0,
};

const MAIN_ACCOUNT_NAMES = [
  "Deposits (Credit Union)",
  "Cash Envelopes At Home",
  "Sinking Funds",
  "Wallet Cash",
  "CIBC",
  "Undeposited Funds",
];

const DASHBOARD_ACCOUNT_NAMES = [
  "Deposits (Credit Union)",
  "Cash Envelopes At Home",
  "Sinking Funds",
  "Wallet Cash",
  "CIBC",
];

const SPENDABLE_ACCOUNT_NAMES = ["Cash Envelopes At Home", "CIBC", "Undeposited Funds"];

const els = {
  monthSelect: document.querySelector("#monthSelect"),
  jumpDate: document.querySelector("#jumpDate"),
  themeSelect: document.querySelector("#themeSelect"),
  cycleNote: document.querySelector("#cycleNote"),
  kpiGrid: document.querySelector("#kpiGrid"),
  accountsGrid: document.querySelector("#accountsGrid"),
  cashFlowBars: document.querySelector("#cashFlowBars"),
  categoryBars: document.querySelector("#categoryBars"),
  budgetBody: document.querySelector("#budgetBody"),
  transactionBody: document.querySelector("#transactionBody"),
  transactionForm: document.querySelector("#transactionForm"),
  transactionFormTitle: document.querySelector("#transactionFormTitle"),
  transactionSubmit: document.querySelector("#transactionSubmit"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  ledgerCategoryFilter: document.querySelector("#ledgerCategoryFilter"),
  ledgerSubcategoryFilter: document.querySelector("#ledgerSubcategoryFilter"),
  searchInput: document.querySelector("#searchInput"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  resetBtn: document.querySelector("#resetBtn"),
  copyBudgetBtn: document.querySelector("#copyBudgetBtn"),
  addAccountBtn: document.querySelector("#addAccountBtn"),
  addEnvelopeBtn: document.querySelector("#addEnvelopeBtn"),
  envelopesGrid: document.querySelector("#envelopesGrid"),
  envelopeBars: document.querySelector("#envelopeBars"),
  addLoanBtn: document.querySelector("#addLoanBtn"),
  loansGrid: document.querySelector("#loansGrid"),
  trackedBalances: document.querySelector("#trackedBalances"),
  walletForm: document.querySelector("#walletForm"),
  walletBody: document.querySelector("#walletBody"),
  walletBalanceTitle: document.querySelector("#walletBalanceTitle"),
  subcategoryList: document.querySelector("#subcategoryList"),
  tabs: [...document.querySelectorAll("[data-tab]")],
  panels: [...document.querySelectorAll("[data-panel]")],
};

let state = loadState();
let selectedMonth = state.meta.defaultViewMonth || "2026-06";

function cloneSeed() {
  return JSON.parse(JSON.stringify(window.BUDGET_SEED || {}));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(PRIOR_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    try {
      return migrateState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PRIOR_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }
  return migrateState(cloneSeed());
}

function migrateState(input) {
  const next = input || {};
  next.meta = { currency: "XCD", budgetCycleStartDay: 24, defaultViewMonth: "2026-06", theme: "sage", ...(next.meta || {}) };
  if (next.meta.budgetCycleStartDay === 25) next.meta.budgetCycleStartDay = 24;
  next.accounts = normalizeAccounts(next.accounts || []);
  next.transactions = (next.transactions || []).map((tx) => ({
    ...tx,
    account: tx.account === "Main Account" ? "Deposits (Credit Union)" : tx.account || "Deposits (Credit Union)",
  }));
  next.transfers = next.transfers || [];
  next.budgets = normalizeBudgets(next.budgets || []);
  next.envelopes = next.envelopes?.length ? next.envelopes : defaultEnvelopes();
  next.loans = normalizeLoans(next.loans?.length ? next.loans : defaultLoans());
  return next;
}

function normalizeAccounts(accounts) {
  const byName = new Map();
  for (const account of accounts) {
    const name = normalizeAccountName(account.name);
    if (!name) continue;
    const carriedBalance = account.currentBalance ?? account.openingBalance ?? 0;
    let currentBalance = name === "Deposits (Credit Union)" && Math.abs(Number(carriedBalance) - 353.03) < 0.01 ? 515.76 : carriedBalance;
    if (name === "Cash Envelopes At Home" && Number(currentBalance || 0) === 0) currentBalance = 139.5;
    byName.set(name, {
      ...account,
      id: account.id || `account-${Date.now()}-${byName.size}`,
      name,
      currentBalance,
      openingBalance: currentBalance,
      displayOnDashboard: account.displayOnDashboard ?? DASHBOARD_ACCOUNT_NAMES.includes(name),
    });
  }
  for (const name of MAIN_ACCOUNT_NAMES) {
    if (!byName.has(name)) {
      byName.set(name, {
        id: slug(name),
        name,
        openingBalance: defaultAccountBalance(name),
        currentBalance: defaultAccountBalance(name),
        notes: defaultAccountNote(name),
        displayOnDashboard: DASHBOARD_ACCOUNT_NAMES.includes(name),
      });
    }
  }
  return [...byName.values()];
}

function defaultAccountBalance(name) {
  if (name === "Deposits (Credit Union)") return 515.76;
  if (name === "Cash Envelopes At Home") return 139.5;
  return 0;
}

function normalizeAccountName(name) {
  if (name === "Main Account") return "Deposits (Credit Union)";
  if (name === "Cash At Home" || name === "Money At Home") return "Cash Envelopes At Home";
  if (name === "Savings") return "Sinking Funds";
  if (name === "Visions" || name === "Vision") return "Visions";
  return name;
}

function defaultAccountNote(name) {
  return {
    "Deposits (Credit Union)": "Your Credit Union deposit account. Current anchor set to 515.76.",
    "Cash Envelopes At Home": "Cash envelopes physically at home.",
    "Sinking Funds": "Savings buckets held at home.",
    "Wallet Cash": "Cash available in your wallet.",
    CIBC: "Your other bank account.",
    "Undeposited Funds": "Cash temporarily held before splitting to envelopes or sinking funds.",
  }[name] || "";
}

function defaultEnvelopes() {
  return [
    { id: "env-emergency", name: "Emergency", type: "Sinking Fund", openingBalance: 0, color: "#2d6a4f" },
    { id: "env-birthday", name: "Birthday", type: "Sinking Fund", openingBalance: 0, color: "#b66b18" },
    { id: "env-passport", name: "Passport", type: "Sinking Fund", openingBalance: 0, color: "#305f8f" },
    { id: "env-groceries", name: "Groceries", type: "Cash Envelope", openingBalance: 0, color: "#226f76" },
    { id: "env-bus", name: "Bus", type: "Cash Envelope", openingBalance: 0, color: "#8a4f7d" },
  ];
}

function defaultLoans() {
  return [
    { id: "loan-main", name: "Main Loan", openingBalance: 203258.58, subcategory: "Land", color: "#a33d32" },
    { id: "loan-insurance", name: "Insurance", openingBalance: 61159, subcategory: "Insurance", color: "#b66b18" },
  ];
}

function normalizeLoans(loans) {
  return loans.map((loan) => {
    if ((loan.name === "Land" || loan.name === "Main Loan") && Number(loan.openingBalance || 0) === 0) {
      return { ...loan, name: "Main Loan", openingBalance: 203258.58, subcategory: loan.subcategory || "Land" };
    }
    if (loan.name === "Insurance" && Number(loan.openingBalance || 0) === 0) {
      return { ...loan, openingBalance: 61159, subcategory: loan.subcategory || "Insurance" };
    }
    return loan;
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeBudgets(rows) {
  const rolled = new Map();
  for (const row of rows) {
    const key = `${row.month}|${row.category}`;
    const current = rolled.get(key) || { month: row.month, category: row.category, budget: 0 };
    current.budget += Number(row.budget || 0);
    rolled.set(key, current);
  }
  return [...rolled.values()].map((row) => ({ ...row, budget: round(row.budget) }));
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: state.meta.currency || "XCD",
    currencyDisplay: "narrowSymbol",
  });
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" })} ${year}`;
}

function addMonths(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions() {
  const months = new Set();
  for (let key = "2026-01"; key <= "2027-01"; key = addMonths(key, 1)) months.add(key);
  months.add(selectedMonth);
  for (const tx of state.transactions) months.add(txMonth(tx));
  for (const row of state.budgets) months.add(row.month);
  return [...months].sort();
}

function cycleMonth(dateString) {
  const d = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(d.getTime())) return selectedMonth;
  const startDay = Number(state.meta.budgetCycleStartDay || 25);
  if (d.getDate() >= startDay) d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function txMonth(tx) {
  if (tx.month) return tx.month;
  if (tx.sourceMonth) return `2026-${String(tx.sourceMonth).padStart(2, "0")}`;
  return cycleMonth(tx.date);
}

function signedAmount(tx) {
  const sign = CATEGORY_SIGN[tx.category] ?? -1;
  return round(Number(tx.amount || 0) * sign);
}

function transactionsForMonth(monthKey) {
  return state.transactions.filter((tx) => txMonth(tx) === monthKey);
}

function transactionsThroughMonth(monthKey) {
  return state.transactions.filter((tx) => txMonth(tx) <= monthKey);
}

function lastKnownTransactions() {
  return state.transactions.filter((tx) => txMonth(tx) <= selectedMonth);
}

function totalsFor(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount || 0);
      if (tx.category === "Income") acc.income += amount;
      else if (tx.category === "Debt") acc.debt += amount;
      else if (tx.category === "Savings") acc.savings += amount;
      else acc.outflow += amount;
      acc.net += signedAmount(tx);
      return acc;
    },
    { income: 0, outflow: 0, savings: 0, debt: 0, net: 0 }
  );
}

function accountBalances(monthKey) {
  const balances = new Map(state.accounts.map((account) => [account.name, Number(account.currentBalance ?? account.openingBalance ?? 0)]));
  for (const tx of transactionsThroughMonth(monthKey)) {
    if (String(tx.id || "").startsWith("seed-")) continue;
    if (tx.category === "Transfer") continue;
    const account = tx.account || "Deposits (Credit Union)";
    balances.set(account, round((balances.get(account) || 0) + signedAmount(tx)));
  }
  for (const transfer of transfersThroughMonth(monthKey)) {
    balances.set(transfer.fromAccount, round((balances.get(transfer.fromAccount) || 0) - Number(transfer.amount || 0)));
    balances.set(transfer.toAccount, round((balances.get(transfer.toAccount) || 0) + Number(transfer.amount || 0)));
  }
  return state.accounts.map((account) => ({ ...account, balance: round(balances.get(account.name) || 0) }));
}

function transfersThroughMonth(monthKey) {
  return (state.transfers || []).filter((transfer) => txMonth(transfer) <= monthKey);
}

function transfersForMonth(monthKey) {
  return (state.transfers || []).filter((transfer) => txMonth(transfer) === monthKey);
}

function dashboardAccountBalances() {
  return accountBalances(selectedMonth)
    .filter((account) => account.displayOnDashboard !== false && DASHBOARD_ACCOUNT_NAMES.includes(account.name))
    .map((account) => {
      if (account.name === "Cash Envelopes At Home") return { ...account, balance: round(account.balance + envelopeTotal("Cash Envelope")) };
      if (account.name === "Sinking Funds") return { ...account, balance: envelopeTotal("Sinking Fund") };
      return account;
    });
}

function accountBalanceByName(name) {
  if (name === "Cash Envelopes At Home") {
    const account = accountBalances(selectedMonth).find((item) => item.name === name);
    return round((account?.balance || 0) + envelopeTotal("Cash Envelope"));
  }
  if (name === "Sinking Funds") return envelopeTotal("Sinking Fund");
  return accountBalances(selectedMonth).find((account) => account.name === name)?.balance || 0;
}

function envelopeTotal(type) {
  return round(state.envelopes.filter((env) => !type || env.type === type).reduce((sum, env) => sum + envelopeBalance(env), 0));
}

function budgetRows(monthKey) {
  const selected = state.budgets.filter((row) => row.month === monthKey);
  const monthTx = transactionsForMonth(monthKey);
  const categories = new Set(["Income", "Bills", "Expenses", "Savings", "Debt"]);
  for (const row of selected) categories.add(row.category);
  for (const tx of monthTx) categories.add(tx.category);
  return [...categories].map((category) => {
    const budget = selected.filter((row) => row.category === category).reduce((sum, row) => sum + Number(row.budget || 0), 0);
    const actual = monthTx.filter((tx) => tx.category === category).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const remaining = category === "Income" ? actual - budget : budget - actual;
    return { category, budget: round(budget), actual: round(actual), remaining: round(remaining) };
  });
}

function cycleRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const startDay = Number(state.meta.budgetCycleStartDay || 25);
  return { start: new Date(year, month - 2, startDay), end: new Date(year, month - 1, startDay - 1) };
}

function fmtDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function lastTxDate() {
  const dates = lastKnownTransactions().map((tx) => tx.date).sort();
  return dates.at(-1) || "No transactions yet";
}

function renderMonthSelect() {
  els.monthSelect.innerHTML = monthOptions().map((key) => `<option value="${key}">${monthLabel(key)}</option>`).join("");
  els.monthSelect.value = selectedMonth;
  els.jumpDate.value ||= `${selectedMonth}-25`;
}

function renderKpis() {
  const monthTx = transactionsForMonth(selectedMonth);
  const totals = totalsFor(monthTx);
  const deposits = accountBalanceByName("Deposits (Credit Union)");
  const spendable = SPENDABLE_ACCOUNT_NAMES.reduce((sum, name) => sum + accountBalanceByName(name), 0);
  const budgets = budgetRows(selectedMonth);
  const nonIncomeBudget = budgets.filter((row) => row.category !== "Income").reduce((sum, row) => sum + row.budget, 0);
  const nonIncomeActual = budgets.filter((row) => row.category !== "Income").reduce((sum, row) => sum + row.actual, 0);
  const leftToBudget = nonIncomeBudget - nonIncomeActual;
  els.kpiGrid.innerHTML = [
    metric("Deposits Balance", money(deposits), "Credit Union account balance anchor plus new posts", deposits < 0 ? "negative" : "positive"),
    metric("Cycle Income", money(totals.income), `${monthLabel(selectedMonth)} includes planned/posted income`, "positive"),
    metric("Cycle Outflow", money(totals.outflow + totals.savings + totals.debt), "Bills, expenses, savings, and debt", totals.outflow > totals.income ? "negative" : ""),
    metric("Left To Spend", money(Math.min(leftToBudget, spendable)), `Cash envelopes, CIBC, and Undeposited Funds: ${money(spendable)}`, leftToBudget < 0 ? "negative" : leftToBudget < 250 ? "warning" : "positive"),
  ].join("");
}

function metric(label, value, sub, tone = "") {
  return `<article class="metric ${tone}"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${escapeHtml(sub)}</div></article>`;
}

function renderAccounts() {
  els.accountsGrid.innerHTML = dashboardAccountBalances()
    .map(
      (account) => `<article class="account-card" data-id="${account.id}">
        <div class="card-title-row">
          <strong>${escapeHtml(account.name)}</strong>
          <button class="icon-danger" data-delete-account="${account.id}" title="Delete account" type="button">Delete</button>
        </div>
        <div class="balance">${money(account.balance)}</div>
        <p class="subtle">${escapeHtml(account.notes || "")}</p>
        <div class="account-edit">
          <label class="field"><span>Name</span><input data-account-field="name" value="${escapeAttr(account.name)}"></label>
          <label class="field"><span>Current / Anchor</span><input data-account-field="currentBalance" type="number" step="0.01" value="${Number(account.currentBalance ?? account.openingBalance ?? 0)}"></label>
        </div>
      </article>`
    )
    .join("");
}

function renderBars() {
  const txs = transactionsForMonth(selectedMonth);
  const totals = totalsFor(txs);
  const bills = txs.filter((tx) => tx.category === "Bills").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const expenses = txs.filter((tx) => tx.category === "Expenses").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const max = Math.max(totals.income, bills, expenses, totals.savings, totals.debt, 1);
  els.cashFlowBars.innerHTML = [
    bar("Income", totals.income, max, "income"),
    bar("Bills", bills, max, "outflow"),
    bar("Expenses", expenses, max, "outflow"),
    bar("Sinking/Savings", totals.savings, max, "income"),
    bar("Debt", totals.debt, max, "debt"),
  ].join("");

  const bySubcategory = new Map();
  for (const tx of txs) {
    if (!["Bills", "Expenses"].includes(tx.category)) continue;
    const key = tx.subcategory || tx.category;
    bySubcategory.set(key, (bySubcategory.get(key) || 0) + Number(tx.amount || 0));
  }
  const top = [...bySubcategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const catMax = Math.max(...top.map(([, value]) => value), 1);
  els.categoryBars.innerHTML = top.length ? top.map(([label, value]) => bar(label, value, catMax, value > 1000 ? "debt" : "")).join("") : `<p class="empty">No category spending yet for this cycle.</p>`;
}

function bar(label, value, max, tone = "", color = "") {
  const pct = Math.min(100, Math.round((Number(value || 0) / max) * 100));
  const style = color ? ` style="width:${pct}%;background:${escapeAttr(color)}"` : ` style="width:${pct}%"`;
  return `<div class="bar-row"><div class="bar-label"><span>${escapeHtml(label)}</span><span>${money(value)}</span></div><div class="bar-track"><div class="bar-fill ${tone}"${style}></div></div></div>`;
}

function renderBudget() {
  els.budgetBody.innerHTML = budgetRows(selectedMonth)
    .map((row) => {
      const used = row.budget > 0 ? Math.round((row.actual / row.budget) * 100) : row.actual > 0 ? 100 : 0;
      const over = row.category !== "Income" && row.remaining < 0;
      return `<tr>
        <td>${escapeHtml(row.category)}</td>
        <td><input class="editable-budget" data-budget-category="${escapeAttr(row.category)}" type="number" step="0.01" value="${row.budget}"></td>
        <td>${money(row.actual)}</td>
        <td class="num ${over ? "negative" : ""}">${money(row.remaining)}</td>
        <td><div class="progress ${over ? "over" : ""}"><span style="width:${Math.min(100, used)}%"></span></div></td>
      </tr>`;
    })
    .join("");
}

function renderTransactions() {
  const q = els.searchInput.value.trim().toLowerCase();
  const category = els.ledgerCategoryFilter.value;
  const subcategory = els.ledgerSubcategoryFilter.value;
  const txRows = transactionsForMonth(selectedMonth)
    .map((tx) => ({ ...tx, rowType: "transaction" }));
  const transferRows = transfersForMonth(selectedMonth)
    .map((transfer) => ({
      ...transfer,
      id: transfer.id,
      rowType: "transfer",
      account: transfer.fromAccount,
      category: "Transfer",
      subcategory: transfer.toAccount,
      description: transfer.description || `${transfer.fromAccount} to ${transfer.toAccount}`,
    }));
  const rows = [...txRows, ...transferRows]
    .filter((tx) => !q || JSON.stringify(tx).toLowerCase().includes(q))
    .filter((tx) => !category || tx.category === category)
    .filter((tx) => !subcategory || tx.subcategory === subcategory)
    .sort((a, b) => a.date.localeCompare(b.date));
  els.transactionBody.innerHTML = rows.length
    ? rows.map((tx) => `<tr>
        <td>${escapeHtml(tx.date)}</td>
        <td>${escapeHtml(tx.account || "")}</td>
        <td>${escapeHtml(tx.category || "")}</td>
        <td>${escapeHtml(tx.subcategory || "")}</td>
        <td>${escapeHtml(tx.description || "")}</td>
        <td class="num">${money(tx.amount)}</td>
        <td class="actions-cell">
          ${tx.rowType === "transaction" ? `<button class="small ghost" data-edit="${tx.id}" type="button">Edit</button>` : ""}
          <button class="small danger" data-delete-${tx.rowType}="${tx.id}" type="button">Delete</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="empty">No transactions found for this cycle.</td></tr>`;
}

function envelopeBalance(envelope, monthKey = selectedMonth) {
  let balance = Number(envelope.openingBalance || 0);
  for (const tx of transactionsThroughMonth(monthKey)) {
    if (String(tx.id || "").startsWith("seed-")) continue;
    if ((tx.subcategory || "").trim().toLowerCase() !== envelope.name.trim().toLowerCase()) continue;
    if (tx.category === "Savings") balance += Number(tx.amount || 0);
    if (tx.category === "Expenses" || tx.category === "Bills") balance -= Number(tx.amount || 0);
  }
  for (const transfer of transfersThroughMonth(monthKey)) {
    if (transfer.toAccount === envelope.name) balance += Number(transfer.amount || 0);
    if (transfer.fromAccount === envelope.name) balance -= Number(transfer.amount || 0);
  }
  return round(balance);
}

function renderEnvelopes() {
  const sinking = state.envelopes.filter((env) => env.type === "Sinking Fund");
  const cash = state.envelopes.filter((env) => env.type === "Cash Envelope");
  const renderGroup = (title, rows, total) => `<div class="envelope-group">
    <div class="group-title"><h3>${escapeHtml(title)}</h3><strong>${money(total)}</strong></div>
    <div class="accounts-grid">${rows.map(renderEnvelopeCard).join("") || `<p class="empty">No ${escapeHtml(title.toLowerCase())} yet.</p>`}</div>
  </div>`;
  const summary = `<article class="account-card summary-card">
      <strong>Total Sinking Funds</strong>
      <div class="balance">${money(envelopeTotal("Sinking Fund"))}</div>
    </article>
    <article class="account-card summary-card">
      <strong>Total Cash Envelopes</strong>
      <div class="balance">${money(accountBalanceByName("Cash Envelopes At Home"))}</div>
      <p class="subtle">Includes beginning balance of 139.50 plus envelope activity.</p>
    </article>`;
  els.envelopesGrid.innerHTML = summary + renderGroup("Sinking Funds", sinking, envelopeTotal("Sinking Fund")) + renderGroup("Cash Envelopes", cash, accountBalanceByName("Cash Envelopes At Home"));
  const rows = state.envelopes.map((env) => ({ label: env.name, value: envelopeBalance(env), color: env.color }));
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  els.envelopeBars.innerHTML = rows.map((row) => bar(row.label, row.value, max, "", row.color)).join("");
}

function renderEnvelopeCard(env) {
  return `<article class="account-card" data-envelope-id="${env.id}">
      <div class="card-title-row">
        <strong>${escapeHtml(env.name)}</strong>
        <button class="icon-danger" data-delete-envelope="${env.id}" type="button">Delete</button>
      </div>
      <div class="balance" style="color:${escapeAttr(env.color || "#226f76")}">${money(envelopeBalance(env))}</div>
      <div class="account-edit envelope-edit">
        <label class="field"><span>Name</span><input data-envelope-field="name" value="${escapeAttr(env.name)}"></label>
        <label class="field"><span>Type</span><select data-envelope-field="type"><option ${env.type === "Sinking Fund" ? "selected" : ""}>Sinking Fund</option><option ${env.type === "Cash Envelope" ? "selected" : ""}>Cash Envelope</option></select></label>
        <label class="field"><span>Opening</span><input data-envelope-field="openingBalance" type="number" step="0.01" value="${Number(env.openingBalance || 0)}"></label>
        <label class="field"><span>Color</span><input data-envelope-field="color" type="color" value="${escapeAttr(env.color || "#226f76")}"></label>
      </div>
    </article>`;
}

function loanBalance(loan, monthKey = selectedMonth) {
  const paid = transactionsThroughMonth(monthKey)
    .filter((tx) => tx.category === "Debt" && (tx.subcategory || "").trim().toLowerCase() === loan.subcategory.trim().toLowerCase())
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  return round(Number(loan.openingBalance || 0) - paid);
}

function renderLoans() {
  els.loansGrid.innerHTML = state.loans.map((loan) => `<article class="account-card" data-loan-id="${loan.id}">
      <div class="card-title-row">
        <strong>${escapeHtml(loan.name)}</strong>
        <button class="icon-danger" data-delete-loan="${loan.id}" type="button">Delete</button>
      </div>
      <div class="balance" style="color:${escapeAttr(loan.color || "#a33d32")}">${money(loanBalance(loan))}</div>
      <p class="subtle">Payments match Debt subcategory: ${escapeHtml(loan.subcategory)}</p>
      <div class="account-edit envelope-edit">
        <label class="field"><span>Name</span><input data-loan-field="name" value="${escapeAttr(loan.name)}"></label>
        <label class="field"><span>Debt Subcategory</span><input data-loan-field="subcategory" value="${escapeAttr(loan.subcategory)}"></label>
        <label class="field"><span>Starting Loan Balance</span><input data-loan-field="openingBalance" type="number" step="0.01" value="${Number(loan.openingBalance || 0)}"></label>
        <label class="field"><span>Color</span><input data-loan-field="color" type="color" value="${escapeAttr(loan.color || "#a33d32")}"></label>
      </div>
    </article>`).join("");
  const balances = accountBalances(selectedMonth).filter((account) => ["Deposits (Credit Union)", "CIBC", "Wallet Cash"].includes(account.name));
  const max = Math.max(...balances.map((account) => Math.abs(account.balance)), 1);
  els.trackedBalances.innerHTML = balances.map((account) => bar(account.name, account.balance, max, account.name === "Deposits (Credit Union)" ? "income" : "")).join("");
}

function renderWallet() {
  const balance = accountBalanceByName("Wallet Cash");
  els.walletBalanceTitle.textContent = `Wallet Cash Balance: ${money(balance)}`;
  const rows = transactionsThroughMonth(selectedMonth)
    .filter((tx) => tx.account === "Wallet Cash")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 80);
  els.walletBody.innerHTML = rows.length
    ? rows.map((tx) => `<tr><td>${escapeHtml(tx.date)}</td><td>${escapeHtml(tx.subcategory || "")}</td><td>${escapeHtml(tx.description || "")}</td><td class="num">${money(tx.amount)}</td></tr>`).join("")
    : `<tr><td colspan="4" class="empty">No wallet cash transactions yet.</td></tr>`;
  els.walletForm.elements.date.value ||= new Date().toISOString().slice(0, 10);
}

function renderFormOptions() {
  const accountSelect = els.transactionForm.elements.account;
  const toAccountSelect = els.transactionForm.elements.toAccount;
  const current = accountSelect.value;
  const currentTo = toAccountSelect.value;
  const options = selectableMoneyBuckets().map((name) => `<option>${escapeHtml(name)}</option>`).join("");
  accountSelect.innerHTML = options;
  toAccountSelect.innerHTML = options;
  if (current) accountSelect.value = current;
  if (currentTo) toAccountSelect.value = currentTo;
  renderSubcategoryOptions();
  els.transactionForm.elements.date.value ||= new Date().toISOString().slice(0, 10);
}

function selectableMoneyBuckets() {
  return [
    ...state.accounts.map((account) => account.name),
    ...state.envelopes.map((envelope) => envelope.name),
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

function subcategoryOptions() {
  return [
    "Paycheck",
    "Groceries",
    "Bus",
    "Food Fees",
    "Boys",
    "Wallet Cash",
    "Lucelec",
    "Wasco",
    "Digibill",
    "Flow",
    "Insurance",
    "Land",
    ...selectableMoneyBuckets(),
    ...state.envelopes.map((envelope) => envelope.name),
    ...state.transactions.map((tx) => tx.subcategory).filter(Boolean),
  ].filter((value, index, array) => value && array.indexOf(value) === index).sort();
}

function renderSubcategoryOptions() {
  const options = subcategoryOptions();
  els.subcategoryList.innerHTML = options.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
  const categories = ["", ...new Set([...state.transactions.map((tx) => tx.category).filter(Boolean), "Transfer"])].sort();
  const subcategories = ["", ...options];
  const selectedCategory = els.ledgerCategoryFilter.value;
  const selectedSubcategory = els.ledgerSubcategoryFilter.value;
  els.ledgerCategoryFilter.innerHTML = categories.map((value) => `<option value="${escapeAttr(value)}">${value ? escapeHtml(value) : "All"}</option>`).join("");
  els.ledgerSubcategoryFilter.innerHTML = subcategories.map((value) => `<option value="${escapeAttr(value)}">${value ? escapeHtml(value) : "All"}</option>`).join("");
  els.ledgerCategoryFilter.value = selectedCategory;
  els.ledgerSubcategoryFilter.value = selectedSubcategory;
}

function renderCycleNote() {
  const { start, end } = cycleRange(selectedMonth);
  els.cycleNote.textContent = `${monthLabel(selectedMonth)} uses your pay-cycle view: ${fmtDate(start)} through ${fmtDate(end)}. Balances show activity through the selected cycle, and May income posted in advance remains in the month it came from in the workbook.`;
}

function applyTheme() {
  document.body.dataset.theme = state.meta.theme || "sage";
  els.themeSelect.value = state.meta.theme || "sage";
}

function renderAll() {
  applyTheme();
  renderMonthSelect();
  renderCycleNote();
  renderFormOptions();
  renderKpis();
  renderAccounts();
  renderBars();
  renderBudget();
  renderTransactions();
  renderEnvelopes();
  renderLoans();
  renderWallet();
}

function updateBudget(category, value) {
  const amount = round(value);
  const existing = state.budgets.find((row) => row.month === selectedMonth && row.category === category);
  if (existing) existing.budget = amount;
  else state.budgets.push({ month: selectedMonth, category, budget: amount });
  saveState();
  renderAll();
}

function fillTransactionForm(tx) {
  els.transactionForm.elements.id.value = tx.id;
  els.transactionForm.elements.date.value = tx.date;
  els.transactionForm.elements.account.value = tx.account || "Deposits (Credit Union)";
  els.transactionForm.elements.category.value = tx.category;
  els.transactionForm.elements.subcategory.value = tx.subcategory || "";
  els.transactionForm.elements.amount.value = tx.amount;
  els.transactionForm.elements.description.value = tx.description || "";
  els.transactionForm.elements.category.dispatchEvent(new Event("change"));
  els.transactionFormTitle.textContent = "Edit Transaction";
  els.transactionSubmit.textContent = "Save Changes";
  els.cancelEditBtn.hidden = false;
}

function clearTransactionForm() {
  els.transactionForm.reset();
  els.transactionForm.elements.id.value = "";
  els.transactionForm.elements.category.value = "Income";
  document.querySelectorAll(".transfer-only").forEach((field) => {
    field.hidden = true;
  });
  els.transactionForm.elements.subcategory.closest(".field").hidden = false;
  els.transactionFormTitle.textContent = "Add Transaction";
  els.transactionSubmit.textContent = "Add Transaction";
  els.cancelEditBtn.hidden = true;
  renderFormOptions();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

els.monthSelect.addEventListener("change", () => {
  selectedMonth = els.monthSelect.value;
  renderAll();
});

els.jumpDate.addEventListener("change", () => {
  if (!els.jumpDate.value) return;
  selectedMonth = cycleMonth(els.jumpDate.value);
  renderAll();
});

els.themeSelect.addEventListener("change", () => {
  state.meta.theme = els.themeSelect.value;
  saveState();
  renderAll();
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
    els.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tab.dataset.tab));
  });
});

els.searchInput.addEventListener("input", renderTransactions);
els.ledgerCategoryFilter.addEventListener("change", renderTransactions);
els.ledgerSubcategoryFilter.addEventListener("change", renderTransactions);

els.transactionForm.elements.category.addEventListener("change", () => {
  const isTransfer = els.transactionForm.elements.category.value === "Transfer";
  document.querySelectorAll(".transfer-only").forEach((field) => {
    field.hidden = !isTransfer;
  });
  els.transactionForm.elements.toAccount.required = isTransfer;
  els.transactionForm.elements.subcategory.closest(".field").hidden = isTransfer;
});

els.transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(els.transactionForm));
  const amount = round(data.amount);
  if (!amount) return;
  if (data.category === "Transfer") {
    const payload = {
      id: data.id || `transfer-${Date.now()}`,
      date: data.date,
      fromAccount: data.account,
      toAccount: data.toAccount,
      amount,
      description: data.description || "",
      month: cycleMonth(data.date),
    };
    const existing = state.transfers.findIndex((transfer) => transfer.id === data.id);
    if (existing >= 0) state.transfers[existing] = { ...state.transfers[existing], ...payload };
    else state.transfers.push(payload);
    saveState();
    selectedMonth = payload.month;
    clearTransactionForm();
    renderAll();
    return;
  }
  const payload = {
    id: data.id || `tx-${Date.now()}`,
    date: data.date,
    account: data.account,
    category: data.category,
    subcategory: data.subcategory || data.category,
    amount,
    description: data.description || "",
    month: cycleMonth(data.date),
  };
  const existing = state.transactions.findIndex((tx) => tx.id === data.id);
  if (existing >= 0) state.transactions[existing] = { ...state.transactions[existing], ...payload };
  else state.transactions.push(payload);
  saveState();
  selectedMonth = payload.month;
  clearTransactionForm();
  renderAll();
});

els.cancelEditBtn.addEventListener("click", clearTransactionForm);

els.accountsGrid.addEventListener("change", (event) => {
  const input = event.target.closest("[data-account-field]");
  if (!input) return;
  const card = event.target.closest("[data-id]");
  const account = state.accounts.find((item) => item.id === card.dataset.id);
  if (!account) return;
  if (input.dataset.accountField === "name") {
    const priorName = account.name;
    const nextName = input.value.trim() || priorName;
    account.name = nextName;
    for (const tx of state.transactions) if (tx.account === priorName) tx.account = nextName;
  } else {
    account.currentBalance = round(input.value);
    account.openingBalance = round(input.value);
  }
  saveState();
  renderAll();
});

els.accountsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-account]");
  if (!button) return;
  const account = state.accounts.find((item) => item.id === button.dataset.deleteAccount);
  if (!account || state.accounts.length <= 1) return;
  if (!confirm(`Delete ${account.name}? Transactions on this account will move to Deposits (Credit Union).`)) return;
  const fallback = state.accounts.find((item) => item.name === "Deposits (Credit Union)" && item.id !== account.id) || state.accounts.find((item) => item.id !== account.id);
  for (const tx of state.transactions) if (tx.account === account.name) tx.account = fallback.name;
  state.accounts = state.accounts.filter((item) => item.id !== account.id);
  saveState();
  renderAll();
});

els.budgetBody.addEventListener("change", (event) => {
  const input = event.target.closest("[data-budget-category]");
  if (input) updateBudget(input.dataset.budgetCategory, input.value);
});

els.transactionBody.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]");
  if (edit) {
    const tx = state.transactions.find((item) => item.id === edit.dataset.edit);
    if (tx) fillTransactionForm(tx);
    return;
  }
  const transferDelete = event.target.closest("[data-delete-transfer]");
  if (transferDelete) {
    state.transfers = state.transfers.filter((transfer) => transfer.id !== transferDelete.dataset.deleteTransfer);
    saveState();
    renderAll();
    return;
  }
  const button = event.target.closest("[data-delete-transaction]");
  if (!button) return;
  state.transactions = state.transactions.filter((tx) => tx.id !== button.dataset.deleteTransaction);
  saveState();
  renderAll();
});

els.addAccountBtn.addEventListener("click", () => {
  const index = state.accounts.length + 1;
  state.accounts.push({ id: `account-${Date.now()}`, name: `Account ${index}`, openingBalance: 0, notes: "" });
  saveState();
  renderAll();
});

els.addEnvelopeBtn.addEventListener("click", () => {
  state.envelopes.push({ id: `env-${Date.now()}`, name: "New Envelope", type: "Cash Envelope", openingBalance: 0, color: "#226f76" });
  saveState();
  renderAll();
});

els.envelopesGrid.addEventListener("change", (event) => {
  const input = event.target.closest("[data-envelope-field]");
  if (!input) return;
  const envelope = state.envelopes.find((item) => item.id === event.target.closest("[data-envelope-id]").dataset.envelopeId);
  if (!envelope) return;
  const field = input.dataset.envelopeField;
  envelope[field] = field === "openingBalance" ? round(input.value) : input.value;
  saveState();
  renderAll();
});

els.envelopesGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-envelope]");
  if (!button) return;
  state.envelopes = state.envelopes.filter((item) => item.id !== button.dataset.deleteEnvelope);
  saveState();
  renderAll();
});

els.addLoanBtn.addEventListener("click", () => {
  state.loans.push({ id: `loan-${Date.now()}`, name: "New Loan", openingBalance: 0, subcategory: "New Loan", color: "#a33d32" });
  saveState();
  renderAll();
});

els.loansGrid.addEventListener("change", (event) => {
  const input = event.target.closest("[data-loan-field]");
  if (!input) return;
  const loan = state.loans.find((item) => item.id === event.target.closest("[data-loan-id]").dataset.loanId);
  if (!loan) return;
  const field = input.dataset.loanField;
  loan[field] = field === "openingBalance" ? round(input.value) : input.value;
  saveState();
  renderAll();
});

els.loansGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-loan]");
  if (!button) return;
  state.loans = state.loans.filter((item) => item.id !== button.dataset.deleteLoan);
  saveState();
  renderAll();
});

els.walletForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(els.walletForm));
  const amount = round(data.amount);
  if (!amount) return;
  state.transactions.push({
    id: `tx-${Date.now()}`,
    date: data.date,
    account: "Wallet Cash",
    category: "Expenses",
    subcategory: data.subcategory || "Wallet Cash",
    amount,
    description: data.description || "",
    month: cycleMonth(data.date),
  });
  saveState();
  selectedMonth = cycleMonth(data.date);
  els.walletForm.reset();
  renderAll();
});

els.transactionForm.elements.category.dispatchEvent(new Event("change"));

els.copyBudgetBtn.addEventListener("click", () => {
  const prior = addMonths(selectedMonth, -1);
  const currentCategories = new Set(state.budgets.filter((row) => row.month === selectedMonth).map((row) => row.category));
  const copied = state.budgets.filter((row) => row.month === prior && !currentCategories.has(row.category)).map((row) => ({ month: selectedMonth, category: row.category, budget: row.budget }));
  state.budgets.push(...copied);
  saveState();
  renderAll();
});

els.exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zola-budget-hub-${selectedMonth}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

els.importInput.addEventListener("change", async () => {
  const file = els.importInput.files?.[0];
  if (!file) return;
  state = migrateState(JSON.parse(await file.text()));
  saveState();
  selectedMonth = state.meta.defaultViewMonth || selectedMonth;
  renderAll();
});

els.resetBtn.addEventListener("click", () => {
  if (!confirm("Reset the local hub back to the imported workbook seed?")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  state = loadState();
  selectedMonth = state.meta.defaultViewMonth || "2026-06";
  renderAll();
});

renderAll();
