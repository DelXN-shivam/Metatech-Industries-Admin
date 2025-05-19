import Head from "next/head";
import React, { useEffect, useState } from "react";
import HeaderImage from "../components/HeaderImage";
import GoogleDriveSearch from "../components/GoogleDriveSearch";
import SimpleSignOn from "../components/SimpleSignOn";
import PlayBookFolders from "../components/PlayBookFolders";
import PlayBookFiles from "../components/PlayBookFiles";
import Layout from "../components/Layout";
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Check if user is verified and session is valid
    const verificationStatus = localStorage.getItem('isVerified');
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    
    if (!verificationStatus || !sessionExpiry) {
      // If not verified or no session, redirect to verify page
      router.push('/verify');
      return;
    }

    // Check if session has expired
    const now = new Date().getTime();
    if (now >= parseInt(sessionExpiry)) {
      // Session expired, clear all session data
      localStorage.removeItem('sessionExpiry');
      localStorage.removeItem('isVerified');
      localStorage.removeItem('userEmail');
      router.push('/verify');
      return;
    }

    setIsVerified(true);
  }, []);

  if (!isVerified) {
    return null; // Don't render anything while checking verification
  }

  return (
    <SimpleSignOn>
      <Layout>
        <Head>
          <title>Metatech Industries</title>
          <link rel="icon" href="/metatech_logo.png" />
        </Head>

        <div className="w-full h-full sm:px-6 lg:px-8">
          <div className="px-1 py-1 sm:px-0">
            <div className="pt-6 h-full w-full">
              <HeaderImage />
              <div className="mt-6">
                <GoogleDriveSearch />
              </div>
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Folders</h2>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <PlayBookFolders />
                </div>
              </div>
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Files</h2>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <PlayBookFiles />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </SimpleSignOn>
  );
}



// import Head from "next/head";
// import React from "react";
// import HeaderImage from "../components/HeaderImage";
// import GoogleDriveSearch from "../components/GoogleDriveSearch";
// import SimpleSignOn from "../components/SimpleSignOn";
// import PlayBookFolders from "../components/PlayBookFolders";
// import PlayBookFiles from "../components/PlayBookFiles";

// export default function Home() {
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Head>
//         <title>Google Drive Explorer</title>
//         <link rel="icon" href="/favicon.ico" />
//       </Head>

//       {/* Main Content */}
//       <SimpleSignOn>
//         <main className="container mx-auto p-4">
//           {/* Header Section */}
//           <HeaderImage />

//           {/* Search Bar */}
//           <div className="my-6">
//             <GoogleDriveSearch />
//           </div>

//           {/* Folders Section */}
//           <section className="mb-8">
//             <h2 className="text-2xl font-bold mb-4">Folders</h2>
//             <PlayBookFolders />
//           </section>

//           {/* Files Section */}
//           <section>
//             <h2 className="text-2xl font-bold mb-4">Files</h2>
//             <PlayBookFiles />
//           </section>
//         </main>

//         {/* Footer Section */}
//         <footer className="bg-gray-800 text-white py-4 text-center">
//           <p>© 2023 Google Drive Explorer. All rights reserved.</p>
//         </footer>
//       </SimpleSignOn>
//     </div>
//   );
// }