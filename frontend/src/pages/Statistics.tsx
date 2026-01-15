import { useState } from 'react';
import Forecast from './Forecast';
import ContractStatistics from '../components/ContractStatistics';

function Statistics() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'contracts'>('forecast');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Statistik</h1>
        <p className="text-gray-600 mt-2">Provisionen, Umsatz und Vertragsentwicklung</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border-b border-gray-200">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
              activeTab === 'forecast'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Forecast
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
              activeTab === 'contracts'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Verträge
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'forecast' && <Forecast />}
        {activeTab === 'contracts' && <ContractStatistics />}
      </div>
    </div>
  );
}

export default Statistics;
