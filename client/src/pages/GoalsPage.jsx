import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { apiClient } from '../api/client.js';

const COLORS = ['#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF6B6B'];

export function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: '',
    title: '',
    description: '',
    targetValue: '',
    unit: '',
    targetDate: ''
  });

  useEffect(() => {
    fetchGoalsData();
  }, []);

  const fetchGoalsData = async () => {
    try {
      setLoading(true);
      const [goalsRes, templatesRes, statsRes] = await Promise.all([
        apiClient.get('/goals'),
        apiClient.get('/goals/templates'),
        apiClient.get('/goals/stats')
      ]);
      
      setGoals(goalsRes.data);
      setTemplates(templatesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch goals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...newGoal,
        targetValue: parseFloat(newGoal.targetValue),
        targetDate: newGoal.targetDate ? new Date(newGoal.targetDate).toISOString() : null
      };

      await apiClient.post('/goals', payload);
      await fetchGoalsData();
      
      setShowCreateForm(false);
      setNewGoal({
        type: '',
        title: '',
        description: '',
        targetValue: '',
        unit: '',
        targetDate: ''
      });
    } catch (error) {
      console.error('Failed to create goal:', error);
      alert('Failed to create goal. Please try again.');
    }
  };

  const handleUpdateProgress = async (goalId, newProgress) => {
    try {
      await apiClient.patch(`/goals/${goalId}/progress`, {
        currentValue: newProgress
      });
      await fetchGoalsData();
    } catch (error) {
      console.error('Failed to update progress:', error);
      alert('Failed to update progress. Please try again.');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      await apiClient.delete(`/goals/${goalId}`);
      await fetchGoalsData();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const handleTemplateSelect = (template) => {
    setNewGoal({
      type: template.type,
      title: template.title,
      description: template.description,
      targetValue: '',
      unit: template.suggestedUnit,
      targetDate: ''
    });
    setShowCreateForm(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#2ed573';
      case 'active': return '#4ECDC4';
      case 'paused': return '#ffa502';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'active': return '🎯';
      case 'paused': return '⏸️';
      default: return '❓';
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (viewMode === 'active') return goal.status === 'active';
    if (viewMode === 'completed') return goal.status === 'completed';
    return true;
  });

  const goalsByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {});

  const progressData = goals
    .filter(g => g.status === 'active')
    .map(goal => ({
      title: goal.title.length > 15 ? goal.title.substring(0, 15) + '...' : goal.title,
      progress: goal.progress || 0
    }));

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your goals...</p>
      </div>
    );
  }

  return (
    <div className="goals-page">
      <div className="page-header">
        <h1>Goals & Achievements</h1>
        <div className="page-actions">
          <button 
            className="button button-primary"
            onClick={() => setShowCreateForm(true)}
          >
            🎯 Create Goal
          </button>
        </div>
      </div>

      {/* Goals Statistics */}
      <div className="goals-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <div className="stat-content">
              <h3>{stats.active || 0}</h3>
              <p>Active Goals</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-content">
              <h3>{stats.completed || 0}</h3>
              <p>Completed</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-content">
              <h3>{stats.completionRate || 0}%</h3>
              <p>Success Rate</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚠️</span>
            <div className="stat-content">
              <h3>{stats.overdue || 0}</h3>
              <p>Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="goals-tabs">
        <button 
          className={`tab-button ${viewMode === 'active' ? 'active' : ''}`}
          onClick={() => setViewMode('active')}
        >
          🎯 Active Goals ({goals.filter(g => g.status === 'active').length})
        </button>
        <button 
          className={`tab-button ${viewMode === 'completed' ? 'active' : ''}`}
          onClick={() => setViewMode('completed')}
        >
          ✅ Completed ({goals.filter(g => g.status === 'completed').length})
        </button>
        <button 
          className={`tab-button ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
        >
          📋 All Goals ({goals.length})
        </button>
      </div>

      {/* Progress Chart */}
      {progressData.length > 0 && (
        <div className="chart-card">
          <h3>Goal Progress Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Progress']} />
              <Bar dataKey="progress" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Goals List */}
      <div className="goals-section">
        {filteredGoals.length > 0 ? (
          <div className="goals-list">
            {filteredGoals.map((goal) => (
              <div key={goal.id} className="goal-card">
                <div className="goal-header">
                  <div className="goal-info">
                    <h3>{goal.title}</h3>
                    <p className="goal-description">{goal.description}</p>
                    <div className="goal-meta">
                      <span className="goal-type">{goal.type.replace('_', ' ')}</span>
                      {goal.targetDate && (
                        <span className="goal-deadline">
                          Due: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="goal-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(goal.status) }}
                    >
                      {getStatusIcon(goal.status)} {goal.status}
                    </span>
                  </div>
                </div>

                <div className="goal-progress">
                  <div className="progress-info">
                    <span className="progress-text">
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                    <span className="progress-percentage">
                      {Math.round(goal.progress || 0)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${Math.min(goal.progress || 0, 100)}%`,
                        backgroundColor: getStatusColor(goal.status)
                      }}
                    ></div>
                  </div>
                </div>

                {goal.status === 'active' && (
                  <div className="goal-actions">
                    <div className="progress-update">
                      <input
                        type="number"
                        placeholder="Update progress"
                        min="0"
                        max={goal.targetValue}
                        step="0.1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateProgress(goal.id, parseFloat(e.target.value));
                            e.target.value = '';
                          }
                        }}
                      />
                      <button 
                        className="button button-small"
                        onClick={(e) => {
                          const input = e.target.previousElementSibling;
                          if (input.value) {
                            handleUpdateProgress(goal.id, parseFloat(input.value));
                            input.value = '';
                          }
                        }}
                      >
                        Update
                      </button>
                    </div>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteGoal(goal.id)}
                      title="Delete Goal"
                    >
                      🗑️
                    </button>
                  </div>
                )}

                {goal.daysRemaining !== null && goal.daysRemaining >= 0 && (
                  <div className="goal-countdown">
                    {goal.daysRemaining === 0 ? (
                      <span className="countdown-today">Due Today!</span>
                    ) : (
                      <span className="countdown-days">{goal.daysRemaining} days remaining</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No {viewMode} goals yet</h3>
            <p>Create your first goal to start tracking your progress!</p>
            <button 
              className="button button-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Goal
            </button>
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Goal</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>

            {!newGoal.type ? (
              <div className="goal-templates">
                <h3>Choose a Goal Template</h3>
                {Object.entries(goalsByCategory).map(([category, categoryTemplates]) => (
                  <div key={category} className="template-category">
                    <h4>{category}</h4>
                    <div className="templates-grid">
                      {categoryTemplates.map((template) => (
                        <button
                          key={template.type}
                          className="template-card"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <h5>{template.title}</h5>
                          <p>{template.description}</p>
                          <span className="template-unit">Unit: {template.suggestedUnit}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="template-category">
                  <h4>Custom</h4>
                  <button
                    className="template-card"
                    onClick={() => handleTemplateSelect({
                      type: 'custom',
                      title: 'Custom Goal',
                      description: 'Create your own personalized goal',
                      suggestedUnit: 'units'
                    })}
                  >
                    <h5>Custom Goal</h5>
                    <p>Create your own personalized goal</p>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateGoal} className="goal-form">
                <div className="form-group">
                  <label htmlFor="title">Goal Title</label>
                  <input
                    type="text"
                    id="title"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    placeholder="e.g., Lose 10 pounds"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description (Optional)</label>
                  <textarea
                    id="description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    placeholder="Describe your goal and motivation..."
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="targetValue">Target Value</label>
                    <input
                      type="number"
                      id="targetValue"
                      value={newGoal.targetValue}
                      onChange={(e) => setNewGoal({...newGoal, targetValue: e.target.value})}
                      placeholder="e.g., 10"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="unit">Unit</label>
                    <input
                      type="text"
                      id="unit"
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                      placeholder="e.g., lbs, miles, days"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="targetDate">Target Date (Optional)</label>
                  <input
                    type="date"
                    id="targetDate"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="button button-primary">
                    Create Goal
                  </button>
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => {
                      setNewGoal({
                        type: '',
                        title: '',
                        description: '',
                        targetValue: '',
                        unit: '',
                        targetDate: ''
                      });
                    }}
                  >
                    Back to Templates
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {stats.recentlyCompleted && stats.recentlyCompleted.length > 0 && (
        <div className="achievements-section">
          <h3>🏆 Recent Achievements</h3>
          <div className="achievements-list">
            {stats.recentlyCompleted.map((goal) => (
              <div key={goal.id} className="achievement-card">
                <span className="achievement-icon">🏆</span>
                <div className="achievement-info">
                  <h4>{goal.title}</h4>
                  <p>Completed on {new Date(goal.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
