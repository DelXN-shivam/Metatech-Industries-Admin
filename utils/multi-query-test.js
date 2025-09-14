// Test utility for multi-query search functionality
// This can be used to test the search logic

// Parse multiple queries from comma-separated input
const parseQueries = (queryString) => {
  return queryString
    .split(',')
    .map(q => q.trim())
    .filter(q => q.length > 0);
};

// Check if content contains all queries
const containsAllQueries = (content, queries) => {
  if (!content || queries.length === 0) return false;
  const contentLower = content.toLowerCase();
  return queries.every(query => contentLower.includes(query.toLowerCase()));
};

// Test cases
const testCases = [
  {
    name: "Single query test",
    query: "contract",
    content: "This is a contract document for the project",
    expected: true
  },
  {
    name: "Multi-query success test",
    query: "contract, agreement, 2024",
    content: "This contract agreement was signed in 2024 for the new project",
    expected: true
  },
  {
    name: "Multi-query failure test",
    query: "contract, agreement, 2024",
    content: "This contract was signed in 2023 for the project", // missing "agreement" and "2024"
    expected: false
  },
  {
    name: "Case insensitive test",
    query: "CONTRACT, Agreement, 2024",
    content: "this contract agreement was signed in 2024",
    expected: true
  },
  {
    name: "Empty content test",
    query: "contract, agreement",
    content: "",
    expected: false
  },
  {
    name: "Partial match test",
    query: "contract, agreement, signature",
    content: "This contract agreement needs to be reviewed", // missing "signature"
    expected: false
  }
];

// Run tests
const runTests = () => {
  console.log("🧪 Running Multi-Query Search Tests...\n");
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    const queries = parseQueries(testCase.query);
    const result = containsAllQueries(testCase.content, queries);
    const success = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`  Query: "${testCase.query}"`);
    console.log(`  Parsed queries: [${queries.join(', ')}]`);
    console.log(`  Content: "${testCase.content}"`);
    console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
    console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`Success rate: ${Math.round((passed / testCases.length) * 100)}%`);
  
  return { passed, failed, total: testCases.length };
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseQueries,
    containsAllQueries,
    runTests
  };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runTests();
}