import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

type WeatherData = {
  city: string;
  country: string;
  temp: string;
  feelsLike: string;
  humidity: string;
  windspeed: string;
  desc: string;
  visibility: string;
  uvIndex: string;
  timestamp: number;
  forecast: Array<{
    date: string;
    maxTemp: string;
    minTemp: string;
    desc: string;
  }>;
};

export default function Weather(props?: any) {
  const location = useLocation();
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { tokens } = useTheme();

  // Load from cache on init
  useEffect(() => {
    const cached = localStorage.getItem('weather-cache');
    if (cached) {
      setWeather(JSON.parse(cached));
    }
  }, []);

  const fetchWeather = async (cityName: string) => {
    if (!cityName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(cityName)}?format=j1`);
      if (!res.ok) throw new Error('City not found');
      const data = await res.json();
      const cur = data.current_condition[0];
      const area = data.nearest_area[0];
      
      const newWeather: WeatherData = {
        city: area.areaName[0].value,
        country: area.country[0].value,
        temp: cur.temp_C,
        feelsLike: cur.FeelsLikeC,
        humidity: cur.humidity,
        windspeed: cur.windspeedKmph,
        desc: cur.weatherDesc[0].value,
        visibility: cur.visibility,
        uvIndex: cur.uvIndex,
        timestamp: Date.now(),
        forecast: data.weather.slice(0, 3).map((d: any) => ({
          date: d.date,
          maxTemp: d.maxtempC,
          minTemp: d.mintempC,
          desc: d.hourly[4]?.weatherDesc[0]?.value || '',
        })),
      };

      setWeather(newWeather);
      localStorage.setItem('weather-cache', JSON.stringify(newWeather));
    } catch (e) {
      setError('Could not fetch weather. Showing last cached data if available.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data) {
      const loc = data.location || data.city || '';
      if (loc) {
        setCity(String(loc));
        fetchWeather(String(loc));
      }
    }
  }, [location.state]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        await fetchWeather(`${latitude},${longitude}`);
      },
      () => setError('Location access denied.')
    );
  };

  const getWeatherIcon = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes('sun') || d.includes('clear')) return '☀️';
    if (d.includes('cloud') || d.includes('overcast')) return '☁️';
    if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
    if (d.includes('snow') || d.includes('sleet')) return '❄️';
    if (d.includes('thunder')) return '⛈️';
    if (d.includes('fog') || d.includes('mist')) return '🌫️';
    return '🌤️';
  };

  // Premium Dynamic Gradient Backgrounds based on weather
  const getGradient = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes('sun') || d.includes('clear')) {
      return 'linear-gradient(135deg, #FF9900, #FF5E36)'; // Sunny/Warm Gold
    }
    if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) {
      return 'linear-gradient(135deg, #1F1C2C, #928DAB)'; // Rainy Deep Purple/Blue
    }
    if (d.includes('cloud') || d.includes('overcast')) {
      return 'linear-gradient(135deg, #3E5151, #DECBA4)'; // Cloudy Slate
    }
    if (d.includes('thunder')) {
      return 'linear-gradient(135deg, #0F2027, #203A43, #2C5364)'; // Thunderstorm Dark Metallic
    }
    return `linear-gradient(135deg, ${tokens.surface}, ${tokens.background})`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const staleness = weather ? Math.floor((Date.now() - weather.timestamp) / 60000) : 0;

  return (
    <ToolWrapper toolName="Weather">
      <div style={styles.container}>
        <div style={styles.searchRow}>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchWeather(city)}
            placeholder="Enter city name..."
            style={{ 
              ...styles.input, 
              background: tokens.inputBg, 
              color: tokens.textPrimary, 
              borderColor: tokens.border 
            }}
          />
          <motion.button 
            onClick={() => fetchWeather(city)} 
            style={{ ...styles.btn, background: `linear-gradient(135deg, ${tokens.accent}, #8B5CF6)` }} 
            whileTap={{ scale: 0.97 }} 
            disabled={loading}
          >
            {loading ? '...' : 'Search'}
          </motion.button>
          <motion.button 
            onClick={getLocation} 
            style={{ ...styles.locBtn, background: tokens.inputBg, borderColor: tokens.border, color: tokens.accent }} 
            whileTap={{ scale: 0.97 }} 
            title="Use my location"
          >
            📍
          </motion.button>
        </div>

        {error && <div style={styles.error} aria-live="polite">{error}</div>}

        <AnimatePresence mode="wait">
          {weather && (
            <motion.div 
              key={weather.city}
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              style={{ 
                ...styles.weatherCard, 
                background: getGradient(weather.desc),
                borderColor: tokens.border
              }}
            >
              {staleness > 60 && (
                <div style={styles.staleNotice}>
                  ⚠️ Data is {Math.floor(staleness / 60)}h old. Refresh to update.
                </div>
              )}
              
              <div style={styles.mainSection}>
                <div style={styles.icon}>{getWeatherIcon(weather.desc)}</div>
                <div style={styles.mainInfo}>
                  <div style={styles.cityName}>{weather.city}, {weather.country}</div>
                  <div style={styles.tempRow}>
                    <span style={styles.temp}>{weather.temp}°</span>
                    <span style={styles.tempUnit}>C</span>
                  </div>
                  <div style={styles.descText}>{weather.desc}</div>
                  <div style={styles.feelsLike}>Feels like {weather.feelsLike}°C</div>
                </div>
              </div>

              <div style={styles.statsGrid}>
                {[
                  { label: 'Humidity', val: `${weather.humidity}%`, icon: '💧' },
                  { label: 'Wind', val: `${weather.windspeed} km/h`, icon: '🌬️' },
                  { label: 'Visibility', val: `${weather.visibility} km`, icon: '👁️' },
                  { label: 'UV Index', val: weather.uvIndex, icon: '☀️' },
                ].map(s => (
                  <div key={s.label} style={styles.statBox}>
                    <span style={styles.statIcon}>{s.icon}</span>
                    <span style={styles.statVal}>{s.val}</span>
                    <span style={styles.statLabel}>{s.label}</span>
                  </div>
                ))}
              </div>

              <div style={styles.forecast}>
                <div style={styles.forecastTitle}>3-Day Forecast</div>
                {weather.forecast.map((d, i) => (
                  <div key={i} style={styles.forecastRow}>
                    <span style={styles.forecastDate}>{i === 0 ? 'Today' : formatDate(d.date)}</span>
                    <span style={styles.forecastIcon}>{getWeatherIcon(d.desc)}</span>
                    <span style={styles.forecastDesc}>{d.desc}</span>
                    <span style={styles.forecastTemp}>
                      <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{d.maxTemp}°</span>
                      {' / '}
                      <span style={{ color: '#E0E0E0' }}>{d.minTemp}°</span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px', margin: '0 auto', padding: '10px' },
  searchRow: { display: 'flex', gap: '8px' },
  input: {
    flex: 1, border: '1px solid',
    borderRadius: '12px', fontSize: '16px', padding: '12px 16px', outline: 'none'
  },
  btn: {
    border: 'none', borderRadius: '12px',
    color: '#fff', fontSize: '13px', fontWeight: '700', padding: '12px 22px', cursor: 'pointer'
  },
  locBtn: {
    border: '1px solid', borderRadius: '12px', width: '48px', height: '48px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px'
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px', padding: '12px 16px', color: '#EF4444', fontSize: '14px',
  },
  weatherCard: { 
    borderRadius: '28px', padding: '28px', border: '1px solid',
    color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '28px',
    boxShadow: '0 12px 36px rgba(0,0,0,0.15)', textShadow: '0 1px 4px rgba(0,0,0,0.2)'
  },
  staleNotice: { 
    background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(4px)',
    borderRadius: '10px', padding: '8px 12px', fontSize: '11px', fontWeight: 'bold'
  },
  mainSection: { display: 'flex', gap: '24px', alignItems: 'center' },
  icon: { fontSize: '64px' },
  mainInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  cityName: { fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px' },
  tempRow: { display: 'flex', alignItems: 'baseline', marginTop: '4px' },
  temp: { fontSize: '48px', fontWeight: '900', lineHeight: 1 },
  tempUnit: { fontSize: '20px', marginLeft: '2px', fontWeight: 'bold' },
  descText: { fontSize: '15px', fontWeight: '700', textTransform: 'capitalize', opacity: 0.9 },
  feelsLike: { fontSize: '12px', opacity: 0.8 },
  statsGrid: { 
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', 
    background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)',
    borderRadius: '20px', padding: '16px 8px'
  },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' },
  statIcon: { fontSize: '20px' },
  statVal: { fontSize: '14px', fontWeight: '800' },
  statLabel: { fontSize: '9px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' },
  forecast: { 
    display: 'flex', flexDirection: 'column', gap: '12px',
    background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)',
    borderRadius: '20px', padding: '20px'
  },
  forecastTitle: { fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 },
  forecastRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' },
  forecastDate: { width: '80px', fontWeight: 'bold' },
  forecastIcon: { width: '30px', textAlign: 'center' },
  forecastDesc: { flex: 1, paddingLeft: '8px', opacity: 0.8 },
  forecastTemp: { width: '80px', textAlign: 'right', fontFamily: 'monospace' }
};
