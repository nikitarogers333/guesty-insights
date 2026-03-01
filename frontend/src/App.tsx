import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import OTAComparison from './pages/OTAComparison'
import Revenue from './pages/Revenue'
import Conversion from './pages/Conversion'
import Patterns from './pages/Patterns'
import ListingPerformance from './pages/ListingPerformance'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="ota-comparison" element={<OTAComparison />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="conversion" element={<Conversion />} />
        <Route path="patterns" element={<Patterns />} />
        <Route path="listings" element={<ListingPerformance />} />
      </Route>
    </Routes>
  )
}

export default App
