import Head from "next/head";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import HeaderImage from "../components/HeaderImage";
import GoogleDriveSearch from "../components/GoogleDriveSearch";
import SimpleSignOn from "../components/SimpleSignOn";
import PlayBookFolders from "../components/PlayBookFolders";
import PlayBookFiles from "../components/PlayBookFiles";
import Layout from "../components/Layout";

export default function Home() {
  const [localStorageContent, setLocalStorageContent] = useState({});
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check for verification
    const isVerified = localStorage.getItem('isVerified');
    
    if (!isVerified || isVerified !== 'true') {
      router.push('/verify');
      return;
    }

    // Get all localStorage content
    const getAllLocalStorage = () => {
      const content = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        content[key] = localStorage.getItem(key);
      }
      setLocalStorageContent(content);
      setUserEmail(localStorage.getItem('userEmail') || '');
    };

    getAllLocalStorage();
  }, [router]);

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
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <h2 className="flex flex-row text-lg font-bold text-gray-800 mb-2">Current User :- <p className="text-blue-600">{userEmail}</p></h2>
                  </div>
                  <GoogleDriveSearch />
                </div>
                {/* <div className="mt-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">LocalStorage Content</h2>
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(localStorageContent, null, 2)}
                    </pre>
                  </div>
                </div> */}
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