const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { syncRides, loadRides } = require('../db');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'darbak-2026';

// مسارات ملفات البيانات
const PRICING_FILE = path.join(__dirname, 'data', 'pricing.json');
const WALLETS_FILE = path.join(__dirname, 'data', 'wallets.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const RIDES_FILE = path.join(__dirname, 'data', 'rides.json');
const PROMOS_FILE = path.join(__dirname, 'data', 'promos.json');
const SUPPORT_FILE = path.join(__dirname, 'data', 'support.json');

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
    return fallback ? { ...fallback } : {};
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
};

// ضمان الشكل الافتراضي على كل قراءة — يمنع undefined.users / undefined.captains
function loadFile(file) {
  const data = readData(file, SCHEMAS[file] || {});
  return ensureShape(file, data);
}

// شكل افتراضي آمن لكل ملف — يمنع undefined.users / undefined.captains
const SCHEMAS = {
  [PRICING_FILE]: { baseFare: 0, perKmRate: 0, waitMinuteRate: 0, minFare: 0, currency: 'د.أ', companyCommissionRate: 0 },
  [WALLETS_FILE]: { captains: [], customers: [], transactions: [] },
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
    vehicle: user.vehicle,
    documents: user.documents,
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
  }
  if (user.role === 'captain' && customer) {
    result.customer = { name: customer.name, phone: customer.phone };
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

// التسعيرة
app.get('/api/pricing', (req, res) => res.json(loadFile(PRICING_FILE)));

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
  const account = wallets[`${user.role}s`].find(a => a.accountId === user.walletAccountId);
  res.json(account || { balance: 0, transactions: [] });
});

