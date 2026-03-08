import React, { useState, useRef, useEffect, useMemo } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder = "Select...", displayKey = "name", returnKey = "name", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  // Derive the display text for the current value
  const displayText = useMemo(() => {
    if (!value) return '';
    const selectedOption = options.find(opt => typeof opt === 'object' ? opt[returnKey] === value : opt === value);
    return selectedOption ? (typeof selectedOption === 'object' ? selectedOption[displayKey] : selectedOption) : value;
  }, [value, options, displayKey, returnKey]);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch(''); // Reset search when closed
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter(opt => {
      const text = typeof opt === 'object' ? String(opt[displayKey]) : String(opt);
      return text.toLowerCase().includes(s);
    });
  }, [options, search, displayKey]);

  const handleSelect = (opt) => {
    const val = typeof opt === 'object' ? opt[returnKey] : opt;
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: disabled ? '#f8fafc' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '38px',
          color: displayText ? 'inherit' : 'var(--muted)',
          fontSize: 13,
          boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
          borderColor: isOpen ? 'var(--accent)' : 'var(--border)'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayText || placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          maxHeight: 250,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1, padding: 4 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const text = typeof opt === 'object' ? opt[displayKey] : opt;
                const val = typeof opt === 'object' ? opt[returnKey] : opt;
                const isSelected = value === val;
                
                return (
                  <div 
                    key={i}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: 4,
                      fontSize: 13,
                      background: isSelected ? '#eff6ff' : 'transparent',
                      color: isSelected ? '#1d4ed8' : '#334155',
                      fontWeight: isSelected ? 600 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{text}</span>
                    {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
