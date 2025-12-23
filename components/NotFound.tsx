import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-background-dark text-center px-4">
            <div className="bg-white dark:bg-card-dark p-8 rounded-2xl shadow-lg border border-border-light dark:border-border-dark max-w-md w-full">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Página não encontrada
                </h1>

                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    Ops! A página que você está procurando não existe ou você não tem permissão para acessá-la.
                </p>

                <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-black font-bold py-3 px-6 rounded-xl transition-colors"
                >
                    <Home className="w-5 h-5" />
                    Voltar para o Início
                </button>
            </div>
        </div>
    );
};