// الرحلات
app.post('/api/rides', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'customer') return res.status(401).json({ error: 'يلزم دخول العميل' });
  // منع الرحلات المتكررة: ما بقبلش عميل عنده رحلة نشطة
  const mine = loadFile(RIDES_FILE).rides.filter(r => r.customerId === user.id && ['searching', 'assigned', 'started'].includes(r.status));
  if (mine.length) return res.status(409).json({ error: 'عندك رحلة نشطة، خلّصها أو ألغِها أولاً' });

  withLock('rides', () => {
    try {
      const rides = loadFile(RIDES_FILE);
      if (!Array.isArray(rides.rides)) rides.rides = [];
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const rideType = body.rideType === 'intercity' ? 'intercity' : 'intra';
      const vehicleType = body.vehicleType === 'private' ? 'private' : 'shared';
      const pricing = loadFile(PRICING_FILE);
      const requestedPrice = safeNumber(body.price, 0);
      const price = requestedPrice > 0 ? requestedPrice : Math.max(
        safeNumber(pricing.minFare, 0),
        body.airportRequest ? safeNumber(pricing.governorateAirportFare, 0) : 0
      );
      const wallets = loadFile(WALLETS_FILE);
      const customerWallet = wallets.customers.find(account => account.accountId === user.walletAccountId);
      const walletBalance = safeNumber(customerWallet?.balance, 0);
      const walletDebit = walletBalance > 0 ? round2(Math.min(walletBalance, price)) : 0;
      if (customerWallet && walletDebit > 0) {
        customerWallet.balance = round2(walletBalance - walletDebit);
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
        vehicleType,
        airportRequest: Boolean(body.airportRequest),
        seats: Math.max(1, Math.floor(safeNumber(body.seats, 1))),
        tripNumber: `NR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        customerId: user.id, customerName: user.name, customerPhone: user.phone,
        targetCaptainId: body.targetCaptainId || null,
        price,
        walletDebit,
        remainingDue: round2(Math.max(0, price - walletDebit)),
        status: 'searching', createdAt: new Date().toISOString()
      };
      // body ما بيقدرش يطغى على الحقول المهمة (نترتيب المفاتيح بعد ...body)
      rides.rides.unshift(trip);
      writeData(RIDES_FILE, rides);
      if (customerWallet && walletDebit > 0) writeData(WALLETS_FILE, wallets);
      res.status(201).json(trip);
    } catch (err) {
      console.error('[create ride]', err);
      res.status(500).json({ error: 'صار خطأ بإنشاء الرحلة' });
    }
  });
});

// الحاجات المتاحة للكابتن — بدون تكرار نفس الرحلة، ومش ديما نفس النتيجة
app.get('/api/rides/available', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'يلزم الدخول' });
  const rides = loadFile(RIDES_FILE);
  if (!Array.isArray(rides.rides)) rides.rides = [];
  const seen = new Set();
  const available = rides.rides.filter(r => {
      if (r.status !== 'searching' || seen.has(r.tripNumber)) return false;
      seen.add(r.tripNumber);
      if (user.role === 'captain') {
        return !r.targetCaptainId || r.targetCaptainId === user.id;
      }
      return true;
  });
  res.json(available.map(ride => enrichRideForUser(ride, user)));
});

app.get('/api/captains/available', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'customer') return res.status(401).json({ error: 'يلزم دخول العميل' });
  const users = loadFile(USERS_FILE);
  const rides = loadFile(RIDES_FILE).rides;
  const busy = new Set(rides.filter(ride => ['assigned', 'started'].includes(ride.status)).map(ride => ride.captainId));
  const captains = users.users
      .filter(captain => captain.role === 'captain' && captain.status === 'approved' && captain.available !== false && !busy.has(captain.id))
      .map(captain => ({
        id: captain.id,
        name: captain.name,
        phone: captain.phone,
        available: captain.available !== false,
        vehicle: captain.vehicle,
        photo: captain.documents?.photo || '',
      }));
  res.json(captains);
});

app.get('/api/rides/mine', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'الجلسة غير صالحة' });
  const rides = loadFile(RIDES_FILE);
  if (!Array.isArray(rides.rides)) rides.rides = [];
  const mine = rides.rides.filter(r => user.role === 'customer' ? r.customerId === user.id && ['searching', 'assigned', 'started'].includes(r.status) : r.captainId === user.id && ['assigned', 'started'].includes(r.status));
  res.json(mine.map(ride => enrichRideForUser(ride, user)));
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
      if (trip.targetCaptainId && trip.targetCaptainId !== user.id) {
        return res.status(403).json({ error: 'هذا الطلب موجّه إلى كابتن آخر' });
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
      trip.rejectedBy = user.id;
      trip.rejectedAt = new Date().toISOString();
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
    if (!trip || trip.captainId !== user.id || trip.status !== 'assigned') return res.status(409).json({ error: 'غير قابلة للبدء' });
    trip.status = 'started'; trip.startedAt = new Date().toISOString();
    writeData(RIDES_FILE, rides);
    res.json(trip);
  });

  // إنهاء الرحلة عند الوصول فقط — بعد القبول وبدء الرحلة
  app.post('/api/rides/:tripNumber/complete', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
    withLock('rides', () => {
      const rides = loadFile(RIDES_FILE);
      const trip = rides.rides.find(r => r.tripNumber === req.params.tripNumber);
      if (!trip || trip.captainId !== user.id) return res.status(404).json({ error: 'الرحلة غير موجودة لحسابك' });
      if (trip.status !== 'started') return res.status(409).json({ error: 'ابدأ الرحلة أولاً ثم أنهِها عند الوصول' });
      trip.status = 'completed';
      trip.completedAt = new Date().toISOString();
      writeData(RIDES_FILE, rides);
      const users = loadFile(USERS_FILE);
      const captain = users.users.find(item => item.id === user.id);
      if (captain) {
        captain.available = true;
        writeData(USERS_FILE, users);
      }
      res.json(trip);
    });
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
  if (!['assigned', 'started'].includes(trip.status)) return res.status(409).json({ error: 'الرحلة غير قابلة للإنهاء' });

  const pricing = loadFile(PRICING_FILE);
  const price = Number(trip.price) || 0;
  const rate = Number(pricing.companyCommissionRate) || 0;
  const commission = Number((price * rate).toFixed(2));
  trip.status = 'completed'; trip.completedAt = new Date().toISOString();
  trip.commission = commission; trip.captainNet = Number((price - commission).toFixed(2));
  writeData(RIDES_FILE, rides);

  const wallets = loadFile(WALLETS_FILE);
  const captainAcc = wallets.captains.find(a => a.accountId === user.walletAccountId);
  if (captainAcc) {
    captainAcc.balance += trip.captainNet;
    captainAcc.transactions.unshift({ type: 'credit', amount: trip.captainNet, note: `رحلة ${trip.tripNumber}`, createdAt: trip.completedAt });
    writeData(WALLETS_FILE, wallets);
  }
  res.json(trip);
  });
});

// الهوية (Auth)
app.post('/api/auth/register', (req, res) => {
  const { role, name, phone, password, vehicle, documents } = req.body;
  if (!['customer', 'captain'].includes(role) || !String(name || '').trim() || !String(phone || '').trim() || String(password || '').length < 6) {
    return res.status(400).json({ error: 'أدخل الاسم ورقم الهاتف وكلمة مرور من 6 أحرف أو أرقام على الأقل' });
  }
  if (role === 'captain' && (!vehicle || !vehicle.carType || !vehicle.carNumber || !vehicle.plateNumber || !documents || Object.values(documents).some(value => !value))) {
    return res.status(400).json({ error: 'بيانات الكابتن وصور الهوية والرخص والسيارة وعدم المحكومية مطلوبة' });
  }
  const users = loadFile(USERS_FILE);
  if (users.users.find(u => u.phone === phone)) return res.status(409).json({ error: 'موجود مسبقاً' });

  const id = crypto.randomUUID();
  const pwd = hashPassword(String(password));
  const user = {
    id,
    role,
    name,
    phone,
    passwordSalt: pwd.salt,
    passwordHash: pwd.hash,
    status: role === 'customer' ? 'approved' : 'pending',
    walletAccountId: phone,
    available: role === 'captain' ? true : undefined,
    vehicle: role === 'captain' ? vehicle : undefined,
    documents: role === 'captain' ? documents : { photo: documents?.photo || '' },
    createdAt: new Date().toISOString()
  };
  users.users.push(user);
  writeData(USERS_FILE, users);

  const wallets = loadFile(WALLETS_FILE);
  wallets[`${role}s`].push({ accountId: phone, accountName: name, balance: 0, transactions: [] });
  writeData(WALLETS_FILE, wallets);

  res.status(201).json({ user: publicUser(user), requiresApproval: user.status === 'pending' });
});

app.post('/api/auth/login', (req, res) => {
  const { role, phone, password } = req.body;
  const users = loadFile(USERS_FILE);
  const user = users.users.find(u => u.phone === phone && u.role === role);
  if (!user || !isPasswordValid(String(password), user)) return res.status(401).json({ error: 'بيانات خاطئة' });
  if (user.status !== 'approved') return res.status(403).json({ error: 'الحساب غير مفعل' });

  if (user.role === 'captain' && user.available === undefined) user.available = true;

  const token = crypto.randomBytes(32).toString('hex');
  users.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeData(USERS_FILE, users);
  res.json({ token, user: publicUser(user) });
});

app.patch('/api/captains/me/availability', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'captain') return res.status(401).json({ error: 'يلزم دخول الكابتن' });
  const available = req.body && typeof req.body.available === 'boolean' ? req.body.available : user.available !== false;
  const users = loadFile(USERS_FILE);
  const captain = users.users.find(u => u.id === user.id && u.role === 'captain');
  if (!captain) return res.status(404).json({ error: 'الكابتن غير موجود' });
  captain.available = available;
  writeData(USERS_FILE, users);
  res.json({ ok: true, available: captain.available !== false, user: publicUser(captain) });
});

async function startServer() {
  try {
    const databaseRides = await loadRides();
    if (databaseRides && databaseRides.length) {
      writeData(RIDES_FILE, { rides: databaseRides });
    } else {
      const localRides = loadFile(RIDES_FILE);
      await syncRides(localRides.rides || []);
    }
  } catch (error) {
    console.error('[database startup]', error);
  }
  app.listen(PORT, () => console.log(`Darbak Server on ${PORT}`));
}

startServer();

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
  else if (action === 'delete') users.users = users.users.filter(u => u.id !== id);
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
  const user = users.users.find(u => u.phone === req.params.phone);
  if (!user) return res.status(404).json({ error: 'لا يوجد حساب بهذا الرقم' });
  const wallets = loadFile(WALLETS_FILE);
  const wallet = wallets[`${user.role}s`]?.find(a => a.accountId === user.walletAccountId) || { balance: 0, transactions: [] };
  const rides = loadFile(RIDES_FILE).rides.filter(r => user.role === 'customer' ? r.customerId === user.id : r.captainId === user.id);
  res.json({ user: publicUser(user), wallet, rides });
});

// تتبع رحلة برقمها
app.get('/api/admin/rides/:tripNumber', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  const trip = loadFile(RIDES_FILE).rides.find(r => r.tripNumber === req.params.tripNumber);
  if (!trip) return res.status(404).json({ error: 'الرحلة غير موجودة' });
  res.json(trip);
});

// كل الرحلات — للمراقبة الحية
app.get('/api/admin/rides', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'مفتاح الإدارة غير صحيح' });
  res.json(loadFile(RIDES_FILE).rides.map(ride => enrichRideForUser(ride, { role: 'customer' })));
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
  const accountId = String(req.body?.accountId || req.body?.phone || '').trim();
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
  const acc = wallets[roleKey].find(a => a.accountId === String(req.body?.phone || '').trim());
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
