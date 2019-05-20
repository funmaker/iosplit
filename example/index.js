const IOSplit = require("../");

// Create an IOSplit instance
const iosplit = new IOSplit({
  history: true,
});

// Capture user input and evaluate it
iosplit.on("line", line => {
  console.log("»", line);
  try {
    const result = eval(line);
    console.log("←", result);
  } catch(err) {
    console.error(err);
  }
});

// Close program on stdin end(Ctrl-D)
// iosplit.on("end", () => process.exit());
iosplit.on("end", () => {
  iosplit.stop();
  iosplit.start();
});

// Display example logs on fixed intervals
setInterval(() => console.warn("Random async warning!"), 3000);
setInterval(() => console.error("Random async error!"), 5000);

// Start IOSplit
iosplit.start();
console.log("Enter any js expression in the box below.");
