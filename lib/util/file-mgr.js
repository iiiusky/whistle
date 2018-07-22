var fs = require('fs');
var iconv = require('iconv-lite');
var Buffer = require('safe-buffer').Buffer;
var isUtf8 = require('./is-utf8');

var MAX_SIZE = 1024 * 1024 * 64;
var CRLF = Buffer.from('\r\n');
var noop = function(_) {
  return _;
};

function decode(buf) {
  if (!Buffer.isBuffer(buf)) {
    return buf ? String(buf) : '';
  }
  if (!isUtf8(buf)) {
    try {
      return iconv.decode(buf, 'GB18030');
    } catch(e) {}
  }
  return String(buf);
}

function isString(path) {
  return path && typeof path === 'string';
}

function readSingleFile(path, callback) {
  if (!isString(path)) {
    return callback();
  }
  var stream = fs.createReadStream(path);
  var done, buf;
  var execCallback = function(err) {
    if (done) {
      return;
    }
    done = true;
    callback(err ? null : buf);
  };
  stream.on('data', function(data) {
    if (buf === null) {
      return;
    }
    buf = buf ? Buffer.concat([buf, data]) : data;
    if (buf.length > MAX_SIZE) {
      buf = null;
    }
  });
  stream.on('error', execCallback);
  stream.on('end', execCallback);
}

function getFileMap(list) {
  if (Array.isArray(list)) {
    list = list.join('|');
  }
  if (!isString(list)) {
    return '';
  }
  var fileMap = {};
  list = list.split('|');
  list.forEach(function(file) {
    fileMap[file || ''] = 1;
  });
  return fileMap;
}

function readFileMap(list, callback, isText) {
  var fileMap = getFileMap(list);
  if (!fileMap) {
    return callback('');
  }
  var files = Object.keys(fileMap);
  var len = files.length;
  files.forEach(function(file) {
    readSingleFile(file, function(data) {
      fileMap[file || ''] = isText ? decode(data) : data;
      if (--len <= 0) {
        callback(fileMap);
      }
    });
  });
}

function joinData(list, isText) {
  if (!list || !list.length) {
    return '';
  }
  if (isText) {
    return list.filter(noop).join('\r\n');
  }
  var result = [];
  list.forEach(function(buf) {
    if (buf) {
      result.push(buf, CRLF);
    }
  });
  result.pop();
  return result.length ? Buffer.concat(result) : '';
}

function readFileFromMap(path, fileMap, isText) {
  if (!isString(path)) {
    return '';
  }
  path = path.split('|');
  return joinData(path.map(function(file) {
    return fileMap[file || ''];
  }), isText);
}

function readFileList(list, callback, isText) {
  readFileMap(list, function(fileMap) {
    if (!fileMap) {
      return callback('');
    }
    var result = [];
    list.forEach(function(file) {
      result.push(readFileFromMap(file, fileMap, isText));
    });
    callback(result);
  }, isText);
}

function readFile(path, callback) {
  if (!isString(path)) {
    return callback();
  }
  readFileList(path.split('|'), function(result) {
    callback(joinData(result));
  });
}

function readFilesText(list, callback) {
  readFileList(list, callback, true);
}

function readFileText(path, callback) {
  if (!isString(path)) {
    return callback();
  }
  readFilesText(path.split('|'), function(result) {
    callback(joinData(result));
  }, true);
}

exports.decode = decode;
exports.readFile = readFile;
exports.readFileList = readFileList;
exports.readFileText = readFileText;
exports.readFilesText = readFilesText;