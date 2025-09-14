import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import config from '../config.json';

const GoogleDriveSearch = () => {
  const router = useRouter();
  const fid = typeof router.query.fid !== "undefined" ? router.query.fid : "root";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fparent, setFParent] = useState(null);
  const [extractedDoc, setExtractedDoc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [lastDownloadedFile, setLastDownloadedFile] = useState(null);
  const [fileTypes, setFileTypes] = useState([
    { label: "All Supported Files", value: "" },
    { label: "Documents", value: "documents" },
    { label: "Spreadsheets", value: "spreadsheets" }
  ]);
  const [fileNameFilter, setFileNameFilter] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFileType, setSelectedFileType] = useState("");
  const nameFilters = [
    { label: "All Files", value: "" },
    { label: "Enquiry Files", value: "enquiry" },
    { label: "PO Files", value: "po" }
  ];
  const accessToken = localStorage.getItem("access_token");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: config.api.client_id,
        client_secret: config.api.client_secret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        return response.data.access_token;
      }
      return null;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return null;
    }
  };

  const makeAuthenticatedRequest = async (requestFn) => {
    try {
      return await requestFn();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Token expired, try to refresh
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          // Retry the request with new token
          return await requestFn();
        }
      }
      throw err;
    }
  };

  // Add event listener for token validation
  useEffect(() => {
    const handleTokenValidated = () => {
      // Trigger initial data fetch
      searchFiles();
    };

    window.addEventListener('tokenValidated', handleTokenValidated);
    return () => {
      window.removeEventListener('tokenValidated', handleTokenValidated);
    };
  }, []);

  // Fetch the parent folder ID of the current folder
  useEffect(() => {
    const fetchParentFolder = async () => {
      if (fid === "root") {
        setFParent(null);
        return;
      }

      try {
        const accessToken = localStorage.getItem('access_token');
        const response = await makeAuthenticatedRequest(() =>
          axios.get(
            `https://www.googleapis.com/drive/v2/files/${fid}/parents`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          )
        );

        const data = response.data;
        if (data.items && data.items.length > 0) {
          setFParent(data.items[0].id);
        } else {
          setFParent(null);
        }
      } catch (err) {
        console.error("Error fetching parent folder:", err);
        setFParent(null);
      }
    };

    fetchParentFolder();
  }, [fid]);

  // Fetch folders
  useEffect(() => {
    const fetchFolders = async () => {
      if (!accessToken) return;

      try {
        // Fetch regular folders
        const regularFoldersResponse = await makeAuthenticatedRequest(() =>
          axios.get(
            "https://www.googleapis.com/drive/v3/files",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: {
                q: `mimeType='application/vnd.google-apps.folder' and trashed = false and parents in '${fid}'`,
                fields: "files(id,name)",
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                corpora: 'allDrives'
              }
            }
          )
        );

        // Fetch shared folders
        const sharedFoldersResponse = await makeAuthenticatedRequest(() =>
          axios.get(
            "https://www.googleapis.com/drive/v3/files",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: {
                q: `mimeType='application/vnd.google-apps.folder' and trashed = false and sharedWithMe = true`,
                fields: "files(id,name)",
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                corpora: 'allDrives'
              }
            }
          )
        );

        const regularFolders = regularFoldersResponse.data.files || [];
        const sharedFolders = sharedFoldersResponse.data.files || [];

        // Combine and deduplicate folders
        const allFolders = [
          { id: "", name: "All Folders" },
          ...regularFolders,
          ...sharedFolders.filter(sharedFolder => 
            !regularFolders.some(regularFolder => regularFolder.id === sharedFolder.id)
          )
        ];

        setFolders(allFolders);
      } catch (err) {
        console.error("Error fetching folders:", err);
      }
    };

    fetchFolders();
  }, [accessToken, fid]);

  // Function to recursively fetch all subfolders
  const fetchAllSubfolders = async (folderIds) => {
    const allFolderIds = [...folderIds];

    while (folderIds.length > 0) {
      try {
        const res = await makeAuthenticatedRequest(() =>
          axios.get("https://www.googleapis.com/drive/v3/files", {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            params: {
              q: `mimeType='application/vnd.google-apps.folder' and trashed = false and parents in '${folderIds.join(
                "','"
              )}'`,
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
              corpora: 'allDrives'
            },
          })
        );

        const subFolders = res.data.files || [];
        if (subFolders.length === 0) break;

        folderIds = subFolders.map((folder) => folder.id);
        allFolderIds.push(...folderIds);
      } catch (err) {
        console.error("Error fetching subfolders:", err);
        setError(err);
        return allFolderIds;
      }
    }

    return allFolderIds;
  };

  // Parse multiple queries from comma-separated input
  const parseQueries = (queryString) => {
    return queryString
      .split(',')
      .map(q => q.trim())
      .filter(q => q.length > 0);
  };

  // Check if file content contains all queries
  const containsAllQueries = (content, queries) => {
    if (!content || queries.length === 0) return false;
    const contentLower = content.toLowerCase();
    return queries.every(query => contentLower.includes(query.toLowerCase()));
  };

  // Search files within the folder and its subfolders
  const searchFiles = async () => {
    if (!query.trim()) {
      setSearchError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setExtractedDoc(null);
    setLastDownloadedFile(null);
    setSearchError(null);
    
    console.log('🔍 Search Debug Info:');
    console.log('- Current folder ID (fid):', fid);
    console.log('- Selected folder:', selectedFolder);
    console.log('- Search query:', query);
    console.log('- File type filter:', selectedFileType);

    // Parse multiple queries
    const queries = parseQueries(query);
    const isMultiQuery = queries.length > 1;
    
    console.log('- Parsed queries:', queries);
    console.log('- Multi-query search:', isMultiQuery);

    try {
      let folderIds = [selectedFolder || fid];
      if (!selectedFolder) {
        folderIds = await fetchAllSubfolders(folderIds);
      }
      
      console.log('- Folder IDs to search:', folderIds);

      // For multi-query search, we need to get all files first, then filter by content
      let searchQuery;
      let fileTypeQuery = "";
      
      if (selectedFileType === "documents") {
        const docTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.google-apps.document'
        ];
        fileTypeQuery = ` and (${docTypes.map(type => `mimeType='${type}'`).join(' or ')})`;
      } else if (selectedFileType === "spreadsheets") {
        const sheetTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/vnd.google-apps.spreadsheet'
        ];
        fileTypeQuery = ` and (${sheetTypes.map(type => `mimeType='${type}'`).join(' or ')})`;
      } else {
        const allowedTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.google-apps.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/vnd.google-apps.spreadsheet'
        ];
        fileTypeQuery = ` and (${allowedTypes.map(type => `mimeType='${type}'`).join(' or ')})`;
      }
      
      // Add file name filter
      let nameQuery = "";
      if (fileNameFilter === "enquiry") {
        nameQuery = ` and name contains 'enquiry'`;
      } else if (fileNameFilter === "po") {
        nameQuery = ` and name contains 'po'`;
      }

      if (isMultiQuery) {
        // For multi-query, use Google Drive's native search with all terms
        const searchTerms = queries.map(q => q.replace(/'/g, "\\'"));
        const fullTextQuery = searchTerms.map(term => `fullText contains '${term}'`).join(' and ');
        const nameSearchQuery = searchTerms.map(term => `name contains '${term}'`).join(' and ');
        
        if (fid === "root" && !selectedFolder) {
          searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false${fileTypeQuery}${nameQuery} and ` +
            `(${nameSearchQuery} or ${fullTextQuery})`;
        } else {
          searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false and ` +
            `(parents in '${folderIds.join("','")}'${folderIds.length > 0 ? ' or sharedWithMe=true' : ''})${fileTypeQuery}${nameQuery} and ` +
            `(${nameSearchQuery} or ${fullTextQuery})`;
        }
      } else {
        // Single query - use existing logic
        const escapedQuery = queries[0].replace(/'/g, "\\'");
        if (fid === "root" && !selectedFolder) {
          searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false${fileTypeQuery}${nameQuery} and ` +
            `(name contains '${escapedQuery}' or fullText contains '${escapedQuery}')`;
        } else {
          searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false and ` +
            `(parents in '${folderIds.join("','")}'${folderIds.length > 0 ? ' or sharedWithMe=true' : ''})${fileTypeQuery}${nameQuery} and ` +
            `(name contains '${escapedQuery}' or fullText contains '${escapedQuery}')`;
        }
      }
      
      console.log('- Final search query:', searchQuery);

      const res = await makeAuthenticatedRequest(() =>
        axios.get("https://www.googleapis.com/drive/v3/files", {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          params: {
            q: searchQuery,
            fields: "files(id,name,mimeType,size,modifiedTime),nextPageToken",
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives'
          },
        })
      );

      let files = res.data.files || [];
      
      // Handle pagination
      let nextPageToken = res.data.nextPageToken;
      while (nextPageToken && files.length < 500) { // Increased limit for multi-query
        try {
          const nextRes = await makeAuthenticatedRequest(() =>
            axios.get("https://www.googleapis.com/drive/v3/files", {
              headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
              params: {
                q: searchQuery,
                fields: "files(id,name,mimeType,size,modifiedTime),nextPageToken",
                pageSize: 100,
                pageToken: nextPageToken,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                corpora: 'allDrives'
              },
            })
          );
          
          const nextFiles = nextRes.data.files || [];
          files = [...files, ...nextFiles];
          nextPageToken = nextRes.data.nextPageToken;
        } catch (paginationError) {
          console.error('Error fetching additional pages:', paginationError);
          break;
        }
      }

      console.log('📄 Initial files found:', files.length);

      // For multi-query search, Google Drive's native search should have already filtered correctly
      // No additional filtering needed since we're using Google's fullText search
      if (isMultiQuery && files.length > 0) {
        console.log('✅ Multi-query search using Google Drive native filtering. Found:', files.length, 'files');
      }
      
      setResults(files);
      setSearchError(null);
      
      console.log('✅ Search completed. Found', files.length, 'files');
      if (files.length > 0) {
        console.log('- First few results:', files.slice(0, 3).map(f => ({ name: f.name, id: f.id, mimeType: f.mimeType })));
      }

      if (files.length === 0) {
        let message;
        if (isMultiQuery) {
          message = `No files found containing ALL queries: ${queries.join(', ')}`;
        } else {
          message = `No results found for "${query}"`;
        }
        
        if (selectedFolder) {
          const selectedFolderName = folders.find(f => f.id === selectedFolder)?.name || 'selected folder';
          message += ` in ${selectedFolderName}`;
        }
        if (selectedFileType) {
          const selectedTypeName = fileTypes.find(t => t.value === selectedFileType)?.label || 'selected file type';
          message += ` with ${selectedTypeName}`;
        }
        
        if (isMultiQuery) {
          message += ". Try: 1) Using fewer search terms 2) Checking spelling 3) Using broader terms";
        } else {
          message += ". Try checking: 1) File permissions 2) Shared drives access 3) Different search terms";
        }
        
        setSearchError(message);
      }
    } catch (err) {
      console.error('❌ Search error:', err);
      if (err.response) {
        console.error('- Response status:', err.response.status);
        console.error('- Response data:', err.response.data);
      }
      
      if (err.response && err.response.status === 401) {
        setError(new Error("Access token expired. Please refresh."));
      } else {
        setError(err);
      }
    }
    setLoading(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      searchFiles();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setExtractedDoc(null);
    setSearchError(null);
    setSelectedFolder("");
    setSelectedFileType("");
  };

  const navigateBack = () => {
    clearSearch();
    if (fid === "root") {
      router.push("/");
    } else if (fparent) {
      router.push({
        pathname: `/list/[fid]`,
        query: { fid: fparent },
      });
    }
  };

  // Add this new function after the extractTextFromDoc function
  function extractCleanTextFromDoc(arrayBuffer) {
    try {
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);

      // Try multiple encodings to find the best readable text
      const encodings = ['utf-8', 'utf-16le', 'utf-16be', 'latin1'];
      let bestText = '';
      let maxReadableChars = 0;

      for (const encoding of encodings) {
        try {
          const decoder = new TextDecoder(encoding, { fatal: false });
          const decodedText = decoder.decode(uint8Array);

          // Count readable characters
          const readableChars = decodedText.replace(/[^\x20-\x7E\n\r\t]/g, '').length;

          if (readableChars > maxReadableChars) {
            maxReadableChars = readableChars;
            bestText = decodedText;
          }
        } catch (err) {
          console.log(`Failed to decode with ${encoding}:`, err);
        }
      }

      if (!bestText) {
        return null;
      }

      // Clean up the text - more aggressive approach
      let cleanedText = bestText
        // Remove binary data patterns
        .replace(/~!bjbj[\s\S]*?uDhhCtyG/g, '')
        // Remove OLE compound document headers
        .replace(/Root Entry[\s\S]*?WordDocument/g, '')
        // Remove Microsoft Office headers
        .replace(/Microsoft Office Word[\s\S]*?Normal\.dotm/g, '')
        // Remove binary data sections
        .replace(/[^\x20-\x7E\n\r\t]+/g, ' ')
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove empty lines
        .replace(/^\s*[\r\n]/gm, '')
        // Trim the result
        .trim();

      // Extract meaningful text chunks
      const lines = cleanedText.split('\n');
      const meaningfulLines = lines.filter(line => {
        // Check if line contains meaningful text
        const cleanLine = line.trim();
        if (cleanLine.length < 3) return false;

        // Check for common binary patterns
        if (/[^\x20-\x7E]/.test(cleanLine)) return false;

        // Check for common document structure markers
        const markers = ['Reference:', 'Subject:', 'Date:', 'To:', 'From:', 'Dear', 'Regards', 'Sincerely'];
        return markers.some(marker => cleanLine.includes(marker)) ||
          (cleanLine.length > 10 && /[a-zA-Z]{3,}/.test(cleanLine));
      });

      return meaningfulLines.join('\n') || null;
    } catch (err) {
      console.log('Text extraction failed:', err);
      return null;
    }
  }

  // Add this new function for retrying failed requests
  const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        if (error.response && error.response.status === 401) {
          // Token expired, try to refresh
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            // Retry with new token
            continue;
          }
        }
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    throw lastError;
  };

  // Update the processExcelFile function
  const processExcelFile = async (fileId, fileName) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Download the Excel file with retry logic and increased timeout
      const response = await retryRequest(() => 
        axios.get(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { 
              alt: 'media',
              supportsAllDrives: true
            },
            responseType: 'arraybuffer',
            timeout: 60000 // Increased to 60 seconds
          }
        )
      );

      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Received empty file from Google Drive');
      }

      // Check file size
      const fileSize = response.data.byteLength;
      if (fileSize > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit');
      }

      // Convert to base64 with better error handling
      let base64Data;
      try {
        if (typeof Buffer !== 'undefined') {
          // Node.js environment
          base64Data = Buffer.from(response.data).toString('base64');
        } else {
          // Browser environment
          const bytes = new Uint8Array(response.data);
          const chunks = [];
          const chunkSize = 1024 * 1024; // 1MB chunks
          
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            const binary = Array.from(chunk)
              .map(byte => String.fromCharCode(byte))
              .join('');
            chunks.push(binary);
          }
          
          base64Data = btoa(chunks.join(''));
        }
      } catch (conversionError) {
        console.error('Error converting file to base64:', conversionError);
        throw new Error('Failed to process Excel file: Conversion error');
      }

      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Failed to convert file to base64: Empty result');
      }

      return {
        fileName,
        fileData: base64Data
      };
    } catch (error) {
      console.error('Error processing Excel file:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
  };

  // Update the cleanDocContent function to handle .doc file content better
  function cleanDocContent(text) {
    // Handle null, undefined, or non-string inputs
    if (text === null || text === undefined) {
      return '';
    }

    // Convert to string if not already a string
    const textStr = String(text);

    return textStr
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters
      .replace(/\t+/g, ' ')             // Replace tabs with spaces
      .replace(/\s+\n/g, '\n')          // Remove spaces before newlines
      .replace(/\n{3,}/g, '\n\n')       // Reduce multiple newlines
      .replace(/[ \t]{2,}/g, ' ')       // Reduce multiple spaces
      .trim();                          // Remove leading/trailing whitespace
  }

  // Keep the existing generateFallbackContent function
  function generateFallbackContent(metadata, message) {
    return `[Document Information]\n` +
      `Name: ${metadata.name}\n` +
      `Type: ${metadata.mimeType}\n` +
      `Size: ${Math.round(metadata.size / 1024) || 'Unknown'}KB\n` +
      `Modified: ${new Date(metadata.modifiedTime).toLocaleString()}\n\n` +
      message;
  }

  // Helper Functions:
  async function parseDocFile(arrayBuffer, fileName, metadata) {
    // First check if this looks like a valid .doc file
    if (!isLikelyValidDoc(arrayBuffer)) {
      return generateFallbackContent(metadata,
        "File doesn't appear to be a valid Word document.\n" +
        "It may be corrupted or in an unsupported format.");
    }

    try {
      // Try proper .doc parsing first
      const parsedText = await extractTextFromDoc(arrayBuffer);
      if (parsedText) {
        return parsedText;
      }

      // If description exists, use it as fallback
      if (metadata.description) {
        return `[Word Document (.doc) - Preview from Description]\n` +
          `Name: ${metadata.name}\n` +
          `Type: ${metadata.mimeType}\n` +
          `Size: ${Math.round(metadata.size / 1024)}KB\n` +
          `Modified: ${new Date(metadata.modifiedTime).toLocaleString()}\n\n` +
          `Description/Preview:\n${cleanDocContent(metadata.description)}\n\n` +
          `Note: Full text extraction from this .doc file was limited.`;
      }

      // Final fallback to metadata only
      return generateFallbackContent(metadata,
        "Text extraction failed for this .doc file.\n" +
        "This might be due to the document format or encryption.\n" +
        "Please download the file to view its content.");
    } catch (err) {
      console.error('Error in parseDocFile:', err);
      return generateFallbackContent(metadata,
        "Error processing this .doc file.\n" +
        "Please download the file to view its content.\n" +
        `Error: ${err.message}`);
    }
  }

  function extractTextFromDoc(arrayBuffer) {
    try {
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);

      // Try multiple encodings to find the best readable text
      const encodings = ['utf-8', 'utf-16le', 'utf-16be', 'latin1'];
      let bestText = '';
      let maxReadableChars = 0;

      for (const encoding of encodings) {
        try {
          const decoder = new TextDecoder(encoding, { fatal: false });
          const decodedText = decoder.decode(uint8Array);

          // Count readable characters
          const readableChars = decodedText.replace(/[^\x20-\x7E\n\r\t]/g, '').length;

          if (readableChars > maxReadableChars) {
            maxReadableChars = readableChars;
            bestText = decodedText;
          }
        } catch (err) {
          console.log(`Failed to decode with ${encoding}:`, err);
        }
      }

      if (!bestText) {
        return null;
      }

      // Clean up the text - more aggressive approach
      let cleanedText = bestText
        // Remove binary data patterns
        .replace(/~!bjbj[\s\S]*?uDhhCtyG/g, '')
        // Remove OLE compound document headers
        .replace(/Root Entry[\s\S]*?WordDocument/g, '')
        // Remove Microsoft Office headers
        .replace(/Microsoft Office Word[\s\S]*?Normal\.dotm/g, '')
        // Remove binary data sections
        .replace(/[^\x20-\x7E\n\r\t]+/g, ' ')
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove empty lines
        .replace(/^\s*[\r\n]/gm, '')
        // Trim the result
        .trim();

      // Extract meaningful text chunks
      const lines = cleanedText.split('\n');
      const meaningfulLines = lines.filter(line => {
        // Check if line contains meaningful text
        const cleanLine = line.trim();
        if (cleanLine.length < 3) return false;

        // Check for common binary patterns
        if (/[^\x20-\x7E]/.test(cleanLine)) return false;

        // Check for common document structure markers
        const markers = ['Reference:', 'Subject:', 'Date:', 'To:', 'From:', 'Dear', 'Regards', 'Sincerely'];
        return markers.some(marker => cleanLine.includes(marker)) ||
          (cleanLine.length > 10 && /[a-zA-Z]{3,}/.test(cleanLine));
      });

      return meaningfulLines.join('\n') || null;
    } catch (err) {
      console.log('Text extraction failed:', err);
      return null;
    }
  }

  function isLikelyValidDoc(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 8) return false;

    const header = new Uint8Array(arrayBuffer.slice(0, 8));
    const docSignatures = [
      [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE Compound
      [0xEC, 0xA5, 0xC1, 0x00], // Older Word format
      [0xDB, 0xA5, 0x2D, 0x00]  // Word 6.0/95
    ];

    return docSignatures.some(sig =>
      header.length >= sig.length &&
      sig.every((byte, i) => byte === header[i])
    );
  }

  function extractUntilReference(text) {
    if (!text) return '';

    const lines = text.split('\n');
    let referenceLineIndex = -1;

    // Find the first line containing "Reference" (case insensitive)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('reference')) {
        referenceLineIndex = i;
        break;
      }
    }

    // If Reference line found, include it and everything before it
    if (referenceLineIndex >= 0) {
      return lines.slice(0, referenceLineIndex + 1).join('\n');
    }

    // If no Reference line found, return first 100 lines as fallback
    return lines.slice(0, 100).join('\n');
  }

  // Helper function to extract text until a specific marker is found
  function extractUntilMarker(text, marker, defaultLineCount = 23) {
    if (!marker || !text) {
      return text.split('\n').slice(0, defaultLineCount).join('\n');
    }

    try {
      const markerLower = marker.toLowerCase();
      const lines = text.split('\n');
      const markerLineIndex = lines.findIndex(line =>
        line.toLowerCase().includes(markerLower)
      );

      if (markerLineIndex === -1) {
        return lines.slice(0, defaultLineCount).join('\n');
      }

      const endIndex = Math.min(markerLineIndex + 4, lines.length);
      return lines.slice(0, endIndex).join('\n');
    } catch (err) {
      console.error('Error in extractUntilMarker:', err);
      return text.split('\n').slice(0, defaultLineCount).join('\n');
    }
  }

  // Add this new function to handle file upload
  const handleUpload = async (file) => {
    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to process file: ${file.name}`);
      }

      const data = await response.json();
      return data.extractedText;
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Update the processFilesInBatches function
  const processFilesInBatches = async (files, batchSize = 5) => {
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    const results = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchPromises = batch.map(async file => {
        try {
          const result = await extractContentFromFile(file.id, file.name, file.mimeType);
          // Ensure we have valid content
          if (!result || !result.content) {
            console.warn(`No content extracted from ${file.name}`);
            return {
              fileName: file.name,
              extractedText: `No content could be extracted from this file.`
            };
          }
          return {
            fileName: file.name,
            extractedText: result.content
          };
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          return {
            fileName: file.name,
            extractedText: `Error processing file: ${err.message}`
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Update progress
      const progress = Math.round(((i + 1) * batchSize / files.length) * 100);
      setProcessingProgress(Math.min(progress, 100));
      setProcessingStatus(`Processing batch ${i + 1} of ${batches.length}`);
    }

    return results;
  };



  // Full content extraction (existing function, optimized)
  const extractContentFromFile = async (fileId, fileName, mimeType) => {
    try {
      let content = '';
      const accessToken = localStorage.getItem("access_token");

      // Get metadata for all file types first with supportsAllDrives
      const metadataResponse = await retryRequest(() =>
        axios.get(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { 
              fields: 'name,mimeType,size,modifiedTime,description',
              supportsAllDrives: true
            }
          }
        )
      );
      const metadata = metadataResponse.data;

      // For supported document types, download and process through our API
      const supportedTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf', // .pdf
        'text/plain', // .txt
        'application/vnd.oasis.opendocument.text', // .odt
        'application/vnd.google-apps.document' // Google Docs
      ];

      if (supportedTypes.includes(mimeType) || 
          (mimeType === 'application/vnd.google-apps.document')) {
        try {
          // For Google Docs, export as docx with supportsAllDrives
          let fileData;
          let actualMimeType = mimeType;
          
          if (mimeType === 'application/vnd.google-apps.document') {
            const response = await retryRequest(() =>
              axios.get(
                `https://www.googleapis.com/drive/v3/files/${fileId}/export`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  params: { 
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    supportsAllDrives: true
                  },
                  responseType: 'arraybuffer'
                }
              )
            );
            fileData = response.data;
            actualMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else if (mimeType === 'application/msword') {
            // For .doc files, download directly with supportsAllDrives
            const response = await retryRequest(() =>
              axios.get(
                `https://www.googleapis.com/drive/v3/files/${fileId}`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  params: { 
                    alt: 'media',
                    supportsAllDrives: true
                  },
                  responseType: 'arraybuffer'
                }
              )
            );
            fileData = response.data;
            actualMimeType = 'application/msword';
          } else {
            // For other file types, download directly with supportsAllDrives
            const response = await retryRequest(() =>
              axios.get(
                `https://www.googleapis.com/drive/v3/files/${fileId}`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  params: { 
                    alt: 'media',
                    supportsAllDrives: true
                  },
                  responseType: 'arraybuffer'
                }
              )
            );
            fileData = response.data;
          }
          
          // Convert array buffer to base64
          let base64Data;
          if (typeof Buffer !== 'undefined') {
            // Node.js environment
            base64Data = Buffer.from(fileData).toString('base64');
          } else {
            // Browser environment
            const bytes = new Uint8Array(fileData);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            base64Data = window.btoa(binary);
          }
          
          // Send to our extract-text API
          const extractResponse = await fetch('/api/extract-text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileData: base64Data,
              mimeType: actualMimeType,
              fileName: fileName
            }),
          });
          
          if (!extractResponse.ok) {
            const errorData = await extractResponse.json();
            throw new Error(errorData.error || 'Failed to extract text');
          }
          
          const data = await extractResponse.json();
          content = data.extractedText;
          
          // If content is empty or very short for a .doc file, try fallback method
          if (mimeType === 'application/msword' && (!content || content.length < 50)) {
            console.log("API extraction returned little content for .doc file, trying fallback...");
            const fallbackContent = generateFallbackContent(metadata,
              "Limited text could be extracted from this .doc file. It may be in an older format or contain mostly images.");
            return { fileName, content: fallbackContent };
          }
        } catch (err) {
          console.error(`Error processing file ${fileName} through API:`, err);
          
          // Special fallback for .doc files
          if (mimeType === 'application/msword') {
            const fallbackContent = generateFallbackContent(metadata,
              `This .doc file could not be processed automatically. It may be in an older format or contain complex formatting. Error: ${err.message}`);
            return { fileName, content: fallbackContent };
          }
          
          content = generateFallbackContent(metadata,
            `Error extracting text: ${err.message}`);
        }
      } else {
        // For unsupported file types, use the existing fallback
        content = generateFallbackContent(metadata,
          `Content extraction is not supported for this file type.`);
      }

      return { fileName, content };
    } catch (err) {
      console.error(`Error extracting content from ${fileName}:`, err);
      return {
        fileName,
        content: `Error extracting content: ${err.message}`
      };
    }
  };

  // Update the processAndCreateDoc function
  const processAndCreateDoc = async (filesToProcess = results) => {
    if (filesToProcess.length === 0 || !accessToken) return;

    setIsProcessing(true);
    setIsInitializing(true);
    setError(null);
    setProcessingProgress(0);
    setProcessingStatus('Initializing...');

    try {
      // Initialize arrays for different file types
      const excelFiles = [];
      const extractedFiles = [];

      // Separate files by type first
      const excelFileList = filesToProcess.filter(file => 
        file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimeType === 'application/vnd.ms-excel' ||
        file.mimeType === 'application/vnd.google-apps.spreadsheet'  // Add Google Sheets mime type
      );
      const docResults = filesToProcess.filter(file => 
        !excelFileList.some(excel => excel.id === file.id)
      );

      setIsInitializing(false);
      setProcessingStatus('Processing files...');

      // Process Excel files if any
      if (excelFileList.length > 0) {
        console.log('📊 Processing Excel files:', excelFileList.length);
        console.log('- Excel files found:', excelFileList.map(f => ({ name: f.name, mimeType: f.mimeType })));
        setProcessingStatus('Processing Excel files...');
        const excelPromises = excelFileList.map(async (file) => {
          try {
            console.log(`Processing Excel file: ${file.name} (${file.mimeType})`);
            // For Google Sheets, export as Excel first
            if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
              const response = await retryRequest(() =>
                axios.get(
                  `https://www.googleapis.com/drive/v3/files/${file.id}/export`,
                  {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: { 
                      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      supportsAllDrives: true
                    },
                    responseType: 'arraybuffer'
                  }
                )
              );
              
              // Convert to base64
              let base64Data;
              if (typeof Buffer !== 'undefined') {
                base64Data = Buffer.from(response.data).toString('base64');
              } else {
                const bytes = new Uint8Array(response.data);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                base64Data = window.btoa(binary);
              }

              return {
                fileName: file.name,
                fileData: base64Data
              };
            }
            return await processExcelFile(file.id, file.name);
          } catch (err) {
            console.error(`Error processing Excel file ${file.name}:`, err);
            return null;
          }
        });
        
        const processedExcelFiles = await Promise.all(excelPromises);
        const validExcelFiles = processedExcelFiles.filter(Boolean);
        
        console.log('📊 Excel processing results:');
        console.log('- Processed files:', processedExcelFiles.length);
        console.log('- Valid files:', validExcelFiles.length);
        
        if (validExcelFiles.length === 0) {
          console.error('❌ No Excel files could be processed');
          throw new Error('Failed to process any Excel files');
        }
        
        excelFiles.push(...validExcelFiles);
      }

      // Process document files in parallel batches
      if (docResults.length > 0) {
        setProcessingStatus('Processing documents...');
        try {
          const processedDocs = await processFilesInBatches(docResults);
          
          // Validate and clean the processed documents
          const validDocs = processedDocs
            .filter(doc => doc && doc.fileName && doc.extractedText)
            .map(doc => ({
              fileName: doc.fileName,
              extractedText: doc.extractedText.trim() || 'No content available'
            }));

          if (validDocs.length === 0) {
            console.warn('No valid documents found, checking for any processed content...');
            // Try to use any processed content, even if empty
            const fallbackDocs = processedDocs
              .filter(doc => doc && doc.fileName)
              .map(doc => ({
                fileName: doc.fileName,
                extractedText: doc.extractedText || 'No content available'
              }));

            if (fallbackDocs.length > 0) {
              console.log('Using fallback documents:', fallbackDocs.length);
              extractedFiles.push(...fallbackDocs);
            } else {
              throw new Error('No documents could be processed. Please check file permissions and try again.');
            }
          } else {
            console.log('Valid documents found:', validDocs.length);
            extractedFiles.push(...validDocs);
          }
        } catch (error) {
          console.error('Error processing documents:', error);
          throw new Error(`Error processing documents: ${error.message}`);
        }
      }

      // Process Excel files if we have any
      if (excelFiles.length > 0) {
        setProcessingStatus('Creating Excel document...');
        const processResponse = await fetch('/api/process-excel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: excelFiles,
            query: query
          }),
        });

        if (!processResponse.ok) {
          throw new Error('Failed to process Excel files');
        }

        const blob = await processResponse.blob();
        const contentDisposition = processResponse.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]
          : 'excel_results.docx';

        // Create and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setLastDownloadedFile({
          filename,
          blob
        });
      }

      // Process Word documents if we have any
      if (extractedFiles.length > 0) {
        setProcessingStatus('Creating Word document...');
        try {
          // Validate files before sending to API
          const validFiles = extractedFiles.map(file => ({
            fileName: file.fileName || 'Untitled Document',
            extractedText: file.extractedText || 'No content available'
          }));

          console.log('Sending files to combine:', validFiles.length);

          const response = await fetch('/api/combine-files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              files: validFiles,
              query: query
            }),
          });

          if (!response.ok) {
            let errorMessage = 'Failed to combine files';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
              console.error('Error parsing error response:', parseError);
            }
            throw new Error(errorMessage);
          }

          const blob = await response.blob();
          if (!blob || blob.size === 0) {
            throw new Error('Received empty file from server');
          }

          let filename = 'combined_document.docx';
          try {
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
              if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
              }
            }
          } catch (headerError) {
            console.error('Error parsing Content-Disposition header:', headerError);
          }

          // Create and trigger download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          setLastDownloadedFile({
            filename,
            blob
          });
        } catch (combineError) {
          console.error('Error in document combination process:', combineError);
          throw new Error(`Error combining files: ${combineError.message}`);
        }
      }

      setProcessingProgress(100);
      setProcessingStatus('Complete!');
    } catch (err) {
      console.error("Error creating document:", err);
      setError(err);
      setProcessingStatus('Error occurred');
    } finally {
      setIsProcessing(false);
      setIsInitializing(false);
    }
  };

  const downloadAgain = () => {
    if (!lastDownloadedFile) return;

    const url = window.URL.createObjectURL(lastDownloadedFile.blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', lastDownloadedFile.filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Update the downloadExtractedDoc function to handle errors better
  const downloadExtractedDoc = async () => {
    if (!extractedDoc) return;

    try {
      // Use the download-file API to get the file
      const downloadUrl = `/api/download-file?fileName=${encodeURIComponent(extractedDoc)}`;
      window.location.href = downloadUrl;
    } catch (err) {
      console.error("Error downloading document:", err);
      setError(new Error(`Failed to download document: ${err.message}`));
    }
  };

  // Function to download a file
  const downloadFile = async (fileId, fileName, mimeType) => {
    try {
      setError(null);

      // For .doc files, first try to export and log the content
      if (mimeType === 'application/msword') {
        try {
          const result = await handleDocExport(fileId);
          console.log('Successfully extracted .doc content:', result);
        } catch (exportError) {
          console.error('Error extracting .doc content:', exportError);
        }
      }

      // For Google Docs, use export
      if (mimeType === 'application/vnd.google-apps.document') {
        const response = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            responseType: 'blob'
          }
        );

        // Create a download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}.docx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      // For other files, use direct download
      else {
        const response = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { alt: 'media' },
            responseType: 'blob'
          }
        );

        // Create a download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(`Error downloading file ${fileName}:`, err);
      setError(new Error(`Failed to download ${fileName}: ${err.message}`));
    }
  };

  // Add this new useEffect to clear lastDownloadedFile when file type changes
  useEffect(() => {
    setLastDownloadedFile(null);
  }, [selectedFileType]);

  // Add this new function to handle .doc file export and logging
  const handleDocExport = async (fileId) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      
      // First get the file metadata
      const metadataResponse = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'name,mimeType,size,modifiedTime' }
        }
      );
      
      const metadata = metadataResponse.data;
      
      // Export the .doc file as text
      const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { mimeType: 'text/plain' },
          responseType: 'arraybuffer'
        }
      );
      
      // Convert the response to text
      const text = new TextDecoder('utf-8').decode(response.data);
      
      // Log the extracted text
      console.log('File Name:', metadata.name);
      console.log('File Size:', metadata.size);
      console.log('Last Modified:', metadata.modifiedTime);
      console.log('Extracted Text:', text);
      
      return {
        fileName: metadata.name,
        content: text
      };
    } catch (error) {
      console.error('Error exporting .doc file:', error);
      throw error;
    }
  };

  return (
    <div className="w-full text-left p-4 text-gray-800">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchError(null);
            }}
            onKeyPress={handleKeyPress}
            className={`w-full p-3 pl-10 border ${searchError ? 'border-red-500' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            placeholder="Search in file names and content... (Use commas to search for multiple terms: term1, term2, term3)"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={searchFiles}
          disabled={loading || !accessToken}
          className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-300 disabled:bg-blue-300 flex items-center space-x-2`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search</span>
            </>
          )}
        </button>

        {/* Clear Button */}
        <button
          onClick={clearSearch}
          className={`px-6 py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition duration-300 flex items-center space-x-2`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Clear</span>
        </button>
      </div>

      {/* Multi-Query Indicator */}
      {parseQueries(query).length > 1 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800">Multi-Query Search Active</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Searching for files containing ALL terms: <strong>{parseQueries(query).join(', ')}</strong>
          </p>
          <p className="text-xs text-blue-500 mt-1">
            💡 Tip: Files must contain all search terms to appear in results
          </p>
        </div>
      )}

      {/* Advanced Options Toggle */}
      <div className="mt-4">
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className={`flex items-center space-x-2 text-gray-600 hover:text-gray-900`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-medium">Advanced Options</span>
        </button>
      </div>

      {/* Filter Dropdowns */}
      {showAdvancedOptions && (
        <div className="space-y-4 mt-4">
          <div className="flex gap-4">
            {/* Folders Dropdown */}
            <div className="flex-1">
              <label htmlFor="folder-select" className="block text-sm font-medium text-gray-700 mb-1">
                Folder
              </label>
              <select
                id="folder-select"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900`}
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {/* File Types Dropdown */}
            <div className="flex-1">
              <label htmlFor="file-type-select" className="block text-sm font-medium text-gray-700 mb-1">
                File Type
              </label>
              <select
                id="file-type-select"
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900`}
              >
                {fileTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* File Name Filter Dropdown */}
            <div className="flex-1">
              <label htmlFor="name-filter-select" className="block text-sm font-medium text-gray-700 mb-1">
                File Name Filter
              </label>
              <select
                id="name-filter-select"
                value={fileNameFilter}
                onChange={(e) => setFileNameFilter(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white border-gray-300 text-gray-900`}
              >
                {nameFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Search Tips */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Search Tips:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Single term:</strong> "contract" - finds files containing "contract"</li>
              <li>• <strong>Multiple terms:</strong> "contract, agreement, 2024" - finds files containing ALL three terms</li>
              <li>• <strong>Exact phrases:</strong> Use quotes for exact matches</li>
              <li>• <strong>Performance:</strong> Multi-query search may take longer as it analyzes file content</li>
            </ul>
          </div>
        </div>
      )}

      {/* Search Error Message */}
      {searchError && (
        <div className={`p-4 mb-4 mt-4 rounded-lg flex items-center space-x-2 ${searchError.startsWith("No results found")
          ? 'bg-blue-50 text-blue-600'
          : 'bg-red-50 text-red-600'
          }`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {searchError.startsWith("No results found") ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            )}
          </svg>
          <span>{searchError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4 mt-4">
        {results.length > 0 && (
          <>
            <button
              onClick={() => {
                const filesToProcess = results;
                processAndCreateDoc(filesToProcess);
              }}
              disabled={isProcessing || !accessToken}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300 disabled:bg-green-300 flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="flex flex-col">
                    <span>{processingStatus}</span>
                    {processingProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${processingProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Process All Files ({results.length})</span>
                </>
              )}
            </button>
            
            {selectedFiles.length > 0 && (
              <button
                onClick={() => {
                  const filesToProcess = results.filter(file => selectedFiles.includes(file.id));
                  processAndCreateDoc(filesToProcess);
                }}
                disabled={isProcessing || !accessToken}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-blue-300 flex items-center space-x-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Process Selected ({selectedFiles.length})</span>
              </button>
            )}
          </>
        )}

        {lastDownloadedFile && (
          <button
            onClick={downloadAgain}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 flex items-center space-x-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download Again</span>
          </button>
        )}
      </div>

      {/* Status Messages */}
      {!accessToken && (
        <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg flex items-center space-x-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Error: No access token found. Please authenticate.</span>
        </div>
      )}
      {error && (
        <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg flex items-center space-x-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Error: {error.message}</span>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">
            Search Results ({results.length})
            {parseQueries(query).length > 1 && (
              <span className="text-sm font-normal text-blue-600 ml-2">
                (Files containing ALL terms: {parseQueries(query).join(', ')})
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => {
              const isMultiQuery = parseQueries(query).length > 1;
              return (
                <div key={result.id} className={`bg-white border-gray-100 hover:border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border p-4 ${isMultiQuery ? 'ring-1 ring-green-200' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(result.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles([...selectedFiles, result.id]);
                          } else {
                            setSelectedFiles(selectedFiles.filter(id => id !== result.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {isMultiQuery && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" title="Contains all search terms"></div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => {
                          // Use direct Google Drive URL for all file types
                          const directUrl = `https://drive.google.com/file/d/${result.id}/view`;
                          // Open directly in a new tab
                          window.open(directUrl, '_blank');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium truncate block cursor-pointer"
                      >
                        {result.name}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{result.mimeType}</p>
                      {isMultiQuery && (
                        <p className="text-xs text-green-600 mt-1">✓ Contains all search terms</p>
                      )}
                    </div>
                    <button
                      onClick={() => downloadFile(result.id, result.name, result.mimeType)}
                      className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Download file"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveSearch;