// For BackButton

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";
import config from "../config.json";
import { useTheme } from "./ThemeContext";

const PlayBookFolders = () => {
  const router = useRouter();
  const { darkMode } = useTheme();
  const fid = typeof router.query.fid !== "undefined" ? router.query.fid : "root";
  const isDashboard = router.pathname === '/';
  const teamDriveId = config.directory.team_drive;
  const corpora = teamDriveId ? "teamDrive" : "allDrives";
  const [regularFolders, setRegularFolders] = useState([]);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const accessToken = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchFolders = async () => {
      setLoading(true);
      setRegularFolders([]);
      setSharedFolders([]);
      try {
        // Fetch regular folders
        const regularFoldersResponse = await axios.get("https://www.googleapis.com/drive/v3/files", {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            corpora: corpora,
            includeTeamDriveItems: true,
            supportsAllDrives: true,
            teamDriveId: teamDriveId,
            q: `mimeType='application/vnd.google-apps.folder' and trashed = false and parents in '${fid}'`,
            fields: "files(id,name)"
          }
        });

        // Fetch shared folders only on dashboard
        if (isDashboard) {
          const sharedFoldersResponse = await axios.get("https://www.googleapis.com/drive/v3/files", {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              corpora: corpora,
              includeTeamDriveItems: true,
              supportsAllDrives: true,
              teamDriveId: teamDriveId,
              q: `mimeType='application/vnd.google-apps.folder' and trashed = false and sharedWithMe = true`,
              fields: "files(id,name)"
            }
          });
          setSharedFolders(sharedFoldersResponse.data.files || []);
        }

        setRegularFolders(regularFoldersResponse.data.files || []);
      } catch (err) {
        console.error("Error fetching folders:", err);
      }
      setLoading(false);
    };

    fetchFolders();
  }, [fid, isDashboard]);

  const renderFolderGrid = (folders, title, isShared = false) => (
    <div className="mb-8">
      <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        {title}
      </h2>
      {folders.length === 0 ? (
        <div className="text-center py-4">
          <div className={darkMode ? "text-gray-500" : "text-gray-400"}>
            <p className="text-sm font-medium">No {title.toLowerCase()} found</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <Link
              href={{
                pathname: `/list/[fid]`,
                query: { 
                  fid: folder.id,
                  isShared: isShared ? 'true' : 'false'
                },
              }}
              as={`/list/${folder.id}`}
              key={folder.id}
            >
              <div className={`group ${darkMode ? 'bg-gray-700 border-gray-600 hover:border-blue-700' : 'bg-white border-gray-100 hover:border-blue-200'} rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border p-4`}>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'} truncate group-hover:text-blue-600`}>
                      {folder.name}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isShared ? 'Shared Folder' : 'Folder'}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {renderFolderGrid(regularFolders, "My Folders", false)}
          {isDashboard && renderFolderGrid(sharedFolders, "Shared With Me", true)}
        </>
      )}
    </div>
  );
};

export default PlayBookFolders;





// // components/PlayBookFolders.jsx
// import React, { useState, useEffect } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";
// import config from "../config.json";
// import styles from "../styles/Home.module.css";
// import Link from "next/link";

// const PlayBookFolders = () => {
//   const router = useRouter();
//   const fid = typeof router.query.fid !== "undefined" ? router.query.fid : "root"; // Default to "root"
//   const teamDriveId = config.directory.team_drive;
//   const corpora = teamDriveId ? "teamDrive" : "allDrives";
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const getFiles = async () => {
//       setLoading(true);
//       setError(null);
//       setResults([]);
//       const accessToken = localStorage.getItem("access_token");
//       try {
//         const res = await axios.get("https://www.googleapis.com/drive/v3/files", {
//           headers: { Authorization: `Bearer ${accessToken}` },
//           params: {
//             corpora: corpora,
//             includeTeamDriveItems: true,
//             supportsAllDrives: true,
//             teamDriveId: teamDriveId,
//             q: `mimeType='application/vnd.google-apps.folder' and trashed = false and parents in '${fid}'`,
//           },
//         });
//         setResults(res.data.files);
//       } catch (err) {
//         if (err.response && err.response.status === 401) {
//           console.error("Access token expired. Please refresh.");
//         } else {
//           setError(err);
//         }
//       }
//       setLoading(false);
//     };
//     getFiles();
//   }, [fid]);

//   return (
//     <div className="w-full text-left">
//       {loading && <div>Loading...</div>}
//       {error && <div>Error: {error.message}</div>}
//       <div className={styles.grid}>
//         {results.map((result) => (
//           <Link
//             href={{
//               pathname: `/list/[fid]`,
//               query: { fid: result.id },
//             }}
//             as={`/list/${result.id}`}
//             key={result.id}
//           >
//             <div className={styles.card}>
//               <h3>{result.name}</h3>
//             </div>
//           </Link>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default PlayBookFolders;





// // components/PlayBookFolders.jsx
// import React, { useState, useEffect } from "react";
// import { useRouter } from 'next/router';
// import axios from "axios";
// import config from "../config.json";
// import Link from 'next/link';

// const PlayBookFolders = () => {
//   const router = useRouter();
//   const fid = router.query.fid || "root"; // Default to root folder if no fid is provided
//   const [folders, setFolders] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchFolders = async () => {
//       setLoading(true);
//       const accessToken = localStorage.getItem("access_token");
//       try {
//         const response = await axios.get("https://www.googleapis.com/drive/v3/files", {
//           headers: { Authorization: `Bearer ${accessToken}` },
//           params: {
//             q: `mimeType='application/vnd.google-apps.folder' and trashed=false and parents in '${fid}'`,
//             fields: "files(id, name)",
//           },
//         });
//         setFolders(response.data.files);
//       } catch (error) {
//         console.error("Error fetching folders:", error);
//       }
//       setLoading(false);
//     };
//     fetchFolders();
//   }, [fid]);

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//       {loading ? (
//         <p>Loading folders...</p>
//       ) : (
//         folders.map((folder) => (
//           <Link
//             key={folder.id}
//             href={`/list/${folder.id}`}
//             className="bg-gray-100 p-4 rounded-lg shadow-md hover:bg-gray-200 transition duration-300"
//           >
//             <h3 className="text-lg font-semibold">{folder.name}</h3>
//           </Link>
//         ))
//       )}
//     </div>
//   );
// };

// export default PlayBookFolders;