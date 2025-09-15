import axios from 'axios';
import config from '../../config.json';
import { searchCache } from '../../utils/searchCache';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    query, 
    folderId = 'root', 
    selectedFolder = '', 
    selectedFileType = '', 
    fileNameFilter = '',
    pageToken = ''
  } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    // Check cache first
    const cachedResult = searchCache.get(query, folderId, selectedFolder, selectedFileType, fileNameFilter);
    if (cachedResult && !pageToken) {
      return res.status(200).json({
        ...cachedResult,
        fromCache: true
      });
    }

    // Parse multiple queries
    const queries = query.split(',').map(q => q.trim()).filter(q => q.length > 0);
    const isMultiQuery = queries.length > 1;

    // Build file type filter
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

    // Build search query
    let searchQuery;
    const targetFolderId = selectedFolder || folderId;

    if (isMultiQuery) {
      const searchTerms = queries.map(q => q.replace(/'/g, "\\'"));
      const fullTextQuery = searchTerms.map(term => `fullText contains '${term}'`).join(' and ');
      const nameSearchQuery = searchTerms.map(term => `name contains '${term}'`).join(' and ');
      
      if (targetFolderId === "root" && !selectedFolder) {
        searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false${fileTypeQuery}${nameQuery} and ` +
          `(${nameSearchQuery} or ${fullTextQuery})`;
      } else {
        searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false and ` +
          `parents in '${targetFolderId}'${fileTypeQuery}${nameQuery} and ` +
          `(${nameSearchQuery} or ${fullTextQuery})`;
      }
    } else {
      const escapedQuery = queries[0].replace(/'/g, "\\'");
      if (targetFolderId === "root" && !selectedFolder) {
        searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false${fileTypeQuery}${nameQuery} and ` +
          `(name contains '${escapedQuery}' or fullText contains '${escapedQuery}')`;
      } else {
        searchQuery = `mimeType!='application/vnd.google-apps.folder' and trashed=false and ` +
          `parents in '${targetFolderId}'${fileTypeQuery}${nameQuery} and ` +
          `(name contains '${escapedQuery}' or fullText contains '${escapedQuery}')`;
      }
    }

    const response = await axios.get("https://www.googleapis.com/drive/v3/files", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: searchQuery,
        fields: "files(id,name,mimeType,size,modifiedTime),nextPageToken",
        pageSize: 50,
        pageToken: pageToken || undefined,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives'
      },
    });

    const files = response.data.files || [];
    
    const result = {
      files,
      nextPageToken: response.data.nextPageToken,
      totalResults: files.length,
      isMultiQuery,
      searchTerms: queries,
      fromCache: false
    };

    // Cache the result if it's the first page
    if (!pageToken) {
      searchCache.set(query, folderId, selectedFolder, selectedFileType, fileNameFilter, result);
    }
    
    res.status(200).json(result);

  } catch (error) {
    console.error('Live search error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Access token expired' });
    }
    
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message 
    });
  }
}