import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files, queries, accessToken } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: 'No queries provided' });
    }
    
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token provided' });
    }

    // Helper function to check if content contains all queries
    const containsAllQueries = (content, searchQueries) => {
      if (!content || searchQueries.length === 0) return false;
      const contentLower = content.toLowerCase();
      return searchQueries.every(query => contentLower.includes(query.toLowerCase()));
    };

    // Helper function to extract lightweight content
    const extractLightweightContent = async (fileId, fileName, mimeType) => {
      try {
        // For Google Docs, try to export as plain text first (fastest)
        if (mimeType === 'application/vnd.google-apps.document') {
          try {
            const response = await axios.get(
              `https://www.googleapis.com/drive/v3/files/${fileId}/export`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { 
                  mimeType: 'text/plain',
                  supportsAllDrives: true
                },
                timeout: 8000 // 8 second timeout
              }
            );
            return response.data || '';
          } catch (err) {
            console.log(`Failed to export ${fileName} as text, trying description...`);
          }
        }
        
        // For other files, get metadata with description
        const metadataResponse = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { 
              fields: 'name,mimeType,description',
              supportsAllDrives: true
            },
            timeout: 5000 // 5 second timeout
          }
        );
        
        const metadata = metadataResponse.data;
        return metadata.description || '';
      } catch (err) {
        console.log(`Lightweight extraction failed for ${fileName}:`, err.message);
        return '';
      }
    };

    // Process files in parallel batches
    const batchSize = 15; // Increased batch size for server-side processing
    const matchingFiles = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          // Check if file name contains all queries first (fastest)
          const nameContainsAll = containsAllQueries(file.name, queries);
          if (nameContainsAll) {
            return file;
          }
          
          // If name doesn't match, extract lightweight content
          const content = await extractLightweightContent(file.id, file.name, file.mimeType);
          
          // Check if file content contains all queries
          const contentContainsAll = containsAllQueries(content, queries);
          
          if (contentContainsAll) {
            return file;
          }
          return null;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validFiles = batchResults.filter(Boolean);
      matchingFiles.push(...validFiles);
    }

    return res.status(200).json({ 
      matchingFiles,
      totalProcessed: files.length,
      totalMatches: matchingFiles.length,
      queries: queries
    });
    
  } catch (error) {
    console.error('Error in multi-query search:', error);
    return res.status(500).json({ error: 'Error processing multi-query search: ' + error.message });
  }
}