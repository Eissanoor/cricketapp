const calculateNRR = function calculateSingleMatchNRR(
  runsScored,
  oversFaced,
  runsAgainst,
  oversBowled
) {
  // Calculate run rate scored and run rate conceded
  const runRateScored = runsScored / (oversFaced || 1);
  const runRateConceded = runsAgainst / (oversBowled || 1);

  // Calculate net run rate
  const netRunRate = runRateScored - runRateConceded;

  // Return the NRR rounded to two decimal places
  return netRunRate.toFixed(2);
};

console.log(calculateNRR(6, 1, 4, 1));
