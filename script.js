/* ==========================================================
   PG MANAGER - script.js
   ========================================================== */

/* ---------- 1. APP DATA (state) ---------- */
var S = { pg: 'My PG', tenants: [], bills: {} };
var month;
var filter = 'all';
var editId = null;
var billId = null;
var sent = {};

/* ---------- 2. SAVE AND LOAD (browser localStorage) ---------- */
function load() {
  try {
    var r = localStorage.getItem('pgm1');
    if (r) S = JSON.parse(r);
  } catch (e) {}
}

function save() {
  try {
    localStorage.setItem('pgm1', JSON.stringify(S));
  } catch (e) {}
}

/* ---------- 3. SMALL HELPER FUNCTIONS ---------- */
function $(i) {
  return document.getElementById(i);
}

// Makes text safe before putting it inside HTML
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

// Formats a number as Indian rupees, e.g. ₹12,500
function inr(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function monthName(m) {
  var d = new Date(m + '-01');
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function tById(id) {
  return S.tenants.filter(function (t) {
    return t.id === id;
  })[0];
}

/* ---------- 4. BILL LOGIC ---------- */

// Finds last month's meter reading and rate for a tenant
function prevCur(id, m) {
  var ks = Object.keys(S.bills)
    .filter(function (k) {
      return k < m && S.bills[k][id];
    })
    .sort();

  return ks.length
    ? {
        cur: S.bills[ks[ks.length - 1]][id].cur,
        rate: S.bills[ks[ks.length - 1]][id].rate
      }
    : { cur: 0, rate: 8 };
}

// Returns the saved bill, or a new default bill for that month
function getBill(t, m) {
  var b = (S.bills[m] || {})[t.id];
  if (b) return b;

  var p = prevCur(t.id, m);
  return {
    prev: p.cur,
    cur: p.cur,
    rate: p.rate,
    other: 0,
    paid: false,
    saved: false
  };
}

// Calculates rent, electricity, other charges and total
function parts(t, b) {
  var el = Math.max(0, (+b.cur || 0) - (+b.prev || 0)) * (+b.rate || 0);
  return {
    rent: +t.rent || 0,
    el: el,
    other: +b.other || 0,
    total: (+t.rent || 0) + el + (+b.other || 0)
  };
}

function putBill(t, b) {
  if (!S.bills[month]) S.bills[month] = {};
  b.saved = true;
  S.bills[month][t.id] = b;
  save();
}

/* ---------- 5. DRAW THE SCREEN ---------- */
function render() {
  var tot = S.tenants.length;
  var pc = 0;
  var pend = 0;
  var coll = 0;

  // Count paid / pending amounts for the stat cards
  S.tenants.forEach(function (t) {
    var b = getBill(t, month);
    var p = parts(t, b);
    if (b.paid) {
      pc++;
      coll += p.total;
    } else {
      pend += p.total;
    }
  });

  $('stats').innerHTML =
    '<div class="stat"><b>' + tot + '</b><span>Tenants</span></div>' +
    '<div class="stat"><b style="color:var(--ok)">' + pc + '</b><span>Paid</span></div>' +
    '<div class="stat"><b style="color:var(--bad)">' + (tot - pc) + '</b><span>Not paid</span></div>' +
    '<div class="stat"><b>' + inr(coll) + '</b><span>Collected</span></div>' +
    '<div class="stat"><b>' + inr(pend) + '</b><span>Pending</span></div>';

  // Build the tenant cards
  var q = $('q').value.trim().toLowerCase();
  var h = '';

  S.tenants.forEach(function (t) {
    var b = getBill(t, month);
    var p = parts(t, b);

    if ((filter === 'paid' && !b.paid) || (filter === 'unpaid' && b.paid)) return;
    if (q && (t.name + ' ' + t.room + ' ' + t.phone).toLowerCase().indexOf(q) < 0) return;

    h +=
      '<div class="t"><div class="top"><div><h3>' + esc(t.name) + '</h3>' +
      '<div class="mute">Room ' + esc(t.room || '–') + ' · ' + esc(t.phone || 'no phone') + '</div></div>' +
      '<span class="badge ' + (b.paid ? 'paid' : 'unpaid') + '">' + (b.paid ? 'PAID' : 'NOT PAID') + '</span></div>' +
      '<div class="brk">' +
      '<span>Rent <b>' + inr(p.rent) + '</b></span>' +
      '<span>Electricity <b>' + inr(p.el) + '</b> (' + Math.max(0, b.cur - b.prev) + ' units)</span>' +
      '<span>Other <b>' + inr(p.other) + '</b></span>' +
      '<span>Total <b>' + inr(p.total) + '</b></span></div>' +
      '<div class="acts" data-id="' + t.id + '">' +
      '<button class="sm pri" data-act="togglePaid">' + (b.paid ? 'Mark unpaid' : 'Mark paid') + '</button>' +
      '<button class="sm" data-act="bill">Bill / meter</button>' +
      (b.paid ? '' : '<button class="sm wa" data-act="wa">WhatsApp</button>') +
      '<button class="sm" data-act="editT">Edit</button>' +
      '<button class="sm" data-act="delT">Delete</button></div></div>';
  });

  $('list').innerHTML =
    h ||
    '<div class="empty">' +
      (tot ? 'No tenants match.' : 'No tenants yet. Tap “+ Add tenant” to start.') +
    '</div>';
}

/* ---------- 6. WHATSAPP MESSAGE ---------- */
function msg(t) {
  var b = getBill(t, month);
  var p = parts(t, b);
  return (
    'Hello ' + t.name + ', this is a reminder from ' + S.pg +
    '. Your payment for ' + monthName(month) + ' is pending.\n\n' +
    'Rent: ' + inr(p.rent) + '\n' +
    'Electricity: ' + inr(p.el) + '\n' +
    'Other: ' + inr(p.other) + '\n' +
    'Total due: ' + inr(p.total) + '\n\n' +
    'Please pay at the earliest. Thank you!'
  );
}

// Makes the WhatsApp link (adds 91 for 10-digit Indian numbers)
function waUrl(t) {
  var n = String(t.phone || '').replace(/\D/g, '');
  if (n.length === 10) n = '91' + n;
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg(t));
}

/* ---------- 7. OPEN POPUPS ---------- */
function openT(id) {
  editId = id;
  var t = id ? tById(id) : {};
  $('dTt').textContent = id ? 'Edit tenant' : 'Add tenant';
  $('tName').value = t.name || '';
  $('tPhone').value = t.phone || '';
  $('tRoom').value = t.room || '';
  $('tRent').value = t.rent || '';
  $('tDep').value = t.dep || '';
  $('tJoin').value = t.join || '';
  $('dT').showModal();
}

// Live total inside the bill popup
function billCalc() {
  var p = parts(
    { rent: tById(billId).rent },
    {
      prev: $('bPrev').value,
      cur: $('bCur').value,
      rate: $('bRate').value,
      other: $('bOther').value
    }
  );
  $('bTot').textContent = 'Electricity ' + inr(p.el) + ' · Total due ' + inr(p.total);
}

// List of unpaid tenants for reminders
function openR() {
  var h = '';

  S.tenants.forEach(function (t) {
    var b = getBill(t, month);
    if (b.paid) return;

    h +=
      '<div class="row"><div><b>' + esc(t.name) + '</b>' +
      '<div class="mute">Room ' + esc(t.room || '–') + ' · ' + inr(parts(t, b).total) + '</div></div>' +
      '<button class="sm wa" data-act="sendR" data-id="' + t.id + '">' +
      (sent[t.id] ? 'Sent ✓ Again' : 'Send') + '</button></div>';
  });

  $('rList').innerHTML = h || '<div class="empty">Everyone has paid for this month. 🎉</div>';
  $('dR').showModal();
}

/* ---------- 8. BUTTON CLICKS (one listener for everything) ---------- */
document.addEventListener('click', function (e) {
  // All / Unpaid / Paid tabs
  var f = e.target.getAttribute && e.target.getAttribute('data-f');
  if (f) {
    filter = f;
    [].forEach.call($('tabs').children, function (b) {
      b.classList.toggle('on', b.getAttribute('data-f') === f);
    });
    render();
    return;
  }

  // Any button with data-act
  var a = e.target.closest && e.target.closest('[data-act]');
  if (!a) return;

  var act = a.getAttribute('data-act');
  var box = a.closest('[data-id]');
  var id = a.getAttribute('data-id') || (box && box.getAttribute('data-id'));
  var t = id && tById(id);

  if (act === 'addT') {
    openT(null);

  } else if (act === 'closeT') {
    $('dT').close();

  } else if (act === 'saveT') {
    var n = $('tName').value.trim();
    if (!n) {
      $('tName').focus();
      return;
    }
    var o = {
      name: n,
      phone: $('tPhone').value.trim(),
      room: $('tRoom').value.trim(),
      rent: +$('tRent').value || 0,
      dep: +$('tDep').value || 0,
      join: $('tJoin').value
    };
    if (editId) {
      Object.assign(tById(editId), o);
    } else {
      o.id = 't' + Date.now();
      S.tenants.push(o);
    }
    save();
    $('dT').close();
    render();

  } else if (act === 'editT') {
    openT(id);

  } else if (act === 'delT') {
    if (confirm('Delete ' + t.name + ' and all their bills?')) {
      S.tenants = S.tenants.filter(function (x) {
        return x.id !== id;
      });
      for (var m in S.bills) delete S.bills[m][id];
      save();
      render();
    }

  } else if (act === 'togglePaid') {
    var b = Object.assign({}, getBill(t, month));
    b.paid = !b.paid;
    putBill(t, b);
    render();

  } else if (act === 'bill') {
    billId = id;
    var b = getBill(t, month);
    $('dBt').textContent = t.name + ' – ' + monthName(month);
    $('bPrev').value = b.prev;
    $('bCur').value = b.cur;
    $('bRate').value = b.rate;
    $('bOther').value = b.other || '';
    billCalc();
    $('dB').showModal();

  } else if (act === 'closeB') {
    $('dB').close();

  } else if (act === 'saveB') {
    var t2 = tById(billId);
    var b2 = Object.assign({}, getBill(t2, month));
    b2.prev = +$('bPrev').value || 0;
    b2.cur = +$('bCur').value || 0;
    b2.rate = +$('bRate').value || 0;
    b2.other = +$('bOther').value || 0;
    putBill(t2, b2);
    $('dB').close();
    render();

  } else if (act === 'wa') {
    window.open(waUrl(t), '_blank');

  } else if (act === 'remindAll') {
    openR();

  } else if (act === 'sendR') {
    sent[id] = 1;
    window.open(waUrl(t), '_blank');
    a.textContent = 'Sent ✓ Again';

  } else if (act === 'closeR') {
    $('dR').close();

  } else if (act === 'backup') {
    // Download all records as a CSV file
    var rows = [[
      'Name', 'Phone', 'Room', 'Rent', 'Deposit', 'Joined', 'Month',
      'Prev meter', 'Cur meter', 'Rate', 'Electricity', 'Other', 'Total', 'Paid'
    ]];

    S.tenants.forEach(function (t) {
      Object.keys(S.bills).sort().forEach(function (m) {
        var b = S.bills[m][t.id];
        if (!b) return;
        var p = parts(t, b);
        rows.push([
          t.name, t.phone, t.room, t.rent, t.dep, t.join, m,
          b.prev, b.cur, b.rate, p.el, p.other, p.total, b.paid ? 'Yes' : 'No'
        ]);
      });
    });

    var csv = rows
      .map(function (r) {
        return r
          .map(function (c) {
            return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
          })
          .join(',');
      })
      .join('\n');

    var l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    l.download = 'pg-records.csv';
    l.click();
  }
});

/* ---------- 9. OTHER EVENTS ---------- */
['bPrev', 'bCur', 'bRate', 'bOther'].forEach(function (i) {
  $(i).addEventListener('input', billCalc);
});

$('q').addEventListener('input', render);

$('month').addEventListener('change', function () {
  month = this.value || month;
  sent = {};
  render();
});

$('pgName').addEventListener('input', function () {
  S.pg = this.value;
  save();
});

/* ---------- 10. START THE APP ---------- */
load();
var d = new Date();
month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
$('month').value = month;
$('pgName').value = S.pg || 'My PG';
render();