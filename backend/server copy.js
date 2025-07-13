const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3001;

// JWT Secret Key - Üretimde environment variable kullanın
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// CORS middleware - önce ekleyin
app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// JSON middleware
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// JWT Token doğrulama middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Token gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification error:', err.message);
      return res.status(403).json({ message: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

// JSON dosyasını okuma/yazma fonksiyonları
const readDB = () => {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    
    // Dosya yoksa oluştur
    if (!fs.existsSync(dbPath)) {
      const initialData = { rides: [], users: [] };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
      console.log('db.json dosyası oluşturuldu');
      return initialData;
    }
    
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('DB okuma hatası:', error);
    return { rides: [], users: [] };
  }
};

const writeDB = (data) => {
  try {
    const dbPath = path.join(__dirname, 'db.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log('DB başarıyla güncellendi');
    return true;
  } catch (error) {
    console.error('DB yazma hatası:', error);
    return false;
  }
};

// JWT token oluşturma fonksiyonu
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Şifre hashleme fonksiyonu - async/await düzgün kullanımı
const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw error;
  }
};

// Şifre doğrulama fonksiyonu
const verifyPassword = async (password, hashedPassword) => {
  try {
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log('Password verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// Test endpoint'i
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server çalışıyor!', 
    timestamp: new Date().toISOString(),
    bcrypt_available: !!bcrypt,
    routes: [
      'GET /test',
      'POST /auth/register', 
      'POST /auth/login',
      'GET /rides',
      'POST /rides (protected)',
      'GET /debug/db'
    ]
  });
});

