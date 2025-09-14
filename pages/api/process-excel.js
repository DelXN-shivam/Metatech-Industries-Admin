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
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Add search query and timestamp
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    // Parse queries for debugging
    const queries = query.split(',').map(q => q.trim().toLowerCase()).filter(q => q.length > 0);
    console.log('Processing Excel files with queries:', queries);

    // Prepare an array to collect all content
    const allChildren = [
      new Paragraph({
        children: [
          new TextRun({
            text: `Search Query: ${query}`,
            highlight: 'yellow',
            bold: true,
          }),
        ],
        spacing: { before: 120, after: 60 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Total Files: ${files.length}`,
            bold: true,
          }),
        ],
        spacing: { before: 60, after: 60 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Date: ${formattedDate} | Time: ${formattedTime}`,
            bold: true,
          }),
        ],
        spacing: { before: 60, after: 120 },
      }),
      new Paragraph({
        text: '―'.repeat(46),
        spacing: { before: 120, after: 120 },
      })
    ];

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
        const buffer = Buffer.from(compressedData, "base64");
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
          }),
        ];

        for (const worksheet of workbook.worksheets) {
          try {
            // Create rows array for the table
            const rows = [];
            let hasMatches = false;

            // Dynamically get all column headers from the first row
            const firstRow = worksheet.getRow(1);
            const columnCount = worksheet.columnCount || firstRow.cellCount; // Fallback to cellCount if columnCount is undefined
            const columnNames = [];
            for (let i = 1; i <= columnCount; i++) {
              const cellValue = firstRow.getCell(i).value;
              columnNames.push(
                cellValue ? cellValue.toString().trim() : `Column ${i}`
              );
            }

            const chunkSize = 1000;
            const totalRows = worksheet.rowCount;
            for (
              let startRow = 2;
              startRow <= totalRows;
              startRow += chunkSize
            ) {
              const endRow = Math.min(startRow + chunkSize - 1, totalRows);
              for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                try {
                  const row = worksheet.getRow(rowNumber);
                  // Use the already parsed queries from the main function
                  let hasMatchesInRow = false;

                  // Arrays to hold non-empty column data and their names
                  const filledColumnValues = [];
                  const filledColumnNames = [];
                  const allRowText = []; // Collect all text from the row

                  // Loop through every cell in the row to collect data
                  for (let i = 1; i <= row.cellCount; i++) {
                    const cellValue = row.getCell(i).value;
                    let cellText = "";

                    if (cellValue !== null && cellValue !== undefined) {
                      if (typeof cellValue === "object") {
                        if (cellValue.text) {
                          cellText = cellValue.text;
                        } else if (cellValue.richText) {
                          cellText = cellValue.richText
                            .map((rt) => rt.text)
                            .join("");
                        } else if (cellValue.formula) {
                          cellText = cellValue.formula;
                        } else if (cellValue.result) {
                          cellText = String(cellValue.result);
                        } else if (cellValue instanceof Date) {
                          cellText = cellValue.toLocaleDateString();
                        } else {
                          cellText = String(cellValue).replace(
                            /[^\x20-\x7E]/g,
                            ""
                          );
                        }
                      } else {
                        cellText = String(cellValue);
                      }
                    }

                    // Add to all row text for multi-query checking
                    if (cellText) {
                      allRowText.push(String(cellText).toLowerCase());
                    }

                    // Only store the column data if it's not empty
                    if (
                      cellValue !== null &&
                      cellValue !== undefined &&
                      cellText !== ""
                    ) {
                      filledColumnValues.push(cellText);
                      const predefinedColumns = [
                        "Sr No.",
                        "Date",
                        "Name of Company",
                        "Enquiry Details / Product",
                        "User name & Phone Number",
                        "Email",
                        "Mode of Enquiry",
                        "Quotation prepared by",
                        "Reply Mode",
                      ];
                      const columnName =
                        predefinedColumns[i - 1] || `Column ${i}`;
                      filledColumnNames.push(columnName);
                    }
                  }

                  // Check if row contains ANY of the queries
                  const rowTextCombined = allRowText.join(" ");
                  
                  // Debug every row that has content
                  if (rowTextCombined.trim().length > 0) {
                    console.log(`\n--- Row ${rowNumber} Debug ---`);
                    console.log(`Row text: "${rowTextCombined}"`);
                    console.log(`Queries to find: [${queries.join(', ')}]`);
                    console.log(`Filled columns: ${filledColumnValues.length}`);
                    
                    // Check if ANY query matches (changed from ALL to ANY)
                    const matches = queries.map(q => {
                      const found = rowTextCombined.includes(q);
                      console.log(`  Query "${q}" found: ${found}`);
                      return found;
                    });
                    hasMatchesInRow = matches.some(m => m); // Changed from .every() to .some()
                    console.log(`Any query matches: ${hasMatchesInRow}`);
                    
                    console.log(`Will include row: ${hasMatchesInRow && filledColumnValues.length > 0}`);
                  }

                  if (hasMatchesInRow && filledColumnValues.length > 0) {
                    console.log(`✅ Adding row ${rowNumber} to results`);
                    fileMatches++;
                    hasMatches = true;

                    // Add header row to the table (including Sr. No.) if it's the first match
                    if (rows.length === 0) {
                      rows.push(
                        new TableRow({
                          children: [
                            new TableCell({
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: "Row No.",
                                      bold: true,
                                      size: 24,
                                    }),
                                  ],
                                  alignment: AlignmentType.CENTER,
                                }),
                              ],
                            }),
                            ...filledColumnNames.map(
                              (name) =>
                                new TableCell({
                                  children: [
                                    new Paragraph({
                                      children: [
                                        new TextRun({
                                          text: name,
                                          bold: true,
                                          size: 24,
                                        }),
                                      ],
                                      alignment: AlignmentType.CENTER,
                                    }),
                                  ],
                                })
                            ),
                          ],
                        })
                      );
                    }

                    // Add the row to the table (Sr. No. + only non-empty columns)
                    rows.push(
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: rowNumber.toString(),
                                    size: 24,
                                  }),
                                ],
                                alignment: AlignmentType.CENTER,
                              }),
                            ],
                          }),
                          ...filledColumnValues.map(
                            (value) =>
                              new TableCell({
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun({
                                        text: value || "",
                                        size: 24,
                                      }),
                                    ],
                                    alignment: AlignmentType.LEFT,
                                  }),
                                ],
                              })
                          ),
                        ],
                      })
                    );
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
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                  insideHorizontal: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                  insideVertical: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
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
                  text: "",
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
              text: "―".repeat(46),
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
          error: err.message,
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
        text: "―".repeat(46),
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
      }),
    ];

    if (failedFiles.length > 0) {
      summarySectionChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Failed Files: ${failedFiles.length}`,
              bold: true,
              size: 24,
              color: "FF0000",
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
      sections: [
        {
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
          children: allChildren,
        },
      ],
    });

    // Generate the Word document
    const docBuffer = await Packer.toBuffer(doc);

    // Format filename
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const sanitizedQuery = query.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
    // Update: filename format is "SearchQuery_Date_Time.docx"
    const outputFileName = `${sanitizedQuery}_${date}_${time}.docx`;

    // Set response headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${outputFileName}`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

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




// import ExcelJS from 'exceljs';
// import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

// // Helper function to compress base64 data
// function compressBase64(base64String) {
//   try {
//     // Remove data URL prefix if present
//     const base64Data = base64String.replace(/^data:.*?;base64,/, '');
//     return base64Data;
//   } catch (error) {
//     console.error('Error compressing base64:', error);
//     return base64String;
//   }
// }

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     const { files, query } = req.body;
    
//     if (!files || !Array.isArray(files) || files.length === 0 || !query) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     // Add search query and timestamp
//     const now = new Date();
//     const formattedDate = now.toLocaleDateString();
//     const formattedTime = now.toLocaleTimeString();

//     // Prepare an array to collect all content
//     const allChildren = [];

//     let totalMatches = 0;
//     let filesWithMatches = 0;
//     let processedFiles = 0;
//     let failedFiles = [];

//     // --- START: Parallelize Excel file processing with concurrency limit ---
//     const concurrency = 5; // You can tune this value based on server resources

//     async function processSingleFile(file) {
//       try {
//         // Compress the base64 data
//         const compressedData = compressBase64(file.fileData);
//         const buffer = Buffer.from(compressedData, 'base64');
//         const workbook = new ExcelJS.Workbook();
//         await workbook.xlsx.load(buffer);

//         let fileMatches = 0;
//         let sheetsWithMatches = 0;
//         const fileSectionChildren = [
//           new Paragraph({
//             text: `File: ${file.fileName}`,
//             heading: HeadingLevel.HEADING_1,
//             spacing: { before: 30, after: 30 },
//             alignment: AlignmentType.CENTER,
//           })
//         ];

//         for (const worksheet of workbook.worksheets) {
//           try {
//             // Create rows array for the table
//             const rows = [];
//             let hasMatches = false;

//             // Dynamically get all column headers from the first row
//             const firstRow = worksheet.getRow(1);
//             const columnCount = worksheet.columnCount || firstRow.cellCount; // Fallback to cellCount if columnCount is undefined
//             const columnNames = [];
//             for (let i = 1; i <= columnCount; i++) {
//               const cellValue = firstRow.getCell(i).value;
//               columnNames.push(cellValue ? cellValue.toString().trim() : `Column ${i}`);
//             }

//             // Add header row to the table (including Sr. No.)
//             rows.push(new TableRow({
//               children: [
//                 new TableCell({
//                   children: [new Paragraph({
//                     children: [new TextRun({
//                       text: 'Sr. No.',
//                       bold: true,
//                       size: 24,
//                     })],
//                     alignment: AlignmentType.CENTER,
//                   })],
//                 }),
//                 ...columnNames.map(name => 
//                   new TableCell({
//                     children: [new Paragraph({
//                       children: [new TextRun({
//                         text: name,
//                         bold: true,
//                         size: 24,
//                       })],
//                       alignment: AlignmentType.CENTER,
//                     })],
//                   })
//                 ),
//               ],
//             }));

//             const chunkSize = 1000;
//             const totalRows = worksheet.rowCount;
//             for (let startRow = 2; startRow <= totalRows; startRow += chunkSize) {
//               const endRow = Math.min(startRow + chunkSize - 1, totalRows);
//               for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
//                 try {
//                   const row = worksheet.getRow(rowNumber);
//                   const searchQuery = query.toLowerCase();
//                   let hasMatchesInRow = false;

//                   // Loop through every cell in the row to check for the query
//                   for (let i = 1; i <= row.cellCount; i++) {
//                     const cellValue = row.getCell(i).value;
//                     let cellText = '';
                    
//                     if (cellValue !== null && cellValue !== undefined) {
//                       if (typeof cellValue === 'object') {
//                         if (cellValue.text) {
//                           cellText = cellValue.text;
//                         } else if (cellValue.richText) {
//                           cellText = cellValue.richText.map(rt => rt.text).join('');
//                         } else if (cellValue.formula) {
//                           cellText = cellValue.formula;
//                         } else if (cellValue.result) {
//                           cellText = cellValue.result.toString();
//                         } else if (cellValue instanceof Date) {
//                           cellText = cellValue.toLocaleDateString();
//                         } else {
//                           cellText = cellValue.toString().replace(/[^\x20-\x7E]/g, '');
//                         }
//                       } else {
//                         cellText = String(cellValue);
//                       }
//                     }
                  
//                     if (cellText && String(cellText).toLowerCase().includes(searchQuery)) {
//                       hasMatchesInRow = true;
//                       break; // Exit the inner loop as soon as a match is found
//                     }
//                   }

//                   if (hasMatchesInRow) {
//                     fileMatches++;
//                     hasMatches = true;

//                     // Extract values from ALL columns
//                     const allColumnValues = [];
//                     for (let i = 1; i <= columnCount; i++) {
//                       const cellValue = row.getCell(i).value;
//                       let displayValue = '';
//                       if (cellValue !== null && cellValue !== undefined) {
//                         if (typeof cellValue === 'object') {
//                           if (cellValue.text) {
//                             displayValue = cellValue.text;
//                           } else if (cellValue.richText) {
//                             displayValue = cellValue.richText.map(rt => rt.text).join('');
//                           } else if (cellValue.formula) {
//                             displayValue = cellValue.formula;
//                           } else if (cellValue.result) {
//                             displayValue = cellValue.result.toString();
//                           } else if (cellValue instanceof Date) {
//                             displayValue = cellValue.toLocaleDateString();
//                           } else {
//                             displayValue = cellValue.toString().replace(/[^\x20-\x7E]/g, '');
//                           }
//                         } else {
//                           displayValue = cellValue.toString();
//                         }
//                       }
//                       allColumnValues.push(displayValue);
//                     }

//                     // Add the row to the table (Sr. No. + all columns)
//                     rows.push(new TableRow({
//                       children: [
//                         new TableCell({
//                           children: [new Paragraph({
//                             children: [new TextRun({
//                               text: rowNumber.toString(),
//                               size: 24,
//                             })],
//                             alignment: AlignmentType.CENTER,
//                           })],
//                         }),
//                         ...allColumnValues.map(value => 
//                           new TableCell({
//                             children: [new Paragraph({
//                               children: [new TextRun({
//                                 text: value || '',
//                                 size: 24,
//                               })],
//                               alignment: AlignmentType.LEFT,
//                             })],
//                           })
//                         ),
//                       ],
//                     }));
//                   }
//                 } catch (err) {
//                   console.error(`Error processing row ${rowNumber}:`, err);
//                 }
//               }
//             }

//             if (hasMatches) {
//               sheetsWithMatches++;
//               const table = new Table({
//                 rows: rows,
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 // Dynamically calculate column widths: equal width for all columns
//                 columnWidths: Array(columnCount + 1).fill(100 / (columnCount + 1)), // +1 for Sr. No.
//                 borders: {
//                   top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
//                   bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
//                   left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
//                   right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
//                   insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
//                   insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
//                 },
//               });
//               fileSectionChildren.push(
//                 new Paragraph({
//                   text: `Sheet: ${worksheet.name}`,
//                   heading: HeadingLevel.HEADING_2,
//                   spacing: { before: 30, after: 30 },
//                   alignment: AlignmentType.CENTER,
//                 }),
//                 table,
//                 new Paragraph({
//                   text: '',
//                   spacing: { after: 30 },
//                 })
//               );
//             }
//           } catch (err) {
//             console.error(`Error processing worksheet ${worksheet.name}:`, err);
//           }
//         }

//         if (fileMatches > 0) {
//           filesWithMatches++;
//           totalMatches += fileMatches;
//           fileSectionChildren.push(
//             new Paragraph({
//               text: '―'.repeat(46),
//               spacing: { before: 30, after: 30 },
//               alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//               children: [
//                 new TextRun({
//                   text: `Matches in ${file.fileName}: ${fileMatches}`,
//                   bold: true,
//                   size: 24,
//                 }),
//               ],
//               spacing: { before: 30, after: 30 },
//               alignment: AlignmentType.CENTER,
//             }),
//             new Paragraph({
//               children: [
//                 new TextRun({
//                   text: `Sheets with Matches: ${sheetsWithMatches}`,
//                   bold: true,
//                   size: 24,
//                 }),
//               ],
//               spacing: { before: 30, after: 30 },
//               alignment: AlignmentType.CENTER,
//             })
//           );
//           allChildren.push(...fileSectionChildren);
//         }
//         processedFiles++;
//       } catch (err) {
//         console.error(`Error processing file ${file.fileName}:`, err);
//         failedFiles.push({
//           fileName: file.fileName,
//           error: err.message
//         });
//       }
//     }

//     // Concurrency control helper
//     async function processFilesWithConcurrency(files, concurrency) {
//       let index = 0;
//       const results = [];
//       async function worker() {
//         while (index < files.length) {
//           const currentIndex = index++;
//           await processSingleFile(files[currentIndex]);
//         }
//       }
//       const workers = [];
//       for (let i = 0; i < concurrency; i++) {
//         workers.push(worker());
//       }
//       await Promise.all(workers);
//       return results;
//     }

//     // Use the concurrency-controlled processor
//     await processFilesWithConcurrency(files, concurrency);
//     // --- END: Parallelize Excel file processing ---

//     // Add overall summary
//     const summarySectionChildren = [
//       new Paragraph({
//         text: '―'.repeat(46),
//         spacing: {
//           before: 30,
//           after: 30,
//         },
//         alignment: AlignmentType.CENTER,
//       }),
//       new Paragraph({
//         children: [
//           new TextRun({
//             text: `Total Matches Found: ${totalMatches}`,
//             bold: true,
//             size: 24,
//           }),
//         ],
//         spacing: {
//           before: 30,
//           after: 30,
//         },
//         alignment: AlignmentType.CENTER,
//       }),
//       new Paragraph({
//         children: [
//           new TextRun({
//             text: `Files with Matches: ${filesWithMatches}`,
//             bold: true,
//             size: 24,
//           }),
//         ],
//         spacing: {
//           before: 30,
//           after: 30,
//         },
//         alignment: AlignmentType.CENTER,
//       }),
//       new Paragraph({
//         children: [
//           new TextRun({
//             text: `Files Processed: ${processedFiles}`,
//             bold: true,
//             size: 24,
//           }),
//         ],
//         spacing: {
//           before: 30,
//           after: 30,
//         },
//         alignment: AlignmentType.CENTER,
//       })
//     ];

//     if (failedFiles.length > 0) {
//       summarySectionChildren.push(
//         new Paragraph({
//           children: [
//             new TextRun({
//               text: `Failed Files: ${failedFiles.length}`,
//               bold: true,
//               size: 24,
//               color: 'FF0000',
//             }),
//           ],
//           spacing: {
//             before: 30,
//             after: 30,
//           },
//           alignment: AlignmentType.CENTER,
//         })
//       );
//     }

//     // Add the summary section to the allChildren array
//     allChildren.push(...summarySectionChildren);

//     // Now create the document with a single section containing all content
//     const doc = new Document({
//       sections: [{
//         properties: {
//           page: {
//             margin: {
//               top: 720,
//               right: 720,
//               bottom: 720,
//               left: 720,
//             },
//           },
//         },
//         children: allChildren
//       }]
//     });

//     // Generate the Word document
//     const docBuffer = await Packer.toBuffer(doc);

//     // Format filename
//     const date = now.toISOString().split('T')[0];
//     const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
//     const sanitizedQuery = query.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
//     // Update: filename format is "SearchQuery_Date_Time.docx"
//     const outputFileName = `${sanitizedQuery}_${date}_${time}.docx`;

//     // Set response headers
//     res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`);
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

//     // Send the document
//     return res.send(docBuffer);
//   } catch (error) {
//     console.error('Error processing Excel files:', error);
//     return res.status(500).json({ error: 'Error processing Excel files: ' + error.message });
//   }
// }

// export const config = {
//   api: {
//     bodyParser: {
//       sizeLimit: '10mb', // Increase the limit as needed (e.g., '10mb')
//     },
//   },
// };