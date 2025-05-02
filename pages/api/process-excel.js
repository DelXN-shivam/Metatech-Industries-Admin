import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

// Helper function to compress base64 data
function compressBase64(base64String) {
  try {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:.*?;base64,/, '');
    return base64Data;
  } catch (error) {
    console.error('Error compressing base64:', error);
    return base64String;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files, query } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0 || !query) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Add search query and timestamp
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    // Create a new Word document with proper margins
    // Remove this block:
    // const doc = new Document({
    //   sections: [{
    //     properties: {
    //       page: {
    //         margin: {
    //           top: 720, // 0.5 inch
    //           right: 720,
    //           bottom: 720,
    //           left: 720,
    //         },
    //       },
    //     },
    //     children: [
    //       // First page content removed: No Search Query, Date, or Time
    //     ]
    //   }]
    // });

    // Prepare an array to collect all content
    const allChildren = [];

    let totalMatches = 0;
    let filesWithMatches = 0;
    let processedFiles = 0;
    let failedFiles = [];

    // Process each Excel file
    for (const file of files) {
      try {
        // Compress the base64 data
        const compressedData = compressBase64(file.fileData);
        
        // Convert base64 to buffer
        const buffer = Buffer.from(compressedData, 'base64');
        
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        let fileMatches = 0;
        let sheetsWithMatches = 0;

        // Create a section for this file
        const fileSectionChildren = [
          new Paragraph({
            text: `File: ${file.fileName}`,
            heading: HeadingLevel.HEADING_1,
            spacing: {
              before: 30,
              after: 30,
            },
            alignment: AlignmentType.CENTER,
          })
        ];

        // Process each worksheet
        for (const worksheet of workbook.worksheets) {
          try {
            // Create rows array for the table
            const rows = [];
            let hasMatches = false;

            // Get column names from the first row
            const firstRow = worksheet.getRow(1);
            const columnNames = [];
            for (let i = 1; i <= 4; i++) {
              const cellValue = firstRow.getCell(i).value;
              // Use the actual column name from Excel, or if empty, use a default name
              columnNames.push(cellValue ? cellValue.toString().trim() : `Column ${i}`);
            }

            // Add header row with original column names
            rows.push(new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: 'Row #',
                      bold: true,
                      size: 24,
                    })],
                    alignment: AlignmentType.CENTER,
                  })],
                  width: {
                    size: 5,
                    type: WidthType.PERCENTAGE,
                  },
                }),
                ...columnNames.map((name, index) => 
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: name,
                        bold: true,
                        size: 24,
                      })],
                      alignment: AlignmentType.CENTER,
                    })],
                    width: {
                      size: index < 2 ? 15 : 35, // 15% for first two columns, 35% for last two
                      type: WidthType.PERCENTAGE,
                    },
                  })
                ),
              ],
            }));

            // Process rows in chunks to handle large files
            const chunkSize = 1000; // Process 1000 rows at a time
            const totalRows = worksheet.rowCount;
            
            for (let startRow = 2; startRow <= totalRows; startRow += chunkSize) {
              const endRow = Math.min(startRow + chunkSize - 1, totalRows);
              
              for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                try {
                  const row = worksheet.getRow(rowNumber);
                  // Check if the query exists in the 4th column (index 3)
                  const fourthColumnValue = row.getCell(4).value;
                  if (fourthColumnValue && fourthColumnValue.toString().toLowerCase().includes(query.toLowerCase())) {
                    fileMatches++;
                    hasMatches = true;
                    
                    // Get first four columns
                    const firstFourColumns = [];
                    for (let i = 1; i <= 4; i++) {
                      const cellValue = row.getCell(i).value;
                      // Handle different types of cell values
                      let displayValue = '';
                      if (cellValue !== null && cellValue !== undefined) {
                        if (typeof cellValue === 'object') {
                          // For Column 3, ensure plain text
                          if (i === 3) {
                            // Extract text content from the object
                            if (cellValue.text) {
                              displayValue = cellValue.text;
                            } else if (cellValue.richText) {
                              displayValue = cellValue.richText.map(rt => rt.text).join('');
                            } else if (cellValue.formula) {
                              displayValue = cellValue.formula;
                            } else {
                              displayValue = cellValue.toString().replace(/[^\x20-\x7E]/g, '');
                            }
                          } else {
                            // Handle date objects for other columns
                            if (cellValue instanceof Date) {
                              displayValue = cellValue.toLocaleDateString();
                            } else {
                              displayValue = JSON.stringify(cellValue);
                            }
                          }
                        } else {
                          displayValue = cellValue.toString();
                        }
                      }
                      firstFourColumns.push(displayValue);
                    }

                    // Add the row data to the rows array
                    rows.push(new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({
                            children: [new TextRun({
                              text: rowNumber.toString(),
                              size: 24,
                            })],
                            alignment: AlignmentType.CENTER,
                          })],
                        }),
                        ...firstFourColumns.map(value => 
                          new TableCell({
                            children: [new Paragraph({
                              children: [new TextRun({
                                text: value || '',
                                size: 24,
                              })],
                              alignment: AlignmentType.LEFT,
                            })],
                          })
                        ),
                      ],
                    }));
                  }
                } catch (err) {
                  console.error(`Error processing row ${rowNumber}:`, err);
                  // Continue with next row
                }
              }
            }

            // Only add the sheet section if it has matches
            if (hasMatches) {
              sheetsWithMatches++;
              
              // Create the table with all rows
              const table = new Table({
                rows: rows,
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                columnWidths: [5, 15, 15, 35, 35], // Updated column widths
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                },
              });

              // Add worksheet name and table to the file section
              // fileSectionChildren.push(...)
              fileSectionChildren.push(
                new Paragraph({
                  text: `Sheet: ${worksheet.name}`,
                  heading: HeadingLevel.HEADING_2,
                  spacing: {
                    before: 30,
                    after: 30,
                  },
                  alignment: AlignmentType.CENTER,
                }),
                table,
                new Paragraph({
                  text: '',
                  spacing: {
                    after: 30,
                  },
                })
              );
            }
          } catch (err) {
            console.error(`Error processing worksheet ${worksheet.name}:`, err);
            // Continue with next worksheet
          }
        }

        // Only add the file section if it has matches
        if (fileMatches > 0) {
          filesWithMatches++;
          totalMatches += fileMatches;

          // Add file summary
          fileSectionChildren.push(
            new Paragraph({
              text: '―'.repeat(46),
              spacing: {
                before: 30,
                after: 30,
              },
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Matches in ${file.fileName}: ${fileMatches}`,
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: {
                before: 30,
                after: 30,
              },
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Sheets with Matches: ${sheetsWithMatches}`,
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: {
                before: 30,
                after: 30,
              },
              alignment: AlignmentType.CENTER,
            })
          );

          // Instead of doc.addSection, push to allChildren
          allChildren.push(...fileSectionChildren);
        }

        processedFiles++;
      } catch (err) {
        console.error(`Error processing file ${file.fileName}:`, err);
        failedFiles.push({
          fileName: file.fileName,
          error: err.message
        });
        // Continue with next file
      }
    }

    // Add overall summary
    const summarySectionChildren = [
      new Paragraph({
        text: '―'.repeat(46),
        spacing: {
          before: 30,
          after: 30,
        },
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Total Matches Found: ${totalMatches}`,
            bold: true,
            size: 24,
          }),
        ],
        spacing: {
          before: 30,
          after: 30,
        },
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Files with Matches: ${filesWithMatches}`,
            bold: true,
            size: 24,
          }),
        ],
        spacing: {
          before: 30,
          after: 30,
        },
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Files Processed: ${processedFiles}`,
            bold: true,
            size: 24,
          }),
        ],
        spacing: {
          before: 30,
          after: 30,
        },
        alignment: AlignmentType.CENTER,
      })
    ];

    if (failedFiles.length > 0) {
      summarySectionChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Failed Files: ${failedFiles.length}`,
              bold: true,
              size: 24,
              color: 'FF0000',
            }),
          ],
          spacing: {
            before: 30,
            after: 30,
          },
          alignment: AlignmentType.CENTER,
        })
      );
    }

    // Add the summary section to the allChildren array
    allChildren.push(...summarySectionChildren);

    // Now create the document with a single section containing all content
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: allChildren
      }]
    });

    // Generate the Word document
    const docBuffer = await Packer.toBuffer(doc);

    // Format filename
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const sanitizedQuery = query.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    // Update: filename format is "SearchQuery_Date_Time.docx"
    const outputFileName = `${sanitizedQuery}_${date}_${time}.docx`;

    // Set response headers
    res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Send the document
    return res.send(docBuffer);
  } catch (error) {
    console.error('Error processing Excel files:', error);
    return res.status(500).json({ error: 'Error processing Excel files: ' + error.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase the limit as needed (e.g., '10mb')
    },
  },
};