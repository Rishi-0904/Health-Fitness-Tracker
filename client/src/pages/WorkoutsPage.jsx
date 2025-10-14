import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiClient } from '../api/client.js';

const WORKOUT_TYPES = [
  'Cardio', 'Strength Training', 'Yoga', 'Pilates', 'Running', 'Cycling', 
  'Swimming', 'HIIT', 'CrossFit', 'Dancing', 'Walking', 'Hiking', 'Sports', 'Other'
];

const INTENSITY_LEVELS = ['light', 'moderate', 'vigorous'];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState([]);
  const [currentWorkout, setCurrentWorkout] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '',
    intensity: 'moderate',
    durationMin: '',
    caloriesBurned: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('form');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/workouts?limit=50');
      setWorkouts(response.data);
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentWorkout(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...currentWorkout,
        durationMin: parseInt(currentWorkout.durationMin) || 0,
        caloriesBurned: currentWorkout.caloriesBurned ? parseInt(currentWorkout.caloriesBurned) : null,
        date: new Date(currentWorkout.date).toISOString()
      };

      if (editingId) {
        await apiClient.put(`/workouts/${editingId}`, payload);
      } else {
        await apiClient.post('/workouts', payload);
      }

      await fetchWorkouts();
      
      // Reset form
      setCurrentWorkout({
        date: new Date().toISOString().split('T')[0],
        type: '',
        intensity: 'moderate',
        durationMin: '',
        caloriesBurned: '',
        notes: ''
      });
      setEditingId(null);
      
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditWorkout = (workout) => {
    setCurrentWorkout({
      ...workout,
      date: workout.date.split('T')[0],
      durationMin: workout.durationMin.toString(),
      caloriesBurned: workout.caloriesBurned?.toString() || ''
    });
    setEditingId(workout.id);
    setViewMode('form');
  };

  const handleDeleteWorkout = async (id) => {
    if (!confirm('Are you sure you want to delete this workout?')) return;
    
    try {
      await apiClient.delete(`/workouts/${id}`);
      await fetchWorkouts();
    } catch (error) {
      console.error('Failed to delete workout:', error);
      alert('Failed to delete workout. Please try again.');
    }
  };

  const calculateCalories = (type, intensity, duration) => {
    // Rough calorie calculation based on workout type and intensity
    const baseCalories = {
      'Cardio': 8,
      'Strength Training': 6,
      'Running': 12,
      'Cycling': 10,
      'Swimming': 11,
      'HIIT': 14,
      'CrossFit': 12,
      'Yoga': 3,
      'Pilates': 4,
      'Walking': 4,
      'Dancing': 7,
      'Hiking': 6,
      'Sports': 9
    };

    const intensityMultiplier = {
      'light': 0.7,
      'moderate': 1.0,
      'vigorous': 1.4
    };

    const base = baseCalories[type] || 6;
    const multiplier = intensityMultiplier[intensity] || 1.0;
    return Math.round(base * multiplier * duration);
  };

  // Auto-calculate calories when type, intensity, or duration changes
  useEffect(() => {
    if (currentWorkout.type && currentWorkout.intensity && currentWorkout.durationMin && !editingId) {
      const estimated = calculateCalories(currentWorkout.type, currentWorkout.intensity, parseInt(currentWorkout.durationMin));
      setCurrentWorkout(prev => ({
        ...prev,
        caloriesBurned: estimated.toString()
      }));
    }
  }, [currentWorkout.type, currentWorkout.intensity, currentWorkout.durationMin, editingId]);

  const filteredWorkouts = filterType === 'all' 
    ? workouts 
    : workouts.filter(w => w.type === filterType);

  const workoutStats = workouts.reduce((acc, workout) => {
    acc.totalWorkouts++;
    acc.totalMinutes += workout.durationMin;
    acc.totalCalories += workout.caloriesBurned || 0;
    acc.typeCount[workout.type] = (acc.typeCount[workout.type] || 0) + 1;
    return acc;
  }, { 
    totalWorkouts: 0, 
    totalMinutes: 0, 
    totalCalories: 0, 
    typeCount: {} 
  });

  const chartData = Object.entries(workoutStats.typeCount).map(([type, count]) => ({
    type,
    count,
    minutes: workouts
      .filter(w => w.type === type)
      .reduce((sum, w) => sum + w.durationMin, 0)
  }));

  const weeklyData = workouts
    .filter(w => {
      const workoutDate = new Date(w.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return workoutDate >= weekAgo;
    })
    .reduce((acc, workout) => {
      const day = new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + workout.durationMin;
      return acc;
    }, {});

  const weeklyChartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
    day,
    minutes: weeklyData[day] || 0
  }));

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your workouts...</p>
      </div>
    );
  }

  return (
    <div className="workouts-page">
      <div className="page-header">
        <h1>Workouts</h1>
        <div className="page-actions">
          <button 
            className={`tab-button ${viewMode === 'form' ? 'active' : ''}`}
            onClick={() => setViewMode('form')}
          >
            📝 Log Workout
          </button>
          <button 
            className={`tab-button ${viewMode === 'stats' ? 'active' : ''}`}
            onClick={() => setViewMode('stats')}
          >
            📊 Statistics
          </button>
          <button 
            className={`tab-button ${viewMode === 'history' ? 'active' : ''}`}
            onClick={() => setViewMode('history')}
          >
            📋 History
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <span className="stat-icon">🏋️</span>
          <div className="stat-content">
            <h3>{workoutStats.totalWorkouts}</h3>
            <p>Total Workouts</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏱️</span>
          <div className="stat-content">
            <h3>{Math.round(workoutStats.totalMinutes / 60)}h</h3>
            <p>Total Hours</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div className="stat-content">
            <h3>{workoutStats.totalCalories.toLocaleString()}</h3>
            <p>Calories Burned</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="stat-content">
            <h3>{Math.round(workoutStats.totalMinutes / workoutStats.totalWorkouts) || 0}</h3>
            <p>Avg Minutes</p>
          </div>
        </div>
      </div>

      {viewMode === 'form' && (
        <div className="workout-form-section">
          <div className="form-card">
            <h2>{editingId ? 'Edit Workout' : 'Log New Workout'}</h2>
            <form onSubmit={handleSubmit} className="workout-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={currentWorkout.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="type">Workout Type</label>
                  <select
                    id="type"
                    name="type"
                    value={currentWorkout.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select workout type</option>
                    {WORKOUT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="intensity">Intensity</label>
                  <select
                    id="intensity"
                    name="intensity"
                    value={currentWorkout.intensity}
                    onChange={handleInputChange}
                    required
                  >
                    {INTENSITY_LEVELS.map(level => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="durationMin">Duration (minutes)</label>
                  <input
                    type="number"
                    id="durationMin"
                    name="durationMin"
                    value={currentWorkout.durationMin}
                    onChange={handleInputChange}
                    placeholder="e.g., 45"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="caloriesBurned">
                    Calories Burned
                    <span className="field-hint">(Auto-calculated, you can edit)</span>
                  </label>
                  <input
                    type="number"
                    id="caloriesBurned"
                    name="caloriesBurned"
                    value={currentWorkout.caloriesBurned}
                    onChange={handleInputChange}
                    placeholder="e.g., 300"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={currentWorkout.notes}
                  onChange={handleInputChange}
                  placeholder="How did the workout feel? Any achievements or notes..."
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
                    editingId ? 'Update Workout' : 'Log Workout'
                  )}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => {
                      setCurrentWorkout({
                        date: new Date().toISOString().split('T')[0],
                        type: '',
                        intensity: 'moderate',
                        durationMin: '',
                        caloriesBurned: '',
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

      {viewMode === 'stats' && (
        <div className="workout-stats-section">
          {chartData.length > 0 ? (
            <>
              <div className="charts-grid">
                <div className="chart-card">
                  <h3>Workout Types Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, count }) => `${type}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Weekly Activity</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} min`, 'Workout Time']} />
                      <Bar dataKey="minutes" fill="#4ECDC4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <h3>Workout Minutes by Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="type" type="category" width={100} />
                    <Tooltip formatter={(value) => [`${value} min`, 'Total Minutes']} />
                    <Bar dataKey="minutes" fill="#96CEB4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No workout data yet</h3>
              <p>Start logging your workouts to see detailed statistics!</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('form')}
              >
                Log Your First Workout
              </button>
            </div>
          )}
        </div>
      )}

      {viewMode === 'history' && (
        <div className="workout-history-section">
          <div className="history-controls">
            <label htmlFor="filterType">Filter by type:</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              {WORKOUT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {filteredWorkouts.length > 0 ? (
            <div className="workouts-list">
              {filteredWorkouts.map((workout) => (
                <div key={workout.id} className="workout-item">
                  <div className="workout-header">
                    <h4>{workout.type}</h4>
                    <span className="workout-date">
                      {new Date(workout.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="workout-details">
                    <div className="workout-stats">
                      <span className="workout-stat">
                        <strong>{workout.durationMin}</strong> minutes
                      </span>
                      <span className="workout-stat">
                        <strong>{workout.intensity}</strong> intensity
                      </span>
                      {workout.caloriesBurned && (
                        <span className="workout-stat">
                          <strong>{workout.caloriesBurned}</strong> calories
                        </span>
                      )}
                    </div>
                    {workout.notes && (
                      <p className="workout-notes">{workout.notes}</p>
                    )}
                  </div>
                  <div className="workout-actions">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEditWorkout(workout)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteWorkout(workout.id)}
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
              <p>No workouts found{filterType !== 'all' ? ` for ${filterType}` : ''}.</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('form')}
              >
                Log a Workout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
