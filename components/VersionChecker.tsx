import React, { useEffect } from 'react';
import { version as currentVersion } from '../version';
import { useToast } from '../contexts/ToastContext';

export const VersionChecker: React.FC = () => {
    const { info } = useToast();

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Add timestamp to prevent caching of the JSON file
                const response = await fetch(`/version.json?t=${Date.now()}`);
                if (!response.ok) return;

                const data = await response.json();
                const latestVersion = data.version;

                if (latestVersion && latestVersion !== currentVersion) {
                    console.log('New version detected:', latestVersion);
                    console.log('Current version:', currentVersion);

                    // Notify user and reload
                    info('Nova versão disponível! Atualizando sistema...', 5000);

                    // Wait a bit for the toast to be seen, then reload
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            } catch (error) {
                console.error('Error checking version:', error);
            }
        };

        // Check on mount
        checkVersion();

        // Check every 60 seconds
        const interval = setInterval(checkVersion, 60 * 1000);

        return () => clearInterval(interval);
    }, [info]);

    return null; // This component handles logic only, no UI rendering
};
