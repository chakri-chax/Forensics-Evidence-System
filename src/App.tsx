/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { useWallet } from "./context/WalletContext";
import WalletConnect from "./pages/WalletConnect";
import AdminDashboard from "./pages/AdminDashboard";
import CaseList from "./pages/CaseList";
import CaseDetail from "./pages/CaseDetail";
import Navbar from "./components/Navbar";
import { ToastProvider } from './components/Toast';

type View = "dashboard" | "cases" | "case-detail";

function App() {
  const { walletAddress, isAdmin, setWalletAddress, disconnect, hasReadAccess, hasWriteAccess } = useWallet();
  const [currentView, setCurrentView] = useState<View>("cases");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleConnect = (address: string) => {
    setWalletAddress(address);
  };

  const handleDisconnect = () => {
    disconnect();
    setCurrentView("cases");
    setSelectedCaseId(null);
  };

  const handleCaseCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    setCurrentView("cases");
  };

  const handleCaseSelect = (caseId: number) => {
    setSelectedCaseId(caseId);
    setCurrentView("case-detail");
  };

  const handleBackToCases = () => {
    setSelectedCaseId(null);
    setCurrentView("cases");
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!walletAddress) {
    return <WalletConnect onConnect={handleConnect} />;
  }


  return (
    <>

      <ToastProvider>
        <div className="min-h-screen bg-police-blue-dark">
          <Navbar
            walletAddress={walletAddress}
            isAdmin={isAdmin}
            onDisconnect={handleDisconnect}
          />

          {(isAdmin || hasReadAccess || hasWriteAccess) && (
            <div className="bg-police-blue border-b border-police-blue-light">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex gap-2 py-3">

                  {/* Admin Dashboard - Only Admin */}
                  {isAdmin && (
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className={`px-4 py-2 font-semibold transition-colors ${currentView === "dashboard"
                          ? "bg-police-red text-white"
                          : "text-gray-400 hover:text-white"
                        }`}
                    >
                      Admin Dashboard
                    </button>
                  )}

                  {/* Case Explorer - Read OR Write OR Admin */}
                  {(hasReadAccess || hasWriteAccess || isAdmin) && (
                    <button
                      onClick={() => setCurrentView("cases")}
                      className={`px-4 py-2 font-semibold transition-colors ${currentView === "cases" || currentView === "case-detail"
                          ? "bg-police-red text-white"
                          : "text-gray-400 hover:text-white"
                        }`}
                    >
                      Case Explorer
                    </button>
                  )}

                </div>
              </div>
            </div>
          )}


          {currentView === "dashboard" && isAdmin && (
            <AdminDashboard walletAddress={walletAddress} onCaseCreated={handleCaseCreated} />
          )}

          {currentView === "cases" && (hasReadAccess || hasWriteAccess || isAdmin) && (
            <CaseList
              walletAddress={walletAddress}
              onCaseSelect={handleCaseSelect}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentView === "case-detail" &&
            selectedCaseId !== null &&
            (hasReadAccess || hasWriteAccess || isAdmin) && (
              <CaseDetail
                walletAddress={walletAddress}
                caseId={selectedCaseId}
                onBack={handleBackToCases}
              />
            )}

        </div>

      </ToastProvider>
    </>
  );
}

export default App;
