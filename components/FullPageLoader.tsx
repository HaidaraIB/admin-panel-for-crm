import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useI18n } from '../context/i18n';

const FullPageLoader: React.FC = () => {
    const { t } = useI18n();
    return (
        <div className="absolute inset-0 bg-gray-50/75 dark:bg-gray-900/75 z-50 flex items-center justify-center">
            <LoadingSpinner size="lg" label={t('common.loading')} />
        </div>
    );
};

export default FullPageLoader;
