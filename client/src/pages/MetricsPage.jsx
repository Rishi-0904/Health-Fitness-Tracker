import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { apiClient } from '../api/client.js';

export function MetricsPage() {
  const [metrics, setMetrics] = useState([]);
  const [currentMetric, setCurrentMetric] = useState({
    date: new Date().toISOString().split('T')[0],
    calories: '',
    steps: '',
    sleepHours: '',
    workoutsMinutes: '',
    waterIntakeOz: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'chart'

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/metrics?limit=30');
      setMetrics(response.data);
      
      // Check if today's metric exists
      const today = new Date().toISOString().split('T')[0];
      const todayMetric = response.data.find(m => m.date.startsWith(today));
      if (todayMetric) {
        setCurrentMetric({
          ...todayMetric,
          date: todayMetric.date.split('T')[0]
        });
        setEditingId(todayMetric.id);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentMetric(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...currentMetric,
        calories: parseInt(currentMetric.calories) || 0,
        steps: parseInt(currentMetric.steps) || 0,
        sleepHours: parseFloat(currentMetric.sleepHours) || 0,
        workoutsMinutes: parseInt(currentMetric.workoutsMinutes) || 0,
        waterIntakeOz: parseFloat(currentMetric.waterIntakeOz) || 0,
        date: new Date(currentMetric.date).toISOString()
      };

      if (editingId) {
        await apiClient.put(`/metrics/${editingId}`, payload);
      } else {
        await apiClient.post('/metrics', payload);
      }

      await fetchMetrics();
      
      // Reset form for new entry
      setCurrentMetric({
        date: new Date().toISOString().split('T')[0],
        calories: '',
        steps: '',
        sleepHours: '',
        workoutsMinutes: '',
        waterIntakeOz: '',
        notes: ''
      });
      setEditingId(null);
      
    } catch (error) {
      console.error('Failed to save metric:', error);
      alert('Failed to save metric. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMetric = (metric) => {
    setCurrentMetric({
      ...metric,
      date: metric.date.split('T')[0]
    });
    setEditingId(metric.id);
    setViewMode('form');
  };

  const handleDeleteMetric = async (id) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      await apiClient.delete(`/metrics/${id}`);
      await fetchMetrics();
    } catch (error) {
      console.error('Failed to delete metric:', error);
      alert('Failed to delete metric. Please try again.');
    }
  };

  const chartData = metrics
    .slice()
    .reverse()
    .map(metric => ({
      date: new Date(metric.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calories: metric.calories,
      steps: metric.steps / 100, // Scale down for better visualization
      sleep: metric.sleepHours,
      workouts: metric.workoutsMinutes,
      water: metric.waterIntakeOz
    }));

  const getGoalProgress = (value, goal) => {
    return Math.min((value / goal) * 100, 100);
  };

  const goals = {
    calories: 2000,
    steps: 10000,
    sleepHours: 8,
    workoutsMinutes: 60,
    waterIntakeOz: 64
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your metrics...</p>
      </div>
    );
  }

  return (
    <div className="metrics-page">
      <div className="page-header">
        <h1>Daily Metrics</h1>
        <div className="page-actions">
          <button 
            className={`tab-button ${viewMode === 'form' ? 'active' : ''}`}
            onClick={() => setViewMode('form')}
          >
            📝 Log Data
          </button>
          <button 
            className={`tab-button ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
          >
            📊 View Trends
          </button>
        </div>
      </div>

      {viewMode === 'form' && (
        <div className="metrics-form-section">
          <div className="form-card">
            <h2>{editingId ? 'Update Today\'s Metrics' : 'Log Daily Metrics'}</h2>
            <form onSubmit={handleSubmit} className="metrics-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={currentMetric.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="calories">
                    Calories Consumed
                    <span className="goal-hint">Goal: {goals.calories} kcal</span>
                  </label>
                  <input
                    type="number"
                    id="calories"
                    name="calories"
                    value={currentMetric.calories}
                    onChange={handleInputChange}
                    placeholder="e.g., 1800"
                    min="0"
                  />
                  {currentMetric.calories && (
                    <div className="progress-indicator">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${getGoalProgress(currentMetric.calories, goals.calories)}%`,
                          backgroundColor: getGoalProgress(currentMetric.calories, goals.calories) >= 100 ? '#2ed573' : '#5352ed'
                        }}
                      ></div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="steps">
                    Steps Taken
                    <span className="goal-hint">Goal: {goals.steps.toLocaleString()} steps</span>
                  </label>
                  <input
                    type="number"
                    id="steps"
                    name="steps"
                    value={currentMetric.steps}
                    onChange={handleInputChange}
                    placeholder="e.g., 8500"
                    min="0"
                  />
                  {currentMetric.steps && (
                    <div className="progress-indicator">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${getGoalProgress(currentMetric.steps, goals.steps)}%`,
                          backgroundColor: getGoalProgress(currentMetric.steps, goals.steps) >= 100 ? '#2ed573' : '#4ECDC4'
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sleepHours">
                    Sleep Hours
                    <span className="goal-hint">Goal: {goals.sleepHours} hours</span>
                  </label>
                  <input
                    type="number"
                    id="sleepHours"
                    name="sleepHours"
                    value={currentMetric.sleepHours}
                    onChange={handleInputChange}
                    placeholder="e.g., 7.5"
                    min="0"
                    max="24"
                    step="0.1"
                  />
                  {currentMetric.sleepHours && (
                    <div className="progress-indicator">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${getGoalProgress(currentMetric.sleepHours, goals.sleepHours)}%`,
                          backgroundColor: getGoalProgress(currentMetric.sleepHours, goals.sleepHours) >= 100 ? '#2ed573' : '#45B7D1'
                        }}
                      ></div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="workoutsMinutes">
                    Workout Minutes
                    <span className="goal-hint">Goal: {goals.workoutsMinutes} min</span>
                  </label>
                  <input
                    type="number"
                    id="workoutsMinutes"
                    name="workoutsMinutes"
                    value={currentMetric.workoutsMinutes}
                    onChange={handleInputChange}
                    placeholder="e.g., 45"
                    min="0"
                  />
                  {currentMetric.workoutsMinutes && (
                    <div className="progress-indicator">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${getGoalProgress(currentMetric.workoutsMinutes, goals.workoutsMinutes)}%`,
                          backgroundColor: getGoalProgress(currentMetric.workoutsMinutes, goals.workoutsMinutes) >= 100 ? '#2ed573' : '#96CEB4'
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="waterIntakeOz">
                    Water Intake (oz)
                    <span className="goal-hint">Goal: {goals.waterIntakeOz} oz</span>
                  </label>
                  <input
                    type="number"
                    id="waterIntakeOz"
                    name="waterIntakeOz"
                    value={currentMetric.waterIntakeOz}
                    onChange={handleInputChange}
                    placeholder="e.g., 48"
                    min="0"
                    step="0.1"
                  />
                  {currentMetric.waterIntakeOz && (
                    <div className="progress-indicator">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${getGoalProgress(currentMetric.waterIntakeOz, goals.waterIntakeOz)}%`,
                          backgroundColor: getGoalProgress(currentMetric.waterIntakeOz, goals.waterIntakeOz) >= 100 ? '#2ed573' : '#74b9ff'
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={currentMetric.notes}
                  onChange={handleInputChange}
                  placeholder="Any additional notes about your day..."
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
                    editingId ? 'Update Metrics' : 'Save Metrics'
                  )}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => {
                      setCurrentMetric({
                        date: new Date().toISOString().split('T')[0],
                        calories: '',
                        steps: '',
                        sleepHours: '',
                        workoutsMinutes: '',
                        waterIntakeOz: '',
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

      {viewMode === 'chart' && (
        <div className="metrics-charts-section">
          {chartData.length > 0 ? (
            <>
              <div className="chart-card">
                <h3>Calories & Steps Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'steps') return [(value * 100).toLocaleString(), 'Steps'];
                        return [value, name === 'calories' ? 'Calories' : name];
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="calories" 
                      stackId="1"
                      stroke="#FF6B6B" 
                      fill="#FF6B6B"
                      fillOpacity={0.6}
                      name="calories"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="steps" 
                      stackId="2"
                      stroke="#4ECDC4" 
                      fill="#4ECDC4"
                      fillOpacity={0.6}
                      name="steps"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Sleep & Workout Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="sleep" 
                      stroke="#45B7D1" 
                      strokeWidth={3}
                      name="Sleep Hours"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="workouts" 
                      stroke="#96CEB4" 
                      strokeWidth={3}
                      name="Workout Minutes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No data to display</h3>
              <p>Start logging your daily metrics to see trends and insights!</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('form')}
              >
                Log Your First Metric
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Metrics List */}
      <div className="metrics-history">
        <h3>Recent Entries</h3>
        {metrics.length > 0 ? (
          <div className="metrics-list">
            {metrics.slice(0, 10).map((metric) => (
              <div key={metric.id} className="metric-item">
                <div className="metric-date">
                  {new Date(metric.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="metric-values">
                  <span className="metric-value">🔥 {metric.calories} cal</span>
                  <span className="metric-value">👟 {metric.steps.toLocaleString()}</span>
                  <span className="metric-value">😴 {metric.sleepHours}h</span>
                  <span className="metric-value">💪 {metric.workoutsMinutes}min</span>
                </div>
                <div className="metric-actions">
                  <button 
                    className="action-btn edit"
                    onClick={() => handleEditMetric(metric)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteMetric(metric.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No metrics logged yet. Start tracking your daily progress!</p>
          </div>
        )}
      </div>
    </div>
  );
}
