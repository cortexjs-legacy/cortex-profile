'use strict';

var typo = require('typo');
var fs = require('fs-sync');
var equal = require('deep-equal');

// @param {String} name Method name
exports.patch = function (host, name) {
  var method = host[name];

  host[name] = function () {
    try {
      method.apply(this, arguments);
      return true;

    } catch(e) {
      if (e.code === 'ERROR_PARSE_CONFIG') {
        var argv = process.argv;

        // if ERROR_PARSE_CONFIG error occurs, only allow user to
        // fix config file or to delete config file
        var about_to_fix = equal(argv.slice(2, 4), ['config', 'edit'])
          || equal(argv.slice(2, 5), ['config', 'delete', '--delete-all']);

        if (about_to_fix) {
          return false;
        }

        this.emit('error', {
          code: 'ERROR_PARSE_CONFIG',
          message: typo.template('Error parsing config file "' + e.data.file + '". You could run\n\n'
            +  '   `{{bold cortex config edit}}` to fix the file manually, or\n'
            +  '   `{{bold cortex config delete --delete-all}}` to reset it.\n'),
          data: e.data
        });
        return false;
      }

      if (e.code === 'EACCES') {
        var mkdirp = '';
        var dir = this.currentDir();
        if (!fs.exists(dir)) {
          mkdirp = '   {{bold mkdir -p ' + dir + '}}\n';
        }

        var bash = mkdirp 
          + '   {{bold chmod -R 755 ' + dir + '}}\n';

        this.emit('error', {
          code: 'EACCES',
          message: 'Permission denied to access or create profiles. Please run\n\n'
            + typo.template(bash) 
            + '\n'
            + 'Maybe you need `sudo`.'
        });
        return;
      }

      this.emit(e);
      return false;
    }
  }
};
