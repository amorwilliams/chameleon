'use strict';

/* Services */

var fs = require('fs');
var pathLib = require('path');
var globalenv = require('./js/globalenv')
var chameleon = require('./ts/chameleon');

var ChameleonTool = chameleon.ChameleonTool;
var Project = chameleon.Project;

function PouchDBWrapper(db) {
    this.db = db;
}

PouchDBWrapper.prototype.set = function(table, key, value, cb) {
    var realKey = table + '-' + key;
    value._id = realKey;
    this.db.insert(value, cb);
}

PouchDBWrapper.prototype.get = function (table, key, cb) {
    var realKey = table + '-' + key;
    this.db.findOne({_id: realKey}, cb);
}


PouchDBWrapper.prototype.del = function (table, key, cb) {
    var realKey = table + '-' + key;
    this.db.remove({_id: realKey}, {}, cb);
}


var chameleonTool = angular.module('chameleonTool', ['ngResource']);

chameleonTool.service('ProjectMgr', ["$q", "$log", function($q, $log) {
    var DRAWABLE_DENSITY = {
        medium: 'drawable-mdpi',
        high: 'drawable-hdpi',
        xhigh: 'drawable-xhdpi',
        xxhigh: 'drawable-xxhdpi',
        xxxhigh: 'drawable-xxxhdpi'
    };

    var ProjectMgr = function() {
        $log.log('init the env');
        this.exec = require('child_process').execFile;
        this.tmpLib = require('tmp');
        this.fs = require('fs');
        this.pathLib = require('path');
        /*
        var content = 
            fs.readFileSync(pathLib.join(globalenv.APP_FOLDER, 'env.json'), {
            encoding:'utf-8'
            });
        this.env = JSON.parse(content);
        this.setPythonMgrPath(
            pathLib.join(globalenv.APP_FOLDER, this.env.pythonPath));
            */
        globalenv.createTempFolder();
        var Database = require('nedb');
        this.sdkdb = new Database({filename: this.pathLib.join(globalenv.APP_FOLDER, 'sdkdb.nedb'), autoload: true});
        this.db = new Database({filename: this.pathLib.join(globalenv.APP_FOLDER, 'productdb.nedb'), autoload: true});
    };

    ProjectMgr.prototype.getTempFile = function(project, name) {
        return globalenv.createProjectTmpFile(project.__doc._id, name);
    }

    ProjectMgr.prototype.init = function () {
        var defered = $q.defer();
        var self = this;
        chameleon.ChameleonTool.initTool(new PouchDBWrapper(self.sdkdb), function (err, chtool) {
            if (err) {
                defered.reject(err);
                return;
            }
            self.chtool = chtool;
            defered.resolve(chtool);
        });
        return defered.promise;
    }

    ProjectMgr.prototype.removeProject = function(project) {
        this.db.remove({_id: project._id});
    };

    ProjectMgr.prototype.loadTempProject = function (path) {
        var j = this.pathLib.join(path, 'chameleon', 'champroject.json');
        try {
            var p = JSON.parse(this.fs.readFileSync(j, 'utf-8'));
            return {
                appname: p.globalcfg.appname,
                version: p.version
            };
        } catch (e) {
            $log.log(e);
            throw new Error("无法找到或者正确读取工程文件: " + j);
        }
    };

    ProjectMgr.prototype.doRunCmd = function (cmd, params, timeout, callback) {
        if (typeof timeof === 'function') {
            callback = timeout;
            timeout = 60; //default one minute
        }
        var c = spawn(cmd, params);
    }

    ProjectMgr.prototype.compileProject = function(project, target) {
        var defered = $q.defer();
        var buildscript = this.pathLib.join(project.__doc.path, 'chameleon_build.py');
        var inputParams = [buildscript, 'build', 'release', target];
        this.exec('python', inputParams, {
                timeout: 120000,
                maxBuffer: 1024*1024
            }, function (error, stdout, stderr) {
                $log.log("std out " + stdout);
                $log.log("std err " + stderr);
                var compileResult = null;
                if (error) {
                    compileResult = {
                        code: error.code,
                        target: target,
                        s: stderr + '\n\n 详细log是：\n' + stdout
                    };
                    return defered.resolve(compileResult);
                }
                return defered.resolve({
                    code: 0,
                    target: target
                });
            });
        return defered.promise;
    };

    ProjectMgr.prototype.getAllChannels = function() {
        return this.chtool.getChannelList();
    };

    ProjectMgr.prototype.newSDK = function (project, sdkid, desc, callback) {
        var defered = $q.defer();
        this.chtool.createSDKCfg(project, sdkid, desc, function (err, sdkcfg) {
            if (err) {
                defered.reject(err);
                return;
            }
            defered.resolve(sdkcfg);
        });
        return defered.promise;
    }

    ProjectMgr.prototype.newChannel = function (project, channelName) {
        return this.chtool.createOrphanChannel(project, channelName);
    }

    ProjectMgr.prototype.getSupportedDKs = function () {
        return this.chtool.getAllSDKs();
    }

    ProjectMgr.prototype.loadIcon = function (projectPath, icon) {
        var path = this.pathLib;
        var fs = this.fs;
        var toLoad = {};
        for (var density in DRAWABLE_DENSITY) {
            var iconPath = path.join(projectPath, 
                'res', DRAWABLE_DENSITY[density], icon);
            if (fs.existsSync(iconPath)) {
                toLoad[density] = iconPath;
            }
        }
        return toLoad;
    }

    ProjectMgr.prototype.updateSignCfg = function (project, channelId, cfg) {
        var defered = $q.defer();
        var self = this;
        project.setSignCfg(cfg);
        project.saveSignCfg(function (err) {
            if (err) {
                defered.reject(err);
            } else {
                defered.resolve();
            }
        });
        return defered.promise;
    };

    ProjectMgr.prototype.setChannel = function (project, channelcfg, cfg){
        var defered = $q.defer();
        var self = this;
        var projectPath = project.__doc.path;
        if (channelcfg.orphan) {
            this.chtool.createChannel(project, channelcfg, cfg, function (err, res) {
                if (err) {
                    defered.reject(err);
                } else {
                    defered.resolve(res);
                }
            })
        } else {
            project.saveChannelCfg(channelcfg.name, cfg, function (err, res) {
                if (err) {
                    defered.reject(err);
                } else {
                    defered.resolve();
                }
            })
        }
        return defered.promise;
    }

    ProjectMgr.prototype.updateSDKCfg = function (project, cfg, sdk) {
        var defered = $q.defer();
        var cfgname = null;
        sdk.updateCfg(cfg);
        project.saveSDKCfg(sdk.name, function (err) {
            if (err) {
                defered.reject(defered);
            } else {
                defered.resolve();
            }
        });
        return defered.promise;
    }

    ProjectMgr.prototype.updateGlobalCfg = function (project, cfg) {
        var defered = $q.defer();
        var self = this;
        project.updateGlobalCfg(cfg, function (err) {
            if (err) {
                defered.reject(defered);
            } else {
                defered.resolve();
            }
        });
        return defered.promise;
    }

    ProjectMgr.prototype.bindProject = function (name, path) {
        var defered = $q.defer();
        var self = this;
        var chameleonPath = self.pathLib.join(path, 'chameleon');
        if (!self.fs.existsSync(chameleonPath)) {
            throw new Error('无法找到Chameleon的工程文件: '+ chameleonPath);
        }
        var chamPrjPath = self.pathLib.join(chameleonPath, 'champroject.json');
        try {
            var projectDetail = JSON.parse(self.fs.readFileSync(chamPrjPath, 'utf-8'));
            var appName = projectDetail.globalcfg.appname;
            var version = projectDetail.version;
            self.db.put({
                _id: Math.round(new Date().getTime()/1000).toString(),
                path: path,
                name: appName,
                version: version
            }, function (err, result) {
                if (err) {
                    $log.log('Fail to put in pouchDB ' + err);
                    return defered.reject(new Error('绑定工程失败: 未知错误'));
                }
                return defered.resolve(result.id);
            });
            return defered.promise;
        } catch (e) {
            $log.log('Fail to read or parse project path');
            throw new Error('解析Chameleon工程文件出错');
        }
    };

    ProjectMgr.prototype.upgradeProject = function (project, force) {
        var defered = $q.defer();
        var self = this;
        var projectPath = project.__doc.path;
        var inputParams = ['upgradeprj'];
        if (force) {
            inputParams.push('-f');
        }
        inputParams.push(projectPath);
        self.runCmd(inputParams, function (err, result) {
            if (err) {
                $log.log('Fail to upgrade prject ' + err);
                return defered.reject(new Error('升级工程失败'));
            }
            defered.resolve();
        });
        return defered.promise;
    };

    ProjectMgr.prototype.upgradeChannel = function (project, channel) {
        var defered = $q.defer();
        var self = this;
        var projectPath = project.__doc.path;
        var inputParams = ['upgradech'];
        inputParams.push(projectPath);
        inputParams.push(channel);
        self.runCmd(inputParams, function (err, result) {
            if (err) {
                $log.log('Fail to upgrade channel ' + err);
                return defered.reject(new Error('升级渠道失败'));
            }
            defered.resolve();
        });
        return defered.promise;
    };


    ProjectMgr.prototype.createProject = function (params) {
        var defered = $q.defer();
        var self = this;
        this.chtool.createProject(params.name, !params.portrait, params.path, params.unity, function (err) {
            if (err) {
                return defered.reject(err);
            }
            var projectDoc = {
                path: params.path,
                name: params.name,
                version: self.chtool.version.toString()
            };
            self.db.insert(projectDoc, function (err, result) {
                if (err) {
                    $log.log('Fail to put in pouchDB ' + err);
                    return defered.reject(new Error('创建工程失败: 未知错误'));
                }
                return defered.resolve(result._id);
            });
        });
        return defered.promise;
    };

    ProjectMgr.prototype.setAndroidPath = function (path) {
        var defered = $q.defer();
        var self = this;
        this.chtool.androidEnv.verifySDKPath(path, function (err) {
            if (err) {
                defered.reject(err);
                return;
            }
            self.chtool.androidEnv.sdkPath = path;
            defered.resolve();
        });
        return defered.promise;
    };

    ProjectMgr.prototype.runCmd = function (inputParams, hasRet, callback) {
        if (typeof(hasRet) === 'function') {
            callback = hasRet;
            hasRet = false;
        }
        $log.log('runcmd ' + this.path + '///' + inputParams.join('///'));
        this.exec('python', [this.path].concat(inputParams), {
		encoding: 'utf8',
		maxBuffer: 200*1024,
                timeout: 30000
            }, function (error, stdout, stderr) {
                $log.log("std out " + stdout);
                $log.log("std err " + stderr);
                if (error) {
                    $log.log("fail to exec python script " + error.code + 
                        error.signal);
                    $log.log("fail to exec python script " + stderr);
                    var e = new Error('执行脚本失败: ' + stderr);
                    e.code= error.code;
                    return callback(e);
                }
                var obj = null;
                if (hasRet) {
                    try {
                        obj = JSON.parse(stdout);
                    } catch (e) {
                        $log.log('fail to parse stdout from cmd ' + stdout);
                        return callback(new Error("执行脚本失败: 未知错误"));
                    }
                } 
                return callback(null, obj);
            }); 
    };

    ProjectMgr.prototype.extractProjectProperty = function (propertyFile) {
        try {
            var p = this.fs.readFileSync(propertyFile, 'utf-8');
            var re = /target\s*=\s*(.+)/m;
            var result = re.exec(p);
            if (result === null) {
                throw new Error();
            }
            return {
                target: result[1]
            };
        } catch (e) {
            $log.log("exception: " + e.message + '\n' + e.stacktrace);
            throw new Error("非法的android工程路径，解析project.properties失败");
        } 
    };

    ProjectMgr.prototype.reloadProject = function () {
        var defered = $q.defer();
        var self = this;
        self.doLoadProject(project.__doc.path, function (err, project) {
            if (err) {
                $log.log(err);
                return defered.reject(err);
            }
            try {
                defered.resolve(project);
            } catch (e) {
                $log.log(e);
                defered.reject(e);
            }
        });
        return defered.promise;
    };

    ProjectMgr.prototype.loadProject = function (projectId) {
        var defered = $q.defer();
        var self = this;
        self.db.findOne({_id: projectId}, function (err, doc) {
            if (err) {
                $log.log('Fail to load project ' + err);
                return defered.reject(new Error('加载工程失败!!'));
            }
            self.doLoadProject(doc.path, function (err, project) {
                if (err) {
                    $log.log(err);
                    return defered.reject(err);
                }
                try {
                    project.__doc = doc;
                    defered.resolve(project);
                } catch (e) {
                    $log.log(e);
                    defered.reject(e);
                }
            });
        });
        return defered.promise;
    };

    ProjectMgr.prototype.doLoadProject = function (prjPath, callback) {
        var self = this;
        self.chtool.loadProject(prjPath, callback);
    };

    ProjectMgr.prototype.updateProjectDoc = function (projectDoc) {
        this.db.update({_id: projectDoc._id}, projectDoc, {});
    };

    ProjectMgr.prototype.getProjectList = function () {
        var defered = $q.defer();
        try {
            this.db.find({}, function(err, response) {
                defered.resolve(response);
            });
        } catch (e) {
            $log.log('Fail to fetch project list ' + e.message);
            setImmediate(function () {
                defered.resolve([]);
            });
        }
        return defered.promise;
    };

    ProjectMgr.prototype.setToolSetting = function (settings) {
        var defered = $q.defer();
        this.exec('python', [this.path, 'setprop','sdk_root', settings.sdk_root], {
                timeout: 100000
            }, function (error, stdout, stderr) {
                if (error) {
                    $log.log("fail to exec python script " + error.code + 
                        error.signal);
                    return defered.reject(error);
                }
                var obj = JSON.parse(stdout);
                return defered.resolve(obj);
            }); 
        return defered.promise;
    };

    return new ProjectMgr();
}])
.factory('WaitingDlg', ['$q', '$modal', function ($q, $modal) {
    var WaitingDlg = function () {
        var self = this;
        this.controller = function ($scope, $modalInstance, data) {
            $scope.tips = data.tips;
            data.p.then(function (x) {
                $modalInstance.close(x);
                return x;
            }, function (x) {
                $modalInstance.dismiss(x);
                return x;
            });
        };
    };

    WaitingDlg.prototype.wait = function (promise, tips) {
        var instance = $modal.open({
            templateUrl: 'partials/waitdlg.html',
            controller: this.controller,
            resolve: {
                data: function () {
                    return {
                        p: promise,
                        tips: tips
                    };
                }
            },
            backdrop: false,
            keyboard: false,
            size: 'sm'
        });
        return instance.result;
    };

    return new WaitingDlg();
}]);



