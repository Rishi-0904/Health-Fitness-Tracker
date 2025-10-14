import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { apiClient } from '../api/client.js';

const WEARABLE_PROVIDERS = [
  { id: 'fitbit', name: 'Fitbit', icon: '⌚', color: '#00B0B9' },
  { id: 'apple_health', name: 'Apple Health', icon: '🍎', color: '#007AFF' },
  { id: 'google_fit', name: 'Google Fit', icon: '🏃', color: '#4285F4' },
  { id: 'garmin', name: 'Garmin', icon: '📱', color: '#007CC3' },
  { id: 'samsung_health', name: 'Samsung Health', icon: '💚', color: '#1BA1E2' },
  { id: 'polar', name: 'Polar', icon: '❄️', color: '#FF6B35' },
  { id: 'strava', name: 'Strava', icon: '🔥', color: '#FC4C02' },
  { id: 'myfitnesspal', name: 'MyFitnessPal', icon: '🍽️', color: '#0066CC' }
];

export function WearablesPage() {
  const [syncHistory, setSyncHistory] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [viewMode, setViewMode] = useState('devices');

  useEffect(() => {
    fetchWearableData();
  }, []);

  const fetchWearableData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wearables');
      const syncsPayload = Array.isArray(response.data?.syncs)
        ? response.data.syncs
        : Array.isArray(response.data)
          ? response.data
          : [];
      setSyncHistory(syncsPayload);
      
      // Group by provider to show connected devices
      const devices = syncsPayload.reduce((acc, sync) => {
        if (!acc.find(d => d.provider === sync.provider)) {
          acc.push({
            provider: sync.provider,
            lastSync: sync.syncedAt,
            status: sync.status,
            totalSyncs: syncsPayload.filter(s => s.provider === sync.provider).length
          });
        }
        return acc;
      }, []);
      
      setConnectedDevices(devices);
    } catch (error) {
      console.error('Failed to fetch wearable data:', error);
      setSyncHistory([]);
      setConnectedDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (providerId) => {
    setSyncing(prev => ({ ...prev, [providerId]: true }));
    
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would redirect to OAuth or show connection instructions
      const mockSyncData = {
        provider: providerId,
        payload: {
          steps: Math.floor(Math.random() * 10000) + 5000,
          calories: Math.floor(Math.random() * 500) + 200,
          heartRate: Math.floor(Math.random() * 40) + 60,
          distance: Math.floor(Math.random() * 10) + 2,
          activeMinutes: Math.floor(Math.random() * 60) + 30
        },
        status: 'processed'
      };

      await apiClient.post('/wearables/sync', mockSyncData);
      await fetchWearableData();
      
      alert(`Successfully connected to ${WEARABLE_PROVIDERS.find(p => p.id === providerId)?.name}!`);
    } catch (error) {
      console.error('Failed to connect device:', error);
      alert('Failed to connect device. Please try again.');
    } finally {
      setSyncing(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleSync = async (provider) => {
    setSyncing(prev => ({ ...prev, [provider]: true }));
    
    try {
      // Simulate sync process with new data
      const mockSyncData = {
        provider: provider,
        payload: {
          steps: Math.floor(Math.random() * 10000) + 5000,
          calories: Math.floor(Math.random() * 500) + 200,
          heartRate: Math.floor(Math.random() * 40) + 60,
          distance: Math.floor(Math.random() * 10) + 2,
          activeMinutes: Math.floor(Math.random() * 60) + 30,
          sleep: Math.floor(Math.random() * 3) + 6
        },
        status: 'processed'
      };

      await apiClient.post('/wearables/sync', mockSyncData);
      await fetchWearableData();
      
    } catch (error) {
      console.error('Failed to sync device:', error);
      alert('Failed to sync device. Please try again.');
    } finally {
      setSyncing(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleDisconnect = async (provider) => {
    if (!confirm(`Are you sure you want to disconnect ${WEARABLE_PROVIDERS.find(p => p.id === provider)?.name}?`)) {
      return;
    }

    try {
      // In a real app, this would revoke OAuth tokens
      await apiClient.delete(`/wearables/disconnect/${provider}`);
      await fetchWearableData();
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      alert('Failed to disconnect device. Please try again.');
    }
  };

  const getProviderInfo = (providerId) => {
    return WEARABLE_PROVIDERS.find(p => p.id === providerId) || {
      id: providerId,
      name: providerId,
      icon: '📱',
      color: '#666'
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed': return '#2ed573';
      case 'pending': return '#ffa502';
      case 'error': return '#ff4757';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed': return '✅';
      case 'pending': return '⏳';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  // Prepare chart data for sync history
  const historyList = Array.isArray(syncHistory) ? syncHistory : [];

  const syncChartData = historyList
    .slice()
    .reverse()
    .slice(0, 10)
    .map(sync => ({
      date: new Date(sync.syncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      provider: sync.provider,
      status: sync.status,
      dataPoints: Object.keys(sync.payload).length
    }));

  const providerStats = historyList.reduce((acc, sync) => {
    acc[sync.provider] = (acc[sync.provider] || 0) + 1;
    return acc;
  }, {});

  const providerChartData = Object.entries(providerStats).map(([provider, count]) => ({
    provider: getProviderInfo(provider).name,
    syncs: count
  }));

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your wearable devices...</p>
      </div>
    );
  }

  return (
    <div className="wearables-page">
      <div className="page-header">
        <h1>Wearable Devices</h1>
        <div className="page-actions">
          <button 
            className={`tab-button ${viewMode === 'devices' ? 'active' : ''}`}
            onClick={() => setViewMode('devices')}
          >
            📱 My Devices
          </button>
          <button 
            className={`tab-button ${viewMode === 'sync' ? 'active' : ''}`}
            onClick={() => setViewMode('sync')}
          >
            🔄 Sync History
          </button>
          <button 
            className={`tab-button ${viewMode === 'connect' ? 'active' : ''}`}
            onClick={() => setViewMode('connect')}
          >
            ➕ Add Device
          </button>
        </div>
      </div>

      {/* Connected Devices Overview */}
      <div className="devices-overview">
        <div className="overview-stats">
          <div className="stat-card">
            <span className="stat-icon">📱</span>
            <div className="stat-content">
              <h3>{connectedDevices.length}</h3>
              <p>Connected Devices</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔄</span>
            <div className="stat-content">
              <h3>{historyList.length}</h3>
              <p>Total Syncs</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-content">
              <h3>{historyList.filter(s => s.status === 'processed').length}</h3>
              <p>Successful Syncs</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-content">
              <h3>{historyList.length > 0 ? new Date(historyList[0].syncedAt).toLocaleDateString() : 'Never'}</h3>
              <p>Last Sync</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'devices' && (
        <div className="connected-devices-section">
          {connectedDevices.length > 0 ? (
            <div className="devices-grid">
              {connectedDevices.map((device) => {
                const providerInfo = getProviderInfo(device.provider);
                return (
                  <div key={device.provider} className="device-card">
                    <div className="device-header">
                      <span 
                        className="device-icon"
                        style={{ color: providerInfo.color }}
                      >
                        {providerInfo.icon}
                      </span>
                      <div className="device-info">
                        <h3>{providerInfo.name}</h3>
                        <p className="device-status">
                          {getStatusIcon(device.status)} Connected
                        </p>
                      </div>
                    </div>
                    
                    <div className="device-stats">
                      <div className="device-stat">
                        <span className="stat-label">Last Sync:</span>
                        <span className="stat-value">
                          {new Date(device.lastSync).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="device-stat">
                        <span className="stat-label">Total Syncs:</span>
                        <span className="stat-value">{device.totalSyncs}</span>
                      </div>
                    </div>

                    <div className="device-actions">
                      <button 
                        className="button button-primary"
                        onClick={() => handleSync(device.provider)}
                        disabled={syncing[device.provider]}
                      >
                        {syncing[device.provider] ? (
                          <>
                            <span className="loading-spinner small"></span>
                            Syncing...
                          </>
                        ) : (
                          '🔄 Sync Now'
                        )}
                      </button>
                      <button 
                        className="button button-secondary"
                        onClick={() => handleDisconnect(device.provider)}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No devices connected</h3>
              <p>Connect your wearable devices to automatically sync your fitness data!</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('connect')}
              >
                Connect Your First Device
              </button>
            </div>
          )}
        </div>
      )}

      {viewMode === 'connect' && (
        <div className="connect-devices-section">
          <div className="connect-header">
            <h2>Connect New Device</h2>
            <p>Choose from our supported wearable devices and fitness apps</p>
          </div>
          
          <div className="available-devices-grid">
            {WEARABLE_PROVIDERS.map((provider) => {
              const isConnected = connectedDevices.some(d => d.provider === provider.id);
              
              return (
                <div key={provider.id} className="available-device-card">
                  <div className="device-header">
                    <span 
                      className="device-icon large"
                      style={{ color: provider.color }}
                    >
                      {provider.icon}
                    </span>
                    <h3>{provider.name}</h3>
                  </div>
                  
                  <div className="device-features">
                    <ul>
                      <li>✅ Steps & Activity</li>
                      <li>✅ Heart Rate</li>
                      <li>✅ Sleep Tracking</li>
                      <li>✅ Calories Burned</li>
                    </ul>
                  </div>

                  <div className="device-action">
                    {isConnected ? (
                      <button className="button button-success" disabled>
                        ✅ Connected
                      </button>
                    ) : (
                      <button 
                        className="button button-primary"
                        onClick={() => handleConnect(provider.id)}
                        disabled={syncing[provider.id]}
                      >
                        {syncing[provider.id] ? (
                          <>
                            <span className="loading-spinner small"></span>
                            Connecting...
                          </>
                        ) : (
                          'Connect'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="connection-info">
            <h3>How It Works</h3>
            <div className="info-steps">
              <div className="info-step">
                <span className="step-number">1</span>
                <div className="step-content">
                  <h4>Choose Your Device</h4>
                  <p>Select your wearable device or fitness app from the list above</p>
                </div>
              </div>
              <div className="info-step">
                <span className="step-number">2</span>
                <div className="step-content">
                  <h4>Authorize Access</h4>
                  <p>You'll be redirected to authorize FitTrack to access your fitness data</p>
                </div>
              </div>
              <div className="info-step">
                <span className="step-number">3</span>
                <div className="step-content">
                  <h4>Automatic Sync</h4>
                  <p>Your data will automatically sync and appear in your dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'sync' && (
        <div className="sync-history-section">
          {historyList.length > 0 ? (
            <>
              <div className="charts-grid">
                <div className="chart-card">
                  <h3>Sync Activity</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={syncChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="dataPoints" fill="#4ECDC4" name="Data Points Synced" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Syncs by Provider</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={providerChartData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="provider" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="syncs" fill="#96CEB4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="sync-history-list">
                <h3>Recent Sync History</h3>
                <div className="sync-items">
                  {historyList.slice(0, 20).map((sync) => {
                    const providerInfo = getProviderInfo(sync.provider);
                    return (
                      <div key={sync.id} className="sync-item">
                        <div className="sync-header">
                          <div className="sync-provider">
                            <span 
                              className="provider-icon"
                              style={{ color: providerInfo.color }}
                            >
                              {providerInfo.icon}
                            </span>
                            <span className="provider-name">{providerInfo.name}</span>
                          </div>
                          <div className="sync-status">
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: getStatusColor(sync.status) }}
                            >
                              {getStatusIcon(sync.status)} {sync.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="sync-details">
                          <div className="sync-time">
                            {new Date(sync.syncedAt).toLocaleString()}
                          </div>
                          <div className="sync-data">
                            {Object.entries(sync.payload).map(([key, value]) => (
                              <span key={key} className="data-point">
                                {key}: {typeof value === 'number' ? value.toLocaleString() : value}
                              </span>
                            ))}
                          </div>
                        </div>

                        {sync.errorMessage && (
                          <div className="sync-error">
                            ⚠️ {sync.errorMessage}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No sync history</h3>
              <p>Connect a device and sync some data to see your sync history!</p>
              <button 
                className="button button-primary"
                onClick={() => setViewMode('connect')}
              >
                Connect a Device
              </button>
            </div>
          )}
        </div>
      )}

      {/* Data Privacy Info */}
      <div className="privacy-info">
        <h3>🔒 Your Data Privacy</h3>
        <div className="privacy-points">
          <div className="privacy-point">
            <span className="privacy-icon">🛡️</span>
            <div>
              <h4>Secure Storage</h4>
              <p>All your fitness data is encrypted and stored securely</p>
            </div>
          </div>
          <div className="privacy-point">
            <span className="privacy-icon">🔐</span>
            <div>
              <h4>Your Control</h4>
              <p>You can disconnect devices and delete data anytime</p>
            </div>
          </div>
          <div className="privacy-point">
            <span className="privacy-icon">🚫</span>
            <div>
              <h4>No Sharing</h4>
              <p>We never share your personal fitness data with third parties</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
