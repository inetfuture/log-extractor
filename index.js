var fs = require('fs');

var logFile = process.argv[2];
var timePattern = new RegExp(process.argv[3]);
var fromTime = process.argv[4];
var toTime = process.argv[5];
var outputFile = process.argv[6];

var fileStat = fs.statSync(logFile);
var fileSize = fileStat.size;
console.log('File size', fileSize);

var logFD = fs.openSync(logFile, 'r');
var blockSize = 1024;

var fromTimePosition = searchTimePosition(0, fileSize, fromTime);
if (fromTimePosition) {
  console.log('Found from time position', fromTimePosition);
} else {
  console.error('Can not find from time');
  process.exit(1);
}

var toTimePosition = searchTimePosition(fromTimePosition, fileSize, toTime);
if (toTimePosition) {
  console.log('Found to time position', toTimePosition);
} else {
  console.error('Can not find to time');
  process.exit(1);
}

extractRangeToNewFile(fromTimePosition, toTimePosition);

function searchTimePosition(startPosition, endPosition, time) {
  if (startPosition >= endPosition) {
    return null;
  }

  var middlePosition = startPosition + Math.round((endPosition - startPosition) / 2);
  var timeIncludedBlock = readTimeIncludedBlock(middlePosition, endPosition);

  var compareTimeResult = compareTime(timeIncludedBlock, time);
  if (compareTimeResult === 0) {
    return middlePosition;
  } else if (compareTimeResult > 0) {
    return searchTimePosition(startPosition, middlePosition, time);
  } else {
    return searchTimePosition(middlePosition, endPosition, time);
  }
}

function readTimeIncludedBlock(startPosition, endPosition) {
  if (startPosition >= endPosition) {
    return null;
  }

  var nextBlock = readBlock(startPosition);
  if (timePattern.test(nextBlock)) {
    return nextBlock;
  } else {
    return readTimeIncludedBlock(startPosition + blockSize, endPosition);
  }
}

function readBlock(startPosition) {
  var buffer = new Buffer(blockSize);
  fs.readSync(logFD, buffer, 0, blockSize, startPosition || 0);
  block = buffer.toString();
  return block;
}

function compareTime(timeIncludedBlock, time) {
  var match = timeIncludedBlock.match(timePattern)
  var timeToCompare = match[1];
  if (timeToCompare === time) {
    return 0;
  } else if (timeToCompare > time) {
    return 1;
  } else {
    return -1;
  }
}

function extractRangeToNewFile(startPosition, endPosition) {
  var rangeSize = endPosition - startPosition;
  var buffer = new Buffer(rangeSize);
  fs.readSync(logFD, buffer, 0, rangeSize, startPosition);
  var outputFileFD = fs.openSync(outputFile, 'w');
  fs.writeSync(outputFileFD, buffer, 0, rangeSize);
}
