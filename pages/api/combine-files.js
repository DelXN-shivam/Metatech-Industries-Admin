import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files, query } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Create a new .docx file with all content
    const children = [];
    
    // Add search query, total files count, and date/time at the top with yellow highlight
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Search Query: ${query || 'N/A'}`,
            highlight: 'yellow',
            bold: true,
          }),
        ],
        spacing: {
          before: 120,
          after: 60,
        },
      })
    );
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Total Files: ${files.length}`,
            bold: true,
          }),
        ],
        spacing: {
          before: 60,
          after: 60,
        },
      })
    );
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Date: ${formattedDate} | Time: ${formattedTime}`,
            bold: true,
          }),
        ],
        spacing: {
          before: 60,
          after: 120,
        },
      })
    );
    
    // Add a separator line
    children.push(
      new Paragraph({
        text: '―'.repeat(46),
        spacing: {
          before: 120,
          after: 120,
        },
      })
    );
    
    for (const file of files) {
      // Add file name as heading
      children.push(
        new Paragraph({
          text: file.fileName,
          heading: HeadingLevel.HEADING_2,
          thematicBreak: true,
          spacing: {
            before: 120,
            after: 60,
          },
        })
      );
      
      // Add extracted text lines
      const lines = file.extractedText.split('\n');
      for (const line of lines) {
        children.push(
          new Paragraph({
            children: [new TextRun(line || ' ')],
            spacing: {
              before: 0,
              after: 0,
            },
          })
        );
      }
      
      // Add separator between files
      children.push(
        new Paragraph({
          text: '',
          spacing: {
            before: 60,
            after: 60,
          },
        })
      );
    }
    
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720, // 0.5 inch
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: children,
        },
      ],
    });
    
    // Save the document to a buffer
    const docBuffer = await Packer.toBuffer(doc);
    
    // Format current date and time for filename
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    
    // Sanitize the query for use in filename
    const sanitizedQuery = query.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    
    const outputFileName = `${sanitizedQuery}_${date}_${time}.docx`;
    
    // Set response headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // Send the buffer directly
    return res.send(docBuffer);
  } catch (error) {
    console.error('Error combining files:', error);
    return res.status(500).json({ error: 'Error combining files: ' + error.message });
  }
}