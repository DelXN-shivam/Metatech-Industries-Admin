// For BackButton code change

// components/PlayBookFiles.jsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import config from "../config.json";

const PlayBookFiles = () => {
  const router = useRouter();
  const fid = typeof router.query.fid !== "undefined" ? router.query.fid : "root";
  const teamDriveId = config.directory.team_drive;
  const corpora = teamDriveId ? "teamDrive" : "allDrives";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredFile, setHoveredFile] = useState(null);
  const accessToken = localStorage.getItem("access_token");

  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setResults([]);
      try {
        const res = await axios.get("https://www.googleapis.com/drive/v3/files", {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            corpora: corpora,
            includeTeamDriveItems: true,
            supportsAllDrives: true,
            teamDriveId: teamDriveId,
            q: `mimeType!='application/vnd.google-apps.folder' and trashed = false and parents in '${fid}'`,
            fields: "files(id,name,mimeType,size,modifiedTime)",
          },
        });
        setResults(res.data.files || []);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
      setLoading(false);
    };

    fetchFiles();
  }, [fid]);

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('document')) {
      return (
        <div className="relative">
          <svg className="h-10 w-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    } else if (mimeType.includes('spreadsheet')) {
      return (
        <svg className="h-10 w-10 text-green-500 group-hover:text-green-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (mimeType.includes('presentation')) {
      return (
        <svg className="h-10 w-10 text-orange-500 group-hover:text-orange-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    } else {
      return (
        <svg className="h-10 w-10 text-gray-500 group-hover:text-gray-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'No date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'No date';
    }
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm font-medium">No files found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((result) => (
            <a
              key={result.id}
              href={`https://docs.google.com/document/d/${result.id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              onMouseEnter={() => setHoveredFile(result.id)}
              onMouseLeave={() => setHoveredFile(null)}
            >
              <div className="bg-white border-gray-100 hover:border-blue-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <div className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                    {formatDate(result.modifiedTime)}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(result.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate transition-colors duration-300">
                      {result.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <span className="flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                        {formatFileSize(result.size || 0)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Private
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayBookFiles;