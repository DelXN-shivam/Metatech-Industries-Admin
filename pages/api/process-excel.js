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

    // --- START: Parallelize Excel file processing with concurrency limit ---
    const concurrency = 5; // You can tune this value based on server resources

    async function processSingleFile(file) {
      try {
        // Compress the base64 data
        const compressedData = compressBase64(file.fileData);
        const buffer = Buffer.from(compressedData, 'base64');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        let fileMatches = 0;
        let sheetsWithMatches = 0;
        const fileSectionChildren = [
          new Paragraph({
            text: `File: ${file.fileName}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 30, after: 30 },
            alignment: AlignmentType.CENTER,
          })
        ];

        for (const worksheet of workbook.worksheets) {
          try {
            // Create rows array for the table
            const rows = [];
            let hasMatches = false;
            const firstRow = worksheet.getRow(1);
            const columnNames = [];
            for (let i = 1; i <= 4; i++) {
              const cellValue = firstRow.getCell(i).value;
              // Use specific column names instead of generic ones
              const defaultNames = ['Code', 'Date', 'Name of Company', 'Enquiry Details / Product'];
              columnNames.push(cellValue ? cellValue.toString().trim() : defaultNames[i - 1]);
            }
            rows.push(new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: 'Sr. No.',
                      bold: true,
                      size: 24,
                    })],
                    alignment: AlignmentType.CENTER,
                  })],
                  width: { size: 5, type: WidthType.PERCENTAGE },
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
                    width: { size: index < 2 ? 15 : 35, type: WidthType.PERCENTAGE },
                  })
                ),
              ],
            }));

            const chunkSize = 1000;
            const totalRows = worksheet.rowCount;
            for (let startRow = 2; startRow <= totalRows; startRow += chunkSize) {
              const endRow = Math.min(startRow + chunkSize - 1, totalRows);
              for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                try {
                  const row = worksheet.getRow(rowNumber);
                  const thirdColumnValue = row.getCell(3).value;
                  const fourthColumnValue = row.getCell(4).value;

                  // Improved value extraction for third column (Name of Company)
                  let companyName = '';
                  if (thirdColumnValue !== null && thirdColumnValue !== undefined) {
                    if (typeof thirdColumnValue === 'object') {
                      if (thirdColumnValue.text) {
                        companyName = thirdColumnValue.text;
                      } else if (thirdColumnValue.richText) {
                        companyName = thirdColumnValue.richText.map(rt => rt.text).join('');
                      } else if (thirdColumnValue.formula) {
                        companyName = thirdColumnValue.formula;
                      } else if (thirdColumnValue.result) {
                        companyName = thirdColumnValue.result.toString();
                      } else {
                        companyName = thirdColumnValue.toString().replace(/[^\x20-\x7E]/g, '');
                      }
                    } else {
                      companyName = thirdColumnValue.toString();
                    }
                  }

                  // Improved value extraction for fourth column
                  let enquiryDetails = '';
                  if (fourthColumnValue !== null && fourthColumnValue !== undefined) {
                    if (typeof fourthColumnValue === 'object') {
                      if (fourthColumnValue.text) {
                        enquiryDetails = fourthColumnValue.text;
                      } else if (fourthColumnValue.richText) {
                        enquiryDetails = fourthColumnValue.richText.map(rt => rt.text).join('');
                      } else if (fourthColumnValue.formula) {
                        enquiryDetails = fourthColumnValue.formula;
                      } else if (fourthColumnValue.result) {
                        enquiryDetails = fourthColumnValue.result.toString();
                      } else {
                        enquiryDetails = String(fourthColumnValue).replace(/[^\x20-\x7E]/g, '');
                      }
                    } else {
                      enquiryDetails = String(fourthColumnValue);
                    }
                  }

                  // Ensure both values are strings before comparison
                  const searchQuery = query.toLowerCase();
                  const companyNameLower = companyName ? String(companyName).toLowerCase() : '';
                  const enquiryDetailsLower = enquiryDetails ? String(enquiryDetails).toLowerCase() : '';

                  if ((companyNameLower && companyNameLower.includes(searchQuery)) ||
                      (enquiryDetailsLower && enquiryDetailsLower.includes(searchQuery))) {
                    fileMatches++;
                    hasMatches = true;
                    const firstFourColumns = [];
                    for (let i = 1; i <= 4; i++) {
                      const cellValue = row.getCell(i).value;
                      let displayValue = '';
                      if (cellValue !== null && cellValue !== undefined) {
                        if (typeof cellValue === 'object') {
                          if (cellValue.text) {
                            displayValue = cellValue.text;
                          } else if (cellValue.richText) {
                            displayValue = cellValue.richText.map(rt => rt.text).join('');
                          } else if (cellValue.formula) {
                            displayValue = cellValue.formula;
                          } else if (cellValue.result) {
                            displayValue = cellValue.result.toString();
                          } else if (cellValue instanceof Date) {
                            displayValue = cellValue.toLocaleDateString();
                          } else {
                            displayValue = cellValue.toString().replace(/[^\x20-\x7E]/g, '');
                          }
                        } else {
                          displayValue = cellValue.toString();
                        }
                      }
                      firstFourColumns.push(displayValue);
                    }
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
                }
              }
            }

            if (hasMatches) {
              sheetsWithMatches++;
              const table = new Table({
                rows: rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [5, 15, 15, 35, 35],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                },
              });
              fileSectionChildren.push(
                new Paragraph({
                  text: `Sheet: ${worksheet.name}`,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 30, after: 30 },
                  alignment: AlignmentType.CENTER,
                }),
                table,
                new Paragraph({
                  text: '',
                  spacing: { after: 30 },
                })
              );
            }
          } catch (err) {
            console.error(`Error processing worksheet ${worksheet.name}:`, err);
          }
        }

        if (fileMatches > 0) {
          filesWithMatches++;
          totalMatches += fileMatches;
          fileSectionChildren.push(
            new Paragraph({
              text: '―'.repeat(46),
              spacing: { before: 30, after: 30 },
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
              spacing: { before: 30, after: 30 },
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
              spacing: { before: 30, after: 30 },
              alignment: AlignmentType.CENTER,
            })
          );
          allChildren.push(...fileSectionChildren);
        }
        processedFiles++;
      } catch (err) {
        console.error(`Error processing file ${file.fileName}:`, err);
        failedFiles.push({
          fileName: file.fileName,
          error: err.message
        });
      }
    }

    // Concurrency control helper
    async function processFilesWithConcurrency(files, concurrency) {
      let index = 0;
      const results = [];
      async function worker() {
        while (index < files.length) {
          const currentIndex = index++;
          await processSingleFile(files[currentIndex]);
        }
      }
      const workers = [];
      for (let i = 0; i < concurrency; i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
      return results;
    }

    // Use the concurrency-controlled processor
    await processFilesWithConcurrency(files, concurrency);
    // --- END: Parallelize Excel file processing ---

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