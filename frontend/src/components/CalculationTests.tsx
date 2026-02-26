import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface TestCalculation {
  label: string;
  value: string | number;
  details?: any;
}

interface TestResult {
  category: string;
  name: string;
  status: 'passed' | 'warning' | 'info';
  description: string;
  contract_id: string | null;
  contract_title: string | null;
  customer_name: string | null;
  calculations: TestCalculation[];
}

interface TestSummary {
  total_tests: number;
  passed: number;
  warnings: number;
  info: number;
}

interface TestResults {
  timestamp: string;
  summary: TestSummary;
  tests: TestResult[];
}

export default function CalculationTests() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const runTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.runCalculationTests();
      setResults(response);
      // Expand all tests with warnings by default
      const warningIndices = new Set<number>();
      response.tests.forEach((test: TestResult, index: number) => {
        if (test.status === 'warning') {
          warningIndices.add(index);
        }
      });
      setExpandedTests(warningIndices);
    } catch (err: any) {
      console.error('Error running tests:', err);
      setError(err.response?.data?.detail || 'Fehler beim Ausführen der Tests');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTests(newExpanded);
  };

  const expandAll = () => {
    const allIndices = new Set<number>();
    results?.tests.forEach((_, index) => allIndices.add(index));
    setExpandedTests(allIndices);
  };

  const collapseAll = () => {
    setExpandedTests(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✓';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '?';
    }
  };

  const categories = results
    ? ['all', ...Array.from(new Set(results.tests.map(t => t.category)))]
    : ['all'];

  const filteredTests = results?.tests.filter(
    test => filterCategory === 'all' || test.category === filterCategory
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Berechnungs-Tests</h2>
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Tests laufen...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Tests starten
            </>
          )}
        </button>
      </div>

      <p className="text-gray-600">
        Dieser Test prüft alle Berechnungen anhand der aktuellen Daten: Preiserhöhungen, Bestandsschutz, Provisionen und Exit-Auszahlungen.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {results && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{results.summary.total_tests}</div>
              <div className="text-sm text-gray-600">Gesamt</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{results.summary.passed}</div>
              <div className="text-sm text-green-700">Bestanden</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{results.summary.warnings}</div>
              <div className="text-sm text-yellow-700">Hinweise</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{results.summary.info}</div>
              <div className="text-sm text-blue-700">Info</div>
            </div>
          </div>

          {/* Filter & Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">Kategorie:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Alle Kategorien' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Alle aufklappen
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Alle zuklappen
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            {filteredTests.map((test, index) => {
              const globalIndex = results.tests.indexOf(test);
              const isExpanded = expandedTests.has(globalIndex);
              
              return (
                <div
                  key={globalIndex}
                  className={`border rounded-lg overflow-hidden ${getStatusColor(test.status)}`}
                >
                  {/* Header */}
                  <div
                    onClick={() => toggleExpand(globalIndex)}
                    className="p-4 cursor-pointer hover:bg-opacity-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{getStatusIcon(test.status)}</span>
                      <div>
                        <div className="font-medium">
                          <span className="text-xs uppercase opacity-60 mr-2">{test.category}</span>
                          {test.name}
                        </div>
                        <div className="text-sm opacity-80">{test.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {test.contract_id && (
                        <Link
                          to={`/customers/${test.contract_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-100 transition"
                        >
                          Zum Vertrag →
                        </Link>
                      )}
                      <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {/* Details */}
                  {isExpanded && test.calculations.length > 0 && (
                    <div className="bg-white bg-opacity-50 p-4 border-t space-y-3">
                      {test.customer_name && (
                        <div className="text-sm">
                          <span className="font-medium">Kunde:</span> {test.customer_name}
                        </div>
                      )}
                      
                      {test.calculations.map((calc, calcIndex) => (
                        <div key={calcIndex} className="bg-white rounded p-3 border border-gray-200">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-700">{calc.label}</span>
                            <span className="font-mono text-gray-900">
                              {typeof calc.value === 'object' ? JSON.stringify(calc.value) : calc.value}
                            </span>
                          </div>
                          
                          {calc.details && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              {Array.isArray(calc.details) ? (
                                <div className="space-y-2">
                                  {calc.details.map((detail: any, detailIndex: number) => (
                                    <div key={detailIndex} className="text-sm bg-gray-50 p-2 rounded">
                                      {detail.contract_id ? (
                                        // Contract detail
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <Link
                                              to={`/contracts/${detail.contract_id}`}
                                              className="text-blue-600 hover:underline font-medium"
                                            >
                                              {detail.contract_title}
                                            </Link>
                                            <span className="text-gray-500 ml-2">({detail.customer_name})</span>
                                            <div className="text-xs text-gray-500 mt-1">
                                              Start: {detail.start_date} | Basis: {detail.base_price}€ → Aktuell: {detail.current_price}€
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className={`px-2 py-0.5 rounded text-xs ${detail.applies ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {detail.applies ? 'Angewendet' : 'Nicht angewendet'}
                                            </span>
                                            <div className="text-xs text-gray-500 mt-1">{detail.reason}</div>
                                          </div>
                                        </div>
                                      ) : detail.type ? (
                                        // Commission detail
                                        <div className="flex justify-between">
                                          <span className="capitalize">{detail.type.replace('_', ' ')}</span>
                                          <span>
                                            {detail.amount} × {detail.rate} = <strong>{detail.commission}</strong>
                                          </span>
                                        </div>
                                      ) : (
                                        <pre className="text-xs overflow-auto">{JSON.stringify(detail, null, 2)}</pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : typeof calc.details === 'object' ? (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(calc.details).map(([key, value]) => (
                                    <div key={key} className="flex justify-between bg-gray-50 p-1 rounded">
                                      <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                      <span className="font-mono">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-600">{String(calc.details)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-sm text-gray-500 text-center">
            Tests durchgeführt am {new Date(results.timestamp).toLocaleString('de-DE')}
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="text-center py-12 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p>Klicke auf "Tests starten" um die Berechnungen zu prüfen</p>
        </div>
      )}
    </div>
  );
}
