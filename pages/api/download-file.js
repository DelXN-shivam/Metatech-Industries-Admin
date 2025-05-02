import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName } = req.query;
    
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }
    
    const filePath = path.join(process.cwd(), 'temp', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    return res.status(500).json({ error: 'Error downloading file' });
  }
}