// components/BackButton.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";

const BackButton = () => {
  const router = useRouter();
  const fid = typeof router.query.fid !== "undefined" ? router.query.fid : "root";
  const isShared = router.query.isShared === 'true';
  const [fparent, setFParent] = useState(null);
  const accessToken = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchParent = async () => {
      if (isShared) {
        // For shared folders, go back to the root
        setFParent("root");
        return;
      }

      try {
        const response = await axios.get(
          `https://www.googleapis.com/drive/v2/files/${fid}/parents`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const data = response.data;
        if (data.items && data.items.length > 0) {
          setFParent(data.items[0].id);
        } else {
          setFParent(null);
        }
      } catch (error) {
        console.error("Error fetching parent folder:", error);
        setFParent(null);
      }
    };

    if (fid !== "root") {
      fetchParent();
    } else {
      setFParent(null);
    }
  }, [fid, isShared]);

  if (!fparent) {
    return null;
  }

  return (
    <Link
      href={{
        pathname: `/list/[fid]`,
        query: { 
          fid: fparent,
          isShared: isShared ? 'true' : 'false'
        },
      }}
      as={`/list/${fparent}`}
    >
      <button
        className={`${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} p-2 rounded-md transition duration-300`}
        onClick={() => {
          const container = document.querySelector(".searchContainer");
          if (container) {
            container.innerHTML = "";
          }
        }}
      >
        Back
      </button>
    </Link>
  );
};

export default BackButton;



// // components/BackButton.jsx
// import React, { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import Link from "next/link";
// import axios from "axios";

// const BackButton = () => {
//   const router = useRouter();
//   const fid = typeof router.query.fid !== "undefined" ? router.query.fid : "root"; // Default to "root"
//   const [fparent, setFParent] = useState(null); // Initialize as null
//   const accessToken = localStorage.getItem("access_token");

//   useEffect(() => {
//     const fetchParent = async () => {
//       try {
//         const response = await axios.get(
//           `https://www.googleapis.com/drive/v2/files/${fid}/parents`,
//           {
//             headers: { Authorization: `Bearer ${accessToken}` },
//           }
//         );

//         const data = response.data;

//         // Check if the folder has a parent
//         if (data.items && data.items.length > 0) {
//           setFParent(data.items[0].id); // Set the parent folder ID
//         } else {
//           setFParent(null); // No parent folder (e.g., root folder)
//         }
//       } catch (error) {
//         console.error("Error fetching parent folder:", error);
//         setFParent(null); // Handle errors gracefully
//       }
//     };

//     if (fid !== "root") {
//       fetchParent(); // Only fetch parent if not already at the root folder
//     } else {
//       setFParent(null); // Root folder has no parent
//     }
//   }, [fid]);

//   // Render the back button only if there is a parent folder
//   if (!fparent) {
//     return null; // Hide the back button if there is no parent folder
//   }

//   return (
//     <Link
//       href={{
//         pathname: `/list/[fid]`,
//         query: { fid: fparent }, // Pass the parent folder ID
//       }}
//       as={`/list/${fparent}`}
//     >
//       <button
//         className="bg-gray-200 p-2 rounded-md hover:bg-gray-300 transition duration-300"
//         onClick={() => {
//           const container = document.querySelector(".searchContainer");
//           if (container) {
//             container.innerHTML = ""; // Clear the search container
//           }
//         }}
//       >
//         Back
//       </button>
//     </Link>
//   );
// };

// export default BackButton;





// import React, { useEffect, useState } from 'react';
// import { useRouter } from 'next/router';
// import Link from 'next/link';
// import styles from '../styles/Home.module.css'
// import axios from 'axios';
// import IconUpLevel from './IconUpLevel';
// import config from "../config.json";

// const BackButton = () => {
//   const router = useRouter();
//   const fid  = (typeof router.query.fid != 'undefined' ) ? router.query.fid : config.directory.target_folder;
//   const [fparent, setFParent] = useState('');
//   const accessToken = localStorage.getItem("access_token");

//   useEffect(() => {
//     const fetchData = async () => {
//       const response = await axios.get(
//         `https://www.googleapis.com/drive/v2/files/${fid}/parents`,
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`
//           }
//         }
//       );
//       const data = response.data;
//       setFParent(data.items[0].id);
//     };
//     fetchData();
//   }, [fid]);

//   return (
//     <Link 
//         href={{
//             pathname: `/list/[fid]`,
//             query: {
//                 fid: fparent,
//                 fname : "get me"
//             },
//         }}
//         as={`/list/${fparent}`} key={fparent}
//     >

//         <button 
//             className={styles.BackButton} 
//             onClick={() => {
//                 const container = document.querySelector('.searchContainer');
//                 if (typeof container != 'undefined'  && container) {
//                     container.innerHTML = '';
//                 }
//         }}>
//         <IconUpLevel />
//         </button>
//     </Link>
//   );
// };

// export default BackButton;
