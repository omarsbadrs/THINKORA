'use client';

import { useState } from 'react';
import OverviewCards from './OverviewCards';
import UsageTimeseries from './UsageTimeseries';
import CostPanel from './CostPanel';
import ModelUsageTable from './ModelUsageTable';
import ModelComparePanel from './ModelComparePanel';
import LogsPanel from './LogsPanel';
import ErrorPanel from './ErrorPanel';
import ConnectorStatusPanel from './ConnectorStatusPanel';
import IngestionStatusPanel from './IngestionStatusPanel';
import RetrievalHealthPanel from './RetrievalHealthPanel';
import ModelCatalogExplorer from './ModelCatalogExplorer';

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                     */
/* ------------------------------------------------------------------ */

const TABS = [
  'Overview',
  'Models',
  'Logs',
  'Costs',
  'Errors',
  'Connectors',
  'Jobs',
  'Retrieval',
] as const;

type TabId = (typeof TABS)[number];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState<TabId>('Overview');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-layout)',
      }}
    >
      {/* Page header */}
      <div style={{ padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Real-time overview of your Thinkora instance.
        </p>
      </div>

      {/* Page navigation tabs */}
      <nav className="page-nav">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`page-nav-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Content area */}
      <div className="page-scroll">
        {activeTab === 'Overview' && (
          <>
            <OverviewCards />
            <UsageTimeseries />
          </>
        )}
        {activeTab === 'Models' && (
          <>
            <ModelCatalogExplorer />
            <ModelUsageTable />
            <ModelComparePanel />
          </>
        )}
        {activeTab === 'Logs' && <LogsPanel />}
        {activeTab === 'Costs' && <CostPanel />}
        {activeTab === 'Errors' && <ErrorPanel />}
        {activeTab === 'Connectors' && <ConnectorStatusPanel />}
        {activeTab === 'Jobs' && <IngestionStatusPanel />}
        {activeTab === 'Retrieval' && <RetrievalHealthPanel />}
      </div>
    </div>
  );
}
