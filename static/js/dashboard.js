(function () {
  "use strict";

  var STORAGE_KEY = "go_pos_frontend_demo_v1";
  var DEFAULT_CURRENCY = "LKR";
  var REPORT_RANGE = "today";

  function uid(prefix) {
    return (prefix || "id") + "-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  }

  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isSameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function defaultState() {
    return {
      settings: { currency: DEFAULT_CURRENCY },
      products: [],
      customers: [],
      employees: [],
      sales: [],
      cart: {
        items: [],
        discount: 0,
        taxRate: 0,
        cashierId: "",
        customerId: "",
        payMethod: "cash",
        cashTendered: ""
      }
    };
  }

  function sampleProducts() {
    return [
      { id: uid("p"), name: "Mineral Water 500ml", sku: "FM-0001", price: 120, cost: 70, stock: 48, lowAt: 10 },
      { id: uid("p"), name: "Bread", sku: "FM-0002", price: 240, cost: 160, stock: 18, lowAt: 5 },
      { id: uid("p"), name: "Milk 1L", sku: "FM-0003", price: 550, cost: 430, stock: 12, lowAt: 4 },
      { id: uid("p"), name: "Instant Noodles", sku: "FM-0004", price: 180, cost: 115, stock: 30, lowAt: 8 },
      { id: uid("p"), name: "Chips 50g", sku: "FM-0005", price: 220, cost: 140, stock: 9, lowAt: 6 },
      { id: uid("p"), name: "Courier Service (Local)", sku: "SV-1001", price: 450, cost: 0, stock: 999999, lowAt: 0 }
    ];
  }

  function seedIfEmpty(state) {
    if (!state.settings) state.settings = { currency: DEFAULT_CURRENCY };
    if (!state.products || state.products.length === 0) state.products = sampleProducts();
    if (!state.employees || state.employees.length === 0) {
      state.employees = [
        { id: uid("emp"), name: "Cashier 01", role: "Cashier" },
        { id: uid("emp"), name: "Manager 01", role: "Manager" }
      ];
    }
    if (!state.customers || state.customers.length === 0) {
      state.customers = [{ id: uid("cus"), name: "Walk-in", phone: "", email: "", points: 0, createdAt: nowISO() }];
    }
    if (!state.sales) state.sales = [];
    if (!state.cart) state.cart = defaultState().cart;
    if (!state.cart.items) state.cart.items = [];
    if (!state.cart.payMethod) state.cart.payMethod = "cash";
    if (!state.cart.customerId) {
      for (var i = 0; i < state.customers.length; i++) {
        if (state.customers[i].name === "Walk-in") state.cart.customerId = state.customers[i].id;
      }
    }
    if (!state.cart.cashierId && state.employees[0]) state.cart.cashierId = state.employees[0].id;
  }

  function fmtMoney(state, amount) {
    var currency = (state && state.settings && state.settings.currency) ? state.settings.currency : DEFAULT_CURRENCY;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency }).format(amount || 0);
    } catch (e) {
      return (amount || 0).toFixed(2) + " " + currency;
    }
  }

  function toast(message, type) {
    var stack = document.getElementById("toastStack");
    if (!stack) return;
    var el = document.createElement("div");
    el.className = "toast" + (type ? (" toast-" + type) : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.classList.add("toast-hide");
      setTimeout(function () {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }, 2400);
  }

  function normalizeHashTab() {
    var hash = (window.location.hash || "").replace("#", "").trim().toLowerCase();
    if (!hash) return "checkout";
    var ok = ["checkout", "inventory", "reports", "customers", "employees", "insights"];
    for (var i = 0; i < ok.length; i++) if (ok[i] === hash) return hash;
    return "checkout";
  }

  function initClock() {
    var clock = document.querySelector("[data-live-clock]");
    if (!clock) return;
    var tick = function () { clock.textContent = new Date().toLocaleString(); };
    tick();
    setInterval(tick, 1000);
  }

  function initNavActive() {
    function update() {
      var current = "#" + normalizeHashTab();
      var links = document.querySelectorAll(".nav a[href^=\"#\"]");
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href") || "";
        links[i].classList.toggle("active", href === current);
      }
    }
    update();
    window.addEventListener("hashchange", update);
  }

  function renderShell(root) {
    root.innerHTML = [
      '<div class="tabs" role="tablist" aria-label="Dashboard Sections">',
      '  <button class="tab-btn active" type="button" role="tab" aria-selected="true" data-tab="checkout">Checkout</button>',
      '  <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="inventory">Inventory</button>',
      '  <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="reports">Reports</button>',
      '  <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="customers">Customers</button>',
      '  <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="employees">Employees</button>',
      '  <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="insights">Insights</button>',
      "</div>",
      '<section class="tab-panel" data-panel="checkout"></section>',
      '<section class="tab-panel" data-panel="inventory" hidden></section>',
      '<section class="tab-panel" data-panel="reports" hidden></section>',
      '<section class="tab-panel" data-panel="customers" hidden></section>',
      '<section class="tab-panel" data-panel="employees" hidden></section>',
      '<section class="tab-panel" data-panel="insights" hidden></section>'
    ].join("\n");
  }

  function setActiveTab(root, tab) {
    var tabs = root.querySelectorAll(".tab-btn[data-tab]");
    var panels = root.querySelectorAll(".tab-panel[data-panel]");
    for (var i = 0; i < tabs.length; i++) {
      var active = tabs[i].getAttribute("data-tab") === tab;
      tabs[i].classList.toggle("active", active);
      tabs[i].setAttribute("aria-selected", active ? "true" : "false");
    }
    for (var j = 0; j < panels.length; j++) {
      var active2 = panels[j].getAttribute("data-panel") === tab;
      panels[j].hidden = !active2;
    }
  }

  function getProductBySku(state, sku) {
    var s = String(sku || "").trim().toLowerCase();
    if (!s) return null;
    for (var i = 0; i < state.products.length; i++) {
      if (String(state.products[i].sku || "").trim().toLowerCase() === s) return state.products[i];
    }
    return null;
  }

  function getProductById(state, id) {
    for (var i = 0; i < state.products.length; i++) if (state.products[i].id === id) return state.products[i];
    return null;
  }

  function getEmployeeById(state, id) {
    for (var i = 0; i < state.employees.length; i++) if (state.employees[i].id === id) return state.employees[i];
    return null;
  }

  function getCustomerById(state, id) {
    for (var i = 0; i < state.customers.length; i++) if (state.customers[i].id === id) return state.customers[i];
    return null;
  }

  function cartTotals(state) {
    var subtotal = 0;
    var costTotal = 0;
    for (var i = 0; i < state.cart.items.length; i++) {
      var it = state.cart.items[i];
      var p = getProductById(state, it.productId);
      if (!p) continue;
      var qty = Math.max(0, safeNumber(it.qty, 0));
      subtotal += safeNumber(p.price, 0) * qty;
      costTotal += safeNumber(p.cost, 0) * qty;
    }
    var discount = Math.max(0, safeNumber(state.cart.discount, 0));
    var taxRate = Math.max(0, safeNumber(state.cart.taxRate, 0));
    var tax = Math.max(0, (subtotal - discount) * (taxRate / 100));
    var total = Math.max(0, subtotal + tax - discount);
    var profit = (subtotal - discount) - costTotal;
    return { subtotal: subtotal, tax: tax, discount: discount, total: total, profit: profit, taxRate: taxRate };
  }

  function main() {
    var root = document.getElementById("posApp");
    if (!root) return;

    var state = loadState() || defaultState();
    seedIfEmpty(state);

    renderShell(root);
    initClock();
    initNavActive();

    var tabFromHash = normalizeHashTab();
    setActiveTab(root, tabFromHash);
    window.addEventListener("hashchange", function () {
      setActiveTab(root, normalizeHashTab());
    });

    root.addEventListener("click", function (e) {
      var tabBtn = e.target.closest(".tab-btn[data-tab]");
      if (!tabBtn) return;
      var tab = tabBtn.getAttribute("data-tab");
      window.location.hash = "#" + tab;
      setActiveTab(root, tab);
    });

    // Public for debugging.
    window.__goPosDashboard = { state: state, save: function () { saveState(state); }, fmtMoney: function (n) { return fmtMoney(state, n); } };

    renderAll(root, state);
    bindEvents(root, state);
  }

  function renderAll(root, state) {
    var checkout = root.querySelector('.tab-panel[data-panel="checkout"]');
    var inventory = root.querySelector('.tab-panel[data-panel="inventory"]');
    var reports = root.querySelector('.tab-panel[data-panel="reports"]');
    var customers = root.querySelector('.tab-panel[data-panel="customers"]');
    var employees = root.querySelector('.tab-panel[data-panel="employees"]');
    var insights = root.querySelector('.tab-panel[data-panel="insights"]');

    if (checkout) checkout.innerHTML = checkoutPanelHtml();
    if (inventory) inventory.innerHTML = inventoryPanelHtml();
    if (reports) reports.innerHTML = reportsPanelHtml();
    if (customers) customers.innerHTML = customersPanelHtml();
    if (employees) employees.innerHTML = employeesPanelHtml();
    if (insights) insights.innerHTML = insightsPanelHtml();

    renderCheckoutDynamic(root, state);
    renderInventoryDynamic(root, state);
    renderReportsDynamic(root, state);
    renderCustomersDynamic(root, state);
    renderEmployeesDynamic(root, state);
    renderInsightsDynamic(root, state);

    saveState(state);
  }

  function checkoutPanelHtml() {
    return [
      '<div class="checkout-layout">',
      '  <div class="card"><div class="card-inner">',
      '    <div class="panel-head">',
      '      <div><h2 class="panel-title">Sell products or services</h2><p class="panel-sub">Scan items, auto totals, and accept cash/card/QR.</p></div>',
      '      <div class="panel-actions"><button class="btn" type="button" data-action="clear-cart">Clear Cart</button></div>',
      "    </div>",
      '    <div class="form-row">',
      '      <div class="field" style="margin:0">',
      '        <label class="label" for="scanInput">Scan SKU / barcode</label>',
      '        <input id="scanInput" type="text" autocomplete="off" placeholder="Example: FM-0001 (press Enter)" />',
      "      </div>",
      '      <div class="field" style="margin:0">',
      '        <label class="label" for="quickPick">Quick pick (name)</label>',
      '        <input id="quickPick" type="text" list="productList" autocomplete="off" placeholder="Type to search..." />',
      '        <datalist id="productList"></datalist>',
      "      </div>",
      '      <div class="field" style="margin:0;align-self:end">',
      '        <button class="btn btn-primary" type="button" data-action="add-quick-pick">Add</button>',
      "      </div>",
      "    </div>",
      '    <div class="table-wrap" style="margin-top:14px">',
      '      <table class="table" aria-label="Cart items">',
      "        <thead><tr><th style=\"min-width:240px\">Item</th><th>Price</th><th style=\"min-width:120px\">Qty</th><th>Total</th><th></th></tr></thead>",
      '        <tbody id="cartTbody"></tbody>',
      "      </table>",
      "    </div>",
      '    <p class="muted" style="margin:10px 0 0">Inventory reduces automatically when you complete a sale.</p>',
      "  </div></div>",
      '  <div class="card checkout-summary sticky"><div class="card-inner">',
      '    <h2 class="panel-title">Payment</h2>',
      '    <div class="field"><label class="label" for="cashierSelect">Cashier / employee</label><select id="cashierSelect" class="select"></select></div>',
      '    <div class="field"><label class="label" for="customerSelect">Customer (optional)</label><select id="customerSelect" class="select"></select><div class="mini muted" id="customerMeta"></div></div>',
      '    <div class="grid" style="align-items:end">',
      '      <div class="col-6"><div class="field"><label class="label" for="taxRate">Tax %</label><input id="taxRate" type="number" min="0" step="0.01" value="0" /></div></div>',
      '      <div class="col-6"><div class="field"><label class="label" for="discount">Discount</label><input id="discount" type="number" min="0" step="0.01" value="0" /><div class="mini muted">Discount amount</div></div></div>',
      "    </div>",
      '    <div class="summary">',
      '      <div class="summary-row"><span class="summary-label">Subtotal</span><span class="summary-value" id="sumSubtotal">—</span></div>',
      '      <div class="summary-row"><span class="summary-label">Tax</span><span class="summary-value" id="sumTax">—</span></div>',
      '      <div class="summary-row"><span class="summary-label">Discount</span><span class="summary-value" id="sumDiscount">—</span></div>',
      '      <div class="summary-row"><span class="summary-label">Total</span><span class="summary-value" id="sumTotal">—</span></div>',
      "    </div>",
      '    <div class="field" style="margin-top:12px">',
      '      <span class="label">Payment method</span>',
      '      <div class="segmented" role="radiogroup" aria-label="Payment method">',
      '        <label class="segmented-item"><input type="radio" name="payMethod" value="cash" checked /><span>Cash</span></label>',
      '        <label class="segmented-item"><input type="radio" name="payMethod" value="card" /><span>Card</span></label>',
      '        <label class="segmented-item"><input type="radio" name="payMethod" value="qr" /><span>QR</span></label>',
      "      </div>",
      "    </div>",
      '    <div class="field" id="cashTenderField"><label class="label" for="cashTendered">Cash received</label><input id="cashTendered" type="number" min="0" step="0.01" placeholder="0.00" /><div class="mini" id="cashChangeMeta"></div></div>',
      '    <div class="actions" style="justify-content:stretch;margin-top:12px"><button class="btn btn-primary btn-lg" type="button" style="flex:1" data-action="complete-sale">Complete Sale</button></div>',
      '    <div class="receipt" style="margin-top:14px"><div class="mini muted">Receipt preview</div><pre class="receipt-box" id="receiptPreview" aria-label="Receipt preview">—</pre></div>',
      "  </div></div>",
      "</div>"
    ].join("\n");
  }

  function inventoryPanelHtml() {
    return [
      '<div class="card"><div class="card-inner">',
      '  <div class="panel-head">',
      '    <div><h2 class="panel-title">Manage inventory</h2><p class="panel-sub">Real-time stock, low-stock alerts, best sellers.</p></div>',
      '    <div class="panel-actions"><button class="btn" type="button" data-action="seed-defaults">Load Sample Items</button></div>',
      "  </div>",
      '  <div class="alert alert-error" id="lowStockAlert" hidden></div>',
      '  <div class="table-wrap">',
      '    <table class="table" aria-label="Inventory table">',
      '      <thead><tr><th style="min-width:220px">Product</th><th>SKU</th><th>Price</th><th>Cost</th><th>Stock</th><th>Status</th><th style="min-width:190px">Restock</th></tr></thead>',
      '      <tbody id="inventoryTbody"></tbody>',
      "    </table>",
      "  </div>",
      '  <div class="grid" style="margin-top:16px;align-items:start">',
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Add product (demo)</h3>',
      '      <div class="field"><label class="label" for="pName">Name</label><input id="pName" type="text" placeholder="Mineral Water 500ml" /></div>',
      '      <div class="field"><label class="label" for="pSku">SKU / barcode</label><input id="pSku" type="text" placeholder="FM-0007" /></div>',
      '      <div class="grid" style="align-items:end">',
      '        <div class="col-6"><div class="field"><label class="label" for="pPrice">Price</label><input id="pPrice" type="number" min="0" step="0.01" /></div></div>',
      '        <div class="col-6"><div class="field"><label class="label" for="pCost">Cost</label><input id="pCost" type="number" min="0" step="0.01" /></div></div>',
      "      </div>",
      '      <div class="grid" style="align-items:end">',
      '        <div class="col-6"><div class="field"><label class="label" for="pStock">Opening stock</label><input id="pStock" type="number" min="0" step="1" value="10" /></div></div>',
      '        <div class="col-6"><div class="field"><label class="label" for="pLow">Low-stock alert at</label><input id="pLow" type="number" min="0" step="1" value="3" /></div></div>',
      "      </div>",
      '      <div class="actions" style="justify-content:flex-start"><button class="btn btn-primary" type="button" data-action="add-product">Add Product</button></div>',
      "    </div></div></div>",
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Inventory notes</h3>',
      '      <ul class="list"><li>Sales reduce stock automatically.</li><li>Low-stock items show up in Insights.</li><li>Profit uses <span class="muted">price - cost</span>.</li></ul>',
      "    </div></div></div>",
      "  </div>",
      "</div></div>"
    ].join("\n");
  }

  function reportsPanelHtml() {
    return [
      '<div class="card"><div class="card-inner">',
      '  <div class="panel-head">',
      '    <div><h2 class="panel-title">Track sales & profits</h2><p class="panel-sub">Daily/monthly reports, top products, top employees.</p></div>',
      '    <div class="panel-actions">',
      '      <button class="btn" type="button" data-action="set-report-range" data-range="today">Today</button>',
      '      <button class="btn" type="button" data-action="set-report-range" data-range="month">This Month</button>',
      '      <button class="btn" type="button" data-action="set-report-range" data-range="all">All Time</button>',
      "    </div>",
      "  </div>",
      '  <div class="kpi-grid" id="kpiGrid"></div>',
      '  <div class="grid" style="margin-top:14px;align-items:start">',
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Top products</h3>',
      '      <div class="table-wrap"><table class="table" aria-label="Top products"><thead><tr><th>Product</th><th>Qty</th><th>Revenue</th><th>Profit</th></tr></thead><tbody id="topProductsTbody"></tbody></table></div>',
      "    </div></div></div>",
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Sales by hour</h3>',
      '      <div class="chart" id="salesByHourChart" aria-label="Sales by hour bar chart"></div>',
      '      <p class="muted" style="margin:10px 0 0">Transactions per hour.</p>',
      "    </div></div></div>",
      "  </div>",
      '  <div class="grid" style="margin-top:14px;align-items:start">',
      '    <div class="col-12"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Employee performance</h3>',
      '      <div class="table-wrap"><table class="table" aria-label="Employee performance"><thead><tr><th>Employee</th><th>Transactions</th><th>Revenue</th><th>Profit</th></tr></thead><tbody id="employeePerfTbody"></tbody></table></div>',
      "    </div></div></div>",
      "  </div>",
      "</div></div>"
    ].join("\n");
  }

  function customersPanelHtml() {
    return [
      '<div class="card"><div class="card-inner">',
      '  <div class="panel-head"><div><h2 class="panel-title">Manage customers</h2><p class="panel-sub">Save details, track purchase history, loyalty discounts.</p></div></div>',
      '  <div class="grid" style="align-items:start">',
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Add customer</h3>',
      '      <div class="field"><label class="label" for="cName">Name</label><input id="cName" type="text" placeholder="Customer name" /></div>',
      '      <div class="field"><label class="label" for="cPhone">Phone</label><input id="cPhone" type="text" placeholder="+94..." /></div>',
      '      <div class="field"><label class="label" for="cEmail">Email</label><input id="cEmail" type="text" placeholder="name@example.com" /></div>',
      '      <div class="actions" style="justify-content:flex-start"><button class="btn btn-primary" type="button" data-action="add-customer">Add Customer</button></div>',
      '      <p class="muted" style="margin:10px 0 0">Loyalty: earn 1 point per 100 in sales.</p>',
      "    </div></div></div>",
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Customers</h3>',
      '      <div class="field"><label class="label" for="customerSearch">Search</label><input id="customerSearch" type="text" placeholder="Search by name or phone..." /></div>',
      '      <div class="table-wrap"><table class="table" aria-label="Customer list"><thead><tr><th>Name</th><th>Phone</th><th>Points</th><th></th></tr></thead><tbody id="customersTbody"></tbody></table></div>',
      '      <div class="mini muted" id="customerHistoryMeta" style="margin-top:10px"></div>',
      "    </div></div></div>",
      "  </div>",
      "</div></div>"
    ].join("\n");
  }

  function employeesPanelHtml() {
    return [
      '<div class="card"><div class="card-inner">',
      '  <div class="panel-head"><div><h2 class="panel-title">Handle employees</h2><p class="panel-sub">Track staff sales and compare performance.</p></div></div>',
      '  <div class="grid" style="align-items:start">',
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Add employee</h3>',
      '      <div class="field"><label class="label" for="eName">Name</label><input id="eName" type="text" placeholder="Employee name" /></div>',
      '      <div class="field"><label class="label" for="eRole">Role</label><input id="eRole" type="text" placeholder="Cashier / Manager" /></div>',
      '      <div class="actions" style="justify-content:flex-start"><button class="btn btn-primary" type="button" data-action="add-employee">Add Employee</button></div>',
      '      <p class="muted" style="margin:10px 0 0">Shift scheduling can be added later.</p>',
      "    </div></div></div>",
      '    <div class="col-6"><div class="card soft"><div class="card-inner">',
      '      <h3 class="panel-title" style="margin:0 0 10px">Employees</h3>',
      '      <div class="table-wrap"><table class="table" aria-label="Employees list"><thead><tr><th>Name</th><th class="muted">Role</th><th>Sales</th><th>Revenue</th></tr></thead><tbody id="employeesTbody"></tbody></table></div>',
      "    </div></div></div>",
      "  </div>",
      "</div></div>"
    ].join("\n");
  }

  function insightsPanelHtml() {
    return [
      '<div class="card"><div class="card-inner">',
      '  <div class="panel-head"><div><h2 class="panel-title">Improve business decisions</h2><p class="panel-sub">Use data to restock, promote, or remove items.</p></div></div>',
      '  <div class="grid" style="align-items:start">',
      '    <div class="col-6"><div class="card soft"><div class="card-inner"><h3 class="panel-title" style="margin:0 0 10px">Low stock alerts</h3><div id="insightLowStock"></div></div></div></div>',
      '    <div class="col-6"><div class="card soft"><div class="card-inner"><h3 class="panel-title" style="margin:0 0 10px">Restock suggestions</h3><div id="insightRestock"></div></div></div></div>',
      "  </div>",
      '  <div class="grid" style="margin-top:14px;align-items:start">',
      '    <div class="col-6"><div class="card soft"><div class="card-inner"><h3 class="panel-title" style="margin:0 0 10px">Best sellers (30 days)</h3><div id="insightBestSellers"></div></div></div></div>',
      '    <div class="col-6"><div class="card soft"><div class="card-inner"><h3 class="panel-title" style="margin:0 0 10px">Slow movers (30 days)</h3><div id="insightSlowMovers"></div></div></div></div>',
      "  </div>",
      "</div></div>"
    ].join("\n");
  }

  function renderSelectOptions(selectEl, items, labelFn, selectedId, emptyLabel) {
    if (!selectEl) return;
    var html = "";
    if (emptyLabel) html += '<option value="">' + escapeHtml(emptyLabel) + "</option>";
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var selected = it.id === selectedId ? ' selected="selected"' : "";
      html += '<option value="' + escapeHtml(it.id) + '"' + selected + ">" + escapeHtml(labelFn(it)) + "</option>";
    }
    selectEl.innerHTML = html;
  }

  function renderCheckoutDynamic(root, state) {
    var dl = root.querySelector("#productList");
    if (dl) {
      var options = "";
      for (var i = 0; i < state.products.length; i++) options += '<option value="' + escapeHtml(state.products[i].name) + '"></option>';
      dl.innerHTML = options;
    }

    var cashier = root.querySelector("#cashierSelect");
    if (cashier) renderSelectOptions(cashier, state.employees, function (e) { return e.name + (e.role ? (" • " + e.role) : ""); }, state.cart.cashierId, "");

    var customer = root.querySelector("#customerSelect");
    if (customer) {
      renderSelectOptions(customer, state.customers, function (c) {
        var pts = Math.max(0, Math.floor(safeNumber(c.points, 0)));
        return c.name + (c.name === "Walk-in" ? "" : (" • " + pts + " pts"));
      }, state.cart.customerId, "");
    }

    var taxRate = root.querySelector("#taxRate");
    if (taxRate) taxRate.value = String(safeNumber(state.cart.taxRate, 0));
    var discount = root.querySelector("#discount");
    if (discount) discount.value = String(safeNumber(state.cart.discount, 0));

    var cashTendered = root.querySelector("#cashTendered");
    if (cashTendered) cashTendered.value = state.cart.cashTendered ? String(state.cart.cashTendered) : "";

    var radios = root.querySelectorAll('input[name="payMethod"]');
    for (var r = 0; r < radios.length; r++) radios[r].checked = radios[r].value === (state.cart.payMethod || "cash");
    var segItems = root.querySelectorAll(".segmented-item");
    for (var s = 0; s < segItems.length; s++) {
      var inp = segItems[s].querySelector("input");
      segItems[s].classList.toggle("active", !!(inp && inp.checked));
    }

    renderCartTable(root, state);
    renderCheckoutSummary(root, state);
  }

  function renderCartTable(root, state) {
    var tbody = root.querySelector("#cartTbody");
    if (!tbody) return;
    if (!state.cart.items.length) {
      tbody.innerHTML = '<tr><td class="muted" colspan="5">No items. Scan a SKU or use Quick pick.</td></tr>';
      return;
    }
    var html = "";
    for (var i = 0; i < state.cart.items.length; i++) {
      var it = state.cart.items[i];
      var p = getProductById(state, it.productId);
      if (!p) continue;
      var qty = Math.max(1, Math.floor(safeNumber(it.qty, 1)));
      var lineTotal = safeNumber(p.price, 0) * qty;
      html += "<tr>";
      html += '<td><div class="cell-title">' + escapeHtml(p.name) + '</div><div class="mini muted">SKU: ' + escapeHtml(p.sku) + "</div></td>";
      html += "<td>" + escapeHtml(fmtMoney(state, safeNumber(p.price, 0))) + "</td>";
      html += '<td><input class="qty-input" type="number" min="1" step="1" value="' + qty + '" data-action="set-qty" data-index="' + i + '" /></td>';
      html += "<td><strong>" + escapeHtml(fmtMoney(state, lineTotal)) + "</strong></td>";
      html += '<td style="text-align:right"><button class="btn btn-danger" type="button" data-action="remove-item" data-index="' + i + '">Remove</button></td>';
      html += "</tr>";
    }
    tbody.innerHTML = html;
  }

  function renderCheckoutSummary(root, state) {
    var t = cartTotals(state);
    var setText = function (id, v) { var el = root.querySelector("#" + id); if (el) el.textContent = v; };
    setText("sumSubtotal", fmtMoney(state, t.subtotal));
    setText("sumTax", fmtMoney(state, t.tax));
    setText("sumDiscount", fmtMoney(state, t.discount));
    setText("sumTotal", fmtMoney(state, t.total));

    var method = state.cart.payMethod || "cash";
    var cashField = root.querySelector("#cashTenderField");
    if (cashField) cashField.hidden = method !== "cash";

    var changeMeta = root.querySelector("#cashChangeMeta");
    if (changeMeta) {
      if (method !== "cash") changeMeta.textContent = "Card/QR: no cash change.";
      else {
        var tender = safeNumber(state.cart.cashTendered, 0);
        var change = tender - t.total;
        changeMeta.textContent = (t.total <= 0) ? "Add items to checkout." : ("Change: " + fmtMoney(state, Math.max(0, change)));
      }
    }

    var customerMeta = root.querySelector("#customerMeta");
    if (customerMeta) {
      var c = getCustomerById(state, state.cart.customerId);
      if (!c || c.name === "Walk-in") customerMeta.textContent = "No customer selected.";
      else customerMeta.textContent = "Points: " + Math.max(0, Math.floor(safeNumber(c.points, 0))) + " • Redeem via Discount field.";
    }

    renderReceipt(root, state);
  }

  function renderReceipt(root, state) {
    var box = root.querySelector("#receiptPreview");
    if (!box) return;
    var t = cartTotals(state);
    var lines = [];
    lines.push("FAMILYMART POS");
    lines.push(new Date().toLocaleString());
    var emp = getEmployeeById(state, state.cart.cashierId);
    if (emp) lines.push("Cashier: " + emp.name);
    var cust = getCustomerById(state, state.cart.customerId);
    if (cust && cust.name && cust.name !== "Walk-in") lines.push("Customer: " + cust.name);
    lines.push("--------------------------------");
    if (!state.cart.items.length) lines.push("(no items)");
    else {
      for (var i = 0; i < state.cart.items.length; i++) {
        var it = state.cart.items[i];
        var p = getProductById(state, it.productId);
        if (!p) continue;
        var qty = Math.max(1, Math.floor(safeNumber(it.qty, 1)));
        var lineTotal = safeNumber(p.price, 0) * qty;
        lines.push(p.name + " x" + qty + "  " + fmtMoney(state, lineTotal));
      }
    }
    lines.push("--------------------------------");
    lines.push("Subtotal:  " + fmtMoney(state, t.subtotal));
    lines.push("Tax:       " + fmtMoney(state, t.tax));
    lines.push("Discount: -" + fmtMoney(state, t.discount));
    lines.push("TOTAL:     " + fmtMoney(state, t.total));
    lines.push("Pay: " + String(state.cart.payMethod || "cash").toUpperCase());
    box.textContent = lines.join("\n");
  }

  function renderInventoryDynamic(root, state) {
    var tbody = root.querySelector("#inventoryTbody");
    if (!tbody) return;
    var lows = [];
    var html = "";
    for (var i = 0; i < state.products.length; i++) {
      var p = state.products[i];
      var stock = Math.max(0, Math.floor(safeNumber(p.stock, 0)));
      var lowAt = Math.max(0, Math.floor(safeNumber(p.lowAt, 0)));
      var isLow = lowAt > 0 && stock <= lowAt;
      if (isLow) lows.push(p.name + " (" + stock + ")");
      html += "<tr>";
      html += '<td><div class="cell-title">' + escapeHtml(p.name) + "</div></td>";
      html += "<td>" + escapeHtml(p.sku) + "</td>";
      html += "<td>" + escapeHtml(fmtMoney(state, safeNumber(p.price, 0))) + "</td>";
      html += "<td>" + escapeHtml(fmtMoney(state, safeNumber(p.cost, 0))) + "</td>";
      html += "<td><strong>" + stock + "</strong></td>";
      html += '<td><span class="badge ' + (isLow ? "badge-low" : "badge-ok") + '">' + (isLow ? "Low" : "OK") + "</span></td>";
      html += '<td><div class="restock-row"><input class="restock-input" type="number" min="1" step="1" placeholder="Qty" data-action="restock-qty" data-pid="' + escapeHtml(p.id) + '" /><button class="btn btn-primary" type="button" data-action="restock" data-pid="' + escapeHtml(p.id) + '">Restock</button></div></td>';
      html += "</tr>";
    }
    tbody.innerHTML = html || '<tr><td class="muted" colspan="7">No products. Add a product to get started.</td></tr>';
    var alert = root.querySelector("#lowStockAlert");
    if (alert) {
      if (lows.length) {
        alert.hidden = false;
        alert.textContent = "Low stock: " + lows.join(", ");
      } else {
        alert.hidden = true;
        alert.textContent = "";
      }
    }
  }

  function filteredSales(state) {
    var now = new Date();
    var sales = state.sales || [];
    if (REPORT_RANGE === "all") return sales.slice();
    var out = [];
    for (var i = 0; i < sales.length; i++) {
      var d = new Date(sales[i].createdAt || "");
      if (REPORT_RANGE === "today" && isSameDay(d, now)) out.push(sales[i]);
      if (REPORT_RANGE === "month" && isSameMonth(d, now)) out.push(sales[i]);
    }
    return out;
  }

  function renderReportsDynamic(root, state) {
    var kpiGrid = root.querySelector("#kpiGrid");
    var topTbody = root.querySelector("#topProductsTbody");
    var empTbody = root.querySelector("#employeePerfTbody");
    var chart = root.querySelector("#salesByHourChart");
    if (!kpiGrid || !topTbody || !empTbody || !chart) return;

    var sales = filteredSales(state);
    var revenue = 0, profit = 0, tx = sales.length;
    var byProduct = {};
    var byEmployee = {};
    var byHour = new Array(24);
    for (var h = 0; h < 24; h++) byHour[h] = 0;

    for (var i = 0; i < sales.length; i++) {
      var s = sales[i];
      revenue += safeNumber(s.total, 0);
      profit += safeNumber(s.profit, 0);
      var hour = new Date(s.createdAt || "").getHours();
      if (hour >= 0 && hour < 24) byHour[hour] += 1;
      if (s.employeeId) {
        if (!byEmployee[s.employeeId]) byEmployee[s.employeeId] = { tx: 0, revenue: 0, profit: 0 };
        byEmployee[s.employeeId].tx += 1;
        byEmployee[s.employeeId].revenue += safeNumber(s.total, 0);
        byEmployee[s.employeeId].profit += safeNumber(s.profit, 0);
      }
      var lines = s.items || [];
      for (var j = 0; j < lines.length; j++) {
        var li = lines[j];
        if (!byProduct[li.productId]) byProduct[li.productId] = { qty: 0, revenue: 0, profit: 0 };
        byProduct[li.productId].qty += Math.max(0, Math.floor(safeNumber(li.qty, 0)));
        byProduct[li.productId].revenue += safeNumber(li.lineTotal, 0);
        byProduct[li.productId].profit += safeNumber(li.lineProfit, 0);
      }
    }

    var avg = tx ? (revenue / tx) : 0;
    kpiGrid.innerHTML =
      '<div class="kpi"><div class="kpi-title">Revenue</div><div class="kpi-value">' + escapeHtml(fmtMoney(state, revenue)) + '</div><div class="kpi-help">Total sales for range</div></div>' +
      '<div class="kpi"><div class="kpi-title">Profit</div><div class="kpi-value">' + escapeHtml(fmtMoney(state, profit)) + '</div><div class="kpi-help">Estimated (price - cost)</div></div>' +
      '<div class="kpi"><div class="kpi-title">Transactions</div><div class="kpi-value">' + tx + '</div><div class="kpi-help">Completed checkouts</div></div>' +
      '<div class="kpi"><div class="kpi-title">Avg Basket</div><div class="kpi-value">' + escapeHtml(fmtMoney(state, avg)) + '</div><div class="kpi-help">Revenue per transaction</div></div>';

    var rows = [];
    for (var pid in byProduct) rows.push({ pid: pid, qty: byProduct[pid].qty, revenue: byProduct[pid].revenue, profit: byProduct[pid].profit });
    rows.sort(function (a, b) { return b.revenue - a.revenue; });
    var html = "";
    for (var r = 0; r < Math.min(8, rows.length); r++) {
      var row = rows[r];
      var p = getProductById(state, row.pid);
      html += "<tr><td>" + escapeHtml(p ? p.name : "Unknown") + "</td><td><strong>" + row.qty + "</strong></td><td>" + escapeHtml(fmtMoney(state, row.revenue)) + "</td><td>" + escapeHtml(fmtMoney(state, row.profit)) + "</td></tr>";
    }
    topTbody.innerHTML = html || '<tr><td class="muted" colspan="4">No sales yet.</td></tr>';

    var perf = [];
    for (var e = 0; e < state.employees.length; e++) {
      var emp = state.employees[e];
      var stats = byEmployee[emp.id] || { tx: 0, revenue: 0, profit: 0 };
      perf.push({ name: emp.name, tx: stats.tx, revenue: stats.revenue, profit: stats.profit });
    }
    perf.sort(function (a, b) { return b.revenue - a.revenue; });
    var html2 = "";
    for (var m = 0; m < perf.length; m++) html2 += "<tr><td>" + escapeHtml(perf[m].name) + "</td><td><strong>" + perf[m].tx + "</strong></td><td>" + escapeHtml(fmtMoney(state, perf[m].revenue)) + "</td><td>" + escapeHtml(fmtMoney(state, perf[m].profit)) + "</td></tr>";
    empTbody.innerHTML = html2 || '<tr><td class="muted" colspan="4">No employees.</td></tr>';

    var max = 1;
    for (var hh = 0; hh < byHour.length; hh++) if (byHour[hh] > max) max = byHour[hh];
    var ch = "";
    for (var hr = 0; hr < 24; hr++) {
      var v = byHour[hr];
      var pct = Math.round((v / max) * 100);
      ch += '<div class="bar" title="' + hr + ':00 • ' + v + ' tx"><div class="bar-fill" style="height:' + pct + '%"></div><div class="bar-label">' + hr + "</div></div>";
    }
    chart.innerHTML = ch;
  }

  function renderCustomersDynamic(root, state) {
    var tbody = root.querySelector("#customersTbody");
    if (!tbody) return;
    var search = root.querySelector("#customerSearch");
    var q = search ? String(search.value || "").toLowerCase() : "";
    var html = "";
    for (var i = 0; i < state.customers.length; i++) {
      var c = state.customers[i];
      if (c.name === "Walk-in") continue;
      var hay = (c.name + " " + (c.phone || "")).toLowerCase();
      if (q && hay.indexOf(q) === -1) continue;
      html += "<tr>";
      html += "<td>" + escapeHtml(c.name) + "</td>";
      html += '<td class="muted">' + escapeHtml(c.phone || "—") + "</td>";
      html += "<td><strong>" + Math.max(0, Math.floor(safeNumber(c.points, 0))) + "</strong></td>";
      html += '<td style="text-align:right"><button class="btn" type="button" data-action="select-customer" data-cid="' + escapeHtml(c.id) + '">Select</button></td>';
      html += "</tr>";
    }
    tbody.innerHTML = html || '<tr><td class="muted" colspan="4">No customers yet.</td></tr>';

    var meta = root.querySelector("#customerHistoryMeta");
    if (meta) {
      var sel = getCustomerById(state, state.cart.customerId);
      if (!sel || sel.name === "Walk-in") meta.textContent = "Select a customer to see purchase history.";
      else {
        var count = 0, spent = 0;
        for (var s = 0; s < state.sales.length; s++) {
          if (state.sales[s].customerId === sel.id) {
            count += 1;
            spent += safeNumber(state.sales[s].total, 0);
          }
        }
        meta.textContent = sel.name + " • Purchases: " + count + " • Spent: " + fmtMoney(state, spent);
      }
    }
  }

  function renderEmployeesDynamic(root, state) {
    var tbody = root.querySelector("#employeesTbody");
    if (!tbody) return;
    var byEmp = {};
    for (var i = 0; i < state.sales.length; i++) {
      var s = state.sales[i];
      if (!s.employeeId) continue;
      if (!byEmp[s.employeeId]) byEmp[s.employeeId] = { sales: 0, revenue: 0 };
      byEmp[s.employeeId].sales += 1;
      byEmp[s.employeeId].revenue += safeNumber(s.total, 0);
    }
    var html = "";
    for (var e = 0; e < state.employees.length; e++) {
      var emp = state.employees[e];
      var stats = byEmp[emp.id] || { sales: 0, revenue: 0 };
      html += "<tr><td><strong>" + escapeHtml(emp.name) + "</strong></td><td class=\"muted\">" + escapeHtml(emp.role || "—") + "</td><td>" + stats.sales + "</td><td>" + escapeHtml(fmtMoney(state, stats.revenue)) + "</td></tr>";
    }
    tbody.innerHTML = html || '<tr><td class="muted" colspan="4">No employees.</td></tr>';
  }

  function renderInsightsDynamic(root, state) {
    var lowBox = root.querySelector("#insightLowStock");
    var restockBox = root.querySelector("#insightRestock");
    var bestBox = root.querySelector("#insightBestSellers");
    var slowBox = root.querySelector("#insightSlowMovers");

    var low = [];
    for (var i = 0; i < state.products.length; i++) {
      var p = state.products[i];
      var stock = Math.max(0, Math.floor(safeNumber(p.stock, 0)));
      var lowAt = Math.max(0, Math.floor(safeNumber(p.lowAt, 0)));
      if (lowAt > 0 && stock <= lowAt) low.push({ id: p.id, name: p.name, sku: p.sku, stock: stock, lowAt: lowAt });
    }
    low.sort(function (a, b) { return a.stock - b.stock; });

    if (lowBox) {
      if (!low.length) lowBox.innerHTML = '<div class="muted">No low-stock items.</div>';
      else {
        var html = '<div class="pill-list">';
        for (var j = 0; j < low.length; j++) html += '<span class="pill pill-danger">' + escapeHtml(low[j].name) + " • " + low[j].stock + "</span>";
        html += "</div>";
        lowBox.innerHTML = html;
      }
    }

    if (restockBox) {
      if (!low.length) restockBox.innerHTML = '<div class="muted">Nothing to restock.</div>';
      else {
        var html2 = '<div class="list-cards">';
        for (var k = 0; k < low.length; k++) {
          var target = Math.max(low[k].lowAt * 3, low[k].lowAt + 1);
          var recommend = Math.max(0, target - low[k].stock);
          html2 += '<div class="mini-card"><div><strong>' + escapeHtml(low[k].name) + "</strong><div class=\"mini muted\">SKU: " + escapeHtml(low[k].sku) + "</div></div><div class=\"mini\"><span class=\"badge badge-low\">Order</span> " + recommend + "</div></div>";
        }
        html2 += "</div>";
        restockBox.innerHTML = html2;
      }
    }

    var last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    var byPid = {};
    for (var s = 0; s < state.sales.length; s++) {
      var sale = state.sales[s];
      var d = new Date(sale.createdAt || "");
      if (d < last30) continue;
      var its = sale.items || [];
      for (var ii = 0; ii < its.length; ii++) {
        var li = its[ii];
        if (!byPid[li.productId]) byPid[li.productId] = 0;
        byPid[li.productId] += Math.max(0, Math.floor(safeNumber(li.qty, 0)));
      }
    }
    var prodCounts = [];
    for (var x = 0; x < state.products.length; x++) {
      var pr = state.products[x];
      prodCounts.push({ name: pr.name, sku: pr.sku, qty: byPid[pr.id] || 0 });
    }
    prodCounts.sort(function (a, b) { return b.qty - a.qty; });

    if (bestBox) {
      var best = prodCounts.slice(0, 6);
      var html3 = '<div class="list-cards">';
      for (var bb = 0; bb < best.length; bb++) html3 += '<div class="mini-card"><div><strong>' + escapeHtml(best[bb].name) + "</strong><div class=\"mini muted\">SKU: " + escapeHtml(best[bb].sku) + "</div></div><div class=\"mini\"><span class=\"badge badge-ok\">Sold</span> " + best[bb].qty + "</div></div>";
      html3 += "</div>";
      bestBox.innerHTML = html3;
    }

    if (slowBox) {
      var slow = prodCounts.slice().sort(function (a, b) { return a.qty - b.qty; }).slice(0, 6);
      var html4 = '<div class="list-cards">';
      for (var ss = 0; ss < slow.length; ss++) html4 += '<div class="mini-card"><div><strong>' + escapeHtml(slow[ss].name) + "</strong><div class=\"mini muted\">SKU: " + escapeHtml(slow[ss].sku) + "</div></div><div class=\"mini\"><span class=\"badge badge-muted\">Sold</span> " + slow[ss].qty + "</div></div>";
      html4 += "</div>";
      slowBox.innerHTML = html4;
    }
  }

  function bindEvents(root, state) {
    var appRoot = document.getElementById("posApp");

    function rerender() {
      if (!appRoot) return;
      renderAll(appRoot, state);
    }

    function addToCart(productId, qty) {
      qty = Math.max(1, Math.floor(safeNumber(qty, 1)));
      for (var i = 0; i < state.cart.items.length; i++) {
        if (state.cart.items[i].productId === productId) {
          state.cart.items[i].qty = Math.max(1, Math.floor(safeNumber(state.cart.items[i].qty, 1))) + qty;
          return;
        }
      }
      state.cart.items.push({ productId: productId, qty: qty });
    }

    function exportJson() {
      var raw = JSON.stringify(state, null, 2);
      try {
        var blob = new Blob([raw], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "go-pos-frontend-demo.json";
        document.body.appendChild(a);
        a.click();
        a.parentNode.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        toast("Exported JSON.", "success");
      } catch (e) {
        toast("Export failed.", "danger");
      }
    }

    function addProductFromForm() {
      var nameEl = document.getElementById("pName");
      var skuEl = document.getElementById("pSku");
      var priceEl = document.getElementById("pPrice");
      var costEl = document.getElementById("pCost");
      var stockEl = document.getElementById("pStock");
      var lowEl = document.getElementById("pLow");
      var name = (nameEl ? nameEl.value : "").trim();
      var sku = (skuEl ? skuEl.value : "").trim();
      if (!name || !sku) return toast("Name and SKU are required.", "danger");
      if (getProductBySku(state, sku)) return toast("SKU already exists.", "danger");
      state.products.push({
        id: uid("p"),
        name: name,
        sku: sku,
        price: Math.max(0, safeNumber(priceEl ? priceEl.value : 0, 0)),
        cost: Math.max(0, safeNumber(costEl ? costEl.value : 0, 0)),
        stock: Math.max(0, Math.floor(safeNumber(stockEl ? stockEl.value : 0, 0))),
        lowAt: Math.max(0, Math.floor(safeNumber(lowEl ? lowEl.value : 0, 0)))
      });
      if (nameEl) nameEl.value = "";
      if (skuEl) skuEl.value = "";
      if (priceEl) priceEl.value = "";
      if (costEl) costEl.value = "";
      toast("Product added.", "success");
    }

    function addCustomerFromForm() {
      var nameEl = document.getElementById("cName");
      var phoneEl = document.getElementById("cPhone");
      var emailEl = document.getElementById("cEmail");
      var name = (nameEl ? nameEl.value : "").trim();
      if (!name) return toast("Customer name is required.", "danger");
      var c = { id: uid("cus"), name: name, phone: (phoneEl ? phoneEl.value : "").trim(), email: (emailEl ? emailEl.value : "").trim(), points: 0, createdAt: nowISO() };
      state.customers.push(c);
      state.cart.customerId = c.id;
      if (nameEl) nameEl.value = "";
      if (phoneEl) phoneEl.value = "";
      if (emailEl) emailEl.value = "";
      toast("Customer added.", "success");
    }

    function addEmployeeFromForm() {
      var nameEl = document.getElementById("eName");
      var roleEl = document.getElementById("eRole");
      var name = (nameEl ? nameEl.value : "").trim();
      if (!name) return toast("Employee name is required.", "danger");
      state.employees.push({ id: uid("emp"), name: name, role: (roleEl ? roleEl.value : "").trim() });
      if (nameEl) nameEl.value = "";
      if (roleEl) roleEl.value = "";
      toast("Employee added.", "success");
    }

    function completeSale() {
      if (!state.cart.items.length) return toast("No items in cart.", "danger");
      var totals = cartTotals(state);
      if (totals.total <= 0) return toast("Total must be greater than 0.", "danger");

      // Stock validation
      for (var i = 0; i < state.cart.items.length; i++) {
        var it = state.cart.items[i];
        var p = getProductById(state, it.productId);
        if (!p) continue;
        var qty = Math.max(1, Math.floor(safeNumber(it.qty, 1)));
        var stock = Math.max(0, Math.floor(safeNumber(p.stock, 0)));
        if (stock < qty) return toast("Not enough stock for: " + p.name, "danger");
      }

      // Payment validation
      if ((state.cart.payMethod || "cash") === "cash") {
        var tender = safeNumber(state.cart.cashTendered, 0);
        if (tender < totals.total) return toast("Cash received is less than total.", "danger");
      }

      var lines = [];
      for (var j = 0; j < state.cart.items.length; j++) {
        var it2 = state.cart.items[j];
        var p2 = getProductById(state, it2.productId);
        if (!p2) continue;
        var qty2 = Math.max(1, Math.floor(safeNumber(it2.qty, 1)));
        p2.stock = Math.max(0, Math.floor(safeNumber(p2.stock, 0)) - qty2);
        var lineTotal = safeNumber(p2.price, 0) * qty2;
        var lineProfit = (safeNumber(p2.price, 0) - safeNumber(p2.cost, 0)) * qty2;
        lines.push({ productId: p2.id, name: p2.name, sku: p2.sku, qty: qty2, unitPrice: safeNumber(p2.price, 0), unitCost: safeNumber(p2.cost, 0), lineTotal: lineTotal, lineProfit: lineProfit });
      }

      var customer = getCustomerById(state, state.cart.customerId);
      if (customer && customer.name !== "Walk-in") {
        var earned = Math.floor(totals.total / 100);
        customer.points = Math.max(0, Math.floor(safeNumber(customer.points, 0))) + Math.max(0, earned);
      }

      state.sales.push({
        id: uid("sale"),
        createdAt: nowISO(),
        employeeId: state.cart.cashierId || "",
        customerId: state.cart.customerId || "",
        payMethod: state.cart.payMethod || "cash",
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        profit: totals.profit,
        items: lines
      });

      state.cart.items = [];
      state.cart.discount = 0;
      state.cart.cashTendered = "";
      toast("Sale completed.", "success");
    }

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");

      if (action === "export-demo") {
        exportJson();
        return;
      }
      if (action === "reset-demo") {
        if (!confirm("Reset demo data? This clears products/customers/employees/sales.")) return;
        var next = defaultState();
        seedIfEmpty(next);
        state.settings = next.settings;
        state.products = next.products;
        state.customers = next.customers;
        state.employees = next.employees;
        state.sales = next.sales;
        state.cart = next.cart;
        REPORT_RANGE = "today";
        window.location.hash = "#checkout";
        toast("Demo reset.", "success");
        rerender();
        return;
      }

      if (!appRoot) return;
      if (!appRoot.contains(btn) && action !== "export-demo" && action !== "reset-demo") return;

      if (action === "clear-cart") {
        state.cart.items = [];
        state.cart.discount = 0;
        state.cart.cashTendered = "";
        rerender();
        toast("Cart cleared.", "success");
        return;
      }
      if (action === "add-quick-pick") {
        var qp = document.getElementById("quickPick");
        var name = qp ? String(qp.value || "").trim() : "";
        if (!name) return toast("Pick a product name.", "danger");
        var found = null;
        for (var i = 0; i < state.products.length; i++) if (state.products[i].name === name) { found = state.products[i]; break; }
        if (!found) return toast("Pick from the list.", "danger");
        addToCart(found.id, 1);
        if (qp) qp.value = "";
        rerender();
        toast("Added: " + found.name, "success");
        return;
      }
      if (action === "remove-item") {
        var idx = Math.max(0, Math.floor(safeNumber(btn.getAttribute("data-index"), 0)));
        state.cart.items.splice(idx, 1);
        rerender();
        return;
      }
      if (action === "complete-sale") {
        completeSale();
        rerender();
        return;
      }
      if (action === "restock") {
        var pid = btn.getAttribute("data-pid");
        var input = document.querySelector('.restock-input[data-action="restock-qty"][data-pid="' + pid + '"]');
        var qty = input ? Math.floor(safeNumber(input.value, 0)) : 0;
        if (qty <= 0) return toast("Enter a restock quantity.", "danger");
        var p = getProductById(state, pid);
        if (p) p.stock = Math.max(0, Math.floor(safeNumber(p.stock, 0))) + qty;
        if (input) input.value = "";
        rerender();
        toast("Restocked.", "success");
        return;
      }
      if (action === "seed-defaults") {
        state.products = sampleProducts();
        rerender();
        toast("Sample items loaded.", "success");
        return;
      }
      if (action === "add-product") {
        addProductFromForm();
        rerender();
        return;
      }
      if (action === "set-report-range") {
        REPORT_RANGE = btn.getAttribute("data-range") || "today";
        rerender();
        toast("Report range: " + REPORT_RANGE, "success");
        return;
      }
      if (action === "add-customer") {
        addCustomerFromForm();
        rerender();
        return;
      }
      if (action === "select-customer") {
        var cid = btn.getAttribute("data-cid") || "";
        state.cart.customerId = cid;
        rerender();
        toast("Customer selected.", "success");
        return;
      }
      if (action === "add-employee") {
        addEmployeeFromForm();
        rerender();
        return;
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var input = e.target;
      if (!input || input.id !== "scanInput") return;
      e.preventDefault();
      var sku = String(input.value || "").trim();
      if (!sku) return;
      var p = getProductBySku(state, sku);
      if (!p) return toast("Unknown SKU: " + sku, "danger");
      addToCart(p.id, 1);
      input.value = "";
      rerender();
      toast("Added: " + p.name, "success");
    });

    document.addEventListener("input", function (e) {
      var el = e.target;
      if (!el) return;

      if (el.getAttribute("data-action") === "set-qty") {
        var idx = Math.max(0, Math.floor(safeNumber(el.getAttribute("data-index"), 0)));
        var qty = Math.max(1, Math.floor(safeNumber(el.value, 1)));
        if (state.cart.items[idx]) state.cart.items[idx].qty = qty;
        saveState(state);
        if (appRoot) {
          renderCartTable(appRoot, state);
          renderCheckoutSummary(appRoot, state);
        }
        return;
      }

      if (el.id === "taxRate") {
        state.cart.taxRate = safeNumber(el.value, 0);
        saveState(state);
        if (appRoot) renderCheckoutSummary(appRoot, state);
        return;
      }

      if (el.id === "discount") {
        state.cart.discount = safeNumber(el.value, 0);
        saveState(state);
        if (appRoot) renderCheckoutSummary(appRoot, state);
        return;
      }

      if (el.id === "cashTendered") {
        state.cart.cashTendered = el.value;
        saveState(state);
        if (appRoot) renderCheckoutSummary(appRoot, state);
        return;
      }

      if (el.id === "customerSearch") {
        if (appRoot) renderCustomersDynamic(appRoot, state);
        return;
      }
    });

    document.addEventListener("change", function (e) {
      var el = e.target;
      if (!el) return;

      if (el.id === "cashierSelect") {
        state.cart.cashierId = el.value || "";
        saveState(state);
        if (appRoot) renderReceipt(appRoot, state);
        return;
      }
      if (el.id === "customerSelect") {
        state.cart.customerId = el.value || "";
        saveState(state);
        if (appRoot) {
          renderCheckoutSummary(appRoot, state);
          renderCustomersDynamic(appRoot, state);
        }
        return;
      }
      if (el.name === "payMethod") {
        state.cart.payMethod = el.value;
        saveState(state);
        if (appRoot) {
          renderCheckoutSummary(appRoot, state);
          var segItems = appRoot.querySelectorAll(".segmented-item");
          for (var i = 0; i < segItems.length; i++) {
            var inp = segItems[i].querySelector("input");
            segItems[i].classList.toggle("active", !!(inp && inp.checked));
          }
        }
        return;
      }
    });
  }

  main();
})();
