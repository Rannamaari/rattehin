(function () {
  const $$ = (sel) => document.querySelector(sel);
  const $$$ = (sel) => Array.from(document.querySelectorAll(sel));

  // State
  let people = [];
  let items = [];   // { id, name, price, assigned: Set(personName) }
  let shared = [];  // { id, name, price }
  let currentCurrency = 'MVR';
  let exchangeRates = { MVR: 1, USD: 0.065, EUR: 0.059 };
  let billHistory = JSON.parse(localStorage.getItem('rattehin_history') || '[]');
  
  // Toast system
  let toastTimeout;

  // Elements
  const personNameEl = $$('#personName');
  const addPersonBtn = $$('#addPersonBtn');
  const peopleListEl = $$('#peopleList');

  const servicePctEl = $$('#servicePct');
  const gstEnabledEl = $$('#gstEnabled');
  const gstOnServiceEl = $$('#gstOnService');

  const sharedNameEl = $$('#sharedName');
  const sharedPriceEl = $$('#sharedPrice');
  const addSharedBtn = $$('#addSharedBtn');
  const sharedListEl = $$('#sharedList');

  const itemNameEl = $$('#itemName');
  const itemPriceEl = $$('#itemPrice');
  const addItemBtn = $$('#addItemBtn');
  const itemListEl = $$('#itemList');

  const calcBtn = $$('#calcBtn');
  const resetBtn = $$('#resetBtn');
  const shareBtn = $$('#shareBtn');
  const shareStatus = $$('#shareStatus');

  const resultsEl = $$('#results');
  const grandTotalsEl = $$('#grandTotals');

  const GST_RATE = 0.08;
  
  // Enhanced currency formatter with multi-currency support
  function currency(n, currencyCode = currentCurrency) {
    if (Number.isNaN(n)) return `${currencyCode} 0.00`;
    const symbols = { MVR: 'MVR', USD: '$', EUR: '€' };
    const symbol = symbols[currencyCode] || currencyCode;
    return `${symbol} ${n.toFixed(2)}`;
  }
  
  // Convert currency
  function convertCurrency(amount, from = 'MVR', to = currentCurrency) {
    if (from === to) return amount;
    const usdAmount = amount / exchangeRates[from];
    return usdAmount * exchangeRates[to];
  }
  
  // Toast notification system
  function showToast(message, type = 'info', duration = 3000) {
    const toast = $$('#toast');
    const toastMessage = $$('#toastMessage');
    const toastIcon = $$('#toastIcon');
    
    const icons = {
      success: '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
      error: '<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>',
      warning: '<svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
      info: '<svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
    };
    
    toastIcon.innerHTML = icons[type] || icons.info;
    toastMessage.textContent = message;
    
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
  
  // Dark mode system
  function initDarkMode() {
    const darkModeToggle = $$('#darkModeToggle');
    const savedTheme = localStorage.getItem('rattehin_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
    
    darkModeToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('rattehin_theme', isDark ? 'dark' : 'light');
      showToast(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'info', 2000);
    });
  }
  
  // Animation helpers
  function animateElement(element, animation = 'animate-bounce-gentle') {
    element.classList.add(animation);
    setTimeout(() => element.classList.remove(animation), 600);
  }

  function id() {
    return Math.random().toString(36).slice(2, 9);
  }

  function renderPeople() {
    peopleListEl.innerHTML = '';
    if (people.length === 0) {
      peopleListEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Add people to start splitting the bill</p>';
      return;
    }
    people.forEach((p) => {
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-3 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up';
      chip.innerHTML = `<span class="text-lg">👤</span>${p}
        <button title="Remove ${p}" class="remove text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-full w-5 h-5 flex items-center justify-center text-lg font-bold transition-all duration-200 ml-1" data-name="${p}">&times;</button>`;
      peopleListEl.appendChild(chip);
    });
  }

  function renderShared() {
    sharedListEl.innerHTML = '';
    if (shared.length === 0) {
      sharedListEl.innerHTML = '<p class="text-sm text-gray-500">No shared items yet.</p>';
      return;
    }
    shared.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between border rounded px-3 py-2';
      row.innerHTML = `
        <div class="font-medium">${s.name}</div>
        <div class="flex items-center gap-4">
          <div class="text-gray-700">${currency(s.price)}</div>
          <button class="text-accent font-semibold" data-id="${s.id}">Remove</button>
        </div>`;
      sharedListEl.appendChild(row);
    });
  }

  function renderItems() {
    itemListEl.innerHTML = '';
    if (items.length === 0) {
      itemListEl.innerHTML = '<p class="text-sm text-gray-500">No items yet.</p>';
      return;
    }
    items.forEach((it) => {
      const card = document.createElement('div');
      card.className = 'border rounded-lg p-3';
      const checks = people.map((p) => {
        const checked = it.assigned.has(p) ? 'checked' : '';
        return `
          <label class="inline-flex items-center gap-2 mr-4 my-1">
            <input type="checkbox" class="assign" data-id="${it.id}" data-person="${p}" ${checked}/>
            <span>${p}</span>
          </label>`;
      }).join('');
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="font-medium">${it.name} <span class="text-gray-500">(${currency(it.price)})</span></div>
          <button class="text-accent font-semibold remove-item" data-id="${it.id}">Remove</button>
        </div>
        <div class="mt-2 text-sm">
          <div class="mb-1 text-gray-600">Who ate this?</div>
          <div>${checks || '<span class="text-gray-400">Add people first.</span>'}</div>
        </div>`;
      itemListEl.appendChild(card);
    });
  }

  function saveToURL() {
    const payload = {
      people,
      items: items.map(i => ({ name: i.name, price: i.price, assigned: Array.from(i.assigned) })),
      shared,
      settings: {
        servicePct: parseFloat(servicePctEl.value) || 0,
        gstEnabled: gstEnabledEl.checked,
        gstOnService: gstOnServiceEl.checked
      },
      currency: currentCurrency,
      timestamp: Date.now()
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url = new URL(window.location.href);
    url.hash = encoded;
    history.replaceState(null, '', url.toString());
  }
  
  // Save bill to history
  function saveBillToHistory(billData, totals) {
    const historyItem = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      people: [...billData.people],
      items: billData.items.length,
      shared: billData.shared.length,
      total: totals.total,
      currency: currentCurrency,
      data: billData
    };
    
    billHistory.unshift(historyItem);
    if (billHistory.length > 20) billHistory = billHistory.slice(0, 20);
    localStorage.setItem('rattehin_history', JSON.stringify(billHistory));
    renderHistory();
  }
  
  // Render bill history
  function renderHistory() {
    const historyList = $$('#historyList');
    if (billHistory.length === 0) {
      historyList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No saved bills yet</p>';
      return;
    }
    
    historyList.innerHTML = billHistory.map(bill => `
      <div class="glass rounded-xl p-4 hover:shadow-md transition-all duration-300 cursor-pointer bill-history-item" data-id="${bill.id}">
        <div class="flex items-center justify-between mb-2">
          <div class="font-medium text-gray-900 dark:text-white">${bill.date}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">${bill.time}</div>
        </div>
        <div class="flex items-center justify-between text-sm">
          <div class="text-gray-600 dark:text-gray-400">
            ${bill.people.length} people • ${bill.items + bill.shared} items
          </div>
          <div class="font-semibold text-primary-600 dark:text-primary-400">
            ${currency(bill.total, bill.currency)}
          </div>
        </div>
      </div>
    `).join('');
  }

  function loadFromURL() {
    if (!location.hash) return;
    try {
      const json = decodeURIComponent(escape(atob(location.hash.slice(1))));
      const data = JSON.parse(json);
      people = data.people || [];
      items = (data.items || []).map(i => ({ id: id(), name: i.name, price: i.price, assigned: new Set(i.assigned || []) }));
      shared = data.shared || [];
      currentCurrency = data.currency || 'MVR';
      if (data.settings) {
        servicePctEl.value = data.settings.servicePct ?? 10;
        gstEnabledEl.checked = !!data.settings.gstEnabled;
        gstOnServiceEl.checked = !!data.settings.gstOnService;
      }
      showToast('Bill data loaded from shared link', 'success');
    } catch (e) {
      showToast('Error loading shared bill data', 'error');
    }
  }

  function calculate() {
    const mode = ($$$('input[name="mode"]:checked')[0] || {}).value || 'itemized';
    const servicePct = (parseFloat(servicePctEl.value) || 0) / 100;
    const gstEnabled = gstEnabledEl.checked;
    const gstOnService = gstOnServiceEl.checked;

    if (people.length === 0) {
      resultsEl.innerHTML = '<p class="text-sm text-gray-600">Add at least one person.</p>';
      grandTotalsEl.innerHTML = '';
      return;
    }

    // Build per-person buckets
    const per = {};
    people.forEach(p => per[p] = { subtotal: 0, service: 0, gst: 0, total: 0 });

    // Sum shared items equally among all
    const sharedTotal = shared.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0);
    const sharedPerHead = people.length > 0 ? sharedTotal / people.length : 0;

    if (mode === 'equal') {
      // Everything is shared equally: items + shared
      const itemsTotal = items.reduce((acc, it) => acc + (parseFloat(it.price) || 0), 0);
      const basePerHead = (itemsTotal + sharedTotal) / people.length;
      people.forEach(p => per[p].subtotal += basePerHead);
    } else {
      // Itemized: split each item by number of assigned people
      items.forEach((it) => {
        const price = parseFloat(it.price) || 0;
        const assigned = Array.from(it.assigned);
        const n = assigned.length || 0;
        if (n === 0) return; // unassigned item doesn't count
        const share = price / n;
        assigned.forEach(p => per[p].subtotal += share);
      });
      // Add shared per head
      people.forEach(p => per[p].subtotal += sharedPerHead);
    }

    // Apply service charge, then GST (optionally on service too)
    let grand = { subtotal: 0, service: 0, gst: 0, total: 0 };
    people.forEach(p => {
      const subtotal = per[p].subtotal;
      const service = subtotal * servicePct;
      const gstBase = gstOnService ? (subtotal + service) : subtotal;
      const gst = gstEnabled ? gstBase * GST_RATE : 0;
      const total = subtotal + service + gst;

      per[p].service = service;
      per[p].gst = gst;
      per[p].total = total;

      grand.subtotal += subtotal;
      grand.service += service;
      grand.gst += gst;
      grand.total += total;
    });

    // Render results
    resultsEl.innerHTML = '';
    people.forEach(p => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl shadow p-4';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-lg">${p}</h3>
          <span class="text-primary font-bold">${currency(per[p].total)}</span>
        </div>
        <div class="mt-2 text-sm text-gray-700">
          <div class="flex justify-between"><span>Subtotal</span><span>${currency(per[p].subtotal)}</span></div>
          <div class="flex justify-between"><span>Service</span><span>${currency(per[p].service)}</span></div>
          <div class="flex justify-between"><span>GST</span><span>${currency(per[p].gst)}</span></div>
        </div>`;
      resultsEl.appendChild(card);
    });

    grandTotalsEl.innerHTML = `
      <div class="bg-white rounded-xl shadow p-4">
        <h3 class="font-semibold text-lg mb-2">Bill Summary</h3>
        <div class="grid md:grid-cols-4 gap-3 text-sm text-gray-700">
          <div class="border rounded p-3"><div class="text-gray-500">Subtotal</div><div class="font-semibold">${currency(grand.subtotal)}</div></div>
          <div class="border rounded p-3"><div class="text-gray-500">Service</div><div class="font-semibold">${currency(grand.service)}</div></div>
          <div class="border rounded p-3"><div class="text-gray-500">GST</div><div class="font-semibold">${currency(grand.gst)}</div></div>
          <div class="border rounded p-3 bg-green-50"><div class="text-gray-500">Grand Total</div><div class="font-semibold">${currency(grand.total)}</div></div>
        </div>
      </div>
    `;
  }

  // Export bill functionality
  function exportBill(billData, totals) {
    const exportData = {
      restaurant: 'Bill Split',
      date: new Date().toLocaleString(),
      people: billData.people,
      items: billData.items,
      shared: billData.shared,
      totals: totals,
      currency: currentCurrency
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rattehin-bill-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Bill exported successfully!', 'success');
  }
  
  // Print functionality
  function printBill() {
    const printWindow = window.open('', '_blank');
    const billContent = resultsEl.innerHTML + grandTotalsEl.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rattehin Bill - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .print-header { text-align: center; margin-bottom: 30px; }
          .person-card { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
          .totals { margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>🧾 Rattehin Bill Split</h1>
          <p>${new Date().toLocaleDateString()} • ${people.length} people</p>
        </div>
        <div class="person-card">${billContent}</div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
    
    showToast('Printing bill...', 'info');
  }
  
  // Enhanced event bindings
  addPersonBtn.addEventListener('click', () => {
    const n = personNameEl.value.trim();
    if (!n) {
      showToast('Please enter a name', 'warning');
      return;
    }
    if (people.includes(n)) {
      showToast('This person is already added', 'warning');
      return;
    }
    if (people.length >= 20) {
      showToast('Maximum 20 people allowed', 'warning');
      return;
    }
    people.push(n);
    personNameEl.value = '';
    renderPeople();
    renderItems();
    renderShared();
    saveToURL();
    showToast(`${n} added successfully!`, 'success', 2000);
    animateElement(addPersonBtn);
  });
  
  // Enter key support for person input
  personNameEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPersonBtn.click();
    }
  });

  peopleListEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove')) {
      const name = e.target.dataset.name;
      people = people.filter(p => p !== name);
      // Remove assignments containing this person
      items.forEach(i => i.assigned.delete(name));
      renderPeople();
      renderItems();
      saveToURL();
    }
  });

  addSharedBtn.addEventListener('click', () => {
    const name = sharedNameEl.value.trim();
    const price = parseFloat(sharedPriceEl.value);
    if (!name || isNaN(price) || price < 0) return;
    shared.push({ id: id(), name, price });
    sharedNameEl.value = '';
    sharedPriceEl.value = '';
    renderShared();
    saveToURL();
  });

  sharedListEl.addEventListener('click', (e) => {
    const idToRemove = e.target.dataset.id;
    if (!idToRemove) return;
    shared = shared.filter(s => s.id !== idToRemove);
    renderShared();
    saveToURL();
  });

  addItemBtn.addEventListener('click', () => {
    const name = itemNameEl.value.trim();
    const price = parseFloat(itemPriceEl.value);
    if (!name || isNaN(price) || price <= 0) return;
    items.push({ id: id(), name, price, assigned: new Set() });
    itemNameEl.value = '';
    itemPriceEl.value = '';
    renderItems();
    saveToURL();
  });

  itemListEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item')) {
      const idToRemove = e.target.dataset.id;
      items = items.filter(i => i.id !== idToRemove);
      renderItems();
      saveToURL();
    }
  });

  itemListEl.addEventListener('change', (e) => {
    if (!e.target.classList.contains('assign')) return;
    const id = e.target.dataset.id;
    const person = e.target.dataset.person;
    const it = items.find(i => i.id === id);
    if (!it) return;
    if (e.target.checked) it.assigned.add(person);
    else it.assigned.delete(person);
    saveToURL();
  });

  $$$('input[name="mode"]').forEach(r => r.addEventListener('change', saveToURL));
  [servicePctEl, gstEnabledEl, gstOnServiceEl].forEach(el => el.addEventListener('change', saveToURL));

  calcBtn.addEventListener('click', calculate);

  resetBtn.addEventListener('click', () => {
    people = [];
    items = [];
    shared = [];
    servicePctEl.value = 10;
    gstEnabledEl.checked = true;
    gstOnServiceEl.checked = true;
    renderPeople();
    renderItems();
    renderShared();
    resultsEl.innerHTML = '';
    grandTotalsEl.innerHTML = '';
    history.replaceState(null, '', location.pathname); // clear hash
    shareStatus.textContent = '';
  });

  shareBtn.addEventListener('click', () => {
    saveToURL();
    navigator.clipboard.writeText(location.href)
      .then(() => { shareStatus.textContent = 'Link copied!'; })
      .catch(() => { shareStatus.textContent = 'Could not copy link.'; });
  });

  // Initialize app
  function initApp() {
    initDarkMode();
    loadFromURL();
    renderPeople();
    renderItems();
    renderShared();
    renderHistory();
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed', err));
    }
    
    // Show welcome toast for new users
    if (!localStorage.getItem('rattehin_visited')) {
      setTimeout(() => {
        showToast('Welcome to Rattehin! Split bills easily with friends & family 🎉', 'info', 5000);
        localStorage.setItem('rattehin_visited', 'true');
      }, 1000);
    }
  }
  
  // Start the app
  initApp();
})();
