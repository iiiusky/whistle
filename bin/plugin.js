var os = require('os');
var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var fse = require('fs-extra2');

var CMD_SUFFIX = process.platform === 'win32' ? '.cmd' : '';
var WHISLTE_PLUGIN_RE = /^(@[\w\-]+\/)?whistle\.[a-z\d_\-]+$/;
var PLUGIN_PATH = path.join(getWhistlePath(), 'plugins');

function getHomedir() {
  //默认设置为`~`，防止Linux在开机启动时Node无法获取homedir
  return (typeof os.homedir == 'function' ? os.homedir() :
  process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME']) || '~';
}

function getWhistlePath() {
  return process.env.WHISTLE_PATH || path.join(getHomedir(), '.WhistleAppData');
}

function getPlugins(argv) {
  return argv.filter(function(name) {
    return WHISLTE_PLUGIN_RE.test(name);
  });
}

exports.install = function(cmd, argv) {
  if (!getPlugins(argv).length) {
    return;
  }
  fse.ensureDirSync(PLUGIN_PATH);
  var files = fs.readdirSync(PLUGIN_PATH);
  files && files.forEach(function(name) {
    if (name !==  'node_modules') {
      try {
        fse.removeSync(path.join(PLUGIN_PATH, name));
      } catch(e) {}
    }
  });
  argv.push('--no-package-lock');
  cp.spawn(cmd + CMD_SUFFIX, argv, {
    stdio: 'inherit',
    cwd: PLUGIN_PATH
  });
};

exports.uninstall = function(cmd, plugins) {
  fse.ensureDirSync(PLUGIN_PATH);
  plugins = getPlugins(plugins);
  cmd = cmd + CMD_SUFFIX;
  plugins.forEach(function(name) {
    cp.spawn(cmd, ['uninstall', name], {
      stdio: 'inherit',
      cwd: PLUGIN_PATH
    });
  });
};

exports.run = function(cmd, argv) {
  var newPath = [path.join(PLUGIN_PATH, 'node_modules/.bin')];
  process.env.PATH && newPath.push(process.env.PATH);
  newPath = newPath.join(os.platform() === 'win32' ? ';' : ':');
  process.env.PATH = newPath;
  cp.spawn(cmd + CMD_SUFFIX, argv, {
    stdio: 'inherit',
    env: process.env
  });
};
