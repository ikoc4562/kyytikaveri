import React, { useState } from 'react';

interface SearchParams {
  from: string;
  to: string;
  date: string;
}

interface Props {
  onSearch: (params: SearchParams) => void;
}

const SearchForm: React.FC<Props> = ({ onSearch }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ from, to, date });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 400,
        margin: '40px auto',
        padding: 20,
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        boxShadow: '0 0 8px rgba(0,0,0,0.1)',
        color: '#333',
      }}
    >
      {['Nereden', 'Nereye', 'Tarih'].map((label, idx) => {
        const stateSetters = [setFrom, setTo, setDate];
        const stateValues = [from, to, date];
        const types = ['text', 'text', 'date'];
        return (
          <div key={idx} style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: '600' }}>{label}:</label>
            <input
              type={types[idx]}
              value={stateValues[idx]}
              onChange={e => stateSetters[idx](e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid #ddd',
                fontSize: 16,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#4CAF50')}
              onBlur={e => (e.currentTarget.style.borderColor = '#ddd')}
            />
          </div>
        );
      })}
      <button
        type="submit"
        style={{
          width: '100%',
          padding: 12,
          backgroundColor: '#4CAF50',
          border: 'none',
          borderRadius: 6,
          color: 'white',
          fontWeight: '700',
          fontSize: 16,
          cursor: 'pointer',
          transition: 'background-color 0.3s',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#45a049')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4CAF50')}
      >
        Search
      </button>
    </form>
  );
};

export default SearchForm;
