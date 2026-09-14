const els = {
  perKmRate: document.getElementById('perKmRate'),
  waitMinuteRate: document.getElementById('waitMinuteRate'),
  baseFare: document.getElementById('baseFare'),
  minFare: document.getElementById('minFare'),
  privatePerKmRate: document.getElementById('privatePerKmRate'),
  privateWaitMinuteRate: document.getElementById('privateWaitMinuteRate'),
  privateBaseFare: document.getElementById('privateBaseFare'),
  privateMinFare: document.getElementById('privateMinFare'),
  sharedSeatFare: document.getElementById('sharedSeatFare'),
  rearSeatFare: document.getElementById('rearSeatFare'),
  fullCarFare: document.getElementById('fullCarFare'),
  interGovernorateSeatFare: document.getElementById('interGovernorateSeatFare'),
  interGovernorateCarFare: document.getElementById('interGovernorateCarFare'),
  governorateAirportFare: document.getElementById('governorateAirportFare'),
  governorateFare: document.getElementById('governorateFare'),
  capitalFare: document.getElementById('capitalFare'),
  companyCommissionRate: document.getElementById('companyCommissionRate'),
  captainRegistrationFee: document.getElementById('captainRegistrationFee'),
  promoCode: document.getElementById('promoCode'),
  promoAmount: document.getElementById('promoAmount'),
  promoCreateBtn: document.getElementById('promoCreateBtn'),
  promoRefreshBtn: document.getElementById('promoRefreshBtn'),
  promoMsg: document.getElementById('promoMsg'),
  promoList: document.getElementById('promoList'),
  capacityFare4: document.getElementById('capacityFare4'),
  capacityFare5: document.getElementById('capacityFare5'),
  capacityFare7: document.getElementById('capacityFare7'),
  jeepFare: document.getElementById('jeepFare'),
  southFare_Karak: document.getElementById('southFare_Karak'),
  southFare_Tafilah: document.getElementById('southFare_Tafilah'),
  southFare_Maan: document.getElementById('southFare_Maan'),
  southFare_Aqaba: document.getElementById('southFare_Aqaba'),
  paymentMethods: document.getElementById('paymentMethods'),
  supportWhatsApp: document.getElementById('supportWhatsApp'),
  adminKey: document.getElementById('adminKey'),
  saveBtn: document.getElementById('saveBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  msg: document.getElementById('msg'),
  meta: document.getElementById('meta'),
  statusPill: document.getElementById('statusPill'),
  sampleKm: document.getElementById('sampleKm'),
  sampleWait: document.getElementById('sampleWait'),
  preview: document.getElementById('preview'),
  walletRole: document.getElementById('walletRole'),
  walletAccountId: document.getElementById('walletAccountId'),
  walletAccountName: document.getElementById('walletAccountName'),
  walletAmount: document.getElementById('walletAmount'),
  walletNote: document.getElementById('walletNote'),
  sendWalletBtn: document.getElementById('sendWalletBtn'),
  walletRefreshBtn: document.getElementById('walletRefreshBtn'),
  walletMsg: document.getElementById('walletMsg'),
  walletList: document.getElementById('walletList'),
  captainsRefreshBtn: document.getElementById('captainsRefreshBtn'),
  captainsMsg: document.getElementById('captainsMsg'),
  captainsList: document.getElementById('captainsList'),
  customerPhoneSearch: document.getElementById('customerPhoneSearch'),
  customerSearchBtn: document.getElementById('customerSearchBtn'),
  customerSearchMsg: document.getElementById('customerSearchMsg'),
  customerResult: document.getElementById('customerResult'),
  supportRefreshBtn: document.getElementById('supportRefreshBtn'),
  supportAdminMsg: document.getElementById('supportAdminMsg'),
  supportList: document.getElementById('supportList'),
  tripSearchInput: document.getElementById('tripSearchInput'),
  tripSearchBtn: document.getElementById('tripSearchBtn'),
  tripSearchMsg: document.getElementById('tripSearchMsg'),
  tripResult: document.getElementById('tripResult'),
  adminRidesRefreshBtn: document.getElementById('adminRidesRefreshBtn'),
  adminRidesMsg: document.getElementById('adminRidesMsg'),
  adminRidesList: document.getElementById('adminRidesList'),
  withdrawRole: document.getElementById('withdrawRole'), withdrawPhone: document.getElementById('withdrawPhone'), withdrawAmount: document.getElementById('withdrawAmount'), withdrawBtn: document.getElementById('withdrawBtn'), withdrawMsg: document.getElementById('withdrawMsg'),
  usersRefreshBtn: document.getElementById('usersRefreshBtn'), usersMsg: document.getElementById('usersMsg'), usersList: document.getElementById('usersList'),
  usersSearch: document.getElementById('usersSearch'),
};

let currentConfig = null;

// نحتفظ بمفتاح الإدارة محلياً بالمتصفح بس (مش على السيرفر) عشان ما تعيد كتابته كل مرة
const savedKey = localStorage.getItem('darbak_admin_key');
if (savedKey) els.adminKey.value = savedKey;

function setStatus(ok) {
  els.statusPill.textContent = ok ? 'متصل بالسيرفر' : 'غير متصل بالسيرفر';
  els.statusPill.className = 'status-pill ' + (ok ? 'status-on' : 'status-off');
}

function showMsg(text, type) {
  els.msg.textContent = text;
  els.msg.className = 'msg ' + (type || '');
}

function updatePreview() {
  if (!currentConfig) return;
  const km = Number(els.sampleKm.value) || 0;
  const wait = Number(els.sampleWait.value) || 0;
  const { baseFare, perKmRate, waitMinuteRate, minFare } = currentConfig;
  const currency = currentConfig.currency || 'د.أ';
  const raw = baseFare + perKmRate * km + waitMinuteRate * wait;
  const total = Math.max(raw, minFare);
  els.preview.textContent =
    `الأجرة الأساسية: ${baseFare.toFixed(2)} ${currency}\n` +
    `${km} كم × ${perKmRate.toFixed(2)} = ${(km * perKmRate).toFixed(2)} ${currency}\n` +
    `${wait} دقيقة انتظار × ${waitMinuteRate.toFixed(2)} = ${(wait * waitMinuteRate).toFixed(2)} ${currency}\n` +
    `— — —\n` +
    `الإجمالي المتوقع للراكب: ${total.toFixed(2)} ${currency}`;
}

function renderPaymentMethods(methods = []) {
  els.paymentMethods.innerHTML = methods.map((method, index) => `
    <div class="grid payment-method-row" data-payment-index="${index}">
      <label class="field"><span>اسم الطريقة</span><input data-payment-field="label" value="${method.label || ''}"></label>
      <label class="field"><span>رقم التحويل / الوصف</span><input data-payment-field="account" value="${method.account || ''}"></label>
      <label class="field"><span>الحالة</span><select data-payment-field="enabled"><option value="true" ${method.enabled !== false ? 'selected' : ''}>مفعّلة</option><option value="false" ${method.enabled === false ? 'selected' : ''}>موقوفة</option></select></label>
      <input type="hidden" data-payment-field="id" value="${method.id || `method_${index}`}">
    </div>`).join('');
}

function readPaymentMethods() {
  return [...els.paymentMethods.querySelectorAll('[data-payment-index]')].map((row) => ({
    id: row.querySelector('[data-payment-field="id"]').value.trim(),
    label: row.querySelector('[data-payment-field="label"]').value.trim(),
    account: row.querySelector('[data-payment-field="account"]').value.trim(),
    enabled: row.querySelector('[data-payment-field="enabled"]').value === 'true',
  })).filter((method) => method.id && method.label);
}

async function loadPricing() {
  try {
    const res = await fetch('/api/pricing');
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    currentConfig = data;
    els.perKmRate.value = data.perKmRate;
    els.waitMinuteRate.value = data.waitMinuteRate;
    els.baseFare.value = data.baseFare;
    els.minFare.value = data.minFare;
    const pf = data.privateCarFare || {};
    els.privatePerKmRate.value = pf.perKmRate ?? data.perKmRate;
    els.privateWaitMinuteRate.value = pf.waitMinuteRate ?? data.waitMinuteRate;
    els.privateBaseFare.value = pf.baseFare ?? data.baseFare;
    els.privateMinFare.value = pf.minFare ?? data.minFare;
    els.sharedSeatFare.value = data.sharedSeatFare;
    els.rearSeatFare.value = data.rearSeatFare;
    els.fullCarFare.value = data.fullCarFare;
    els.interGovernorateSeatFare.value = data.interGovernorateSeatFare;
    els.interGovernorateCarFare.value = data.interGovernorateCarFare;
    els.governorateAirportFare.value = data.governorateAirportFare;
    els.governorateFare.value = data.governorateFare;
    els.capitalFare.value = data.capitalFare;
    els.companyCommissionRate.value = data.companyCommissionRate;
    els.captainRegistrationFee.value = data.captainRegistrationFee ?? 0;
    els.capacityFare4.value = data.capacityFares?.['4'] ?? 20;
    els.capacityFare5.value = data.capacityFares?.['5'] ?? 24;
    els.capacityFare7.value = data.capacityFares?.['7'] ?? 32;
    els.jeepFare.value = data.jeepFare ?? 35;
    const south = data.southFares || {};
    els.southFare_Karak.value = south['الكرك'] ?? 0;
    els.southFare_Tafilah.value = south['الطفيلة'] ?? 0;
    els.southFare_Maan.value = south['معان'] ?? 0;
    els.southFare_Aqaba.value = south['العقبة'] ?? 0;
    renderPaymentMethods(data.paymentMethods || []);
    els.supportWhatsApp.value = data.supportWhatsApp || '962790905611';
    els.meta.textContent = data.updatedAt
      ? `آخر تحديث: ${new Date(data.updatedAt).toLocaleString('ar-JO')} — بواسطة: ${data.updatedBy || '—'}`
      : '';
    setStatus(true);
    updatePreview();
  } catch (e) {
    setStatus(false);
    showMsg('تعذّر الاتصال بالسيرفر، تأكد إنه شغال', 'err');
  }
}

async function savePricing() {
  const body = {
    perKmRate: Number(els.perKmRate.value),
    waitMinuteRate: Number(els.waitMinuteRate.value),
    baseFare: Number(els.baseFare.value),
    minFare: Number(els.minFare.value),
    privateCarFare: {
      baseFare: Number(els.privateBaseFare.value),
      perKmRate: Number(els.privatePerKmRate.value),
      waitMinuteRate: Number(els.privateWaitMinuteRate.value),
      minFare: Number(els.privateMinFare.value),
    },
    sharedSeatFare: Number(els.sharedSeatFare.value),
    rearSeatFare: Number(els.rearSeatFare.value),
    fullCarFare: Number(els.fullCarFare.value),
    interGovernorateSeatFare: Number(els.interGovernorateSeatFare.value),
    interGovernorateCarFare: Number(els.interGovernorateCarFare.value),
    governorateAirportFare: Number(els.governorateAirportFare.value),
    governorateFare: Number(els.governorateFare.value),
    capitalFare: Number(els.capitalFare.value),
    companyCommissionRate: Number(els.companyCommissionRate.value),
    captainRegistrationFee: Number(els.captainRegistrationFee.value),
    capacityFares: {
      '4': Number(els.capacityFare4.value),
      '5': Number(els.capacityFare5.value),
      '7': Number(els.capacityFare7.value),
    },
    jeepFare: Number(els.jeepFare.value),
    southFares: {
      'الكرك': Number(els.southFare_Karak.value),
      'الطفيلة': Number(els.southFare_Tafilah.value),
      'معان': Number(els.southFare_Maan.value),
      'العقبة': Number(els.southFare_Aqaba.value),
    },
    paymentMethods: readPaymentMethods(),
    supportWhatsApp: els.supportWhatsApp.value.replace(/\D/g, ''),
    updatedBy: 'مسؤول غرفة التحكم',
  };

  if (Object.values(body).some((v) => typeof v === 'number' && isNaN(v))) {
    showMsg('تأكد إنك عبّيت كل الحقول بأرقام صحيحة', 'err');
    return;
  }

  const key = els.adminKey.value.trim();
  if (!key) {
    showMsg('لازم تدخل مفتاح الإدارة أول', 'err');
    return;
  }
  localStorage.setItem('darbak_admin_key', key);

  els.saveBtn.disabled = true;
  els.saveBtn.textContent = 'جارِ الحفظ...';

  try {
    const res = await fetch('/api/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
    currentConfig = data;
    showMsg('تم حفظ التسعيرة بنجاح ✅ رح تنعكس على التطبيقين فوراً', 'ok');
    els.meta.textContent = `آخر تحديث: ${new Date(data.updatedAt).toLocaleString('ar-JO')} — بواسطة: ${data.updatedBy}`;
    updatePreview();
  } catch (e) {
    showMsg(e.message || 'صار خطأ أثناء الحفظ', 'err');
  } finally {
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = 'حفظ التسعيرة';
  }
}

function renderWallets(accounts) {
  els.walletList.innerHTML = accounts.length
    ? accounts.map((account) => `<div class="wallet-row"><span>${account.accountName} <small>${account.accountId}</small></span><strong>${Number(account.balance).toFixed(2)} د.أ</strong></div>`).join('')
    : '<p class="meta">لا توجد أرصدة محفوظة لهذا النوع.</p>';
}

async function loadWallets() {
  try {
    const res = await fetch(`/api/wallets?role=${els.walletRole.value}`);
    if (!res.ok) throw new Error('تعذّر تحميل الأرصدة');
    renderWallets(await res.json());
  } catch (e) {
    els.walletMsg.textContent = e.message;
    els.walletMsg.className = 'msg err';
  }
}

async function sendWalletCredit() {
  const key = els.adminKey.value.trim();
  const amount = Number(els.walletAmount.value);
  if (!key) return showWalletMsg('أدخل مفتاح الإدارة أولًا', 'err');
  if (!els.walletAccountId.value.trim() || !Number.isFinite(amount) || amount <= 0) {
    return showWalletMsg('أدخل رقم الحساب وقيمة أكبر من صفر', 'err');
  }

  els.sendWalletBtn.disabled = true;
  try {
    const res = await fetch('/api/wallets/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({
        role: els.walletRole.value,
        phone: els.walletAccountId.value.trim(),
        accountName: els.walletAccountName.value.trim(),
        amount,
        note: els.walletNote.value.trim(),
        updatedBy: 'مسؤول غرفة التحكم',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل حفظ الرصيد');
    showWalletMsg(`تم حفظ الرصيد. الرصيد الحالي: ${data.balance.toFixed(2)} د.أ`, 'ok');
    els.walletAmount.value = '';
    els.walletNote.value = '';
    await loadWallets();
  } catch (e) {
    showWalletMsg(e.message || 'حدث خطأ أثناء حفظ الرصيد', 'err');
  } finally {
    els.sendWalletBtn.disabled = false;
  }
}

function showWalletMsg(text, type) {
  els.walletMsg.textContent = text;
  els.walletMsg.className = `msg ${type || ''}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderCaptains(captains) {
  const docLabels = { photo: 'صورة الكابتن', license: 'رخصة السيارة', drivingLicense: 'رخصة القيادة', identity: 'الهوية', clearance: 'عدم المحكومية', car: 'صورة السيارة' };
  els.captainsList.innerHTML = captains.length ? captains.map((captain) => `
    <div class="captain-review" data-id="${captain.id}">
      <div class="captain-review-head">
        ${captain.documents?.photo ? `<img src="${captain.documents.photo}" class="captain-avatar" />` : ''}
        <strong>${captain.name}</strong><span>${captain.phone} · ${captain.status}</span>
      </div>
      <p class="meta"><strong>السيارة:</strong> ${captain.vehicle?.carType || '—'} · ${captain.vehicle?.bodyType === 'jeep' ? 'جيب' : 'سيارة عادية'} · ${captain.vehicle?.capacity || '—'} ركاب · رقم: ${captain.vehicle?.carNumber || '—'}</p>
      <div class="document-grid">
        ${Object.keys(docLabels).map((key) => `<label class="document-upload"><span>${docLabels[key]}</span><input type="file" accept="image/*" data-doc="${key}" /><img src="${captain.documents?.[key] || ''}" data-preview="${key}" /></label>`).join('')}
      </div>
      <div class="grid"><label class="field"><span>فئة السيارة</span><select data-vehicle="category"><option value="">—</option>${[['private','خصوصي'],['taxi','تكسي'],['electric','كهرباء'],['shared','مشترك'],['airport','مطار']].map(([value,label])=>`<option value="${value}" ${captain.vehicle?.category===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>نوع السيارة</span><input data-vehicle="carType" value="${captain.vehicle?.carType || ''}" /></label><label class="field"><span>رقم السيارة</span><input data-vehicle="carNumber" value="${captain.vehicle?.carNumber || ''}" /></label><label class="field"><span>سعة السيارة</span><input data-vehicle="capacity" value="${captain.vehicle?.capacity || ''}" /></label></div>
      <div class="actions"><button class="btn-gold" data-action="save">حفظ التعديلات</button><button class="btn-gold" data-action="approve">قبول (موافقة على التسجيل)</button><button class="btn-ghost" data-action="reject">رفض</button></div>
      <p class="msg" data-message></p>
    </div>`).join('') : '<p class="meta">لا توجد طلبات كباتن معلقة.</p>';
  els.captainsList.querySelectorAll('.captain-review').forEach((card) => {
    card.querySelectorAll('input[type="file"]').forEach((input) => input.addEventListener('change', async () => {
      const image = await readFileAsDataUrl(input.files[0]);
      const preview = card.querySelector(`[data-preview="${input.dataset.doc}"]`);
      preview.src = image;
      preview.dataset.value = image;
    }));
    card.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => updateCaptain(card, button.dataset.action)));
  });
}

async function loadCaptains() {
  const key = els.adminKey.value.trim();
  if (!key) return showCaptainMsg('أدخل مفتاح الإدارة أولًا');
  try {
    const res = await fetch('/api/admin/captains/pending', { headers: { 'x-admin-key': key } });
    const data = await res.json();
    if (!res.ok) return showCaptainMsg(data.error || 'تعذّر تحميل الكباتن');
    renderCaptains(data);
    showCaptainMsg(data.length ? `يوجد ${data.length} طلب كابتن بانتظار المراجعة` : 'لا توجد طلبات جديدة حاليًا', 'ok');
  } catch (e) {
    showCaptainMsg('تعذّر الاتصال بالسيرفر');
  }
}

function showCaptainMsg(text, type = 'err') { els.captainsMsg.textContent = text; els.captainsMsg.className = `msg ${type}`; }

async function searchCustomer() {
  const key = els.adminKey.value.trim();
  const phone = els.customerPhoneSearch.value.replace(/\s+/g, '').trim();
  if (!key) return showCustomerMsg('أدخل مفتاح الإدارة أولًا');
  if (!phone) return showCustomerMsg('أدخل رقم الهاتف');
  const res = await fetch(`/api/admin/users/${encodeURIComponent(phone)}/history`, { headers: { 'x-admin-key': key } });
  const data = await res.json();
  if (!res.ok) return showCustomerMsg(data.error || 'تعذّر البحث');
  const roleLabel = data.user.role === 'captain' ? 'كابتن' : 'عميل';
  const transactions = (data.wallet.transactions || []).slice(0, 10).map((item) => `<div class="wallet-row"><span>${item.note || item.type}</span><strong>${Number(item.amount).toFixed(2)} د.أ</strong></div>`).join('');
  const rides = (data.rides || []).map((ride) => `<div class="wallet-row"><span>${ride.tripNumber || '—'} · ${ride.from || '—'} ← ${ride.to || '—'}<small>${ride.status || ''} · ${ride.createdAt ? new Date(ride.createdAt).toLocaleString('ar-JO') : ''}${data.user.role === 'captain' && ride.customerName ? ` · العميل: ${ride.customerName}` : ''}${data.user.role === 'customer' && ride.captainName ? ` · الكابتن: ${ride.captainName}` : ''}</small></span><strong>${Number(ride.price || 0).toFixed(2)} د.أ</strong></div>`).join('');
  const vehicle = data.user.vehicle;
  const profileDetails = `${vehicle ? `<p class="meta"><strong>المركبة:</strong> ${vehicle.carType || '—'} · ${vehicle.plateNumber || '—'} · السعة ${vehicle.capacity || '—'} ركاب</p>` : ''}${data.user.services?.length ? `<p class="meta"><strong>الخدمات:</strong> ${data.user.services.join('، ')}</p>` : ''}${data.user.location ? `<p class="meta"><strong>آخر موقع:</strong> ${Number(data.user.location.lat).toFixed(5)}, ${Number(data.user.location.lng).toFixed(5)}</p>` : ''}${data.user.documents ? `<p class="meta"><strong>الملفات:</strong> ${Object.entries(data.user.documents).filter(([, value]) => value).map(([key]) => key).join('، ') || 'لا توجد ملفات'}</p>` : ''}`;
  els.customerResult.innerHTML = `<div class="captain-review"><div class="captain-review-head"><strong>${data.user.name}</strong><span>${roleLabel} · ${data.user.phone} · ${data.user.status}</span></div><p class="meta">رقم الحساب: ${data.user.accountId || data.user.walletAccountId}</p>${profileDetails}<div class="preview">الرصيد الحالي: ${Number(data.wallet.balance || 0).toFixed(2)} د.أ</div><p class="meta"><strong>سجل الرحلات (${(data.rides || []).length}):</strong></p><div class="wallet-list">${rides || '<p class="meta">لا توجد رحلات.</p>'}</div><p class="meta"><strong>سجل المحفظة:</strong></p><div class="wallet-list">${transactions || '<p class="meta">لا توجد عمليات.</p>'}</div></div>`;
  showCustomerMsg('تم العثور على الحساب', 'ok');
}

function showCustomerMsg(text, type = 'err') { els.customerSearchMsg.textContent = text; els.customerSearchMsg.className = `msg ${type}`; }

async function loadSupportTickets() {
  const key = els.adminKey.value.trim();
  if (!key) return showSupportMsg('أدخل مفتاح الإدارة أولًا');
  const res = await fetch('/api/admin/support/tickets', { headers: { 'x-admin-key': key } });
  const data = await res.json();
  if (!res.ok) return showSupportMsg(data.error || 'تعذّر تحميل الشكاوى');
  els.supportList.innerHTML = data.length ? data.map((ticket) => `<div class="captain-review"><div class="captain-review-head"><strong>${ticket.subject}</strong><span>${ticket.userName} · ${ticket.role === 'captain' ? 'كابتن' : 'عميل'} · ${new Date(ticket.createdAt).toLocaleString('ar-JO')}</span></div><p>${ticket.message}</p><p class="meta">رقم الرحلة: ${ticket.tripNumber || 'غير محدد'} · الحالة: ${ticket.status === 'open' ? 'مفتوحة' : ticket.status}</p></div>`).join('') : '<p class="meta">لا توجد شكاوى حاليًا.</p>';
  showSupportMsg(`تم تحميل ${data.length} شكوى`, 'ok');
}

function showSupportMsg(text, type = 'err') { els.supportAdminMsg.textContent = text; els.supportAdminMsg.className = `msg ${type}`; }

async function searchTrip() {
  const key = els.adminKey.value.trim();
  const tripNumber = els.tripSearchInput.value.trim();
  if (!key) return showTripMsg('أدخل مفتاح الإدارة أولًا');
  if (!tripNumber) return showTripMsg('أدخل رقم الرحلة');
  const res = await fetch(`/api/admin/rides/${encodeURIComponent(tripNumber)}`, { headers: { 'x-admin-key': key } });
  const trip = await res.json();
  if (!res.ok) return showTripMsg(trip.error || 'الرحلة غير موجودة');
  const profileCard = (profile, label) => profile
    ? `<div class="preview"><strong>${label}</strong><br>${profile.name || '—'} · ${profile.phone || '—'}<br>الحالة: ${profile.status || '—'}${profile.role === 'captain' ? `<br>المركبة: ${profile.vehicle?.carType || '—'} · ${profile.vehicle?.plateNumber || '—'} · السعة ${profile.vehicle?.capacity || '—'} ركاب<br>الخدمات: ${(profile.services || []).join('، ') || '—'}` : ''}${profile.location ? `<br>آخر موقع: ${Number(profile.location.lat).toFixed(5)}, ${Number(profile.location.lng).toFixed(5)}` : ''}</div>`
    : `<div class="preview"><strong>${label}</strong><br>غير معيّن</div>`;
  els.tripResult.innerHTML = `<div class="captain-review"><div class="captain-review-head"><strong>${trip.tripNumber}</strong><span>${trip.status}</span></div><p>من: ${trip.from || '—'}</p><p>إلى: ${trip.to || '—'}</p>${profileCard(trip.customerProfile, 'معلومات العميل')}${profileCard(trip.captainProfile, 'معلومات الكابتن')}<div class="preview">الأجرة: ${Number(trip.price || 0).toFixed(2)} د.أ · المقاعد: ${trip.seats || 1}</div></div>`;
  showTripMsg('تم تحميل بيانات الرحلة', 'ok');
}

async function loadAdminRides() {
  const key = els.adminKey.value.trim();
  if (!key) return showAdminRidesMsg('أدخل مفتاح الإدارة أولًا');
  const res = await fetch('/api/admin/rides', { headers: { 'x-admin-key': key } });
  const rides = await res.json();
  if (!res.ok) return showAdminRidesMsg(rides.error || 'تعذّر تحميل سجل الرحلات');
  els.adminRidesList.innerHTML = rides.length
    ? rides.map((ride) => `<div class="wallet-row"><span><strong>${ride.tripNumber}</strong><small>${ride.customerProfile?.name || ride.customerName || '—'} · ${ride.customerProfile?.phone || ride.customerPhone || '—'}${ride.captainProfile ? ` · الكابتن: ${ride.captainProfile.name} (${ride.captainProfile.phone || '—'})` : ''}<br>${ride.from || '—'} ← ${ride.to || 'الوصول غير محدد'}<br>العميل: ${ride.customerProfile?.status || '—'} · الكابتن: ${ride.captainProfile?.status || 'غير معيّن'}</small></span><strong>${ride.status}</strong></div>`).join('')
    : '<p class="meta">لا توجد رحلات.</p>';
  showAdminRidesMsg(`تم تحميل ${rides.length} رحلة`, 'ok');
}

function showAdminRidesMsg(text, type = 'err') {
  els.adminRidesMsg.textContent = text;
  els.adminRidesMsg.className = `msg ${type}`;
}

function showTripMsg(text, type = 'err') { els.tripSearchMsg.textContent = text; els.tripSearchMsg.className = `msg ${type}`; }

async function withdrawBalance() {
  const res = await fetch('/api/wallets/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': els.adminKey.value.trim() }, body: JSON.stringify({ role: els.withdrawRole.value, phone: els.withdrawPhone.value.trim(), amount: Number(els.withdrawAmount.value), updatedBy: 'غرفة التحكم' }) });
  const data = await res.json(); els.withdrawMsg.textContent = res.ok ? `تم السحب. الرصيد الحالي: ${Number(data.balance).toFixed(2)} د.أ` : data.error; els.withdrawMsg.className = `msg ${res.ok ? 'ok' : 'err'}`;
}

