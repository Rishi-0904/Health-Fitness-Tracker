import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { apiClient } from '../api/client.js';

const SLEEP_QUALITY_OPTIONS = ['poor', 'fair', 'good', 'excellent'];

export function SleepPage() {
  const [sleepSessions, setSleepSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState({
    startTime: '',
    endTime: '',
    quality: 'good',
    interruptions: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('form');

  useEffect(() => {
    fetchSleepSessions();
  }, []);

  const fetchSleepSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/sleep?limit=30');
      setSleepSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sleep sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentSession(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime - startTime;
    return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...currentSession,
        interruptions: parseInt(currentSession.interruptions) || 0,
        startTime: new Date(currentSession.startTime).toISOString(),
        endTime: new Date(currentSession.endTime).toISOString()
      };

      // Validate that end time is after start time
      if (new Date(payload.endTime) <= new Date(payload.startTime)) {
        alert('End time must be after start time');
        return;
      }

      if (editingId) {
        await apiClient.put(`/sleep/${editingId}`, payload);
      } else {
        await apiClient.post('/sleep', payload);
      }

      await fetchSleepSessions();
      
      // Reset form
      setCurrentSession({
        startTime: '',
        endTime: '',
        quality: 'good',
        interruptions: '',
        notes: ''
      });
      setEditingId(null);
      
    } catch (error) {
      console.error('Failed to save sleep session:', error);
      alert('Failed to save sleep session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSession = (session) => {
    setCurrentSession({
      ...session,
      startTime: new Date(session.startTime).toISOString().slice(0, 16),
      endTime: new Date(session.endTime).toISOString().slice(0, 16),
      interruptions: session.interruptions.toString()
    });
    setEditingId(session.id);
    setViewMode('form');
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this sleep session?')) return;
    
    try {
      await apiClient.delete(`/sleep/${id}`);
      await fetchSleepSessions();
    } catch (error) {
      console.error('Failed to delete sleep session:', error);
      alert('Failed to delete sleep session. Please try again.');
    }
  };

  // Calculate sleep statistics
  const sleepStats = sleepSessions.reduce((acc, session) => {
    const duration = calculateDuration(session.startTime, session.endTime);
    acc.totalSessions++;
    acc.totalHours += duration;
    acc.totalInterruptions += session.interruptions;
    
    // Quality distribution
    acc.qualityCount[session.quality] = (acc.qualityCount[session.quality] || 0) + 1;
    
    return acc;
  }, {
    totalSessions: 0,
    totalHours: 0,
    totalInterruptions: 0,
    qualityCount: {}
  });

  const averageSleep = sleepStats.totalSessions > 0 ? sleepStats.totalHours / sleepStats.totalSessions : 0;
  const averageInterruptions = sleepStats.totalSessions > 0 ? sleepStats.totalInterruptions / sleepStats.totalSessions : 0;

  // Prepare chart data
  const chartData = sleepSessions
    .slice()
    .reverse()
    .slice(0, 14) // Last 14 days
    .map(session => {
      const duration = calculateDuration(session.startTime, session.endTime);
      const bedtime = new Date(session.startTime);
      const wakeTime = new Date(session.endTime);
      
      return {
        date: bedtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        duration: parseFloat(duration.toFixed(1)),
        quality: session.quality,
        qualityScore: SLEEP_QUALITY_OPTIONS.indexOf(session.quality) + 1,
        interruptions: session.interruptions,
        bedtimeHour: bedtime.getHours() + bedtime.getMinutes() / 60,
        waketimeHour: wakeTime.getHours() + wakeTime.getMinutes() / 60
      };
    });

  const qualityData = SLEEP_QUALITY_OPTIONS.map(quality => ({
    quality: quality.charAt(0).toUpperCase() + quality.slice(1),
    count: sleepStats.qualityCount[quality] || 0
  }));

  const getSleepQualityColor = (quality) => {
    const colors = {
      poor: '#ff4757',
      fair: '#ffa502',
      good: '#2ed573',
      excellent: '#5352ed'
    };
    return colors[quality] || '#gray';
  };

  const getOptimalSleepMessage = () => {
    if (averageSleep >= 7 && averageSleep <= 9) {
      return { message: "Great! You're getting optimal sleep.", color: '#2ed573' };
    } else if (averageSleep < 7) {
      return { message: "Try to get more sleep. Aim for 7-9 hours.", color: '#ffa502' };
    } else {
      return { message: "You might be oversleeping. 7-9 hours is ideal.", color: '#ffa502' };
    }
  };

  const sleepMessage = getOptimalSleepMessage();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your sleep data...</p>
      </div>
    );
  }

  return (
    <div className="sleep-page">
      <div className="page-header">
        <h1>Sleep Tracker</h1>
        <div className="page-actions">
          <button 
            className={`tab-button ${viewMode === 'form' ? 'active' : ''}`}
            onClick={() => setViewMode('form')}
          >
            😴 Log Sleep
          </button>
          <button 
            className={`tab-button ${viewMode === 'analytics' ? 'active' : ''}`}
            onClick={() => setViewMode('analytics')}
          >
            📊 Sleep Analytics
          </button>
          <button 
            className={`tab-button ${viewMode === 'history' ? 'active' : ''}`}
            onClick={() => setViewMode('history')}
          >
            📋 Sleep History
          </button>
        </div>
      </div>

      {/* Sleep Overview */}
      <div className="sleep-overview">
        <div className="sleep-stats-grid">
          <div className="stat-card">
            <span className="stat-icon">⏰</span>
            <div className="stat-content">
              <h3>{averageSleep.toFixed(1)}h</h3>
              <p>Average Sleep</p>
              <span className="stat-message" style={{ color: sleepMessage.color }}>
                {sleepMessage.message}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🛏️</span>
            <div className="stat-content">
              <h3>{sleepStats.totalSessions}</h3>
              <p>Total Sessions</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">😴</span>
            <div className="stat-content">
              <h3>{Math.round(sleepStats.totalHours)}h</h3>
              <p>Total Sleep Time</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🌙</span>
            <div className="stat-content">
              <h3>{averageInterruptions.toFixed(1)}</h3>
              <p>Avg Interruptions</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'form' && (
        <div className="sleep-form-section">
          <div className="form-card">
            <h2>{editingId ? 'Edit Sleep Session' : 'Log Sleep Session'}</h2>
            <form onSubmit={handleSubmit} className="sleep-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">Bedtime</label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    value={currentSession.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endTime">Wake Time</label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    value={currentSession.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {currentSession.startTime && currentSession.endTime && (
                <div className="duration-display">
                  <span className="duration-label">Sleep Duration:</span>
                  <span className="duration-value">
                    {calculateDuration(currentSession.startTime, currentSession.endTime).toFixed(1)} hours
                  </span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quality">Sleep Quality</label>
                  <select
                    id="quality"
                    name="quality"
                    value={currentSession.quality}
                    onChange={handleInputChange}
                    required
                  >
                    {SLEEP_QUALITY_OPTIONS.map(quality => (
                      <option key={quality} value={quality}>
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="interruptions">
                    Sleep Interruptions
                    <span className="field-hint">(Number of times you woke up)</span>
                  </label>
                  <input
                    type="number"
                    id="interruptions"
                    name="interruptions"
                    value={currentSession.interruptions}
                    onChange={handleInputChange}
                    placeholder="e.g., 2"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={currentSession.notes}
                  onChange={handleInputChange}
                  placeholder="How did you feel? Any factors affecting sleep..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="loading-spinner small"></span>
                      {editingId ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    editingId ? 'Update Sleep Session' : 'Log Sleep Session'
                  )}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => {
                      setCurrentSession({
                        startTime: '',
                        endTime: '',
                        quality: 'good',
                        interruptions: '',
                        notes: ''
                      });
                      setEditingId(null);
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="sleep-analytics-section">
          {chartData.length > 0 ? (
            <>
              <div className="charts-grid">
                <div className="chart-card">
                  <h3>Sleep Duration Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 12]} />
                      <Tooltip formatter={(value) => [`${value} hours`, 'Sleep Duration']} />
                      <Area 
                        type="monotone" 
                        dataKey="duration" 
                        stroke="#45B7D1" 
                        fill="#45B7D1"
                        fillOpacity={0.6}
                      />
                      {/* Optimal sleep range indicator */}
                      <Line y={7} stroke="#2ed573" strokeDasharray="5 5" />
                      <Line y={9} stroke="#2ed573" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Sleep Quality Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={qualityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quality" />
                      <YAxis />
                      <Tooltip />
                      <Bar 
                        dataKey="count" 
                        fill="#96CEB4"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <h3>Sleep Quality & Interruptions</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="qualityScore" 
                      stroke="#2ed573" 
                      strokeWidth={3}
                      name="Quality Score (1-4)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="interruptions" 
                      stroke="#ff4757" 
                      strokeWidth={2}
                      name="Interruptions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="sleep-insights">
                <h3>Sleep Insights</h3>
                <div className="insights-grid">
                  <div className="insight-card">
                    <h4>Sleep Consistency</h4>
                    <p className="insight-value">
                      {chartData.length > 1 ? 
                        `${((chartData.filter(d => d.duration >= 7 && d.duration <= 9).length / chartData.length) * 100).toFixed(0)}% optimal nights` :
                        'Need more data'
                      }
                    </p>
                  </div>
                  <div className="insight-card">
                    <h4>Best Sleep Quality</h4>
                    <p className="insight-value">
                      {Object.keys(sleepStats.qualityCount).length > 0 ?
                        Object.entries(sleepStats.qualityCount)
                          .sort(([,a], [,b]) => b - a)[0][0]
                          .charAt(0).toUpperCase() + Object.entries(sleepStats.qualityCount)
                          .sort(([,a], [,b]) => b - a)[0][0].slice(1) :
                        'No data'
                      }
                    </p>
                  </div>
                  <div className="insight-card">
                    <h4>Sleep Debt</h4>
                    <p className="insight-value">
                      {averageSleep < 7 ? 
                        `${(7 - averageSleep).toFixed(1)}h behind` :
                        'Well rested!'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No sleep data yet</h3>
              <p>Start logging your sleep sessions to see detailed analytics!</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('form')}
              >
                Log Your First Sleep Session
              </button>
            </div>
          )}
        </div>
      )}

      {viewMode === 'history' && (
        <div className="sleep-history-section">
          {sleepSessions.length > 0 ? (
            <div className="sleep-sessions-list">
              {sleepSessions.map((session) => {
                const duration = calculateDuration(session.startTime, session.endTime);
                const bedtime = new Date(session.startTime);
                const wakeTime = new Date(session.endTime);
                
                return (
                  <div key={session.id} className="sleep-session-item">
                    <div className="session-header">
                      <div className="session-date">
                        {bedtime.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="session-duration">
                        {duration.toFixed(1)} hours
                      </div>
                    </div>
                    <div className="session-details">
                      <div className="session-times">
                        <span className="bedtime">
                          🛏️ {bedtime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                        <span className="waketime">
                          ⏰ {wakeTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                      <div className="session-quality">
                        <span 
                          className="quality-badge"
                          style={{ backgroundColor: getSleepQualityColor(session.quality) }}
                        >
                          {session.quality.charAt(0).toUpperCase() + session.quality.slice(1)}
                        </span>
                        {session.interruptions > 0 && (
                          <span className="interruptions">
                            🌙 {session.interruptions} interruption{session.interruptions !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="session-notes">{session.notes}</p>
                      )}
                    </div>
                    <div className="session-actions">
                      <button 
                        className="action-btn edit"
                        onClick={() => handleEditSession(session)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>No sleep sessions logged yet.</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('form')}
              >
                Log Your First Sleep Session
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sleep Tips */}
      <div className="sleep-tips">
        <h3>💡 Sleep Tips</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>🕘 Consistent Schedule</h4>
            <p>Go to bed and wake up at the same time every day, even on weekends.</p>
          </div>
          <div className="tip-card">
            <h4>📱 Screen Time</h4>
            <p>Avoid screens 1 hour before bedtime. Blue light can disrupt sleep.</p>
          </div>
          <div className="tip-card">
            <h4>🌡️ Cool Environment</h4>
            <p>Keep your bedroom cool (60-67°F) for optimal sleep quality.</p>
          </div>
          <div className="tip-card">
            <h4>☕ Caffeine Timing</h4>
            <p>Avoid caffeine 6 hours before bedtime to prevent sleep disruption.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
