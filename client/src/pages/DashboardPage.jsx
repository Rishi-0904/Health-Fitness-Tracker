import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { apiClient } from '../api/client.js';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function DashboardPage() {
  const [metrics, setMetrics] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [todayStats, setTodayStats] = useState({
    calories: 0,
    steps: 0,
    sleepHours: 0,
    workoutsMinutes: 0,
    waterIntakeOz: 0
  });
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent metrics
      const metricsRes = await apiClient.get('/metrics?limit=7');
      setMetrics(metricsRes.data);
      
      // Fetch recent workouts
      const workoutsRes = await apiClient.get('/workouts?limit=5');
      setRecentWorkouts(workoutsRes.data);
      
      // Calculate today's stats
      const today = new Date().toISOString().split('T')[0];
      const todayMetric = metricsRes.data.find(m => m.date.startsWith(today));
      if (todayMetric) {
        setTodayStats(todayMetric);
      }
      
      // Process weekly progress
      const weeklyData = metricsRes.data.map(metric => ({
        date: new Date(metric.date).toLocaleDateString('en-US', { weekday: 'short' }),
        calories: metric.calories,
        steps: metric.steps,
        sleep: metric.sleepHours,
        workouts: metric.workoutsMinutes
      }));
      setWeeklyProgress(weeklyData.reverse());
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    { 
      title: 'Today\'s Calories', 
      value: todayStats.calories, 
      unit: 'kcal', 
      icon: '🔥',
      color: '#FF6B6B',
      target: 2000,
      progress: (todayStats.calories / 2000) * 100
    },
    { 
      title: 'Steps Taken', 
      value: todayStats.steps.toLocaleString(), 
      unit: 'steps', 
      icon: '👟',
      color: '#4ECDC4',
      target: 10000,
      progress: (todayStats.steps / 10000) * 100
    },
    { 
      title: 'Sleep Hours', 
      value: todayStats.sleepHours, 
      unit: 'hrs', 
      icon: '😴',
      color: '#45B7D1',
      target: 8,
      progress: (todayStats.sleepHours / 8) * 100
    },
    { 
      title: 'Workout Time', 
      value: todayStats.workoutsMinutes, 
      unit: 'min', 
      icon: '💪',
      color: '#96CEB4',
      target: 60,
      progress: (todayStats.workoutsMinutes / 60) * 100
    }
  ];

  const workoutTypeData = recentWorkouts.reduce((acc, workout) => {
    acc[workout.type] = (acc[workout.type] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(workoutTypeData).map(([type, count]) => ({
    name: type,
    value: count
  }));

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your health and fitness overview</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="stats-grid">
        {quickStats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">{stat.icon}</span>
              <h3>{stat.title}</h3>
            </div>
            <div className="stat-value">
              <span className="value">{stat.value}</span>
              <span className="unit">{stat.unit}</span>
            </div>
            <div className="stat-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Math.min(stat.progress, 100)}%`,
                    backgroundColor: stat.color 
                  }}
                ></div>
              </div>
              <span className="progress-text">
                {Math.round(stat.progress)}% of {stat.target} {stat.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Weekly Progress Chart */}
        <div className="chart-card">
          <h3>Weekly Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="#FF6B6B" 
                strokeWidth={2}
                name="Calories"
              />
              <Line 
                type="monotone" 
                dataKey="steps" 
                stroke="#4ECDC4" 
                strokeWidth={2}
                name="Steps (÷100)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Workout Distribution */}
        <div className="chart-card">
          <h3>Workout Types</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No workout data yet. Start logging your workouts!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h3>Recent Workouts</h3>
        {recentWorkouts.length > 0 ? (
          <div className="activity-list">
            {recentWorkouts.map((workout) => (
              <div key={workout.id} className="activity-item">
                <div className="activity-icon">💪</div>
                <div className="activity-details">
                  <h4>{workout.type}</h4>
                  <p>{workout.durationMin} minutes • {workout.intensity}</p>
                  <span className="activity-date">
                    {new Date(workout.date).toLocaleDateString()}
                  </span>
                </div>
                {workout.caloriesBurned && (
                  <div className="activity-calories">
                    {workout.caloriesBurned} cal
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent workouts. Time to get moving! 🏃‍♂️</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => window.location.href = '/workouts'}>
            <span>🏋️</span>
            Log Workout
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/meals'}>
            <span>🍎</span>
            Add Meal
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/sleep'}>
            <span>😴</span>
            Log Sleep
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/metrics'}>
            <span>📊</span>
            Update Metrics
          </button>
        </div>
      </div>
    </div>
  );
}
