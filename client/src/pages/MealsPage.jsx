import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { apiClient } from '../api/client.js';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];

const COMMON_FOODS = [
  { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
  { name: 'Salmon (100g)', calories: 208, protein: 22, carbs: 0, fat: 13 },
  { name: 'Greek Yogurt (1 cup)', calories: 130, protein: 23, carbs: 9, fat: 0.4 },
  { name: 'Avocado', calories: 234, protein: 3, carbs: 12, fat: 21 },
  { name: 'Oatmeal (1 cup)', calories: 154, protein: 6, carbs: 28, fat: 3 },
  { name: 'Eggs (2 large)', calories: 140, protein: 12, carbs: 1, fat: 10 },
  { name: 'Broccoli (1 cup)', calories: 25, protein: 3, carbs: 5, fat: 0.3 }
];

export function MealsPage() {
  const [meals, setMeals] = useState([]);
  const [currentMeal, setCurrentMeal] = useState({
    date: new Date().toISOString().split('T')[0],
    mealType: 'Breakfast',
    name: '',
    calories: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('form');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFoodSuggestions, setShowFoodSuggestions] = useState(false);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/meals?limit=100');
      const mealsPayload = Array.isArray(response.data?.meals)
        ? response.data.meals
        : Array.isArray(response.data)
          ? response.data
          : [];
      setMeals(mealsPayload);
    } catch (error) {
      console.error('Failed to fetch meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentMeal(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFoodSelect = (food) => {
    setCurrentMeal(prev => ({
      ...prev,
      name: food.name,
      calories: food.calories.toString(),
      proteinG: food.protein.toString(),
      carbsG: food.carbs.toString(),
      fatG: food.fat.toString()
    }));
    setShowFoodSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...currentMeal,
        calories: parseInt(currentMeal.calories) || 0,
        proteinG: parseFloat(currentMeal.proteinG) || 0,
        carbsG: parseFloat(currentMeal.carbsG) || 0,
        fatG: parseFloat(currentMeal.fatG) || 0,
        date: new Date(currentMeal.date).toISOString()
      };

      if (editingId) {
        await apiClient.put(`/meals/${editingId}`, payload);
      } else {
        await apiClient.post('/meals', payload);
      }

      await fetchMeals();
      
      // Reset form
      setCurrentMeal({
        date: new Date().toISOString().split('T')[0],
        mealType: 'Breakfast',
        name: '',
        calories: '',
        proteinG: '',
        carbsG: '',
        fatG: '',
        notes: ''
      });
      setEditingId(null);
      
    } catch (error) {
      console.error('Failed to save meal:', error);
      alert('Failed to save meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMeal = (meal) => {
    setCurrentMeal({
      ...meal,
      date: meal.date.split('T')[0],
      calories: meal.calories.toString(),
      proteinG: meal.proteinG.toString(),
      carbsG: meal.carbsG.toString(),
      fatG: meal.fatG.toString()
    });
    setEditingId(meal.id);
    setViewMode('form');
  };

  const handleDeleteMeal = async (id) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;
    
    try {
      await apiClient.delete(`/meals/${id}`);
      await fetchMeals();
    } catch (error) {
      console.error('Failed to delete meal:', error);
      alert('Failed to delete meal. Please try again.');
    }
  };

  // Calculate daily totals for selected date
  const mealsList = Array.isArray(meals) ? meals : [];

  const dailyMeals = mealsList.filter(meal => 
    meal.date.startsWith(selectedDate)
  );

  const dailyTotals = dailyMeals.reduce((acc, meal) => {
    acc.calories += meal.calories;
    acc.protein += meal.proteinG;
    acc.carbs += meal.carbsG;
    acc.fat += meal.fatG;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Macronutrient distribution
  const macroData = [
    { name: 'Protein', value: dailyTotals.protein * 4, grams: dailyTotals.protein }, // 4 cal/g
    { name: 'Carbs', value: dailyTotals.carbs * 4, grams: dailyTotals.carbs }, // 4 cal/g
    { name: 'Fat', value: dailyTotals.fat * 9, grams: dailyTotals.fat } // 9 cal/g
  ];

  // Meal type distribution for selected date
  const mealTypeData = MEAL_TYPES.map(type => {
    const typeMeals = dailyMeals.filter(meal => meal.mealType === type);
    return {
      type,
      calories: typeMeals.reduce((sum, meal) => sum + meal.calories, 0),
      count: typeMeals.length
    };
  });

  // Weekly calorie trend
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayMeals = mealsList.filter(meal => meal.date.startsWith(dateStr));
    const dayCalories = dayMeals.reduce((sum, meal) => sum + meal.calories, 0);
    
    weeklyData.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: dayCalories
    });
  }

  const calorieGoal = 2000; // This could be user-configurable
  const proteinGoal = 150; // grams
  const carbGoal = 250; // grams
  const fatGoal = 67; // grams

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your meals...</p>
      </div>
    );
  }

  return (
    <div className="meals-page">
      <div className="page-header">
        <h1>Nutrition Tracker</h1>
        <div className="page-actions">
          <button 
            className={`tab-button ${viewMode === 'form' ? 'active' : ''}`}
            onClick={() => setViewMode('form')}
          >
            🍎 Log Meal
          </button>
          <button 
            className={`tab-button ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
          >
            📅 Daily View
          </button>
          <button 
            className={`tab-button ${viewMode === 'analytics' ? 'active' : ''}`}
            onClick={() => setViewMode('analytics')}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="daily-summary">
        <div className="summary-header">
          <h3>Today's Nutrition</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
        </div>
        <div className="nutrition-cards">
          <div className="nutrition-card">
            <div className="nutrition-value">
              <span className="value">{dailyTotals.calories}</span>
              <span className="unit">kcal</span>
            </div>
            <div className="nutrition-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${Math.min((dailyTotals.calories / calorieGoal) * 100, 100)}%`,
                  backgroundColor: '#FF6B6B'
                }}
              ></div>
            </div>
            <p>Calories ({calorieGoal} goal)</p>
          </div>
          <div className="nutrition-card">
            <div className="nutrition-value">
              <span className="value">{Math.round(dailyTotals.protein)}</span>
              <span className="unit">g</span>
            </div>
            <div className="nutrition-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${Math.min((dailyTotals.protein / proteinGoal) * 100, 100)}%`,
                  backgroundColor: '#4ECDC4'
                }}
              ></div>
            </div>
            <p>Protein ({proteinGoal}g goal)</p>
          </div>
          <div className="nutrition-card">
            <div className="nutrition-value">
              <span className="value">{Math.round(dailyTotals.carbs)}</span>
              <span className="unit">g</span>
            </div>
            <div className="nutrition-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${Math.min((dailyTotals.carbs / carbGoal) * 100, 100)}%`,
                  backgroundColor: '#45B7D1'
                }}
              ></div>
            </div>
            <p>Carbs ({carbGoal}g goal)</p>
          </div>
          <div className="nutrition-card">
            <div className="nutrition-value">
              <span className="value">{Math.round(dailyTotals.fat)}</span>
              <span className="unit">g</span>
            </div>
            <div className="nutrition-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${Math.min((dailyTotals.fat / fatGoal) * 100, 100)}%`,
                  backgroundColor: '#96CEB4'
                }}
              ></div>
            </div>
            <p>Fat ({fatGoal}g goal)</p>
          </div>
        </div>
      </div>

      {viewMode === 'form' && (
        <div className="meal-form-section">
          <div className="form-card">
            <h2>{editingId ? 'Edit Meal' : 'Log New Meal'}</h2>
            <form onSubmit={handleSubmit} className="meal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={currentMeal.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mealType">Meal Type</label>
                  <select
                    id="mealType"
                    name="mealType"
                    value={currentMeal.mealType}
                    onChange={handleInputChange}
                    required
                  >
                    {MEAL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name">Food Name</label>
                <div className="food-input-container">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={currentMeal.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Grilled Chicken Salad"
                    required
                    onFocus={() => setShowFoodSuggestions(true)}
                  />
                  <button 
                    type="button"
                    className="suggestions-btn"
                    onClick={() => setShowFoodSuggestions(!showFoodSuggestions)}
                  >
                    💡 Suggestions
                  </button>
                </div>
                
                {showFoodSuggestions && (
                  <div className="food-suggestions">
                    <h4>Common Foods</h4>
                    <div className="suggestions-grid">
                      {COMMON_FOODS.map((food, index) => (
                        <button
                          key={index}
                          type="button"
                          className="suggestion-item"
                          onClick={() => handleFoodSelect(food)}
                        >
                          <span className="food-name">{food.name}</span>
                          <span className="food-calories">{food.calories} cal</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="calories">Calories</label>
                  <input
                    type="number"
                    id="calories"
                    name="calories"
                    value={currentMeal.calories}
                    onChange={handleInputChange}
                    placeholder="e.g., 350"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="proteinG">Protein (g)</label>
                  <input
                    type="number"
                    id="proteinG"
                    name="proteinG"
                    value={currentMeal.proteinG}
                    onChange={handleInputChange}
                    placeholder="e.g., 25"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="carbsG">Carbs (g)</label>
                  <input
                    type="number"
                    id="carbsG"
                    name="carbsG"
                    value={currentMeal.carbsG}
                    onChange={handleInputChange}
                    placeholder="e.g., 30"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fatG">Fat (g)</label>
                  <input
                    type="number"
                    id="fatG"
                    name="fatG"
                    value={currentMeal.fatG}
                    onChange={handleInputChange}
                    placeholder="e.g., 12"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={currentMeal.notes}
                  onChange={handleInputChange}
                  placeholder="Restaurant, recipe, or other notes..."
                  rows="2"
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
                    editingId ? 'Update Meal' : 'Log Meal'
                  )}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => {
                      setCurrentMeal({
                        date: new Date().toISOString().split('T')[0],
                        mealType: 'Breakfast',
                        name: '',
                        calories: '',
                        proteinG: '',
                        carbsG: '',
                        fatG: '',
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

      {viewMode === 'daily' && (
        <div className="daily-view-section">
          <div className="daily-meals">
            {MEAL_TYPES.map(mealType => {
              const typeMeals = Array.isArray(dailyMeals) ? dailyMeals.filter(meal => meal.mealType === mealType) : [];
              const typeCalories = typeMeals.reduce((sum, meal) => sum + meal.calories, 0);
              
              return (
                <div key={mealType} className="meal-type-section">
                  <div className="meal-type-header">
                    <h3>{mealType}</h3>
                    <span className="meal-calories">{typeCalories} calories</span>
                  </div>
                  {typeMeals.length > 0 ? (
                    <div className="meals-list">
                      {typeMeals.map(meal => (
                        <div key={meal.id} className="meal-item">
                          <div className="meal-info">
                            <h4>{meal.name}</h4>
                            <div className="meal-macros">
                              <span>{meal.calories} cal</span>
                              <span>P: {meal.proteinG}g</span>
                              <span>C: {meal.carbsG}g</span>
                              <span>F: {meal.fatG}g</span>
                            </div>
                            {meal.notes && <p className="meal-notes">{meal.notes}</p>}
                          </div>
                          <div className="meal-actions">
                            <button 
                              className="action-btn edit"
                              onClick={() => handleEditMeal(meal)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDeleteMeal(meal.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-meal-type">
                      <p>No {mealType.toLowerCase()} logged</p>
                      <button 
                        className="button button-small"
                        onClick={() => {
                          setCurrentMeal(prev => ({ ...prev, mealType, date: selectedDate }));
                          setViewMode('form');
                        }}
                      >
                        Add {mealType}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {dailyMeals.length > 0 && (
            <div className="daily-charts">
              <div className="chart-card">
                <h3>Macronutrient Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, grams }) => `${name}: ${Math.round(grams)}g`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${Math.round(value)} cal`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Calories by Meal</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={mealTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calories" fill="#4ECDC4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="analytics-section">
          {weeklyData.some(d => d.calories > 0) ? (
            <>
              <div className="chart-card">
                <h3>Weekly Calorie Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="calories" 
                      stroke="#FF6B6B" 
                      strokeWidth={3}
                      dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="nutrition-insights">
                <h3>Nutrition Insights</h3>
                <div className="insights-grid">
                  <div className="insight-card">
                    <h4>Average Daily Calories</h4>
                    <p className="insight-value">
                      {Math.round(weeklyData.reduce((sum, d) => sum + d.calories, 0) / 7)} kcal
                    </p>
                  </div>
                  <div className="insight-card">
                    <h4>Most Logged Meal</h4>
                    <p className="insight-value">
                      {meals.reduce((acc, meal) => {
                        acc[meal.mealType] = (acc[meal.mealType] || 0) + 1;
                        return acc;
                      }, {})}
                    </p>
                  </div>
                  <div className="insight-card">
                    <h4>Total Meals Logged</h4>
                    <p className="insight-value">{meals.length}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No nutrition data yet</h3>
              <p>Start logging your meals to see detailed analytics and trends!</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('form')}
              >
                Log Your First Meal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
