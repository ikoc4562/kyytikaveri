import React, { useState, useEffect, useRef } from 'react';

type Ride = {
  id: number;
  from: string;
  to: string;
  date: string;
  driver: string;
  price: number;
  availableSeats?: number;
};

type User = {
  id: number;
  name: string;
  email: string;
};

// Finlandiya şehirleri listesi
const finnishCities = [
  'Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 
  'Kuopio', 'Pori', 'Kouvola', 'Joensuu', 'Lappeenranta', 'Hämeenlinna', 'Vaasa',
  'Seinäjoki', 'Rovaniemi', 'Mikkeli', 'Kotka', 'Salo', 'Porvoo', 'Kokkola',
  'Hyvinkää', 'Lohja', 'Järvenpää', 'Rauma', 'Tuusula', 'Kirkkonummi', 'Kajaani',
  'Kerava', 'Naantali', 'Savonlinna', 'Nokia', 'Ylöjärvi', 'Kemi', 'Tornio',
  'Riihimäki', 'Raisio', 'Vihti', 'Iisalmi', 'Raahe', 'Imatra', 'Valkeakoski',
  'Hamina', 'Forssa', 'Äänekoski', 'Heinola', 'Parainen', 'Sastamala', 'Ylivieska'
];

// Autocomplete component
const AutoCompleteInput = ({ 
  value, 
  onChange, 
  placeholder, 
  style, 
  required = false 
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  style: React.CSSProperties;
  required?: boolean;
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      const filtered = finnishCities.filter(city =>
        city.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
      setActiveSuggestion(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestion >= 0) {
        handleSuggestionClick(suggestions[activeSuggestion]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }, 200);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => value.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        style={style}
        required={required}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                backgroundColor: index === activeSuggestion ? '#f0f0f0' : 'white',
                borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none'
              }}
              onMouseEnter={() => setActiveSuggestion(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  // State'ler
  const [from, setFrom] = useState('Helsinki');
  const [to, setTo] = useState('Tampere');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<Ride[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Kullanıcı yönetimi state'leri
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showCreateRide, setShowCreateRide] = useState(false);

  // Form state'leri
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');

  // Create ride form state'leri
  const [newRide, setNewRide] = useState({
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    price: '',
    availableSeats: 1
  });
  const [createRideError, setCreateRideError] = useState('');
  const [createRideLoading, setCreateRideLoading] = useState(false);

  // Token'ı memory'den yükle (localStorage yerine state kullanıyoruz)
  useEffect(() => {
    // Claude.ai artifacts'da localStorage kullanılamadığı için
    // Bu kısmı kaldırıyoruz veya session storage yerine state kullanıyoruz
  }, []);

  // API çağrıları için helper fonksiyon
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = 'http://localhost:3001';
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Bir hata oluştu');
    }

    return response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    setSearchLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        from,
        to,
        date
      });
      
      const data = await apiCall(`/rides?${queryParams}`);
      setResults(data);
    } catch (error) {
      console.error('Arama hatası:', error);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin 
        ? { email, password }
        : { name, email, password };

      const data = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // Başarılı giriş/kayıt
      setUser(data.user);
      setToken(data.token);
      setShowAuthForm(false);
      
      // Form temizle
      setEmail('');
      setPassword('');
      setName('');
      
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setShowCreateRide(false);
  };

  const handleCreateRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRideLoading(true);
    setCreateRideError('');

    try {
      const data = await apiCall('/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  
        },
        body: JSON.stringify({
          from: newRide.from,
          to: newRide.to,
          date: newRide.date,
          price: parseFloat(newRide.price),
          availableSeats: newRide.availableSeats
        }),
      });

      // Başarılı oluşturma
      setShowCreateRide(false);
      setNewRide({
        from: '',
        to: '',
        date: new Date().toISOString().split('T')[0],
        price: '',
        availableSeats: 1
      });

      // Arama sonuçlarını güncelle (eğer varsa)
      if (hasSearched) {
        handleSubmit(e);
      }

    } catch (error) {
      setCreateRideError(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setCreateRideLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setAuthError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  const swapFromTo = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>KyytiKaveri</h1>
        <div style={styles.userSection}>
          {user ? (
            <div style={styles.userInfo}>
              <span>Merhaba, {user.name}!</span>
              <button 
                onClick={() => setShowCreateRide(true)}
                style={styles.createRideButton}
              >
                Ride Oluştur
              </button>
              <button 
                onClick={handleLogout}
                style={styles.logoutButton}
              >
                Çıkış Yap
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthForm(true)}
              style={styles.loginButton}
            >
              Giriş Yap
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
              <button 
                onClick={() => setShowAuthForm(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div style={styles.authForm}>
              {!isLogin && (
                <label style={styles.authLabel}>
                  İsim
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.authInput}
                    required
                    minLength={2}
                  />
                </label>
              )}
              
              <label style={styles.authLabel}>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.authInput}
                  required
                />
              </label>
              
              <label style={styles.authLabel}>
                Şifre {!isLogin && <span style={styles.passwordHint}>(en az 6 karakter)</span>}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.authInput}
                  required
                  minLength={6}
                />
              </label>

              {authError && (
                <div style={styles.error}>{authError}</div>
              )}

              <button 
                type="button"
                onClick={handleAuth}
                disabled={authLoading}
                style={styles.authButton}
              >
                {authLoading ? 'Yükleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </div>

            <div style={styles.authToggle}>
              <span>
                {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}
              </span>
              <button 
                onClick={toggleAuthMode}
                style={styles.toggleButton}
              >
                {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ride Modal */}
      {showCreateRide && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2>Yeni Ride Oluştur</h2>
              <button 
                onClick={() => setShowCreateRide(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div style={styles.authForm}>
              <label style={styles.authLabel}>
                Nereden
                <AutoCompleteInput
                  value={newRide.from}
                  onChange={(value) => setNewRide({...newRide, from: value})}
                  placeholder="Örn: Helsinki"
                  style={styles.authInput}
                  required
                />
              </label>
              
              <label style={styles.authLabel}>
                Nereye
                <AutoCompleteInput
                  value={newRide.to}
                  onChange={(value) => setNewRide({...newRide, to: value})}
                  placeholder="Örn: Tampere"
                  style={styles.authInput}
                  required
                />
              </label>
              
              <label style={styles.authLabel}>
                Tarih
                <input
                  type="date"
                  value={newRide.date}
                  onChange={(e) => setNewRide({...newRide, date: e.target.value})}
                  style={styles.authInput}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </label>

              <label style={styles.authLabel}>
                Fiyat (€)
                <input
                  type="number"
                  value={newRide.price}
                  onChange={(e) => setNewRide({...newRide, price: e.target.value})}
                  style={styles.authInput}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </label>

              <label style={styles.authLabel}>
                Mevcut Koltuk Sayısı
                <input
                  type="number"
                  value={newRide.availableSeats}
                  onChange={(e) => setNewRide({...newRide, availableSeats: parseInt(e.target.value)})}
                  style={styles.authInput}
                  required
                  min="1"
                  max="8"
                />
              </label>

              {createRideError && (
                <div style={styles.error}>{createRideError}</div>
              )}

              <button 
                type="button"
                onClick={handleCreateRide}
                disabled={createRideLoading}
                style={styles.authButton}
              >
                {createRideLoading ? 'Oluşturuluyor...' : 'Ride Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Form */}
      <div style={styles.form}>
        <label style={styles.label}>
          Nereden
          <AutoCompleteInput
            value={from}
            onChange={setFrom}
            placeholder="Nereden"
            style={styles.input}
            required
          />
        </label>
        <button 
          type="button"
          onClick={swapFromTo}
          style={styles.swapButton}
          title="Yerları değiştir"
        >
          ⇄
        </button>
        <label style={styles.label}>
          Nereye
          <AutoCompleteInput
            value={to}
            onChange={setTo}
            placeholder="Nereye"
            style={styles.input}
            required
          />
        </label>

        <label style={styles.label}>
          Tarih
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={styles.input}
            required
          />
        </label>

        <button 
          type="button"
          onClick={handleSubmit}
          style={styles.button}
          disabled={searchLoading}
        >
          {searchLoading ? 'Aranıyor...' : 'Ara'}
        </button>
      </div>

      {/* Results */}
      <div style={styles.results}>
        {searchLoading && (
          <div style={styles.loading}>
            Rides aranıyor...
          </div>
        )}
        
        {hasSearched && !searchLoading && results.length === 0 && (
          <div style={styles.noResults}>
            Hiç ride bulunamadı.
          </div>
        )}
        
        {results.map((ride) => (
          <div key={ride.id} style={styles.rideCard}>
            <div style={styles.rideRoute}>
              <strong>{ride.from}</strong> ➡ <strong>{ride.to}</strong>
            </div>
            <div style={styles.rideDate}>{ride.date}</div>
            <div style={styles.rideDriver}>Sürücü: <strong>{ride.driver}</strong></div>
            <div style={styles.rideDetails}>
              <span style={styles.ridePrice}>€{ride.price}</span>
              {ride.availableSeats && (
                <span style={styles.rideSeats}>
                  {ride.availableSeats} koltuk mevcut
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: '"Roboto", Arial, sans-serif',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  title: {
    color: '#2e7d32',
    fontSize: '2rem',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#333',
  },
  loginButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2e7d32',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  createRideButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#1976d2',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    color: '#333',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  authLabel: {
    display: 'flex',
    flexDirection: 'column',
    fontWeight: 500,
    color: '#333',
  },
  authInput: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #bbb',
    marginTop: '5px',
    fontSize: '1rem',
  },
  authButton: {
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2e7d32',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    marginTop: '10px',
  },
  passwordHint: {
    fontSize: '0.8rem',
    color: '#666',
    fontWeight: 'normal',
  },
  error: {
    color: '#d32f2f',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    border: '1px solid #ffcdd2',
  },
  authToggle: {
    marginTop: '20px',
    textAlign: 'center',
    color: '#666',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#2e7d32',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginLeft: '5px',
  },
  form: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: '20px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    fontWeight: 500,
    color: '#333',
    flex: '1 1 150px',
    minWidth: '150px',
  },
  input: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #bbb',
    marginTop: '4px',
    width: '100%',
    height: '45px',
    boxSizing: 'border-box',
    fontSize: '1rem',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2e7d32',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    flex: '0 0 auto',
    alignSelf: 'center',
    marginTop: '25px',
    height: '45px',
  },
  swapButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #bbb',
    backgroundColor: '#fff',
    color: '#333',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    flex: '0 0 auto',
    alignSelf: 'center',
    marginTop: '25px',
    height: '45px',
    minWidth: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  results: {
    marginTop: '20px',
  },
  loading: {
    textAlign: 'center',
    color: '#666',
    padding: '20px',
    fontStyle: 'italic',
  },
  rideCard: {
    backgroundColor: '#fff',
    padding: '15px',
    margin: '10px auto',
    borderRadius: '6px',
    color: '#333',
    width: '90%',
    maxWidth: '450px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    textAlign: 'left',
    lineHeight: '1.5',
  },
  rideRoute: {
    fontSize: '1.1rem',
    marginBottom: '5px',
  },
  rideDate: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '5px',
  },
  rideDriver: {
    marginBottom: '8px',
  },
  rideDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  ridePrice: {
    fontWeight: 'bold',
    color: '#2e7d32',
    fontSize: '1.1rem',
  },
  rideSeats: {
    fontSize: '0.9rem',
    color: '#666',
  },
  noResults: {
    color: '#888',
    marginTop: '10px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
};