let cachedUsers = [];

function renderUsers(users) {
  els.usersList.innerHTML = users.map((user) => `<div class="wallet-row"${user.status === 'archived' ? ' style="opacity:.55"' : ''}><span>${user.name} · ${user.role === 'captain' ? 'كابتن' : 'عميل'}<small>${user.phone}${user.status === 'pending' ? ' · بانتظار موافقة الإدارة' : user.status === 'archived' ? ' · مؤرشف' : user.status === 'blocked' ? ' · محظور' : ''}</small></span><span>${user.status === 'pending' && user.role === 'captain'
    ? `<button class="btn-gold" data-user-id="${user.id}" data-user-action="approve">موافقة</button> <button class="btn-ghost" data-user-id="${user.id}" data-user-action="reject">رفض</button>`
    : user.status === 'archived'
    ? `<button class="btn-ghost" data-user-id="${user.id}" data-user-action="restore">استرجاع</button>`
    : `<button class="btn-ghost" data-user-id="${user.id}" data-user-action="${user.status === 'blocked' ? 'unblock' : 'block'}">${user.status === 'blocked' ? 'فك الحظر' : 'حظر'}</button> <button class="btn-ghost" data-user-id="${user.id}" data-user-action="archive">أرشفة</button> <button class="btn-ghost" data-user-id="${user.id}" data-user-action="delete">حذف</button>`}</span></div>`).join('');
  els.usersList.querySelectorAll('[data-user-id]').forEach((button) => button.addEventListener('click', async () => {
    if (button.dataset.userAction === 'reject' && !confirm('رفض طلب تسجيل هذا الكابتن؟')) return;
    if (button.dataset.userAction === 'archive' && !confirm('أرشفة هذا الحساب؟ يمكن استرجاعه لاحقًا.')) return;
    if (button.dataset.userAction === 'delete' && !confirm('سيتم أرشفة الحساب مع حفظ بياناته وسجله، هل تريد المتابعة؟')) return;
    await fetch(`/api/admin/users/${button.dataset.userId}/${button.dataset.userAction}`, { method: 'POST', headers: { 'x-admin-key': els.adminKey.value.trim() } });
    loadUsers();
  }));
}

