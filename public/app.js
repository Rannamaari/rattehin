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

  // OCR Elements
  const billImageInput = $$('#billImageInput');
  const uploadArea = $$('#uploadArea');
  const imagePreview = $$('#imagePreview');
  const previewImage = $$('#previewImage');
  const ocrProgress = $$('#ocrProgress');
  const ocrStatus = $$('#ocrStatus');
  const ocrProgressBar = $$('#ocrProgressBar');
  const ocrResults = $$('#ocrResults');
  const extractedItems = $$('#extractedItems');
  const addAllItemsBtn = $$('#addAllItemsBtn');
  const clearExtractionBtn = $$('#clearExtractionBtn');

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

  // OCR State
  let extractedItemsData = [];
  
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
      sharedListEl.innerHTML = '<div class="text-center py-8"><div class="text-4xl mb-2">🍽️</div><p class="text-sm text-gray-500 dark:text-gray-400">No shared items yet</p><p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Add items that everyone will share</p></div>';
      return;
    }
    shared.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors';
      row.innerHTML = `
        <div class="font-medium text-gray-900 dark:text-white">${s.name}</div>
        <div class="flex items-center gap-4">
          <div class="text-gray-700 dark:text-gray-300 font-semibold">${currency(s.price)}</div>
          <button class="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900 transition-all" data-id="${s.id}">Remove</button>
        </div>`;
      sharedListEl.appendChild(row);
    });
  }

  function renderItems() {
    itemListEl.innerHTML = '';
    if (items.length === 0) {
      itemListEl.innerHTML = '<div class="text-center py-8"><div class="text-4xl mb-2">🍽️</div><p class="text-sm text-gray-500 dark:text-gray-400">No individual items yet</p><p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Add items and assign them to specific people</p></div>';
      return;
    }
    items.forEach((it) => {
      const card = document.createElement('div');
      card.className = 'border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300';
      const checks = people.map((p) => {
        const checked = it.assigned.has(p) ? 'checked' : '';
        return `
          <label class="inline-flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
            <input type="checkbox" class="assign w-4 h-4 text-primary-600 rounded" data-id="${it.id}" data-person="${p}" ${checked}/>
            <span class="text-gray-700 dark:text-gray-300">${p}</span>
          </label>`;
      }).join('');
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="font-medium text-gray-900 dark:text-white">${it.name} <span class="text-gray-500 dark:text-gray-400 font-semibold">(${currency(it.price)})</span></div>
          <button class="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-semibold px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-all remove-item" data-id="${it.id}">Remove</button>
        </div>
        <div class="mt-3 text-sm">
          <div class="mb-2 text-gray-600 dark:text-gray-300 font-medium">Who ate this?</div>
          <div class="space-y-1">${checks || '<span class="text-gray-400 dark:text-gray-500">Add people first.</span>'}</div>
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
      resultsEl.innerHTML = '<div class="glass rounded-xl p-8 text-center animate-fade-in"><div class="text-4xl mb-4">\ud83d\udc65</div><p class="text-gray-600 dark:text-gray-400">Add at least one person to calculate the split</p></div>';
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
      card.className = 'glass rounded-xl shadow-soft hover:shadow-lift transition-all duration-300 p-6 animate-fade-in';
      card.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-primary-500 bg-opacity-10 flex items-center justify-center">
              <span class="text-xl">👤</span>
            </div>
            <h3 class="font-bold text-xl text-gray-900 dark:text-white">${p}</h3>
          </div>
          <span class="text-primary-600 dark:text-primary-400 font-bold text-xl">${currency(per[p].total)}</span>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
            <span class="font-semibold text-gray-900 dark:text-white">${currency(per[p].subtotal)}</span>
          </div>
          <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Service</span>
            <span class="font-semibold text-gray-900 dark:text-white">${currency(per[p].service)}</span>
          </div>
          <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
            <span class="text-gray-600 dark:text-gray-400">GST</span>
            <span class="font-semibold text-gray-900 dark:text-white">${currency(per[p].gst)}</span>
          </div>
        </div>`;
      resultsEl.appendChild(card);
    });

    grandTotalsEl.innerHTML = `
      <div class="glass rounded-2xl shadow-soft hover:shadow-lift transition-all duration-300 p-6 animate-fade-in">
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-12 h-12 rounded-full bg-green-500 bg-opacity-10 flex items-center justify-center">
            <span class="text-2xl">💰</span>
          </div>
          <h3 class="font-bold text-2xl text-gray-900 dark:text-white">Bill Summary</h3>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all">
            <div class="text-gray-500 dark:text-gray-400 text-sm font-medium">Subtotal</div>
            <div class="font-bold text-lg text-gray-900 dark:text-white">${currency(grand.subtotal)}</div>
          </div>
          <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all">
            <div class="text-gray-500 dark:text-gray-400 text-sm font-medium">Service</div>
            <div class="font-bold text-lg text-gray-900 dark:text-white">${currency(grand.service)}</div>
          </div>
          <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all">
            <div class="text-gray-500 dark:text-gray-400 text-sm font-medium">GST</div>
            <div class="font-bold text-lg text-gray-900 dark:text-white">${currency(grand.gst)}</div>
          </div>
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 border border-green-200 dark:border-green-700 rounded-xl p-4 hover:shadow-md transition-all">
            <div class="text-green-600 dark:text-green-400 text-sm font-medium">Grand Total</div>
            <div class="font-bold text-xl text-green-700 dark:text-green-300">${currency(grand.total)}</div>
          </div>
        </div>
      </div>
    `;

    // Save bill to history
    const billData = {
      people: [...people],
      items: items.map(i => ({ name: i.name, price: i.price, assigned: Array.from(i.assigned) })),
      shared: [...shared],
      settings: {
        servicePct: parseFloat(servicePctEl.value) || 0,
        gstEnabled: gstEnabledEl.checked,
        gstOnService: gstOnServiceEl.checked
      },
      currency: currentCurrency
    };
    saveBillToHistory(billData, grand);
    
    // Show history section
    const historySection = $$('#historySection');
    if (historySection) {
      historySection.classList.remove('hidden');
    }
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

  // OCR Functions using OCR.Space API
  async function processImageWithOCR(imageFile) {
    try {
      ocrProgress.classList.remove('hidden');
      ocrResults.classList.add('hidden');
      extractedItemsData = [];
      
      // Update progress UI
      ocrProgressBar.style.width = '20%';
      if (imageFile.size > 800 * 1024) {
        ocrStatus.textContent = 'Compressing for OCR (max 1MB)...';
      } else {
        ocrStatus.textContent = 'Converting image...';
      }
      
      // Convert image to base64 (with compression if needed)
      const base64Image = await fileToBase64(imageFile);
      
      ocrProgressBar.style.width = '40%';
      ocrStatus.textContent = 'Processing with OCR.Space API...';
      
      // Call our backend OCR endpoint
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Image
        })
      });
      
      ocrProgressBar.style.width = '80%';
      ocrStatus.textContent = 'Parsing bill items...';
      
      // Enhanced response handling with better error messages
      if (!response.ok) {
        let errorMessage = `OCR service error (${response.status})`;
        
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorResult.details || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, it might be an HTML error page
          const textResponse = await response.text();
          if (textResponse.includes('<html') || textResponse.includes('<!DOCTYPE')) {
            errorMessage = 'OCR service temporarily unavailable. Please try again in a moment.';
          } else {
            errorMessage = 'Unable to connect to OCR service. Please check your internet connection.';
          }
        }
        
        throw new Error(errorMessage);
      }
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse OCR response as JSON:', jsonError);
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (!result.success) {
        throw new Error(result.error || 'OCR processing failed');
      }
      
      ocrProgressBar.style.width = '100%';
      ocrStatus.textContent = 'Complete!';
      
      setTimeout(() => {
        ocrProgress.classList.add('hidden');
      }, 500);
      
      if (result.items && result.items.length > 0) {
        extractedItemsData = result.items;
        renderExtractedItems();
        ocrResults.classList.remove('hidden');
        showToast(`Found ${result.items.length} items in the bill!`, 'success');
        
        // Log debug info to console
        console.log('OCR Debug Info:', {
          extractedText: result.extractedText,
          originalLines: result.debug.originalLines,
          parsedItems: result.items
        });
      } else {
        showToast('No food items found in the image. Try a clearer photo of the bill.', 'warning', 4000);
      }
      
    } catch (error) {
      console.error('OCR Error:', error);
      ocrProgress.classList.add('hidden');
      showToast(`Error: ${error.message}`, 'error', 5000);
    }
  }
  
  // Helper function to convert file to base64 with compression
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      // Check file size - OCR.Space limit is 1MB, so target 800KB to be safe
      const maxSize = 800 * 1024; // 800KB
      
      if (file.size <= maxSize) {
        // Small file, no compression needed
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      } else {
        // Large file, compress it
        compressImage(file, maxSize)
          .then(resolve)
          .catch(reject);
      }
    });
  }
  
  // Image compression function for mobile photos
  function compressImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = function() {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        const maxDimension = 1280; // Max width/height (reduced for OCR)
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with 0.8 quality and reduce until we get under maxSize
        let quality = 0.8;
        
        const tryCompress = () => {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const sizeBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3/4);
          
          if (sizeBytes <= maxSize || quality <= 0.1) {
            console.log(`Compressed image: ${(file.size/1024/1024).toFixed(1)}MB → ${(sizeBytes/1024/1024).toFixed(1)}MB (${Math.round(quality*100)}% quality)`);
            resolve(dataUrl);
          } else {
            quality -= 0.1;
            setTimeout(tryCompress, 10); // Small delay to prevent blocking
          }
        };
        
        tryCompress();
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  }


  function renderExtractedItems() {
    extractedItems.innerHTML = '';
    
    extractedItemsData.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border';
      itemEl.innerHTML = `
        <div class="flex-1 mr-3">
          <input 
            type="text" 
            class="w-full bg-transparent border-none focus:outline-none font-medium text-gray-900 dark:text-white"
            value="${item.name}"
            data-index="${index}"
            data-field="name"
          />
        </div>
        <div class="flex items-center space-x-2">
          <input 
            type="number" 
            step="0.01" 
            min="0"
            class="w-20 px-2 py-1 text-right bg-gray-50 dark:bg-gray-600 rounded border text-gray-900 dark:text-white"
            value="${item.price}"
            data-index="${index}"
            data-field="price"
          />
          <button class="text-red-500 hover:text-red-600 p-1" data-index="${index}" data-action="remove">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      `;
      extractedItems.appendChild(itemEl);
    });
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

  // Service charge preset buttons
  $$$('.tip-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      servicePctEl.value = value;
      saveToURL();
      showToast(`Service charge set to ${value}%`, 'info', 2000);
    });
  });

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

  // Print button functionality
  const printBtn = $$('#printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', printBill);
  }

  // OCR Event Listeners
  uploadArea.addEventListener('click', () => billImageInput.click());
  
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-primary-400');
  });
  
  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-primary-400');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-primary-400');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  });

  billImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageUpload(e.target.files[0]);
    }
  });

  function handleImageUpload(file) {
    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }
    
    // Specifically check for supported formats
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      showToast(`Unsupported format: ${file.type}. Please use JPG, PNG, WEBP, GIF, or BMP.`, 'error');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // Process with OCR
    processImageWithOCR(file);
  }

  // Handle extracted items interactions
  extractedItems.addEventListener('click', (e) => {
    // Find the button element (could be the button itself or a child element like SVG)
    const button = e.target.closest('button[data-action="remove"]');
    
    if (button) {
      const index = parseInt(button.dataset.index);
      extractedItemsData.splice(index, 1);
      renderExtractedItems();
      
      if (extractedItemsData.length === 0) {
        ocrResults.classList.add('hidden');
      }
      
      showToast(`Item removed`, 'info', 2000);
    }
  });

  extractedItems.addEventListener('input', (e) => {
    const index = parseInt(e.target.dataset.index);
    const field = e.target.dataset.field;
    
    if (extractedItemsData[index]) {
      if (field === 'name') {
        extractedItemsData[index].name = e.target.value;
      } else if (field === 'price') {
        extractedItemsData[index].price = parseFloat(e.target.value) || 0;
      }
    }
  });

  addAllItemsBtn.addEventListener('click', () => {
    let added = 0;
    
    extractedItemsData.forEach(extractedItem => {
      if (extractedItem.name.trim() && extractedItem.price > 0) {
        items.push({
          id: id(),
          name: extractedItem.name.trim(),
          price: extractedItem.price,
          assigned: new Set()
        });
        added++;
      }
    });
    
    if (added > 0) {
      renderItems();
      saveToURL();
      
      // Clear OCR results
      ocrResults.classList.add('hidden');
      imagePreview.classList.add('hidden');
      extractedItemsData = [];
      billImageInput.value = '';
      
      showToast(`Added ${added} items to your bill!`, 'success');
    } else {
      showToast('No valid items to add', 'warning');
    }
  });

  clearExtractionBtn.addEventListener('click', () => {
    ocrResults.classList.add('hidden');
    imagePreview.classList.add('hidden');
    extractedItemsData = [];
    billImageInput.value = '';
    showToast('Cleared extracted items', 'info');
  });

  // Bill History Event Listeners
  document.addEventListener('click', (e) => {
    if (e.target.closest('.bill-history-item')) {
      const historyId = parseInt(e.target.closest('.bill-history-item').dataset.id);
      const historyItem = billHistory.find(h => h.id === historyId);
      if (historyItem && historyItem.data) {
        // Load the historical bill data
        people = historyItem.data.people || [];
        items = (historyItem.data.items || []).map(i => ({
          id: id(),
          name: i.name,
          price: i.price,
          assigned: new Set(i.assigned || [])
        }));
        shared = historyItem.data.shared || [];
        currentCurrency = historyItem.data.currency || 'MVR';
        if (historyItem.data.settings) {
          servicePctEl.value = historyItem.data.settings.servicePct ?? 10;
          gstEnabledEl.checked = !!historyItem.data.settings.gstEnabled;
          gstOnServiceEl.checked = !!historyItem.data.settings.gstOnService;
        }
        renderPeople();
        renderItems();
        renderShared();
        saveToURL();
        showToast('Bill loaded from history!', 'success');
      }
    }
  });

  // Clear history functionality
  const clearHistoryBtn = $$('#clearHistoryBtn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all bill history? This cannot be undone.')) {
        billHistory = [];
        localStorage.removeItem('rattehin_history');
        renderHistory();
        showToast('History cleared', 'info');
      }
    });
  }

  // Initialize app
  function initApp() {
    initDarkMode();
    loadFromURL();
    renderPeople();
    renderItems();
    renderShared();
    renderHistory();
    updateCopyrightYear();
    initPresetButtons();
    
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
  
  // Initialize preset buttons
  function initPresetButtons() {
    // Shared item preset buttons
    const sharedButtons = document.querySelectorAll('.shared-preset');
    console.log('Found shared preset buttons:', sharedButtons.length);
    sharedButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Shared preset clicked:', btn.dataset.name);
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        
        if (name && price) {
          console.log('Filling shared form with:', name, price);
          // Fill the form inputs (same as individual items)
          sharedNameEl.value = name;
          sharedPriceEl.value = price;
          // Focus on the form so user can see it's filled
          sharedNameEl.focus();
          showToast(`${name} ready to add - adjust price if needed!`, 'info');
          
          // Add animation feedback
          btn.classList.add('animate-bounce-gentle');
          setTimeout(() => btn.classList.remove('animate-bounce-gentle'), 800);
        }
      });
    });
    
    // Individual item preset buttons  
    const itemButtons = document.querySelectorAll('.item-preset');
    console.log('Found item preset buttons:', itemButtons.length);
    itemButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Item preset clicked:', btn.dataset.name);
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        
        if (name && price) {
          console.log('Filling form with:', name, price);
          // Fill the form inputs
          itemNameEl.value = name;
          itemPriceEl.value = price;
          // Focus on the form so user can see it's filled
          itemNameEl.focus();
          showToast(`${name} ready to add - assign to someone!`, 'info');
          
          // Add animation feedback
          btn.classList.add('animate-bounce-gentle');
          setTimeout(() => btn.classList.remove('animate-bounce-gentle'), 800);
        }
      });
    });
  }
  
  // Update copyright year dynamically
  function updateCopyrightYear() {
    const currentYearEl = $$('#currentYear');
    if (currentYearEl) {
      currentYearEl.textContent = new Date().getFullYear();
    }
  }
  
  // Start the app
  initApp();
})();
