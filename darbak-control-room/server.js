const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { syncRides, loadRides, persistState, loadPersistentState, hasPersistentStore } = require('../db');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'darbak-2026';

// مسارات ملفات البيانات
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'nashmi-data') : path.join(__dirname, 'data');
const PRICING_FILE = path.join(DATA_DIR, 'pricing.json');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');
const TOPUPS_FILE = path.join(DATA_DIR, 'topups.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RIDES_FILE = path.join(DATA_DIR, 'rides.json');
const PROMOS_FILE = path.join(DATA_DIR, 'promos.json');
const SUPPORT_FILE = path.join(DATA_DIR, 'support.json');
const DATA_FILES = {
  pricing: PRICING_FILE,
  wallets: WALLETS_FILE,
  topups: TOPUPS_FILE,
  users: USERS_FILE,
  rides: RIDES_FILE,
  promos: PROMOS_FILE,
  support: SUPPORT_FILE,
};

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const publicRoot = path.join(__dirname, 'public');

app.use(express.static(publicRoot));

const serveHtmlPage = (fileName, route) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(publicRoot, fileName));
  });
};

serveHtmlPage('index.html', '/');
serveHtmlPage('passenger.html', '/passenger');
serveHtmlPage('captain.html', '/captain');
serveHtmlPage('control-room.html', '/control-room');
serveHtmlPage('download.html', '/download');

// دالات القراءة والكتابة — تتعامل بأمان إذا الملف مش موجود أو فيه JSON تالف
const readData = (file, fallback) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed && typeof parsed === 'object' ? parsed : { ...fallback };
  } catch {
    try {
      const bundledFile = path.join(__dirname, 'data', path.basename(file));
      const parsed = JSON.parse(fs.readFileSync(bundledFile, 'utf-8'));
      return parsed && typeof parsed === 'object' ? parsed : (fallback ? { ...fallback } : {});
    } catch {
      return fallback ? { ...fallback } : {};
    }
  }
};
const writeData = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file); // كتابة آمنة: ما بتعطش ملف نصّاً لو انقطعت بنص الكتابة
  if (file === RIDES_FILE && Array.isArray(data.rides)) {
    syncRides(data.rides).catch(error => console.error('[database rides sync]', error));
  }
  const dataKey = Object.entries(DATA_FILES).find(([, filePath]) => filePath === file)?.[0];
  if (dataKey) {
    persistState(dataKey, data).catch(error => console.error(`[database ${dataKey} sync]`, error));
  }
};

// ضمان الشكل الافتراضي على كل قراءة — يمنع undefined.users / undefined.captains
function loadFile(file) {
  const data = readData(file, SCHEMAS[file] || {});
  return ensureShape(file, data);
}

// شكل افتراضي آمن لكل ملف — يمنع undefined.users / undefined.captains
const SCHEMAS = {
  [PRICING_FILE]: {
    baseFare: 0,
    perKmRate: 0,
    waitMinuteRate: 0,
    minFare: 0,
    currency: 'د.أ',
    companyCommissionRate: 0,
    paymentMethods: [
      { id: 'orange_money', label: 'Orange Money', account: '0790905611', enabled: true },
      { id: 'zain_cash', label: 'Zain Cash', account: '0790905611', enabled: true },
      { id: 'card', label: 'Visa / بطاقة', account: 'شراء رصيد', enabled: true },
    ],
  },
  [WALLETS_FILE]: { captains: [], customers: [], transactions: [] },
  [TOPUPS_FILE]: { requests: [] },
  [USERS_FILE]: { users: [], sessions: [] },
  [RIDES_FILE]: { rides: [] },
  [PROMOS_FILE]: { promos: [] },
  [SUPPORT_FILE]: { tickets: [] },
};
const readSafe = (file) => readData(file, SCHEMAS[file] || {});

// دمج الشكل الافتراضي مع البيانات القديمة إذا ناقصة مفاتيح
function ensureShape(file, data) {
  const shape = SCHEMAS[file] || {};
  for (const key of Object.keys(shape)) {
    if (data[key] === undefined) data[key] = shape[key];
  }
  return data;
}

// قيمة رقمية آمنة — تمنع NaN بالأرصدة
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => Math.round(n * 100) / 100;

function distanceBetweenLocations(from, to) {
  if (!from || !to) return null;
  const lat1 = safeNumber(from.lat, NaN);
  const lng1 = safeNumber(from.lng, NaN);
  const lat2 = safeNumber(to.lat, NaN);
  const lng2 = safeNumber(to.lng, NaN);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const radians = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * radians / 2) ** 2
    + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin((lng2 - lng1) * radians / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateRidePrice(pricing, serviceType, distanceKm) {
  const fixedFare = serviceType === 'jeep'
    ? safeNumber(pricing.jeepFare, 0)
    : serviceType === 'airport'
      ? safeNumber(pricing.governorateAirportFare, 0)
      : 0;
  const fareConfig = serviceType === 'private' || serviceType === 'electric'
    ? (pricing.privateCarFare || {})
    : pricing;
  const distanceFare = safeNumber(fareConfig.baseFare, 0) + safeNumber(fareConfig.perKmRate, 0) * distanceKm;
  return round2(Math.max(safeNumber(pricing.minFare, 0), fixedFare, distanceFare));
}

// قفل بسيط لمنع تضارب الكتابة بين الطلبات المتزامنة — مع معالجة أخطاء بدل ما يعلّق الطلب
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn).catch((err) => {
    console.error(`[lock:${key}]`, err);
  });
  locks.set(key, next);
  return next;
}