// الفلترة الحية أثناء الكتابة: بالاسم أو الهاتف، أو "كابتن"/"عميل" لعرض دور معين
function filterUsers() {
  const q = (els.usersSearch?.value || '').trim().toLowerCase();
  if (!q) return renderUsers(cachedUsers);
  const filtered = cachedUsers.filter((user) =>
    user.name.toLowerCase().includes(q) ||
    String(user.phone).includes(q) ||
    (q === 'كابتن' && user.role === 'captain') ||
    (q === 'عميل' && user.role === 'customer')
  );
  renderUsers(filtered);
}

async function loadUsers() {
  const res = await fetch('/api/admin/users', { headers: { 'x-admin-key': els.adminKey.value.trim() } }); const users = await res.json();
  if (!res.ok) { els.usersMsg.textContent = users.error; els.usersMsg.className = 'msg err'; return; }
  cachedUsers = users;
  filterUsers();
}

async function updateCaptain(card, action) {
  const key = els.adminKey.value.trim();
  const id = card.dataset.id;
  if (!key) return showCaptainMsg('أدخل مفتاح الإدارة أولًا');
  const message = card.querySelector('[data-message]');
  try {
    if (action === 'approve' || action === 'reject') {
      const res = await fetch(`/api/admin/captains/${id}/${action}`, { method: 'POST', headers: { 'x-admin-key': key } });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showCaptainMsg(action === 'approve' ? 'تم قبول الكابتن وتفعيل حسابه ✅' : 'تم رفض طلب الكابتن', 'ok');
        return loadCaptains();
      }
      return showCaptainMsg(data.error || 'تعذّر تحديث حالة الكابتن');
    }
    const documents = {};
    card.querySelectorAll('[data-preview]').forEach((image) => { if (image.dataset.value) documents[image.dataset.preview] = image.dataset.value; });
    const vehicle = {};
    card.querySelectorAll('[data-vehicle]').forEach((input) => { vehicle[input.dataset.vehicle] = input.value; });
    const res = await fetch(`/api/admin/captains/${id}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: JSON.stringify({ documents, vehicle }) });
    const data = await res.json();
    message.textContent = res.ok ? 'تم حفظ بيانات وصور الكابتن' : data.error;
    message.className = `msg ${res.ok ? 'ok' : 'err'}`;
  } catch (e) {
    if (message) { message.textContent = 'تعذّر الاتصال بالسيرفر'; message.className = 'msg err'; }
  }
}

els.saveBtn.addEventListener('click', savePricing);
els.refreshBtn.addEventListener('click', loadPricing);
els.sampleKm.addEventListener('input', updatePreview);
els.sampleWait.addEventListener('input', updatePreview);
els.sendWalletBtn.addEventListener('click', sendWalletCredit);
els.walletRefreshBtn.addEventListener('click', loadWallets);
els.walletRole.addEventListener('change', loadWallets);
els.captainsRefreshBtn.addEventListener('click', loadCaptains);
els.customerSearchBtn.addEventListener('click', searchCustomer);
els.supportRefreshBtn.addEventListener('click', loadSupportTickets);
els.tripSearchBtn.addEventListener('click', searchTrip);
els.adminRidesRefreshBtn.addEventListener('click', loadAdminRides);
els.withdrawBtn.addEventListener('click', withdrawBalance); els.usersRefreshBtn.addEventListener('click', loadUsers);
els.usersSearch?.addEventListener('input', filterUsers);

// ===== الرموز الترويجية =====

function showPromoMsg(text, type = 'err') { els.promoMsg.textContent = text; els.promoMsg.className = `msg ${type}`; }

function renderPromos(codes) {
  els.promoList.innerHTML = codes.length ? codes.map((promo) => `
    <div class="wallet-row">
      <span>${promo.code} <small>${promo.amount} د.أ · ${promo.active ? 'متاح' : 'مستخدم/موقوف'}${promo.redeemedBy ? ` · استخدمه ${promo.redeemedBy}` : ''}</small></span>
      <button class="btn-ghost" data-promo-code="${promo.code}">${promo.active ? 'إيقاف' : 'إعادة تفعيل'}</button>
    </div>`).join('') : '<p class="meta">لا توجد رموز ترويجية بعد.</p>';
  els.promoList.querySelectorAll('[data-promo-code]').forEach((button) => button.addEventListener('click', async () => {
    const res = await fetch(`/api/admin/promos/${button.dataset.promoCode}/toggle`, { method: 'POST', headers: { 'x-admin-key': els.adminKey.value.trim() } });
    const data = await res.json();
    if (!res.ok) return showPromoMsg(data.error || 'تعذّر التعديل');
    renderPromos(data);
    showPromoMsg('تم تحديث حالة الرمز', 'ok');
  }));
}

async function loadPromos() {
  const key = els.adminKey.value.trim();
  if (!key) return showPromoMsg('أدخل مفتاح الإدارة أولًا');
  const res = await fetch('/api/admin/promos', { headers: { 'x-admin-key': key } });
  const data = await res.json();
  if (!res.ok) return showPromoMsg(data.error || 'تعذّر تحميل الرموز');
  renderPromos(data);
  showPromoMsg(`تم تحميل ${data.length} رمز`, 'ok');
}

async function createPromo() {
  const key = els.adminKey.value.trim();
  if (!key) return showPromoMsg('أدخل مفتاح الإدارة أولًا');
  const code = els.promoCode.value.trim();
  const amount = Number(els.promoAmount.value);
  if (!code || !Number.isFinite(amount) || amount <= 0) return showPromoMsg('أدخل رمزًا وقيمة أكبر من صفر');
  const res = await fetch('/api/admin/promos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': key }, body: JSON.stringify({ code, amount }) });
  const data = await res.json();
  if (!res.ok) return showPromoMsg(data.error || 'تعذّر إنشاء الرمز');
  els.promoCode.value = '';
  els.promoAmount.value = '';
  renderPromos(data);
  showPromoMsg(`تم إنشاء الرمز بنجاح ✅`, 'ok');
}

els.promoCreateBtn.addEventListener('click', createPromo);
els.promoRefreshBtn.addEventListener('click', loadPromos);

loadPricing();
loadWallets();
loadCaptains();
