import React from 'react';
import Link from 'next/link';
import config from "../config.json";
import { useTheme } from './ThemeContext';
// import styles from '../styles/Home.module.css';

const HeaderImage = () => {
    const { darkMode } = useTheme();

    return (
        <div className="py-2">
            <Link href="/">
                <div className="flex items-center justify-center space-x-4">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-white p-4' : ''}`}>
                        <img
                            src="/metatech_logo.png"
                            alt="Metatech Logo"
                            className="h-12 w-auto"
                        />
                    </div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {config.components.HeaderImage.title}
                    </h1>
                </div>
            </Link>
        </div>
    );
};

export default HeaderImage;
