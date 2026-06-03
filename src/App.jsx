import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Devis from './pages/Devis'
import Factures from './pages/Factures'
import Abonnements from './pages/Abonnements'
import Charges from './pages/Charges'
import Parametres from './pages/Parametres'

export default function App() {
  const [page, setPage] = useState('dashboard')

  const pages = {
    dashboard: <Dashboard onNavigate={setPage} />,
    clients: <Clients />,
    devis: <Devis />,
    factures: <Factures />,
    abonnements: <Abonnements />,
    charges: <Charges />,
    parametres: <Parametres />,
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {pages[page]}
    </Layout>
  )
}