// Kullanıcı kayıt endpoint'i
app.post('/auth/register', async (req, res) => {
  try {
    console.log('=== REGISTER REQUEST ===');
    console.log('Body:', req.body);
    
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      console.log('Validation error: Missing fields');
      return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalı' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Geçerli bir email adresi girin' });
    }
    
    const db = readDB();
    
    // Users array'ini initialize et
    if (!db.users) {
      db.users = [];
    }
    
    // Kullanıcının zaten var olup olmadığını kontrol et
    const existingUser = db.users.find(user => user.email === email);
    if (existingUser) {
      console.log('User already exists');
      return res.status(409).json({ message: 'Bu email adresi zaten kayıtlı' });
    }
    
    // Şifreyi hashle - await kullanımı
    console.log('Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('Password hashed:', hashedPassword ? 'Success' : 'Failed');
    
    // Yeni kullanıcı oluştur
    const newUser = {
      id: Date.now(),
      name,
      email,
      password: hashedPassword, // Hashlenen şifre
      createdAt: new Date().toISOString()
    };
    
    console.log('New user created:', { 
      id: newUser.id, 
      name: newUser.name, 
      email: newUser.email,
      passwordHashed: newUser.password.startsWith('$2a$') || newUser.password.startsWith('$2b$')
    });
    
    db.users.push(newUser);
    
    // Veritabanına kaydet
    const saved = writeDB(db);
    if (!saved) {
      console.log('Database write error');
      return res.status(500).json({ message: 'Kayıt sırasında hata oluştu' });
    }
    
    // JWT token oluştur
    const token = generateToken(newUser);
    
    // Şifreyi response'dan çıkar
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'Kayıt başarılı',
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// Kullanıcı giriş endpoint'i
app.post('/auth/login', async (req, res) => {
  try {
    console.log('=== LOGIN REQUEST ===');
    console.log('Body:', req.body);
    
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      console.log('Validation error: Missing email or password');
      return res.status(400).json({ message: 'Email ve şifre zorunludur' });
    }
    
    const db = readDB();
    
    // Users array'ini kontrol et
    if (!db.users || db.users.length === 0) {
      console.log('No users found in database');
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    // Kullanıcıyı bul
    const user = db.users.find(user => user.email === email);
    if (!user) {
      console.log('User not found with email:', email);
      return res.status(401).json({ message: 'Email veya şifre hatalı' });
    }
    
    console.log('User found:', { 
      id: user.id, 
      name: user.name, 
      email: user.email,
      passwordHashed: user.password.startsWith('$2a$') || user.password.startsWith('$2b$')
    });
    
    // Şifreyi doğrula
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Email veya şifre hatalı' });
    }
    
    console.log('Login successful for user:', user.name);
    
    // JWT token oluştur
    const token = generateToken(user);
    
    // Şifreyi response'dan çıkar
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Giriş başarılı',
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// Rides endpoint'i (arama için herkese açık)
app.get('/rides', (req, res) => {
  try {
    console.log('=== RIDES GET REQUEST ===');
    console.log('Query params:', req.query);
    
    const { from, to, date } = req.query;
    const db = readDB();
    
    let filteredRides = db.rides || [];
    
    // Filtreleme
    if (from) {
      filteredRides = filteredRides.filter(ride => 
        ride.from.toLowerCase().includes(from.toLowerCase())
      );
    }
    
    if (to) {
      filteredRides = filteredRides.filter(ride => 
        ride.to.toLowerCase().includes(to.toLowerCase())
      );
    }
    
    if (date) {
      filteredRides = filteredRides.filter(ride => ride.date === date);
    }
    
    console.log('Filtered rides count:', filteredRides.length);
    res.json(filteredRides);
    
  } catch (error) {
    console.error('Rides error:', error);
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// Yeni ride ekleme endpoint'i (korumalı)
app.post('/rides', authenticateToken, (req, res) => {
  try {
    console.log('=== CREATE RIDE REQUEST ===');
    console.log('Body:', req.body);
    console.log('User:', req.user);
    
    const { from, to, date, price, availableSeats } = req.body;
    
    // Validation
    if (!from || !to || !date || !price) {
      console.log('Validation error: Missing required fields');
      return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
    }
    
    if (price <= 0) {
      return res.status(400).json({ message: 'Fiyat sıfırdan büyük olmalı' });
    }
    
    const db = readDB();
    
    // Rides array'ini initialize et
    if (!db.rides) {
      db.rides = [];
    }
    
    // Yeni ride oluştur
    const newRide = {
      id: Date.now(),
      from,
      to,
      date,
      price: parseFloat(price),
      availableSeats: availableSeats || 1,
      driver: req.user.name,
      driverId: req.user.id,
      createdAt: new Date().toISOString()
    };
    
    console.log('Creating new ride:', newRide);
    
    db.rides.push(newRide);
    
    // Veritabanına kaydet
    const saved = writeDB(db);
    if (!saved) {
      console.log('Database write failed');
      return res.status(500).json({ message: 'Ride kayıt edilemedi' });
    }
    
    console.log('New ride created successfully');
    
    res.status(201).json({
      message: 'Ride başarıyla oluşturuldu',
      ride: newRide
    });
    
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
  }
});

// DB durumu kontrol endpoint'i
app.get('/debug/db', (req, res) => {
  try {
    const db = readDB();
    res.json({
      users_count: db.users ? db.users.length : 0,
      rides_count: db.rides ? db.rides.length : 0,
      users: db.users ? db.users.map(u => ({ 
        id: u.id, 
        name: u.name, 
        email: u.email,
        passwordHashed: u.password.startsWith('$2a$') || u.password.startsWith('$2b$')
      })) : [],
      rides: db.rides || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.path);
  res.status(404).json({ 
    message: 'Route bulunamadı',
    method: req.method,
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Sunucu hatası' });
});

// Server'ı başlat
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log(`Test URL: http://localhost:${PORT}/test`);
  console.log(`bcryptjs available: ${!!bcrypt}`);
  
  // Test bcrypt
  bcrypt.hash('test123', 10).then(hash => {
    console.log('bcrypt test - hash created:', hash.substring(0, 20) + '...');
  }).catch(err => {
    console.error('bcrypt test failed:', err);
  });
});

module.exports = app;