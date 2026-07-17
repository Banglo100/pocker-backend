import React from 'react';

function Stats({ stats, onClose }) {
  return (
    <div className="d-flex flex-col items-center justify-center" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, padding: '1rem' }}>
      <div className="glass" style={{ padding: '2rem', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        
        <div className="d-flex justify-between items-center">
          <h2 style={{ margin: 0 }}>My Stats 📊</h2>
          <button className="danger" onClick={onClose} style={{ padding: '0.4rem 0.8rem' }}>X</button>
        </div>

        <div className="d-flex flex-col gap-4">
          <div className="glass" style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Hands Played</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalHandsPlayed}</div>
          </div>
          
          <div className="glass" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Hands Won</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.handsWon}</div>
          </div>

          <div className="glass" style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Total Chips Won</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{stats.totalChipsWon.toLocaleString()}</div>
          </div>

          <div className="glass" style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Biggest Pot Won</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a78bfa' }}>{stats.biggestPotWon.toLocaleString()}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Stats;