// دالات التشفير والمساعدة
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function isPasswordValid(password, user) {
  if (!user || !user.passwordSalt || !user.passwordHash) return false;
  const hash = crypto.scryptSync(String(password), user.passwordSalt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(user.passwordHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return digits;
  return '';
}

function samePhone(left, right) {
  const normalizedLeft = normalizePhone(left);
  const normalizedRight = normalizePhone(right);
  return Boolean(normalizedLeft && normalizedLeft === normalizedRight);
}

function isJeepElectricEligible(vehicle) {
  return vehicle?.bodyType === 'jeep'
    && vehicle?.electric === true
    && Number(vehicle?.capacity || 0) > 4;
}

function publicUser(user) {
  return {
    id: user.id,
    accountId: user.walletAccountId,
    role: user.role,
    name: user.name,
    phone: user.phone,
    status: user.status,
    walletAccountId: user.walletAccountId,
    available: user.role === 'captain' ? user.available !== false : undefined,
    services: user.role === 'captain'
      ? (user.services || ['private', 'shared', 'electric', 'airport', 'shared_intra'])
        .filter(service => service !== 'electric' || user.vehicle?.electric === true)
        .filter(service => service !== 'shared_intercity')
        .filter(service => service !== 'jeep_electric' || isJeepElectricEligible(user.vehicle))
      : undefined,
    vehicle: user.vehicle,
    documents: user.documents,
  };
}

function adminUserProfile(user) {
  if (!user) return null;
  return {
    ...publicUser(user),
    createdAt: user.createdAt,
    reviewedAt: user.reviewedAt,
    location: user.location || null,
  };
}

function enrichRideForAdmin(ride) {
  const users = loadFile(USERS_FILE);
  const customer = users.users.find(item => item.id === ride.customerId);
  const captain = users.users.find(item => item.id === ride.captainId);
  return {
    ...ride,
    customerProfile: adminUserProfile(customer),
    captainProfile: adminUserProfile(captain),
  };
}

function enrichRideForUser(ride, user) {
  const users = loadFile(USERS_FILE);
  const customer = users.users.find(item => item.id === ride.customerId);
  const captain = users.users.find(item => item.id === ride.captainId);
  const result = { ...ride };
  if (user.role === 'customer' && captain) {
    result.captain = {
      name: captain.name,
      phone: captain.phone,
      vehicle: captain.vehicle,
      photo: captain.documents?.photo || '',
    };
    if (['assigned', 'started'].includes(ride.status)) result.startCode = ride.startCode;
  }
  if (user.role === 'captain' && customer) {
    result.customer = { name: customer.name, phone: customer.phone };
    delete result.startCode;
  }
  return result;
}

function getAuthenticatedUser(req) {
  const token = String(req.header('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const users = loadFile(USERS_FILE);
  const session = users.sessions.find(s => s.token === token);
  return session && users.users.find(u => u.id === session.userId);
}

const isAdmin = (req) => req.header('x-admin-key') === ADMIN_KEY;

// المسارات (Routes)
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.status !== 'approved') return res.status(401).json({ error: 'الجلسة غير صالحة' });
  res.json({ user: publicUser(user) });
});

// التسعيرة
app.get('/api/pricing', (req, res) => res.json(loadFile(PRICING_FILE)));

app.post('/api/rides/estimate', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'customer') return res.status(401).json({ error: 'يلزم دخول العميل' });
  const distanceKm = distanceBetweenLocations(req.body?.pickupLocation, req.body?.destinationLocation);
  if (distanceKm === null) return res.status(400).json({ error: 'أرسل إحداثيات الانطلاق والوجهة' });
  const serviceType = String(req.body?.serviceType || 'private');
  const price = estimateRidePrice(loadFile(PRICING_FILE), serviceType, distanceKm);
  res.json({ distanceKm: round2(distanceKm), price, currency: loadFile(PRICING_FILE).currency || 'د.أ' });
});

app.put('/api/pricing', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const updated = { ...req.body, updatedAt: new Date().toISOString() };
  writeData(PRICING_FILE, updated);
  res.json(updated);
});

// المحفظة
app.get('/api/wallets/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  const wallets = loadFile(WALLETS_FILE);
  const account = wallets[`${user.role}s`].find(a => samePhone(a.accountId, user.walletAccountId));
  const rides = loadFile(RIDES_FILE).rides || [];
  const completed = rides.filter(ride => ride.captainId === user.id && ride.status === 'completed');
  res.json({
    ...(account || { balance: 0, transactions: [] }),
    stats: {
      ordersValue: round2(completed.reduce((sum, ride) => sum + safeNumber(ride.price, 0), 0)),
      kilometers: round2(completed.reduce((sum, ride) => sum + safeNumber(ride.distanceKm, 0), 0)),
      onlineMinutes: Math.round(completed.reduce((sum, ride) => sum + (ride.onlineMinutes || 0), 0)),
    },
  });
});

app.post('/api/wallets/topup-request', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  const amount = Number(req.body?.amount);
  const method = String(req.body?.method || '');
  const paymentMethod = (loadFile(PRICING_FILE).paymentMethods || []).find(item => item.id === method && item.enabled !== false);
  if (!paymentMethod || !Number.isFinite(amount) || amount < 1 || amount > 500) {
    return res.status(400).json({ error: 'اختر طريقة صحيحة وأدخل مبلغًا بين 1 و500 دينار' });
  }
  const topups = loadFile(TOPUPS_FILE);
  const request = {
    id: crypto.randomUUID(),
    captainId: user.id,
    accountId: user.walletAccountId,
    captainName: user.name,
    phone: user.phone,
    amount: round2(amount),
    method,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  topups.requests.unshift(request);
  writeData(TOPUPS_FILE, topups);
  res.status(201).json(request);
});

