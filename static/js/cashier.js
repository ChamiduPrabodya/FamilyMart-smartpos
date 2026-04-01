(function () {
  "use strict";

  var STORAGE_KEY = "go_pos_frontend_demo_v1";
  var HOLD_KEY = "go_pos_frontend_demo_holds_v1";

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

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
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
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }, 2400);
  }

  function defaultState() {
    return {
      settings: { currency: "LKR", register: "01" },
      products: [],
      employees: [],
      sales: [],
      cart: { items: [], discount: 0, taxRate: 0, cashierId: "", payMethod: "cash", cashTendered: "" },
      lastReceipt: ""
    };
  }

  function sampleProducts() {
    return [
      { id: uid("p"), name: "Mineral Water 500ml", sku: "FM-0001", price: 120, cost: 70, stock: 48, lowAt: 10 },
      { id: uid("p"), name: "Bread", sku: "FM-0002", price: 240, cost: 160, stock: 18, lowAt: 5 },
      { id: uid("p"), name: "Milk 1L", sku: "FM-0003", price: 550, cost: 430, stock: 12, lowAt: 4 },
      { id: uid("p"), name: "Instant Noodles", sku: "FM-0004", price: 180, cost: 115, stock: 30, lowAt: 8 },
      { id: uid("p"), name: "Chips 50g", sku: "FM-0005", price: 220, cost: 140, stock: 9, lowAt: 6 }
    ];
  }

  function seedIfEmpty(state) {
    if (!state.settings) state.settings = { currency: "LKR", register: "01" };
    if (!state.products || state.products.length === 0) state.products = sampleProducts();
    if (!state.employees || state.employees.length === 0) {
      state.employees = [
        { id: uid("emp"), name: "Cashier 01", role: "Cashier" },
        { id: uid("emp"), name: "Manager 01", role: "Manager" }
      ];
    }
    if (!state.sales) state.sales = [];
    if (!state.cart) state.cart = defaultState().cart;
    if (!state.cart.items) state.cart.items = [];
    if (!state.cart.payMethod) state.cart.payMethod = "cash";
    if (!state.cart.cashierId && state.employees[0]) state.cart.cashierId = state.employees[0].id;
    if (!state.lastReceipt) state.lastReceipt = "";
  }

  function fmtMoney(state, amount) {
    var currency = (state && state.settings && state.settings.currency) ? state.settings.currency : "LKR";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency }).format(amount || 0);
    } catch (e) {
      return (amount || 0).toFixed(2) + " " + currency;
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

  function cartTotals(state) {
    var subtotal = 0;
    var costTotal = 0;
    var qtyTotal = 0;
    for (var i = 0; i < state.cart.items.length; i++) {
      var it = state.cart.items[i];
      var p = getProductById(state, it.productId);
      if (!p) continue;
      var qty = Math.max(0, Math.floor(safeNumber(it.qty, 0)));
      qtyTotal += qty;
      subtotal += safeNumber(p.price, 0) * qty;
      costTotal += safeNumber(p.cost, 0) * qty;
    }
    var discount = Math.max(0, safeNumber(state.cart.discount, 0));
    var taxRate = Math.max(0, safeNumber(state.cart.taxRate, 0));
    var tax = Math.max(0, (subtotal - discount) * (taxRate / 100));
    var total = Math.max(0, subtotal + tax - discount);
    var profit = (subtotal - discount) - costTotal;
    return { qtyTotal: qtyTotal, subtotal: subtotal, tax: tax, discount: discount, total: total, profit: profit };
  }

  function buildReceipt(state, cartSnapshot, totalsSnapshot, createdAt) {
    var t = totalsSnapshot || cartTotals(state);
    var cart = cartSnapshot || state.cart;
    var lines = [];
    lines.push("FAMILYMART POS");
    lines.push(createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString());
    lines.push("Register: " + ((state.settings && state.settings.register) ? state.settings.register : "01"));
    var emp = getEmployeeById(state, cart.cashierId);
    if (emp) lines.push("Cashier: " + emp.name);
    lines.push("--------------------------------");
    if (!cart.items || !cart.items.length) lines.push("(no items)");
    else {
      for (var i = 0; i < cart.items.length; i++) {
        var it = cart.items[i];
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
    lines.push("Pay: " + String(cart.payMethod || "cash").toUpperCase());
    return lines.join("\n");
  }

  function renderShell() {
    return [
      '<div class="cashier-shell cashier-shell-v2">',
      '  <div class="cashier-main">',
      '    <div class="card cashier-card"><div class="card-inner">',
      '      <div class="cashier-searchbar">',
      '        <button class="scan-btn" type="button" data-action="focus-scan" title="Focus scan (F2)">▦</button>',
      '        <div class="cashier-searchfields">',
      '          <div class="field" style="margin:0">',
      '            <label class="label" for="scanInput">Scan / SKU</label>',
      '            <input id="scanInput" type="text" autocomplete="off" placeholder="Scan or type SKU then Enter" />',
      "          </div>",
      '          <div class="field" style="margin:0">',
      '            <label class="label" for="quickPick">Search by name</label>',
      '            <input id="quickPick" type="text" list="productList" autocomplete="off" placeholder="Type product name..." />',
      '            <datalist id="productList"></datalist>',
      "          </div>",
      "        </div>",
      '        <div class="cashier-search-actions">',
      '          <button class="btn" type="button" data-action="add-quick-pick" title="Add by name">Add</button>',
      '          <button class="btn btn-primary cashier-confirm" type="button" data-action="add-scan" title="Add scanned item">Confirm</button>',
      "        </div>",
      "      </div>",
      '      <div class="table-wrap cashier-table">',
      '        <table class="table" aria-label="Cart items">',
      '          <thead><tr><th style="min-width:240px">Name</th><th>Price</th><th style="min-width:140px">Qty</th><th>Total</th><th></th></tr></thead>',
      '          <tbody id="cartTbody"></tbody>',
      "        </table>",
      "      </div>",
      '      <div class="charge-bar">',
      '        <div class="charge-meta">',
      '          <div class="charge-kv"><span class="muted">Quantity</span><strong id="sumQty">0</strong></div>',
      '          <div class="charge-kv"><span class="muted">Total</span><strong id="chargeTotal">-</strong></div>',
      "        </div>",
      '        <div class="charge-actions">',
      '          <button class="btn" type="button" data-action="void-selected" title="Remove selected line (Del)">Void</button>',
      '          <button class="btn btn-accent btn-lg charge-btn" type="button" data-action="pay" title="Pay (F4)">Charge <span class="charge-amount" id="chargeAmount">-</span></button>',
      "        </div>",
      "      </div>",
      "    </div></div>",
      "  </div>",
      '  <div class="cashier-side">',
      '    <div class="card cashier-card"><div class="card-inner">',
      '      <div class="cashier-side-top">',
      '        <div class="field" style="margin:0"><label class="label" for="cashierSelect">Cashier</label><select id="cashierSelect" class="select"></select></div>',
      "      </div>",
      '      <div class="payment-stats" aria-label="Payment summary">',
      '        <div class="payment-row"><span class="muted">Payment due</span><strong id="payDue">-</strong></div>',
      '        <div class="payment-row"><span class="muted">Payment received</span><strong id="payReceived">-</strong></div>',
      '        <div class="payment-row"><span class="muted">Change</span><strong id="payChange">-</strong></div>',
      "      </div>",
      '      <div class="grid" style="align-items:end;margin-top:10px">',
      '        <div class="col-6"><div class="field" style="margin:0"><label class="label" for="taxRate">Tax %</label><input id="taxRate" type="number" min="0" step="0.01" value="0" /></div></div>',
      '        <div class="col-6"><div class="field" style="margin:0"><label class="label" for="discount">Discount</label><input id="discount" type="number" min="0" step="0.01" value="0" /></div></div>',
      "      </div>",
      '      <div class="field" style="margin-top:10px">',
      '        <span class="label">Payment method</span>',
      '        <div class="segmented" role="radiogroup" aria-label="Payment method">',
      '          <label class="segmented-item"><input type="radio" name="payMethod" value="cash" checked /><span>Cash</span></label>',
      '          <label class="segmented-item"><input type="radio" name="payMethod" value="card" /><span>Card</span></label>',
      '          <label class="segmented-item"><input type="radio" name="payMethod" value="qr" /><span>QR</span></label>',
      "        </div>",
      "      </div>",
      '      <div class="field" id="cashTenderField" style="margin-top:10px">',
      '        <label class="label" for="cashTendered">Cash received</label>',
      '        <input id="cashTendered" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" />',
      '        <div class="mini" id="cashChangeMeta"></div>',
      "      </div>",
      '      <div class="keypad" aria-label="Numeric keypad">',
      '        <div class="keypad-grid">',
      '          <button class="key" type="button" data-action="keypad" data-key="1">1</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="2">2</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="3">3</button>',
      '          <button class="key key-cancel" type="button" data-action="keypad-cancel">Cancel</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="4">4</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="5">5</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="6">6</button>',
      '          <button class="key key-delete" type="button" data-action="keypad-delete">Delete</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="7">7</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="8">8</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="9">9</button>',
      '          <button class="key key-enter" type="button" data-action="keypad-enter">Enter</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="0">0</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="00">00</button>',
      '          <button class="key" type="button" data-action="keypad" data-key=".">.</button>',
      '          <button class="key" type="button" data-action="keypad" data-key="000">000</button>',
      "        </div>",
      "      </div>",
      '      <div class="actions" style="justify-content:stretch;margin-top:12px">',
      '        <button class="btn btn-primary btn-lg" type="button" style="flex:1" data-action="complete-sale">Complete Sale</button>',
      "      </div>",
      '      <div class="receipt" style="margin-top:12px">',
      '        <div class="mini muted">Receipt preview</div>',
      '        <pre class="receipt-box receipt-box-compact" id="receiptPreview" aria-label="Receipt preview">-</pre>',
      '        <div class="actions" style="justify-content:flex-start;margin-top:10px">',
      '          <button class="btn" type="button" data-action="print-receipt">Print</button>',
      '          <button class="btn" type="button" data-action="copy-receipt">Copy</button>',
      "        </div>",
      "      </div>",
      "    </div></div>",
      "  </div>",
      '  <div class="cashier-rail" aria-label="Quick actions">',
      '    <button class="rail-btn" type="button" data-action="focus-scan" title="Scan">▦</button>',
      '    <button class="rail-btn" type="button" data-action="pay" title="Charge">💳</button>',
      '    <button class="rail-btn" type="button" data-action="new-sale" title="New sale">＋</button>',
      '    <button class="rail-btn" type="button" data-action="hold-sale" title="Hold">⏸</button>',
      '    <button class="rail-btn rail-gear" type="button" data-action="cashier-help" title="Shortcuts">?</button>',
      "  </div>",
      "</div>",
      '<div class="modal-backdrop" id="billModalBackdrop" hidden>',
      '  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="billModalTitle">',
      '    <div class="modal-card">',
      '      <div class="modal-head">',
      '        <h3 class="modal-title" id="billModalTitle">Bill / Receipt</h3>',
      '        <button class="btn" type="button" data-action="close-bill">Close</button>',
      "      </div>",
      '      <div class="modal-body">',
      '        <pre class="receipt-box" id="billReceipt" aria-label="Receipt">-</pre>',
      '        <div class="modal-actions">',
      '          <button class="btn" type="button" data-action="copy-bill">Copy</button>',
      '          <button class="btn" type="button" data-action="print-bill">Print</button>',
      '          <button class="btn btn-primary" type="button" data-action="new-sale">New Sale</button>',
      "        </div>",
      "      </div>",
      "    </div>",
      "  </div>",
      "</div>"
    ].join("\n");
  }

  function renderSelectOptions(selectEl, items, labelFn, selectedId) {
    if (!selectEl) return;
    var html = "";
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var selected = it.id === selectedId ? ' selected="selected"' : "";
      html += '<option value="' + escapeHtml(it.id) + '"' + selected + ">" + escapeHtml(labelFn(it)) + "</option>";
    }
    selectEl.innerHTML = html;
  }

  function renderCartTable(root, state) {
    var tbody = root.querySelector("#cartTbody");
    if (!tbody) return;
    if (!state.cart.items.length) {
      tbody.innerHTML = '<tr><td class="muted" colspan="5">No items. Scan a SKU or search by name.</td></tr>';
      return;
    }
    var html = "";
    for (var i = 0; i < state.cart.items.length; i++) {
      var it = state.cart.items[i];
      var p = getProductById(state, it.productId);
      if (!p) continue;
      var qty = Math.max(1, Math.floor(safeNumber(it.qty, 1)));
      var lineTotal = safeNumber(p.price, 0) * qty;
      html += '<tr class="cart-row" data-index="' + i + '">';
      html += '<td><div class="cell-title">' + escapeHtml(p.name) + '</div><div class="mini muted">SKU: ' + escapeHtml(p.sku) + " • Stock: " + Math.max(0, Math.floor(safeNumber(p.stock, 0))) + "</div></td>";
      html += "<td>" + escapeHtml(fmtMoney(state, safeNumber(p.price, 0))) + "</td>";
      html += '<td><div class="qty-stepper"><button class="step" type="button" data-action="qty-dec" data-index="' + i + '">-</button><input class="qty-input qty-input-compact" type="number" min="1" step="1" value="' + qty + '" data-action="set-qty" data-index="' + i + '" /><button class="step" type="button" data-action="qty-inc" data-index="' + i + '">+</button></div></td>';
      html += "<td><strong>" + escapeHtml(fmtMoney(state, lineTotal)) + "</strong></td>";
      html += '<td style="text-align:right"><button class="btn btn-danger" type="button" data-action="remove-item" data-index="' + i + '">Void</button></td>';
      html += "</tr>";
    }
    tbody.innerHTML = html;
  }

  function renderReceipt(root, state) {
    var box = root.querySelector("#receiptPreview");
    if (!box) return;
    if (!state.cart.items.length && state.lastReceipt) {
      box.textContent = state.lastReceipt;
      return;
    }
    box.textContent = buildReceipt(state, state.cart, cartTotals(state), null);
  }

  function renderTotals(root, state) {
    var t = cartTotals(state);
    var setText = function (id, v) { var el = root.querySelector("#" + id); if (el) el.textContent = v; };
    setText("sumQty", String(t.qtyTotal));
    setText("chargeTotal", fmtMoney(state, t.total));
    setText("chargeAmount", fmtMoney(state, t.total));
    setText("payDue", fmtMoney(state, t.total));

    var method = state.cart.payMethod || "cash";
    var received = method === "cash" ? safeNumber(state.cart.cashTendered, 0) : t.total;
    var change = received - t.total;
    setText("payReceived", fmtMoney(state, received));
    setText("payChange", fmtMoney(state, Math.max(0, change)));

    var cashField = root.querySelector("#cashTenderField");
    var keypad = root.querySelector(".keypad");
    if (cashField) cashField.hidden = method !== "cash";
    if (keypad) keypad.hidden = method !== "cash";

    var changeMeta = root.querySelector("#cashChangeMeta");
    if (changeMeta) {
      if (method !== "cash") changeMeta.textContent = "Card/QR: no cash input.";
      else changeMeta.textContent = t.total <= 0 ? "Add items to checkout." : ("Change: " + fmtMoney(state, Math.max(0, change)));
    }
  }

  function addToCart(state, productId, qty) {
    qty = Math.max(1, Math.floor(safeNumber(qty, 1)));
    for (var i = 0; i < state.cart.items.length; i++) {
      if (state.cart.items[i].productId === productId) {
        state.cart.items[i].qty = Math.max(1, Math.floor(safeNumber(state.cart.items[i].qty, 1))) + qty;
        return;
      }
    }
    state.cart.items.push({ productId: productId, qty: qty });
  }

  function completeSale(state) {
    if (!state.cart.items.length) return { ok: false, message: "No items in cart." };
    var totals = cartTotals(state);
    if (totals.total <= 0) return { ok: false, message: "Total must be greater than 0." };

    for (var i = 0; i < state.cart.items.length; i++) {
      var it = state.cart.items[i];
      var p = getProductById(state, it.productId);
      if (!p) continue;
      var qty = Math.max(1, Math.floor(safeNumber(it.qty, 1)));
      var stock = Math.max(0, Math.floor(safeNumber(p.stock, 0)));
      if (stock < qty) return { ok: false, message: "Not enough stock for: " + p.name };
    }

    if ((state.cart.payMethod || "cash") === "cash") {
      var tender = safeNumber(state.cart.cashTendered, 0);
      if (tender < totals.total) return { ok: false, message: "Cash received is less than total." };
    }

    var createdAt = nowISO();
    var receiptText = buildReceipt(state, JSON.parse(JSON.stringify(state.cart)), totals, createdAt);

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

    var saleId = uid("sale");
    state.sales.push({
      id: saleId,
      createdAt: createdAt,
      employeeId: state.cart.cashierId || "",
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
    state.lastReceipt = receiptText;
    return { ok: true, message: "Sale completed.", receipt: receiptText, saleId: saleId };
  }

  function renderAll(root, state) {
    var dl = root.querySelector("#productList");
    if (dl) {
      var options = "";
      for (var i = 0; i < state.products.length; i++) options += '<option value="' + escapeHtml(state.products[i].name) + '"></option>';
      dl.innerHTML = options;
    }

    var cashier = root.querySelector("#cashierSelect");
    if (cashier) renderSelectOptions(cashier, state.employees, function (e) { return e.name + (e.role ? (" - " + e.role) : ""); }, state.cart.cashierId);

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
    renderTotals(root, state);
    renderReceipt(root, state);

    var reg = document.getElementById("registerPill");
    if (reg) reg.textContent = "Register " + ((state.settings && state.settings.register) ? state.settings.register : "01");
  }

  var app = document.getElementById("cashierApp");
  if (!app) return;

  app.innerHTML = renderShell();
  var billBackdrop = app.querySelector("#billModalBackdrop");
  if (billBackdrop) {
    billBackdrop.addEventListener("click", function (e) {
      if (e.target === billBackdrop) closeBill();
    });
  }

  var state = loadJson(STORAGE_KEY, null) || defaultState();
  seedIfEmpty(state);

  function persist() { saveJson(STORAGE_KEY, state); }
  function rerender() { renderAll(app, state); persist(); }

  function openBill(receiptText) {
    var backdrop = app.querySelector("#billModalBackdrop");
    if (!backdrop) return;
    var box = backdrop.querySelector("#billReceipt");
    if (box) box.textContent = receiptText || state.lastReceipt || "-";
    backdrop.hidden = false;
  }

  function closeBill() {
    var backdrop = app.querySelector("#billModalBackdrop");
    if (!backdrop) return;
    backdrop.hidden = true;
    var scan = document.getElementById("scanInput");
    if (scan) scan.focus();
  }

  function newSale() {
    state.cart.items = [];
    state.cart.discount = 0;
    state.cart.taxRate = 0;
    state.cart.cashTendered = "";
    state.cart.payMethod = "cash";
    state.lastReceipt = "";
    toast("New sale ready.", "success");
    rerender();
    var scan = document.getElementById("scanInput");
    if (scan) scan.focus();
  }

  function holdCurrentSale() {
    if (!state.cart.items.length) return toast("Nothing to hold.", "danger");
    var holds = loadJson(HOLD_KEY, []);
    holds.unshift({ id: uid("hold"), at: nowISO(), cart: JSON.parse(JSON.stringify(state.cart)) });
    holds = holds.slice(0, 20);
    saveJson(HOLD_KEY, holds);
    state.cart.items = [];
    state.cart.discount = 0;
    state.cart.cashTendered = "";
    toast("Sale held.", "success");
    rerender();
  }

  function recallSale() {
    var holds = loadJson(HOLD_KEY, []);
    if (!holds.length) return toast("No held sales.", "danger");
    var pick = holds.shift();
    saveJson(HOLD_KEY, holds);
    state.cart = pick.cart;
    toast("Recalled held sale.", "success");
    rerender();
  }

  function voidSelected() {
    var selected = app.querySelector("tr.cart-row.is-selected");
    if (!selected) return toast("Select a cart row first.", "danger");
    var idx = Math.max(0, Math.floor(safeNumber(selected.getAttribute("data-index"), 0)));
    state.cart.items.splice(idx, 1);
    rerender();
  }

  rerender();
  var scanInput = document.getElementById("scanInput");
  if (scanInput) scanInput.focus();

  // Click actions (including header buttons)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");

    if (action === "new-sale") return newSale();
    if (action === "hold-sale") return holdCurrentSale();
    if (action === "recall-sale") return recallSale();

    if (!app.contains(btn)) return;

    if (action === "focus-scan") {
      var s = document.getElementById("scanInput");
      if (s) s.focus();
      return;
    }

    if (action === "add-scan") {
      var sku = scanInput ? String(scanInput.value || "").trim() : "";
      if (!sku) return toast("Enter a SKU first.", "danger");
      var p = getProductBySku(state, sku);
      if (!p) return toast("Unknown SKU: " + sku, "danger");
      addToCart(state, p.id, 1);
      if (scanInput) scanInput.value = "";
      rerender();
      toast("Added: " + p.name, "success");
      return;
    }

    if (action === "add-quick-pick") {
      var qp = document.getElementById("quickPick");
      var name = qp ? String(qp.value || "").trim() : "";
      if (!name) return toast("Pick a product name.", "danger");
      var found = null;
      for (var i = 0; i < state.products.length; i++) if (state.products[i].name === name) { found = state.products[i]; break; }
      if (!found) return toast("Pick from the list.", "danger");
      addToCart(state, found.id, 1);
      if (qp) qp.value = "";
      rerender();
      toast("Added: " + found.name, "success");
      return;
    }

    if (action === "remove-item") {
      var idx2 = Math.max(0, Math.floor(safeNumber(btn.getAttribute("data-index"), 0)));
      state.cart.items.splice(idx2, 1);
      rerender();
      return;
    }

    if (action === "qty-inc" || action === "qty-dec") {
      var idx3 = Math.max(0, Math.floor(safeNumber(btn.getAttribute("data-index"), 0)));
      var it = state.cart.items[idx3];
      if (!it) return;
      var cur = Math.max(1, Math.floor(safeNumber(it.qty, 1)));
      it.qty = action === "qty-inc" ? (cur + 1) : Math.max(1, cur - 1);
      rerender();
      return;
    }

    if (action === "void-selected") return voidSelected();

    if (action === "pay") {
      var cash = document.getElementById("cashTendered");
      if ((state.cart.payMethod || "cash") === "cash" && cash) cash.focus();
      return;
    }

    if (action === "complete-sale") {
      var res = completeSale(state);
      if (!res.ok) return toast(res.message, "danger");
      toast(res.message, "success");
      openBill(res.receipt);
      rerender();
      return;
    }

    if (action === "print-receipt") {
      window.print();
      return;
    }

    if (action === "copy-receipt") {
      var box = document.getElementById("receiptPreview");
      if (!box) return;
      try {
        navigator.clipboard.writeText(box.textContent || "");
        toast("Receipt copied.", "success");
      } catch (err) {
        toast("Copy failed.", "danger");
      }
      return;
    }

    if (action === "close-bill") {
      closeBill();
      return;
    }

    if (action === "print-bill") {
      window.print();
      return;
    }

    if (action === "copy-bill") {
      var box2 = app.querySelector("#billReceipt");
      if (!box2) return;
      try {
        navigator.clipboard.writeText(box2.textContent || "");
        toast("Receipt copied.", "success");
      } catch (err2) {
        toast("Copy failed.", "danger");
      }
      return;
    }

    if (action === "keypad" || action === "keypad-cancel" || action === "keypad-delete" || action === "keypad-enter") {
      if ((state.cart.payMethod || "cash") !== "cash") return toast("Keypad is for Cash.", "danger");
      var current = String(state.cart.cashTendered || "");
      if (action === "keypad-cancel") current = "";
      if (action === "keypad-delete") current = current.slice(0, Math.max(0, current.length - 1));
      if (action === "keypad") {
        var key = btn.getAttribute("data-key") || "";
        if (key === ".") {
          if (current.indexOf(".") === -1) current = (current ? current : "0") + ".";
        } else {
          current += key;
        }
      }
      if (action === "keypad-enter") {
        var res2 = completeSale(state);
        if (!res2.ok) return toast(res2.message, "danger");
        toast(res2.message, "success");
        openBill(res2.receipt);
        rerender();
        return;
      }
      state.cart.cashTendered = current;
      var cash2 = document.getElementById("cashTendered");
      if (cash2) cash2.value = current;
      persist();
      renderTotals(app, state);
      return;
    }

    if (action === "cashier-help") {
      alert("Shortcuts:\nF2 = focus scan\nF4 = focus cash\nDel = void selected\nEnter on scan/name = add\n");
      return;
    }
  });

  // Select cart row
  app.addEventListener("click", function (e) {
    var row = e.target.closest("tr.cart-row");
    if (!row) return;
    var rows = app.querySelectorAll("tr.cart-row");
    for (var i = 0; i < rows.length; i++) rows[i].classList.remove("is-selected");
    row.classList.add("is-selected");
  });

  // Inputs
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el || !app.contains(el)) return;

    if (el.getAttribute("data-action") === "set-qty") {
      var idx = Math.max(0, Math.floor(safeNumber(el.getAttribute("data-index"), 0)));
      var qty = Math.max(1, Math.floor(safeNumber(el.value, 1)));
      if (state.cart.items[idx]) state.cart.items[idx].qty = qty;
      persist();
      renderCartTable(app, state);
      renderTotals(app, state);
      renderReceipt(app, state);
      return;
    }

    if (el.id === "taxRate") {
      state.cart.taxRate = safeNumber(el.value, 0);
      persist();
      renderTotals(app, state);
      renderReceipt(app, state);
      return;
    }

    if (el.id === "discount") {
      state.cart.discount = safeNumber(el.value, 0);
      persist();
      renderTotals(app, state);
      renderReceipt(app, state);
      return;
    }

    if (el.id === "cashTendered") {
      state.cart.cashTendered = el.value;
      persist();
      renderTotals(app, state);
      return;
    }
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (!el || !app.contains(el)) return;

    if (el.id === "cashierSelect") {
      state.cart.cashierId = el.value || "";
      persist();
      renderReceipt(app, state);
      return;
    }

    if (el.name === "payMethod") {
      state.cart.payMethod = el.value;
      persist();
      rerender();
      return;
    }
  });

  // Shortcuts
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var backdrop = app.querySelector("#billModalBackdrop");
      if (backdrop && !backdrop.hidden) {
        e.preventDefault();
        closeBill();
        return;
      }
    }
    if (e.key === "F2") {
      e.preventDefault();
      var s = document.getElementById("scanInput");
      if (s) s.focus();
    }
    if (e.key === "F4") {
      e.preventDefault();
      var c = document.getElementById("cashTendered");
      if (c) c.focus();
    }
    if (e.key === "Delete") {
      if (document.activeElement && (document.activeElement.tagName || "").toLowerCase() === "input") return;
      voidSelected();
    }
    if (e.key === "Enter") {
      var active = document.activeElement;
      if (!active) return;
      if (active.id === "scanInput") {
        e.preventDefault();
        var sku = String(active.value || "").trim();
        if (!sku) return;
        var p = getProductBySku(state, sku);
        if (!p) return toast("Unknown SKU: " + sku, "danger");
        addToCart(state, p.id, 1);
        active.value = "";
        rerender();
        toast("Added: " + p.name, "success");
      }
      if (active.id === "quickPick") {
        e.preventDefault();
        var name = String(active.value || "").trim();
        if (!name) return;
        var found = null;
        for (var i = 0; i < state.products.length; i++) if (state.products[i].name === name) { found = state.products[i]; break; }
        if (!found) return toast("Pick from the list.", "danger");
        addToCart(state, found.id, 1);
        active.value = "";
        rerender();
        toast("Added: " + found.name, "success");
      }
    }
  });
})();
