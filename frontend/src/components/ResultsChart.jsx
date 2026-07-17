import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ResultsChart({ room, socketId, onLeave, onPlayAgain, onDestroyRoom }) {
  const chipHistory = room.chipHistory;
  const isHost = room.hostId === socketId;
  // chipHistory: [{ id, name, isBot, history: [1000, 1100, 950] }, ...]
  
  // Find max length of history to generate hands array
  const maxHands = Math.max(...chipHistory.map(h => h.history.length), 0);
  
  // Format data for Recharts: [{ hand: 0, "Player1": 1000, "Bot1": 1000 }, { hand: 1, ... }]
  const data = Array.from({ length: maxHands }).map((_, i) => {
    const dataPoint = { hand: i };
    chipHistory.forEach(h => {
      // If player joined late, they might not have history for early hands, just use their first value or 0
      dataPoint[h.name] = h.history[i] !== undefined ? h.history[i] : (h.history[h.history.length - 1] || 0);
    });
    return dataPoint;
  });

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <div className="d-flex flex-col h-full w-full items-center justify-center p-4">
      <div className="glass" style={{ width: '100%', maxWidth: '900px', padding: '2rem', height: '600px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Match Results</h2>
        
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hand" stroke="#9ca3af" label={{ value: 'Hands Played', position: 'insideBottom', offset: -5 }} />
              <YAxis stroke="#9ca3af" label={{ value: 'Chips', angle: -90, position: 'insideLeft' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Legend verticalAlign="top" height={36}/>
              {chipHistory.map((h, i) => (
                <Line 
                  key={h.id} 
                  type="monotone" 
                  dataKey={h.name} 
                  stroke={colors[i % colors.length]} 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          {isHost && (
            <>
              <button className="success" onClick={onPlayAgain}>Play Again</button>
              <button className="danger" onClick={onDestroyRoom}>Destroy Room</button>
            </>
          )}
          <button className="danger" onClick={onLeave}>Leave Room</button>
        </div>
      </div>
    </div>
  );
}

export default ResultsChart;
