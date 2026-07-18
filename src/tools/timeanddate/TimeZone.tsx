import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

type Zone = {
  city: string;
  country: string;
  tz: string;
  flag: string;
  region: string;
};

const ALL_ZONES: Zone[] = [
  // Americas (20)
  { city: 'New York', country: 'USA', tz: 'America/New_York', flag: '🇺🇸', region: 'Americas' },
  { city: 'Toronto', country: 'Canada', tz: 'America/Toronto', flag: '🇨🇦', region: 'Americas' },
  { city: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo', flag: '🇧🇷', region: 'Americas' },
  { city: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires', flag: '🇦🇷', region: 'Americas' },
  { city: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City', flag: '🇲🇽', region: 'Americas' },
  { city: 'Bogotá', country: 'Colombia', tz: 'America/Bogota', flag: '🇨🇴', region: 'Americas' },
  { city: 'Lima', country: 'Peru', tz: 'America/Lima', flag: '🇵🇪', region: 'Americas' },
  { city: 'Santiago', country: 'Chile', tz: 'America/Santiago', flag: '🇨🇱', region: 'Americas' },
  { city: 'Caracas', country: 'Venezuela', tz: 'America/Caracas', flag: '🇻🇪', region: 'Americas' },
  { city: 'Quito', country: 'Ecuador', tz: 'America/Guayaquil', flag: '🇪🇨', region: 'Americas' },
  { city: 'San José', country: 'Costa Rica', tz: 'America/Costa_Rica', flag: '🇨🇷', region: 'Americas' },
  { city: 'Panama City', country: 'Panama', tz: 'America/Panama', flag: '🇵🇦', region: 'Americas' },
  { city: 'Kingston', country: 'Jamaica', tz: 'America/Jamaica', flag: '🇯🇲', region: 'Americas' },
  { city: 'Havana', country: 'Cuba', tz: 'America/Havana', flag: '🇨🇺', region: 'Americas' },
  { city: 'San Juan', country: 'Puerto Rico', tz: 'America/Puerto_Rico', flag: '🇵🇷', region: 'Americas' },
  { city: 'Santo Domingo', country: 'Dominican Republic', tz: 'America/Santo_Domingo', flag: '🇩🇴', region: 'Americas' },
  { city: 'Vancouver', country: 'Canada', tz: 'America/Vancouver', flag: '🇨🇦', region: 'Americas' },
  { city: 'Los Angeles', country: 'USA', tz: 'America/Los_Angeles', flag: '🇺🇸', region: 'Americas' },
  { city: 'Chicago', country: 'USA', tz: 'America/Chicago', flag: '🇺🇸', region: 'Americas' },
  { city: 'Honolulu', country: 'USA (Hawaii)', tz: 'Pacific/Honolulu', flag: '🇺🇸', region: 'Americas' },

  // Europe (25)
  { city: 'London', country: 'UK', tz: 'Europe/London', flag: '🇬🇧', region: 'Europe' },
  { city: 'Paris', country: 'France', tz: 'Europe/Paris', flag: '🇫🇷', region: 'Europe' },
  { city: 'Berlin', country: 'Germany', tz: 'Europe/Berlin', flag: '🇩🇪', region: 'Europe' },
  { city: 'Moscow', country: 'Russia', tz: 'Europe/Moscow', flag: '🇷🇺', region: 'Europe' },
  { city: 'Rome', country: 'Italy', tz: 'Europe/Rome', flag: '🇮🇹', region: 'Europe' },
  { city: 'Madrid', country: 'Spain', tz: 'Europe/Madrid', flag: '🇪🇸', region: 'Europe' },
  { city: 'Athens', country: 'Greece', tz: 'Europe/Athens', flag: '🇬🇷', region: 'Europe' },
  { city: 'Zurich', country: 'Switzerland', tz: 'Europe/Zurich', flag: '🇨🇭', region: 'Europe' },
  { city: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam', flag: '🇳🇱', region: 'Europe' },
  { city: 'Stockholm', country: 'Sweden', tz: 'Europe/Stockholm', flag: '🇸🇪', region: 'Europe' },
  { city: 'Oslo', country: 'Norway', tz: 'Europe/Oslo', flag: '🇳🇴', region: 'Europe' },
  { city: 'Kyiv', country: 'Ukraine', tz: 'Europe/Kyiv', flag: '🇺🇦', region: 'Europe' },
  { city: 'Warsaw', country: 'Poland', tz: 'Europe/Warsaw', flag: '🇵🇱', region: 'Europe' },
  { city: 'Vienna', country: 'Austria', tz: 'Europe/Vienna', flag: '🇦🇹', region: 'Europe' },
  { city: 'Brussels', country: 'Belgium', tz: 'Europe/Brussels', flag: '🇧🇪', region: 'Europe' },
  { city: 'Copenhagen', country: 'Denmark', tz: 'Europe/Copenhagen', flag: '🇩🇰', region: 'Europe' },
  { city: 'Helsinki', country: 'Finland', tz: 'Europe/Helsinki', flag: '🇫🇮', region: 'Europe' },
  { city: 'Lisbon', country: 'Portugal', tz: 'Europe/Lisbon', flag: '🇵🇹', region: 'Europe' },
  { city: 'Dublin', country: 'Ireland', tz: 'Europe/Dublin', flag: '🇮🇪', region: 'Europe' },
  { city: 'Budapest', country: 'Hungary', tz: 'Europe/Budapest', flag: '🇭🇺', region: 'Europe' },
  { city: 'Prague', country: 'Czech Republic', tz: 'Europe/Prague', flag: '🇨🇿', region: 'Europe' },
  { city: 'Bucharest', country: 'Romania', tz: 'Europe/Bucharest', flag: '🇷🇴', region: 'Europe' },
  { city: 'Monaco', country: 'Monaco', tz: 'Europe/Monaco', flag: '🇲🇨', region: 'Europe' },
  { city: 'Luxembourg', country: 'Luxembourg', tz: 'Europe/Luxembourg', flag: '🇱🇺', region: 'Europe' },
  { city: 'Vatican City', country: 'Vatican City', tz: 'Europe/Vatican', flag: '🇻🇦', region: 'Europe' },

  // Asia (30)
  { city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo', flag: '🇯🇵', region: 'Asia' },
  { city: 'Mumbai', country: 'India', tz: 'Asia/Kolkata', flag: '🇮🇳', region: 'Asia' },
  { city: 'Dubai', country: 'UAE', tz: 'Asia/Dubai', flag: '🇦🇪', region: 'Asia' },
  { city: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore', flag: '🇸🇬', region: 'Asia' },
  { city: 'Shanghai', country: 'China', tz: 'Asia/Shanghai', flag: '🇨🇳', region: 'Asia' },
  { city: 'Riyadh', country: 'Saudi Arabia', tz: 'Asia/Riyadh', flag: '🇸🇦', region: 'Asia' },
  { city: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul', flag: '🇰🇷', region: 'Asia' },
  { city: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok', flag: '🇹🇭', region: 'Asia' },
  { city: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta', flag: '🇮🇩', region: 'Asia' },
  { city: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong', flag: '🇭🇰', region: 'Asia' },
  { city: 'Taipei', country: 'Taiwan', tz: 'Asia/Taipei', flag: '🇹🇼', region: 'Asia' },
  { city: 'Ho Chi Minh', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', flag: '🇻🇳', region: 'Asia' },
  { city: 'Manila', country: 'Philippines', tz: 'Asia/Manila', flag: '🇵🇭', region: 'Asia' },
  { city: 'Kuala Lumpur', country: 'Malaysia', tz: 'Asia/Kuala_Lumpur', flag: '🇲🇾', region: 'Asia' },
  { city: 'Karachi', country: 'Pakistan', tz: 'Asia/Karachi', flag: '🇵🇰', region: 'Asia' },
  { city: 'Dhaka', country: 'Bangladesh', tz: 'Asia/Dhaka', flag: '🇧🇩', region: 'Asia' },
  { city: 'Tehran', country: 'Iran', tz: 'Asia/Tehran', flag: '🇮🇷', region: 'Asia' },
  { city: 'Baghdad', country: 'Iraq', tz: 'Asia/Baghdad', flag: '🇮🇶', region: 'Asia' },
  { city: 'Jerusalem', country: 'Israel', tz: 'Asia/Jerusalem', flag: '🇮🇱', region: 'Asia' },
  { city: 'Istanbul', country: 'Turkey', tz: 'Europe/Istanbul', flag: '🇹🇷', region: 'Asia' },
  { city: 'Amman', country: 'Jordan', tz: 'Asia/Amman', flag: '🇯🇴', region: 'Asia' },
  { city: 'Beirut', country: 'Lebanon', tz: 'Asia/Beirut', flag: '🇱🇧', region: 'Asia' },
  { city: 'Kuwait City', country: 'Kuwait', tz: 'Asia/Kuwait', flag: '🇰🇼', region: 'Asia' },
  { city: 'Doha', country: 'Qatar', tz: 'Asia/Doha', flag: '🇶🇦', region: 'Asia' },
  { city: 'Muscat', country: 'Oman', tz: 'Asia/Muscat', flag: '🇴🇲', region: 'Asia' },
  { city: 'Colombo', country: 'Sri Lanka', tz: 'Asia/Colombo', flag: '🇱🇰', region: 'Asia' },
  { city: 'Kathmandu', country: 'Nepal', tz: 'Asia/Kathmandu', flag: '🇳🇵', region: 'Asia' },
  { city: 'Yangon', country: 'Myanmar', tz: 'Asia/Yangon', flag: '🇲🇲', region: 'Asia' },
  { city: 'Phnom Penh', country: 'Cambodia', tz: 'Asia/Phnom_Penh', flag: '🇰🇭', region: 'Asia' },
  { city: 'Tashkent', country: 'Uzbekistan', tz: 'Asia/Tashkent', flag: '🇺🇿', region: 'Asia' },

  // Africa (15)
  { city: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo', flag: '🇪🇬', region: 'Africa' },
  { city: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg', flag: '🇿🇦', region: 'Africa' },
  { city: 'Lagos', country: 'Nigeria', tz: 'Africa/Lagos', flag: '🇳🇬', region: 'Africa' },
  { city: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi', flag: '🇰🇪', region: 'Africa' },
  { city: 'Casablanca', country: 'Morocco', tz: 'Africa/Casablanca', flag: '🇲🇦', region: 'Africa' },
  { city: 'Algiers', country: 'Algeria', tz: 'Africa/Algiers', flag: '🇩🇿', region: 'Africa' },
  { city: 'Addis Ababa', country: 'Ethiopia', tz: 'Africa/Addis_Ababa', flag: '🇪🇹', region: 'Africa' },
  { city: 'Accra', country: 'Ghana', tz: 'Africa/Accra', flag: '🇬🇭', region: 'Africa' },
  { city: 'Dakar', country: 'Senegal', tz: 'Africa/Dakar', flag: '🇸🇳', region: 'Africa' },
  { city: 'Dar es Salaam', country: 'Tanzania', tz: 'Africa/Dar_es_Salaam', flag: '🇹🇿', region: 'Africa' },
  { city: 'Kampala', country: 'Uganda', tz: 'Africa/Kampala', flag: '🇺🇬', region: 'Africa' },
  { city: 'Antananarivo', country: 'Madagascar', tz: 'Indian/Antananarivo', flag: '🇲🇬', region: 'Africa' },
  { city: 'Port Louis', country: 'Mauritius', tz: 'Indian/Mauritius', flag: '🇲🇺', region: 'Africa' },
  { city: 'Victoria', country: 'Seychelles', tz: 'Indian/Mahe', flag: '🇸🇨', region: 'Africa' },
  { city: 'Almaty', country: 'Kazakhstan', tz: 'Asia/Almaty', flag: '🇰🇿', region: 'Africa' },

  // Oceania & Islands (7)
  { city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney', flag: '🇦🇺', region: 'Oceania' },
  { city: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland', flag: '🇳🇿', region: 'Oceania' },
  { city: 'Fiji', country: 'Fiji', tz: 'Pacific/Fiji', flag: '🇫🇯', region: 'Oceania' },
  { city: 'Port Moresby', country: 'Papua New Guinea', tz: 'Pacific/Port_Moresby', flag: '🇵🇬', region: 'Oceania' },
  { city: 'Honiara', country: 'Solomon Islands', tz: 'Pacific/Guadalcanal', flag: '🇸🇧', region: 'Oceania' },
  { city: 'Apia', country: 'Samoa', tz: 'Pacific/Apia', flag: '🇼🇸', region: 'Oceania' },
  { city: 'Nuku\'alofa', country: 'Tonga', tz: 'Pacific/Tongatapu', flag: '🇹🇴', region: 'Oceania' }
];

const REGIONS = ['All', 'Americas', 'Europe', 'Asia', 'Africa', 'Oceania'];

export default function TimeZone(props?: any) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All');
  const [tick, setTick] = useState(0);
  const { tokens } = useTheme();
  const location = useLocation();

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
      if (data.timezone) {
        setSearch(String(data.timezone));
      } else if (data.search) {
        setSearch(String(data.search));
      }
    }
  }, [location.state]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const getTimeData = (tz: string) => {
    const now = new Date();
    try {
      const time = now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const date = now.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' });
      return { time, date };
    } catch {
      return { time: '--:--:--', date: '---' };
    }
  };

  const filtered = ALL_ZONES.filter(z => {
    const matchRegion = region === 'All' || z.region === region;
    const matchSearch = z.city.toLowerCase().includes(search.toLowerCase()) || 
                      z.country.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchSearch;
  });

  return (
    <ToolWrapper toolName="Time Zone (World Clock)">
      <div style={styles.container}>
        <div style={styles.header}>
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search city or country..." 
            style={{ 
              ...styles.search, 
              color: tokens.textPrimary,
              borderColor: tokens.border,
              background: tokens.inputBg
            }}
          />
          <div style={styles.tabs}>
            {REGIONS.map(r => (
              <button 
                key={r} 
                onClick={() => setRegion(r)}
                style={{ 
                  ...styles.tab, 
                  background: region === r ? tokens.accent : tokens.surface,
                  color: region === r ? '#ffffff' : tokens.textSecondary,
                  borderColor: region === r ? tokens.accent : tokens.border
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.grid}>
          {filtered.map(z => {
            const data = getTimeData(z.tz);
            return (
              <motion.div 
                key={z.tz} 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ 
                  ...styles.card, 
                  background: tokens.surface,
                  borderColor: tokens.border
                }}
              >
                <div style={styles.cardTop}>
                  <span style={styles.flag}>{z.flag}</span>
                  <div style={styles.location}>
                    <div style={{ ...styles.city, color: tokens.textPrimary }}>{z.city}</div>
                    <div style={styles.country}>{z.country}</div>
                  </div>
                </div>
                <div style={{ ...styles.time, color: tokens.accent }}>{data.time}</div>
                <div style={styles.date}>{data.date}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px' },
  header: { display: 'flex', flexDirection: 'column', gap: '16px' },
  search: { border: '1px solid', borderRadius: '14px', padding: '14px 20px', fontSize: '16px', outline: 'none', width: '100%' },
  tabs: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' },
  tab: { border: '1px solid', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' },
  card: { border: '1px solid', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  cardTop: { display: 'flex', gap: '12px', alignItems: 'center' },
  flag: { fontSize: '24px' },
  location: { display: 'flex', flexDirection: 'column' },
  city: { fontSize: '15px', fontWeight: 'bold' },
  country: { fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  time: { fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px', fontFamily: 'monospace' },
  date: { fontSize: '12px', color: 'var(--color-text-muted)' }
};