// الرحلات
app.post('/api/rides', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'customer') return res.status(401).json({ error: 'يلزم دخول العميل' });
  if (req.body?.serviceType === 'shared_intercity') {
    return res.status(409).json({ error: 'خدمة المشترك خارج المحافظات قيد التجهيز — Coming soon' });
  }
  // منع الرحلات المتكررة: ما بقبلش عميل عنده رحلة نشطة
  const mine = loadFile(RIDES_FILE).rides.filter(r => r.customerId === user.id && ['searching', 'assigned', 'started'].includes(r.status));
  if (mine.length) return res.status(409).json({ error: 'عندك رحلة نشطة، خلّصها أو ألغِها أولاً' });

  withLock('rides', () => {
    try {
      const rides = loadFile(RIDES_FILE);
      if (!Array.isArray(rides.rides)) rides.rides = [];
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const rideType = body.rideType === 'intercity' ? 'intercity' : 'intra';
      const serviceType = ['private', 'shared', 'electric', 'airport', 'shared_intra', 'shared_intercity', 'jeep', 'jeep_electric'].includes(body.serviceType)
        ? body.serviceType
        : (body.airportRequest ? 'airport' : body.vehicleType === 'private' ? 'private' : rideType === 'intercity' ? 'shared_intercity' : 'shared_intra');
      if (serviceType === 'shared_intercity') {
        return res.status(409).json({ error: 'خدمة المشترك خارج المحافظات قيد التجهيز — Coming soon' });
      }
      const vehicleType = serviceType === 'private' || serviceType === 'electric' ? 'private' : 'shared';
      const pricing = loadFile(PRICING_FILE);
      const requestedPrice = safeNumber(body.price, 0);
      const configuredFare = serviceType === 'jeep'
        ? safeNumber(pricing.jeepFare, 0)
        : body.airportRequest ? safeNumber(pricing.governorateAirportFare, 0) : 0;
      const distanceKm = distanceBetweenLocations(body.pickupLocation, body.destinationLocation);
      const basePrice = Math.max(safeNumber(pricing.minFare, 0), configuredFare);
      const price = requestedPrice > 0 ? requestedPrice : (distanceKm === null ? basePrice : estimateRidePrice(pricing, serviceType, distanceKm));
      const wallets = loadFile(WALLETS_FILE);
      if (!Array.isArray(wallets.customers)) wallets.customers = [];
      const customerWallet = wallets.customers.find(account => account.accountId === user.walletAccountId);
      const walletBalance = safeNumber(customerWallet?.balance, 0);
      const walletDebit = walletBalance > 0 ? round2(Math.min(walletBalance, price)) : 0;
      if (customerWallet && walletDebit > 0) {
        customerWallet.balance = round2(walletBalance - walletDebit);
        if (!Array.isArray(customerWallet.transactions)) customerWallet.transactions = [];
        customerWallet.transactions.unshift({
          type: 'debit',
          amount: -walletDebit,
          note: 'خصم من قيمة الرحلة',
          createdAt: new Date().toISOString(),
        });
      }
      const trip = {
        ...body,
        rideType,
        serviceType,
        vehicleType,
        airportRequest: Boolean(body.airportRequest),
        seats: Math.max(1, Math.floor(safeNumber(body.seats, 1))),
        tripNumber: `NR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        customerId: user.id, customerName: user.name, customerPhone: user.phone,
        targetCaptainId: body.targetCaptainId || null,
        price,
        distanceKm: distanceKm === null ? undefined : round2(distanceKm),
        walletDebit,
        remainingDue: round2(Math.max(0, price - walletDebit)),
        startCode: String(crypto.randomInt(1000, 10000)),
        status: 'searching', createdAt: new Date().toISOString(),
        offerCaptainId: null, offerExpiresAt: null, offerAttemptedCaptainIds: []
      };
      // body ما بيقدرش يطغى على الحقول المهمة (نترتيب المفاتيح بعد ...body)
      refreshRideOffer(trip, rides);
      rides.rides.unshift(trip);
      writeData(RIDES_FILE, rides);
      if (customerWallet && walletDebit > 0) writeData(WALLETS_FILE, wallets);
      res.status(201).json(trip);
    } catch (err) {
      console.error('[create ride]', err);
      if (!res.headersSent) res.status(500).json({ error: 'تعذر إنشاء الرحلة، حاول مرة ثانية' });
    }
  });
});

const OFFER_WINDOW_MS = 10000;
const CAPTAIN_ONLINE_WINDOW_MS = 60000;

function isCaptainOnline(captain) {
  const updatedAt = captain.location?.updatedAt ? new Date(captain.location.updatedAt).getTime() : 0;
  return Number.isFinite(updatedAt) && Date.now() - updatedAt <= CAPTAIN_ONLINE_WINDOW_MS;
}

function nextCaptainForRide(ride, rides) {
  const users = loadFile(USERS_FILE);
  const busy = new Set(rides.rides
    .filter(item => ['assigned', 'started'].includes(item.status))
    .map(item => item.captainId));
  const attempted = new Set(ride.offerAttemptedCaptainIds || []);
  const candidates = users.users.filter(captain => {
    if (captain.role !== 'captain' || captain.status !== 'approved' || captain.available === false || !isCaptainOnline(captain)) return false;
    if (busy.has(captain.id) || attempted.has(captain.id)) return false;
    if (ride.targetCaptainId && ride.targetCaptainId !== captain.id) return false;
    const services = captain.services || ['private', 'shared', 'electric', 'airport', 'shared_intra'];
    if (ride.serviceType === 'jeep' && (captain.vehicle?.bodyType !== 'jeep' || Number(captain.vehicle?.capacity || 0) < 1 || Number(captain.vehicle?.capacity || 0) > 6)) return false;
    if (ride.serviceType === 'jeep_electric' && !isJeepElectricEligible(captain.vehicle)) return false;
    if (ride.serviceType === 'electric' && captain.vehicle?.electric !== true) return false;
    if (ride.serviceType && !services.includes(ride.serviceType) && !(ride.serviceType === 'shared_intra' && services.includes('shared')) && !(ride.serviceType === 'shared_intercity' && services.includes('shared'))) return false;
    return true;
  });
  const pickup = ride.pickupLocation;
  if (pickup && Number.isFinite(Number(pickup.lat)) && Number.isFinite(Number(pickup.lng))) {
    const distance = captain => {
      const location = captain.location;
      if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return Number.POSITIVE_INFINITY;
      const lat1 = Number(pickup.lat) * Math.PI / 180;
      const lat2 = Number(location.lat) * Math.PI / 180;
      const dLat = (Number(location.lat) - Number(pickup.lat)) * Math.PI / 180;
      const dLng = (Number(location.lng) - Number(pickup.lng)) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    candidates.sort((a, b) => distance(a) - distance(b));
  }
  return candidates[0] || null;
}

function refreshRideOffer(ride, rides) {
  const now = Date.now();
  if (ride.status !== 'searching') return false;
  if (ride.offerCaptainId && ride.offerExpiresAt && new Date(ride.offerExpiresAt).getTime() > now) return false;
  if (ride.offerCaptainId) {
    ride.offerAttemptedCaptainIds = [...new Set([...(ride.offerAttemptedCaptainIds || []), ride.offerCaptainId])];
  }
  const captain = nextCaptainForRide(ride, rides);
  ride.offerCaptainId = captain?.id || null;
  ride.offerExpiresAt = captain ? new Date(now + OFFER_WINDOW_MS).toISOString() : null;
  ride.offerAssignedAt = captain ? new Date(now).toISOString() : null;
  return true;
}

// الطلبات المسبقة: كل رحلة تُعرض لكابتن واحد فقط لمدة 10 ثوانٍ ثم تنتقل تلقائيًا.
app.get('/api/rides/available', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'يلزم الدخول' });
  const rides = loadFile(RIDES_FILE);
  if (!Array.isArray(rides.rides)) rides.rides = [];
  let changed = false;
  const available = rides.rides.filter(r => {
      if (r.status !== 'searching') return false;
      if (user.role === 'captain') {
        changed = refreshRideOffer(r, rides) || changed;
        return r.offerCaptainId === user.id;
      }
      return true;
  });
  if (changed) writeData(RIDES_FILE, rides);
  res.json(available.map(ride => enrichRideForUser(ride, user)));
});

app.get('/api/captains/available', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'customer') return res.status(401).json({ error: 'يلزم دخول العميل' });
  const users = loadFile(USERS_FILE);
  const rides = loadFile(RIDES_FILE).rides;
  const busy = new Set(rides.filter(ride => ['assigned', 'started'].includes(ride.status)).map(ride => ride.captainId));
  const requestedService = String(req.query.service || '');
  const captains = users.users
      .filter(captain => captain.role === 'captain' && captain.status === 'approved' && captain.available !== false && isCaptainOnline(captain) && !busy.has(captain.id))
      .filter(captain => {
        if (!requestedService) return true;
        const services = captain.services || ['private', 'shared', 'electric', 'airport', 'shared_intra'];
        if (requestedService === 'electric' && captain.vehicle?.electric !== true) return false;
        if (requestedService === 'jeep_electric' && !isJeepElectricEligible(captain.vehicle)) return false;
        return services.includes(requestedService) || (requestedService.startsWith('shared_') && services.includes('shared'));
      })
      .map(captain => ({
        id: captain.id,
        name: captain.name,
        phone: captain.phone,
        available: captain.available !== false,
        vehicle: captain.vehicle,
        photo: captain.documents?.photo || '',
        services: (captain.services || ['private', 'shared', 'electric', 'airport', 'shared_intra'])
          .filter(service => service !== 'electric' || captain.vehicle?.electric === true)
          .filter(service => service !== 'shared_intercity')
          .filter(service => service !== 'jeep_electric' || isJeepElectricEligible(captain.vehicle)),
      }));
  res.json(captains);
});

app.get('/api/rides/mine', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  const rides = loadFile(RIDES_FILE);
  if (!Array.isArray(rides.rides)) rides.rides = [];
  let mine = rides.rides.filter(r => user.role === 'customer' ? r.customerId === user.id && ['searching', 'assigned', 'started', 'completed'].includes(r.status) : r.captainId === user.id && ['assigned', 'started'].includes(r.status));
  // الرحلة المكتملة تبقى ظاهرة عند الكابتن حتى يوافق العميل (عشان ما ينسى قيمة الطلب)
  if (user.role === 'captain') {
    const acknowledged = new Set(rides.rides.filter(r => r.captainId === user.id && r.status === 'completed' && r.customerAcknowledgedAt).map(r => r.tripNumber));
    const recentCompleted = rides.rides.filter(r => r.captainId === user.id && r.status === 'completed' && !acknowledged.has(r.tripNumber));
    return res.json([...mine, ...recentCompleted].map(ride => enrichRideForUser(ride, user)));
  }
  // عند العميل: بعد موافقته على القيمة تختفي الرحلة من الصفحة الرئيسية — تبقى بس في سجل الرحلات
  mine = mine.filter(r => !(r.status === 'completed' && r.customerAcknowledgedAt));
  res.json(mine.map(ride => enrichRideForUser(ride, user)));
});

// موافقة العميل على قيمة الرحلة المكتملة — بعدها تختفي من الواجهتين
app.post('/api/rides/:tripNumber/acknowledge', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'customer') return res.status(401).json({ error: 'يلزم دخول العميل' });
  withLock('rides', () => {
    const rides = loadFile(RIDES_FILE);
    const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
    if (!trip || trip.customerId !== user.id) return res.status(404).json({ error: 'الرحلة غير موجودة لحسابك' });
    if (trip.status !== 'completed') return res.status(409).json({ error: 'يمكن الموافقة على الرحلة بعد إنهائها' });
    trip.customerAcknowledgedAt = new Date().toISOString();
    writeData(RIDES_FILE, rides);
    res.json({ ok: true });
  });
});

app.get('/api/rides/history', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  const rides = loadFile(RIDES_FILE);
  if (!Array.isArray(rides.rides)) rides.rides = [];
  const mine = rides.rides.filter(r => user.role === 'customer' ? r.customerId === user.id : r.captainId === user.id);
  res.json(mine.filter(r => ['completed', 'cancelled'].includes(r.status)));
});

app.post('/api/rides/:tripNumber/assign', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  withLock('rides', () => {
    try {
      const rides = loadFile(RIDES_FILE);
      const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
      if (!trip || trip.status !== 'searching') return res.status(409).json({ error: 'غير متاحة — ممكن حجزها كابتن ثاني' });
      if (trip.targetCaptainId && trip.targetCaptainId !== user.id) return res.status(403).json({ error: 'هذا الطلب موجّه إلى كابتن آخر' });
      if (trip.offerCaptainId !== user.id || !trip.offerExpiresAt || new Date(trip.offerExpiresAt).getTime() <= Date.now()) {
        return res.status(409).json({ error: 'انتهت مهلة الطلب، انتظر انتقاله لكابتن آخر' });
      }
      const captainWallets = loadFile(WALLETS_FILE);
      const captainWallet = captainWallets.captains.find(account => account.accountId === user.walletAccountId);
      if (safeNumber(captainWallet?.balance, 0) < -1) {
        return res.status(403).json({ error: 'رصيد محفظتك أقل من الحد المسموح لاستقبال الطلبات (-1 د.أ)' });
      }
      const activeTrips = rides.rides.filter(r => r.captainId === user.id && ['assigned', 'started'].includes(r.status));
      if (trip.vehicleType === 'private' && activeTrips.length) {
        return res.status(409).json({ error: 'السيارة الخاصة لا تستقبل طلبًا آخر قبل انتهاء الرحلة الحالية' });
      }
      if (trip.vehicleType === 'shared') {
        const capacity = Math.max(1, Math.floor(safeNumber(user.vehicle?.capacity, 4)));
        const occupied = activeTrips.filter(r => r.vehicleType === 'shared').reduce((sum, r) => sum + Math.max(1, Number(r.seats) || 1), 0);
        if (occupied + Math.max(1, Number(trip.seats) || 1) > capacity) {
          return res.status(409).json({ error: `لا توجد مقاعد كافية. المتاح حاليًا ${Math.max(0, capacity - occupied)} مقعد` });
        }
      }
      trip.captainId = user.id; trip.captainName = user.name; trip.captainPhone = user.phone;
      trip.status = 'assigned'; trip.assignedAt = new Date().toISOString();
      trip.targetCaptainId = null;

      const users = loadFile(USERS_FILE);
      const captain = users.users.find(u => u.id === user.id && u.role === 'captain');
      if (captain) {
        captain.available = false;
        writeData(USERS_FILE, users);
      }
      writeData(RIDES_FILE, rides);
      res.json(trip);
    } catch (err) {
      console.error('[assign]', err);
      res.status(500).json({ error: 'صار خطأ بحجز الرحلة' });
    }
  });
});

app.post('/api/rides/:tripNumber/reject', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  withLock('rides', () => {
    try {
      const rides = loadFile(RIDES_FILE);
      const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
      if (!trip) return res.status(404).json({ error: 'الرحلة غير موجودة' });
      if (trip.status !== 'searching') return res.status(409).json({ error: 'لا يمكن رفض طلب تم قبوله بالفعل' });
      if (trip.targetCaptainId && trip.targetCaptainId !== user.id) return res.status(403).json({ error: 'هذا الطلب موجّه إلى كابتن آخر' });
      trip.targetCaptainId = null;
      trip.offerCaptainId = null;
      trip.offerExpiresAt = null;
      trip.offerAttemptedCaptainIds = [...new Set([...(trip.offerAttemptedCaptainIds || []), user.id])];
      trip.rejectedBy = user.id;
      trip.rejectedAt = new Date().toISOString();
      refreshRideOffer(trip, rides);
      writeData(RIDES_FILE, rides);
      res.json({ ok: true, trip });
    } catch (err) {
      console.error('[reject request]', err);
      res.status(500).json({ error: 'تعذر رفض الطلب' });
    }
  });
});

// بداية الرحلة
app.post('/api/rides/:tripNumber/start', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  withLock('rides', () => {
    const rides = loadFile(RIDES_FILE);
    const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
    if (!trip || trip.captainId !== user.id || trip.status !== 'assigned' || !trip.arrivedAt) return res.status(409).json({ error: 'سجّل الوصول إلى العميل أولًا' });
    if (String(req.body?.startCode || '') !== String(trip.startCode || '')) return res.status(403).json({ error: 'رمز بدء الرحلة غير صحيح، خذه من العميل' });
    trip.status = 'started'; trip.startedAt = new Date().toISOString();
    writeData(RIDES_FILE, rides);
    res.json(trip);
  });

});

app.post('/api/rides/:tripNumber/arrive', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  withLock('rides', () => {
    const rides = loadFile(RIDES_FILE);
    const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
    if (!trip || trip.captainId !== user.id) return res.status(404).json({ error: 'الرحلة غير موجودة لحسابك' });
    if (trip.status !== 'assigned') return res.status(409).json({ error: 'يمكن تسجيل الوصول بعد قبول الرحلة وقبل بدئها' });
    trip.arrivedAt = new Date().toISOString();
    writeData(RIDES_FILE, rides);
    res.json(trip);
  });
});

// إلغاء الرحلة — من العميل أو الكابتن المسؤول
app.post('/api/rides/:tripNumber/cancel', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  withLock('rides', () => {
    const rides = loadFile(RIDES_FILE);
    const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
    if (!trip) return res.status(404).json({ error: 'غير موجودة' });
    const allowed = trip.customerId === user.id || (user.role === 'captain' && trip.captainId === user.id);
    if (!allowed) return res.status(403).json({ error: 'غير مسموح' });
    if (!['searching', 'assigned', 'started'].includes(trip.status)) return res.status(409).json({ error: 'ما بتقدرش تلغيها' });
    trip.status = 'cancelled'; trip.cancelledAt = new Date().toISOString();
    trip.cancelledBy = user.role;
    if (trip.captainId) {
      const activeTrips = rides.rides.filter(item => item.tripNumber !== trip.tripNumber && item.captainId === trip.captainId && ['assigned', 'started'].includes(item.status));
      if (!activeTrips.length) {
        const users = loadFile(USERS_FILE);
        const captain = users.users.find(item => item.id === trip.captainId && item.role === 'captain');
        if (captain) {
          captain.available = true;
          writeData(USERS_FILE, users);
        }
      }
    }
    writeData(RIDES_FILE, rides);
    res.json(trip);
  });
});

app.post('/api/rides/:tripNumber/complete', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  withLock('rides', () => {
  const rides = loadFile(RIDES_FILE);
  const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
  if (!trip) return res.status(404).json({ error: 'غير موجودة' });
  if (trip.captainId !== user.id) return res.status(403).json({ error: 'الرحلة ليست محجوزة لك' });
  if (trip.status !== 'started') return res.status(409).json({ error: 'أنهِ الرحلة بعد بدءها والوصول إلى الموقع' });
  const startedAt = new Date(trip.startedAt || 0).getTime();
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 10000) {
    const remaining = Math.max(1, Math.ceil((10000 - (Date.now() - startedAt)) / 1000));
    return res.status(409).json({ error: `زر الإنهاء يتفعل بعد ${remaining} ثوانٍ من بدء الرحلة` });
  }

  const pricing = loadFile(PRICING_FILE);
  const price = Number(trip.price) || 0;
  const rate = Number(pricing.companyCommissionRate) || 0;
  const commission = Number((price * rate).toFixed(2));
  trip.status = 'completed'; trip.completedAt = new Date().toISOString();
  trip.commission = commission; trip.captainNet = Number((price - commission).toFixed(2));
  // تفاصيل الإنهاء: كم، مدة الرحلة، وقت المتصلة — تظهر عند الكابتن والعميل
  const distanceKm = Number(trip.distanceKm);
  if (Number.isFinite(distanceKm)) trip.distanceKm = distanceKm;
  const startMs = new Date(trip.startedAt || trip.arrivedAt || trip.assignedAt || trip.createdAt || trip.completedAt).getTime();
  trip.durationMinutes = Math.max(1, Math.round((new Date(trip.completedAt).getTime() - startMs) / 60000));
  const onlineMs = new Date(trip.completedAt).getTime() - new Date(trip.createdAt || trip.completedAt).getTime();
  trip.onlineMinutes = Math.max(1, Math.round(onlineMs / 60000));
  // الرحلة تبقى ظاهرة عند الطرفين حتى يوافق العميل
  trip.customerAcknowledgedAt = null;
  writeData(RIDES_FILE, rides);

  const wallets = loadFile(WALLETS_FILE);
  if (!Array.isArray(wallets.captains)) wallets.captains = [];
  let captainAcc = wallets.captains.find(a => a.accountId === user.walletAccountId);
  if (!captainAcc) {
    captainAcc = { accountId: user.walletAccountId, accountName: user.name, balance: 0, transactions: [] };
    wallets.captains.push(captainAcc);
  }
  if (commission > 0) {
    // العمولة تُخصم حتى لو الرصيد صفر — تصبح سالب
    captainAcc.balance = round2((Number(captainAcc.balance) || 0) - commission);
    if (!Array.isArray(captainAcc.transactions)) captainAcc.transactions = [];
    captainAcc.transactions.unshift({ type: 'debit', amount: -commission, note: `عمولة الشركة للرحلة ${trip.tripNumber}`, createdAt: trip.completedAt });
  }
  writeData(WALLETS_FILE, wallets);
  res.json(trip);
  });

  app.get('/api/rides/:tripNumber/chat', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
    const trip = loadFile(RIDES_FILE).rides.find(item => item.tripNumber === req.params.tripNumber);
    if (!trip || (trip.customerId !== user.id && trip.captainId !== user.id)) return res.status(403).json({ error: 'غير مسموح' });
    res.json(trip.messages || []);
  });

  app.post('/api/rides/:tripNumber/chat', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
    withLock('rides', () => {
      const rides = loadFile(RIDES_FILE);
      const trip = rides.rides.find(item => item.tripNumber === req.params.tripNumber);
      if (!trip || (trip.customerId !== user.id && trip.captainId !== user.id)) return res.status(403).json({ error: 'غير مسموح' });
      const text = String(req.body?.text || '').trim().slice(0, 500);
      if (!text) return res.status(400).json({ error: 'اكتب رسالة' });
      if (!Array.isArray(trip.messages)) trip.messages = [];
      trip.messages.push({ senderId: user.id, senderName: user.name, text, createdAt: new Date().toISOString() });
      writeData(RIDES_FILE, rides);
      res.status(201).json(trip.messages[trip.messages.length - 1]);
    });
  });

  app.post('/api/rides/:tripNumber/rating', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'التقييم يجب أن يكون من 1 إلى 5' });
    }
    withLock('rides', () => {
      const rides = loadFile(RIDES_FILE);
      const trip = rides.rides.find(item => item.tripNumber === req.params.tripNumber);
      if (!trip || trip.status !== 'completed') return res.status(404).json({ error: 'الرحلة المكتملة غير موجودة' });
      const isCustomer = trip.customerId === user.id;
      const isCaptain = trip.captainId === user.id && user.role === 'captain';
      if (!isCustomer && !isCaptain) return res.status(403).json({ error: 'غير مسموح' });
      const field = isCustomer ? 'customerRating' : 'captainRating';
      if (trip[field]) return res.status(409).json({ error: 'تم إرسال التقييم مسبقًا' });
      trip[field] = rating;
      trip[`${field}At`] = new Date().toISOString();
      writeData(RIDES_FILE, rides);
      res.status(201).json({ ok: true, rating });
    });
  });
});

// الهوية (Auth)
app.post('/api/auth/register', (req, res) => {
  const { role, name, phone, password, vehicle, documents } = req.body;
  const normalizedPhone = normalizePhone(phone);
  if (!['customer', 'captain'].includes(role) || !String(name || '').trim() || !normalizedPhone || String(password || '').length < 6) {
    return res.status(400).json({ error: 'أدخل الاسم ورقم هاتف من 9 أرقام أو 10 أرقام مع الصفر، وكلمة مرور من 6 أحرف أو أرقام على الأقل' });
  }
  if (role === 'captain' && (!vehicle || typeof vehicle.electric !== 'boolean' || !vehicle.carType || !vehicle.bodyType || !Number.isFinite(Number(vehicle.capacity)) || Number(vehicle.capacity) < 1 || Number(vehicle.capacity) > 6 || !vehicle.carNumber || !vehicle.plateNumber || !documents || Object.values(documents).some(value => !value))) {
    return res.status(400).json({ error: 'بيانات الكابتن وصور الهوية والرخص والسيارة وعدم المحكومية مطلوبة' });
  }
  const users = loadFile(USERS_FILE);
  if (users.users.find(u => samePhone(u.phone, normalizedPhone) && u.role === role)) {
    return res.status(409).json({ error: role === 'customer' ? 'رقم الهاتف مستخدم في حساب عميل مسبقاً' : 'رقم الهاتف مستخدم في حساب كابتن مسبقاً' });
  }

  const id = crypto.randomUUID();
  const pwd = hashPassword(String(password));
  const user = {
    id,
    role,
    name,
    phone: normalizedPhone,
    passwordSalt: pwd.salt,
    passwordHash: pwd.hash,
    status: role === 'customer' ? 'approved' : 'pending',
    walletAccountId: normalizedPhone,
    available: role === 'captain' ? true : undefined,
    services: role === 'captain'
      ? ['private', 'shared_intra', ...(vehicle?.electric === true ? ['electric'] : []), 'airport',
        ...(vehicle?.bodyType === 'jeep' && Number(vehicle?.capacity) >= 1 && Number(vehicle?.capacity) <= 6 ? ['jeep'] : []),
        ...(isJeepElectricEligible(vehicle) ? ['jeep_electric'] : [])]
      : undefined,
    vehicle: role === 'captain' ? vehicle : undefined,
    documents: role === 'captain' ? documents : { photo: documents?.photo || '' },
    createdAt: new Date().toISOString()
  };
  users.users.push(user);
  writeData(USERS_FILE, users);

  const wallets = loadFile(WALLETS_FILE);
  wallets[`${role}s`].push({ accountId: normalizedPhone, accountName: name, balance: 0, transactions: [] });
  writeData(WALLETS_FILE, wallets);

  res.status(201).json({ user: publicUser(user), registrationId: id, requiresApproval: user.status === 'pending' });
});

app.get('/api/auth/registration-status/:id', (req, res) => {
  const users = loadFile(USERS_FILE);
  const user = users.users.find(item => item.id === req.params.id && item.role === 'captain');
  if (!user) return res.status(404).json({ error: 'طلب التسجيل غير موجود' });
  res.json({ status: user.status, name: user.name });
});

app.post('/api/auth/login', (req, res) => {
  const { role, phone, password } = req.body;
  const normalizedPhone = normalizePhone(phone);
  const users = loadFile(USERS_FILE);
  const user = users.users.find(u => samePhone(u.phone, normalizedPhone) && u.role === role);
  if (!user || user.status === 'deleted' || !isPasswordValid(String(password), user)) return res.status(401).json({ error: 'بيانات خاطئة' });
  if (user.status === 'blocked') return res.status(403).json({ error: 'يرجى مراجعة الشركة لتفعيل حسابك' });
  if (user.status !== 'approved') return res.status(403).json({ error: 'الحساب غير مفعل' });

  if (user.role === 'captain' && user.available === undefined) user.available = true;

  const token = crypto.randomBytes(32).toString('hex');
  users.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeData(USERS_FILE, users);
  res.json({ token, user: publicUser(user) });
});

app.delete('/api/auth/account', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  if (String(req.body?.confirmation || '') !== 'DELETE') {
    return res.status(400).json({ error: 'أرسل تأكيد DELETE لحذف الحساب' });
  }
  const users = loadFile(USERS_FILE);
  const account = users.users.find(item => item.id === user.id);
  if (!account) return res.status(404).json({ error: 'الحساب غير موجود' });
  account.status = 'archived';
  account.archivedAt = new Date().toISOString();
  users.sessions = users.sessions.filter(session => session.userId !== user.id);
  writeData(USERS_FILE, users);
  res.json({ ok: true, message: 'تم إخفاء الحساب مع حفظ كامل بياناته لدى الإدارة. يمكن استرجاعه من غرفة التحكم.' });
});

app.patch('/api/captains/me/availability', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  const available = req.body && typeof req.body.available === 'boolean' ? req.body.available : user.available !== false;
  const users = loadFile(USERS_FILE);
  const captain = users.users.find(u => u.id === user.id && u.role === 'captain');
  if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });
  captain.available = available;
  if (Array.isArray(req.body?.services)) {
      const allowedServices = ['private', 'shared', 'electric', 'airport', 'shared_intra', 'jeep', 'jeep_electric'];
    captain.services = [...new Set(req.body.services
      .filter(service => allowedServices.includes(service))
      .filter(service => service !== 'electric' || captain.vehicle?.electric === true)
      .filter(service => service !== 'jeep' || (captain.vehicle?.bodyType === 'jeep' && Number(captain.vehicle?.capacity || 0) >= 1 && Number(captain.vehicle?.capacity || 0) <= 6)))];
      captain.services = captain.services.filter(service => service !== 'jeep_electric' || isJeepElectricEligible(captain.vehicle));
  }
  if (req.body?.location && Number.isFinite(Number(req.body.location.lat)) && Number.isFinite(Number(req.body.location.lng))) {
    captain.location = {
      lat: Number(req.body.location.lat),
      lng: Number(req.body.location.lng),
      updatedAt: new Date().toISOString(),
    };
  }
  writeData(USERS_FILE, users);
  res.json({ ok: true, available: captain.available !== false, user: publicUser(captain) });
});

async function startServer() {
  try {
    if (process.env.NODE_ENV === 'production' && !hasPersistentStore) {
      throw new Error('DATABASE_URL is required in production to preserve accounts and application data');
    }
    const snapshots = {};
    for (const [dataKey, file] of Object.entries(DATA_FILES)) {
      snapshots[dataKey] = loadFile(file);
    }
    const databaseRides = await loadRides();
    if (databaseRides && databaseRides.length) {
      const localRides = snapshots.rides.rides || [];
      const ridesByNumber = new Map(localRides.map(ride => [ride.tripNumber, ride]));
      for (const ride of databaseRides) ridesByNumber.set(ride.tripNumber, ride);
      snapshots.rides = { rides: [...ridesByNumber.values()] };
    }
    const hydrated = await loadPersistentState(snapshots);
    for (const [dataKey, file] of Object.entries(DATA_FILES)) {
      if (hydrated[dataKey]) {
        writeData(file, hydrated[dataKey]);
      }
    }
  } catch (error) {
    console.error('[database startup]', error);
    if (process.env.NODE_ENV === 'production') {
      process.exitCode = 1;
      return;
    }
  }
  if (!process.env.VERCEL) app.listen(PORT, () => console.log(`Darbak Server on ${PORT}`));
}

const startupPromise = startServer();
app.use(async (req, res, next) => {
  try {
    await startupPromise;
    next();
  } catch (error) {
    next(error);
  }
});

// ===== المسارات الإدارية لغرفة التحكم =====

// قائمة كل الحسابات (كباتن + عملاء)
app.get('/api/admin/users', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const users = loadFile(USERS_FILE);
  res.json(users.users.map(publicUser));
});

// إجراءات على حساب: حظر / فك حظر / أرشفة / استرجاع / حذف
app.post('/api/admin/users/:id/:action', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const { id, action } = req.params;
  const users = loadFile(USERS_FILE);
  const user = users.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'الحساب غير موجود' });
  if (action === 'block') user.status = 'blocked';
  else if (action === 'unblock') user.status = 'approved';
  else if (action === 'archive') user.status = 'archived';
  else if (action === 'restore') user.status = 'approved';
  else if (action === 'delete') {
    user.status = 'archived';
    user.archivedAt = new Date().toISOString();
    users.sessions = users.sessions.filter(session => session.userId !== id);
  }
  else return res.status(400).json({ error: 'إجراء غير معروف' });
  writeData(USERS_FILE, users);
  res.json({ ok: true });
});

// طلبات الكباتن المعلّقة
app.get('/api/admin/captains/pending', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const users = loadFile(USERS_FILE);
  res.json(users.users.filter(u => u.role === 'captain' && u.status === 'pending').map(publicUser));
});

// قبول / رفض / حفظ تعديلات كابتن
app.post('/api/admin/captains/:id/:action', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const { id, action } = req.params;
  const users = loadFile(USERS_FILE);
  const user = users.users.find(u => u.id === id && u.role === 'captain');
  if (!user) return res.status(404).json({ error: 'الكابتن غير موجود' });
  if (action === 'approve') {
    user.status = 'approved';
    if (req.body?.vehicle) user.vehicle = { ...(user.vehicle || {}), ...req.body.vehicle };
    if (req.body?.documents) user.documents = { ...(user.documents || {}), ...req.body.documents };
  } else if (action === 'reject') {
    user.status = 'rejected';
  } else if (action === 'save') {
    if (req.body?.vehicle) user.vehicle = { ...(user.vehicle || {}), ...req.body.vehicle };
    if (req.body?.documents) user.documents = { ...(user.documents || {}), ...req.body.documents };
  } else return res.status(400).json({ error: 'إجراء غير معروف' });
  writeData(USERS_FILE, users);
  res.json({ ok: true });
});

// بحث عن حساب برقم الهاتف + سجل رحلاته ومحفظته
app.get('/api/admin/users/:phone/history', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const users = loadFile(USERS_FILE);
  const user = users.users.find(u => samePhone(u.phone, req.params.phone));
  if (!user) return res.status(404).json({ error: 'لا يوجد حساب بهذا الرقم' });
  const wallets = loadFile(WALLETS_FILE);
  const wallet = wallets[`${user.role}s`]?.find(a => a.accountId === user.walletAccountId) || { balance: 0, transactions: [] };
  const rides = loadFile(RIDES_FILE).rides
    .filter(r => user.role === 'customer' ? r.customerId === user.id : r.captainId === user.id)
    .map(enrichRideForAdmin);
  res.json({ user: adminUserProfile(user), wallet, rides });
});

// تتبع رحلة برقمها
app.get('/api/admin/rides/:tripNumber', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const trip = loadFile(RIDES_FILE).rides.find(r => r.tripNumber === req.params.tripNumber);
  if (!trip) return res.status(404).json({ error: 'الرحلة غير موجودة' });
  res.json(enrichRideForAdmin(trip));
});

// كل الرحلات — للمراقبة الحية
app.get('/api/admin/rides', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  res.json(loadFile(RIDES_FILE).rides.map(enrichRideForAdmin));
});

// الرموز الترويجية
app.get('/api/admin/promos', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  res.json(loadFile(PROMOS_FILE).promos);
});

app.post('/api/admin/promos', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const promos = loadFile(PROMOS_FILE);
  const code = String(req.body?.code || '').trim().toUpperCase();
  const amount = safeNumber(req.body?.amount, 0);
  if (!code || amount <= 0) return res.status(400).json({ error: 'أدخل رمزاً وقيمة صحيحة' });
  if (promos.promos.find(p => p.code === code)) return res.status(409).json({ error: 'الرمز موجود مسبقاً' });
  promos.promos.unshift({ code, amount, active: true, createdAt: new Date().toISOString() });
  writeData(PROMOS_FILE, promos);
  res.status(201).json(promos.promos);
});

app.post('/api/admin/promos/:code/toggle', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const promos = loadFile(PROMOS_FILE);
  const promo = promos.promos.find(p => p.code === req.params.code);
  if (!promo) return res.status(404).json({ error: 'الرمز غير موجود' });
  promo.active = !promo.active;
  writeData(PROMOS_FILE, promos);
  res.json(promos.promos);
});

// استرداد رمز ترويجي من العميل
app.post('/api/promos/redeem', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  withLock('promos', () => {
    const promos = loadFile(PROMOS_FILE);
    const promo = promos.promos.find(p => p.code === String(req.body?.code || '').trim().toUpperCase());
    if (!promo || !promo.active) return res.status(404).json({ error: 'رمز غير صالح أو موقوف' });
    promo.active = false; promo.redeemedBy = user.phone; promo.redeemedAt = new Date().toISOString();
    writeData(PROMOS_FILE, promos);
    const wallets = loadFile(WALLETS_FILE);
    const acc = wallets[`${user.role}s`]?.find(a => a.accountId === user.walletAccountId);
    if (acc) {
      acc.balance = round2((acc.balance || 0) + promo.amount);
      acc.transactions.unshift({ type: 'credit', amount: promo.amount, note: `رمز ترويجي ${promo.code}`, createdAt: new Date().toISOString() });
      writeData(WALLETS_FILE, wallets);
    }
    res.json({ ok: true, amount: promo.amount, balance: acc?.balance || 0 });
  });
});

// شكاوى الدعم
app.get('/api/admin/support/tickets', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  res.json(readSafe(SUPPORT_FILE).tickets);
});

app.get('/api/support/tickets', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  res.json(readSafe(SUPPORT_FILE).tickets.filter(ticket => ticket.userId === user.id));
});

app.post('/api/support/tickets', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  const support = readSafe(SUPPORT_FILE);
  support.tickets.unshift({ id: crypto.randomUUID(), userId: user.id, userName: user.name, role: user.role, subject: String(req.body?.subject || 'شكوى').slice(0, 80), message: String(req.body?.message || '').slice(0, 500), tripNumber: req.body?.tripNumber || null, status: 'open', createdAt: new Date().toISOString() });
  writeData(SUPPORT_FILE, support);
  res.status(201).json({ ok: true });
});

// إرسال رصيد (شحن محفظة)
app.post('/api/wallets/credit', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const wallets = loadFile(WALLETS_FILE);
  const roleKey = req.body?.role === 'customer' ? 'customers' : 'captains';
  const accountId = normalizePhone(req.body?.accountId || req.body?.phone);
  if (!accountId) return res.status(400).json({ error: 'رقم الهاتف يجب أن يكون 9 أو 10 أرقام' });
  let acc = wallets[roleKey].find(a => a.accountId === accountId);
  if (!acc) {
    acc = { accountId, accountName: req.body?.accountName || accountId, balance: 0, transactions: [] };
    wallets[roleKey].push(acc);
  }
  const amount = safeNumber(req.body?.amount, 0);
  if (amount <= 0) return res.status(400).json({ error: 'قيمة غير صحيحة' });
  acc.balance = round2((acc.balance || 0) + amount);
  acc.transactions.unshift({ type: 'credit', amount, note: req.body?.note || 'شحن من الإدارة', createdAt: new Date().toISOString() });
  writeData(WALLETS_FILE, wallets);
  res.json({ ok: true, balance: acc.balance });
});

// قائمة محافظ حسب الدور
app.get('/api/wallets', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const wallets = loadFile(WALLETS_FILE);
  const roleKey = req.query.role === 'customer' ? 'customers' : 'captains';
  res.json(wallets[roleKey] || []);
});

// سحب رصيد
app.post('/api/wallets/withdraw', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const wallets = loadFile(WALLETS_FILE);
  const roleKey = req.body?.role === 'customer' ? 'customers' : 'captains';
  const acc = wallets[roleKey].find(a => samePhone(a.accountId, req.body?.phone));
  if (!acc) return res.status(404).json({ error: 'الحساب غير موجود' });
  const amount = safeNumber(req.body?.amount, 0);
  if (amount <= 0 || amount > acc.balance) return res.status(400).json({ error: 'الرصيد غير كافٍ أو القيمة غير صحيحة' });
  acc.balance = round2(acc.balance - amount);
  acc.transactions.unshift({ type: 'debit', amount: -amount, note: req.body?.note || 'سحب رصيد', createdAt: new Date().toISOString() });
  writeData(WALLETS_FILE, wallets);
  res.json({ ok: true, balance: acc.balance });
});

// ===== مساعد الذكاء الاصطناعي (OpenRouter) — المفتاح يقرأ من متغيرات البيئة فقط =====
const OPENROUTER_KEY = process.env.OPENROUTER_KEY || '';

app.post('/api/ai/chat', async (req, res) => {
  try {
    if (!OPENROUTER_KEY) {
      return res.status(503).json({ error: 'لم يتم إعداد مفتاح OpenRouter في متغيرات البيئة' });
    }
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : [];
    if (!messages.length) return res.status(400).json({ error: 'لا توجد رسائل' });
    const systemMsg = {
      role: 'system',
      content: 'أنت مساعد ذكي لتطبيق ناشمي رايد (Nashmi Ride) — تطبيق نقل مشترك أردني. جاوب بالعربية بشكل مختصر ومفيد على أسئلة الزوار عن التطبيقات، الأسعار، التحميل، وكيفية الاستخدام. إذا سُئلت عن شيء خارج الخدمة، اعتذر بلطف وحوّل المحادثة للخدمة.'
    };
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'http://nashmiride.local',
        'X-Title': 'Nashmi Ride',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'openrouter/free', messages: [systemMsg, ...messages] }),
    });
    if (!r.ok) return res.status(502).json({ error: 'خدمة الذكاء الاصطناعي غير متاحة حالياً' });
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'لم يصل رد من الخدمة' });
    res.json({ reply });
  } catch (err) {
    console.error('[ai/chat]', err);
    res.status(500).json({ error: 'صار خطأ في المساعد الذكي' });
  }
});
