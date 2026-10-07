import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import AuthModal from './AuthModal';

export default function Layout({ children, transparentNavbar = false }) {
    const [authModalState, setAuthModalState] = useState({
        isOpen: false,
        mode: 'login'
    });

    const handleOpenAuth = (mode = 'login') => {
        setAuthModalState({ isOpen: true, mode });
    };

    const handleCloseAuth = () => {
        setAuthModalState(prev => ({ ...prev, isOpen: false }));
    };

    const handleSwitchAuthMode = (mode) => {
        setAuthModalState({ isOpen: true, mode });
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#f4f5f8] dark:bg-[#07080c] text-slate-900 dark:text-white selection:bg-[#00B074] selection:text-white transition-colors duration-300">
            <Navbar onOpenAuth={handleOpenAuth} transparent={transparentNavbar} />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
            
            <AuthModal 
                isOpen={authModalState.isOpen}
                mode={authModalState.mode}
                onClose={handleCloseAuth}
                onSwitchMode={handleSwitchAuthMode}
            />
        </div>
    );
}
