import React from 'react';
import Link from 'next/link';
import config from "../config.json";

const HeaderImage = () => {
    return (
        <div className="py-2">
            <Link href="/">
                <div className="flex items-center justify-center space-x-4">
                    <div className="p-2 rounded-lg">
                        <img
                            src="/metatech_logo.png"
                            alt="Metatech Logo"
                            className="h-12 w-auto"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {config.components.HeaderImage.title}
                    </h1>
                </div>
            </Link>
        </div>
    );
};

export default HeaderImage;