// components/FolderName.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import StatsCards from "./StatsCards";
import config from "../config.json";
import axios from "axios";

const FolderName = () => {
  const router = useRouter();
  const fid = typeof router.query.fid !== "undefined" ? router.query.fid : "root"; // Default to "root"
  const [fname, setFName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const teamDriveId = config.directory.team_drive;
  const corpora = teamDriveId ? "teamDrive" : "allDrives";

  useEffect(() => {
    setLoaded(false);
    setLoading(true);
    const fetchData = async () => {
      const accessToken = localStorage.getItem("access_token");
      try {
        const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fid}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            corpora: corpora,
            includeTeamDriveItems: true,
            supportsAllDrives: true,
            teamDriveId: teamDriveId,
          },
        });
        const data = response.data;
        setFName(data.name || "Root Folder"); // Use "Root Folder" for the root folder
        setLoaded(true);
        setLoading(false);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          console.error("Access token expired. Please refresh.");
        } else {
          console.error(err);
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [fid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading folder...</span>
      </div>
    );
  }

  if (loaded && fname) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2">
          <svg
            className="w-6 h-6 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">{fname}</h2>
          <div className="mt-2 text-sm text-gray-500">
            <span className="items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {fid === "root" ? "Root Directory" : "Subfolder"}
            </span>
          </div>
        </div>

        {/* <div className="mt-6">
          <StatsCards />
        </div> */}
      </div>
    );
  }

  return null;
};

export default FolderName;
