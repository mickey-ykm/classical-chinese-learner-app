// Shared in-memory maps for tracking async generation runs.
// generateRuns: quiz generation and article generation jobs
// runs: assessment runs
const generateRuns = {}
const runs = {}

module.exports = { generateRuns, runs }
