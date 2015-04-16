'use strict';

/* Controllers */


var chameleonControllers = angular.module('chameleonControllers', ['ui.router']);

chameleonControllers
.controller('ToolInitCtrl', function($scope) {
})
.controller('InitController', function ($scope, $state, $modal, ProjectMgr, WaitingDlg) {
    var promise = ProjectMgr.init();
    promise = WaitingDlg.wait(promise, '初始化工具');
    promise.then(function (chtool) {
        if (chtool.isEnvSet())  {
            $state.go('projectlist');
        } else {
            var instance = $modal.open( {
                templateUrl: 'partials/init.html.orig',
                backdrop: false,
                keyboard: false,
                resolve: {
                    inited: function () {
                        return chtool.isEnvSet();
                    },
                    sdkroot: function () {
                        return '';
                    }
                },
                controller: 'InitDlgController'
            });
            instance.result.then(
                function () {
                    $state.go('projectlist');
                }
            );
        }
    }, function (err) {
        alert(err.message);
        exit();
    })
});

function InitDlgController($scope, $modalInstance, fileDialog, ProjectMgr, inited, sdkroot) {
    $scope.inited = inited;
    $scope.setSDKRoot = function () {
        fileDialog.openDir(function (d) {
            $scope.env.sdk_root = d;
            $scope.$apply();
        })
    }
    $scope.env = {
        sdk_root: sdkroot
    };
    $scope.submit = function () {
        var promise = ProjectMgr.setAndroidPath($scope.env.sdk_root);
        promise.then(function () {
            $modalInstance.close();
        }, function (err) {
            alert(err.message);
        });
    };
    $scope.cancel = function () {
        $modalInstance.dismiss();   
    };
}

chameleonControllers
.controller('ProjectListCtrl', ['$scope', '$state', 'ProjectMgr', '$modal',
  function($scope, $state, ProjectMgr, $modal) {
    $scope.projects = [];
    var promise = ProjectMgr.getProjectList();
    promise.then(
        function (data) {
            $scope.projects = data;        
        }
    );
    $scope.newProject = function () {
        $state.go('newproject');
    };
    $scope.bindProject = function () {
        $state.go('bindproject');
    };

    $scope.selectProject = [];

    $scope.projectTable = {
        data: 'projects',
        columnDefs: [
            {
                displayName: '游戏名称',
                field: 'name',
                width: '20%',
                resizable: false,
                groupable: false
            },
            {
                displayName: '游戏代码路径',
                field: 'path',
                width: '70%',
                resizable: false,
                groupable: false
            },
            {
                displayName: '版本',
                field: 'version',
                width: '10%',
                resizable: false,
                groupable: false
            }
        ],
        multiSelect: false,
        selectedItems: $scope.selectProject,
        showSelectionCheckbox: true,
        showGroupPanel: false,
        beforeSelectionChange: function() {
            return !$scope.compiling;
        },
        rowTemplate: '<div ng-dblclick="onDblClickRow(row)" ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}"><div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div><div ng-cell></div></div>'
    };

    $scope.onDblClickRow = function (row) {
        var project = $scope.projects[row.rowIndex];
        if (project) {
            $state.go('project.globalsdk', 
                {projectId: project._id});
        }
    }

    $scope.openProject = function () {
        if ($scope.selectProject.length > 0) {
            $state.go('project.othersdk', 
                {projectId: $scope.selectProject[0]._id});
        }
    }

    $scope.removeProject = function () {
        angular.forEach($scope.selectProject, function(rowItem) { 
            $scope.projects.splice($scope.projects.indexOf(rowItem),1);
            ProjectMgr.removeProject(rowItem);
        });
    }

 }])
.directive('projectListView', ['$state', function($state) {
    return {
        restrict: 'EA',
        transclude: false,
        templateUrl: 'partials/projecttable.html',
        controller: function ($scope) {
            $scope.showProject = function (project) {
                $state.go('project.globalsdk', {projectId: project._id});
            };
        }
    };
}]);

chameleonControllers
.controller('BindProjectCtrl', ['$scope', '$state', 'ProjectMgr', 'fileDialog',
function ($scope, $state, ProjectMgr, fileDialog) {
    $scope.newProjectPromise = null;
    $scope.project = {
    };
    $scope.msg = "";
    $scope.setPath = function() {
        fileDialog.openDir(function (d) {
            try {
                $scope.project = ProjectMgr.loadTempProject(d);
                $scope.gamePath = d;
                $scope.msg = "";
            } catch (e) {
                $scope.msg = e.message;
            }
            $scope.$apply();
        })
    };
    $scope.bind = function () {
        try {
            $scope.newProjectPromise = ProjectMgr.bindProject($scope.gameName, 
                $scope.gamePath);
            $scope.newProjectPromise.then(
                function (projectId) {
                    console.log('switch to projects' %projectId);
                    $state.go('project.globalsdk', {projectId: projectId});
                }, 
                function (err) {
                    // error handling
                });
        } catch (e) {
            console.log(e);
        }
    };
}]);

chameleonControllers
.controller('NewProjectCtrl', ['$scope', '$state', 'ProjectMgr', 
function ($scope, $state, ProjectMgr) {
    $scope.updatePathName = '(' + function () {
        $scope.pathName = this.files[0];
    }.toString() + ')';
    $scope.newProjectPromise = null;
    $scope.setFiles = function(element) {
        $scope.$apply(function(scope) {
            $scope.gamePath = element.files[0].path;
        }
      );
    };
    $scope.portrait = false; // default use landscape
    $scope.unity = false; // default no unity package
    $scope.force = false; // default no force create
    $scope.create = function () {
        try {
            var params = {
                path: $scope.gamePath,
                name: $scope.gameName,
                portrait: $scope.portrait || false,
                unity: $scope.unity || false,
                force: $scope.force || false
            };
            $scope.newProjectPromise = ProjectMgr.createProject(params);
            $scope.newProjectPromise.then(
                function (projectId) {
                    console.log('switch to projects' %projectId);
                    $state.go('project.globalsdk', {projectId: projectId});
                }, 
                function (err) {
                    alert(err.message);
                });
        } catch (e) {
            console.log(e);
            console.log(e.stack);
        }
    };
}]);

/*
 *  project page controller
 */

chameleonControllers
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('project', {
            abstract: true,
            url: '/project/:projectId',
            templateUrl: 'partials/project.html',
            resolve: {
                project: ['$stateParams', 'ProjectMgr', 'WaitingDlg',
                    function($stateParams, ProjectMgr, WaitingDlg){
                        var promise = ProjectMgr.loadProject($stateParams.projectId);
                        return WaitingDlg.wait(promise, "加载工程中");
                    }]
            },
            controller: ['$scope', '$log', '$stateParams', '$state', '$modal', 'project', 'ProjectMgr', 'WaitingDlg', function (  $scope, $log, $stateParams, $state, $modal, project, ProjectMgr, WaitingDlg) {
                (function InitProject() {
                    $scope.project = project;
                    $scope.projectDoc = project.__doc;
                    $scope.toolversion = ProjectMgr.version
                    $scope.openUpgradePanel = function () {
                        var instance = $modal.open( {
                            templateUrl: 'partials/upgrade.html',
                            controller: 'UpgradeController',
                            backdrop: false,
                            keyboard: false,
                            resolve: {
                                project: function () {
                                    return project;
                                },
                                outdatedChannels: function () {
                                    var oudatedInfos = project.getOutdatedProject()
                                    var res = [];
                                    for (var chname in oudatedInfos) {
                                        var infoObj = oudatedInfos[chname];
                                        var res1 = [];
                                        for (var i in infoObj.libs) {
                                            var sdk = ProjectMgr.sdkset.getChannelSDK(infoObj.libs[i].name);
                                            if (!sdk) {
                                                $log.log('Fail to find sdk for ' + chname);
                                                continue;
                                            }
                                            res1.push({
                                                desc: sdk.desc,
                                                name: infoObj.libs[i].name, 
                                                from: infoObj.libs[i].fromdesc,
                                                to: infoObj.libs[i].todesc
                                            })
                                        }
                                        res.push({
                                            name: chname,
                                            depends: res1,
                                            needReconfig: infoObj.isMajorOutdated
                                        });
                                    }
                                        console.log(res)
                                    return res;
                                }
                            }
                        });
                        instance.result.then(function () {
                            $state.go($state.$current, null, { reload: true });
                        })
                    };

                    $scope.upgradeAndCompile = function () {
                        if ($scope.isOutdated) {
                            alert("请先升级工程");
                            return;
                        }
                        var promise = ProjectMgr.compileProject(
                            $scope.project, $scope.channel.name);
                        promise = WaitingDlg.wait(promise, "编译中");
                        promise.then(function (res) {
                            if (res.code != 0) {
                                $modal.open({
                                   templateUrl: 'partials/logpanel.html',
                                   controller: 'LogPanelController',
                                   resolve: {
                                       logs: function () {
                                            console.log(res.s)
                                           return [res.s];
                                       }
                                   }
                               });
                            }
                            if ($scope.channel.outdated) {
                                ProjectMgr.upgradeChannel($scope.project, 
                                    $scope.channel.name);
                                $scope.channel.outdated = null;
                                delete $scope.project.outdatedChannels[$scope.channel.name]
                                for (var i in $scope.channels) {
                                    if ($scope.channels[i].name == $scope.channel.name) {
                                        $scope.channels[i].outdated = null;
                                        $scope.channels[i].data.outdated = null;
                                        break;
                                    }
                                }
                            } 
                        });
                         
                    }
                })();

                (function InitTabMgr() {
                    $scope.tab = [
                        {
                            active: true
                        },
                        {
                            active: false
                        }
                    ];
                })();
                // sign manipulation
                $scope.getSignDesc = function () {
                    var pathLib = require('path');
                    if ($scope.selectedsdk && $scope.selectedsdk.signcfg) {
                        return pathLib.basename($scope.selectedsdk.signcfg.keystroke);
                    } else {
                        return '未设定签名配置';
                    }
                };

                $scope.setSignCfg = function () {
                    var instance = $modal.open( {
                        templateUrl: 'partials/setsign.html',
                        controller: 'SetSignController',
                        backdrop: false,
                        keyboard: false,
                        resolve: {
                            signcfg: function () {
                                var signcfg = null;
                                if (!$scope.selectedsdk.signcfg) {
                                    signcfg = {
                                        keystroke: '',
                                        keypass: '',
                                        storepass: '',
                                        alias: ''
                                    };
                                } else {
                                    var pathLib = require('path');
                                    if (!$scope.selectedsdk.signcfg.keystroke) {
                                        var keystroke = '';
                                    } else  {
                                        var keystroke = pathLib.join($scope.projectDoc.path, $scope.selectedsdk.signcfg.keystroke);
                                    }
                                    signcfg = {
                                        keystroke: keystroke,
                                        keypass: $scope.selectedsdk.signcfg.keypass,
                                        storepass: $scope.selectedsdk.signcfg.storepass,
                                        alias: $scope.selectedsdk.signcfg.alias
                                    };
                                }
                                return signcfg;
                            }
                        }
                    });
                    instance.result.then(function (signcfg) {
                        var pathLib = require('path');
                        var relpath = pathLib.relative($scope.projectDoc.path,
                            signcfg.keystroke);
                        if (pathLib.sep !== '/') {
                            relpath = relpath.split(pathLib.sep).join('/');
                        }
                        signcfg.keystroke = relpath;
                        var promise = ProjectMgr.updateSignCfg(
                            $scope.project,
                            null,
                            signcfg);
                        promise = WaitingDlg.wait(promise, "更新签名配置");
                        promise.then(function (obj) {
                            $scope.selectedsdk.signcfg = signcfg;
                            project.updateSignCfg(
                                null,
                                signcfg);
                        }, function (err) {
                            // TODO: error handling
                        });
                    }, function () {
                        console.log('dialog dismissed');
                    });
                };

                // compile dialog
                $scope.openBuildDialog = function () {
                    var instance = $modal.open( {
                        templateUrl: 'partials/buildproject.html',
                        controller: 'BuildProjectController',
                        size: 'lg',
                        resolve: {
                            project: function () {
                                return project;
                            }
                        },
                        backdrop: false,
                        keyboard: false
                    });
                };

                // show server management
                $scope.openServerDialog = function () {
                    var instance = $modal.open( {
                        templateUrl: 'partials/serverinfo.html',
                        controller: 'ManageServerController',
                        size: 'lg',
                        backdrop: false,
                        keyboard: false,
                        resolve: {
                            project: function () {
                                return project;
                            }
                        }
                    });
                    instance.result.then(function (serverInfoStat) {
                        if (serverInfoStat) {
                            var doc = project.__doc;
                            doc.svrinfo = serverInfoStat;
                            ProjectMgr.updateProjectDoc(doc);
                        }
                    });
                };

                $scope.selectSDKPanel = function () {
                    if (!$scope.selectedsdk) {
                        return;
                    }
                    if ($scope.selectedsdk.data) {
                        var params = {
                            sdkname: $scope.selectedsdk.data.sdkid,
                        };
                        $state.go('project.othersdk', params);
                    } else {
                        $state.go('project.globalsdk');
                    }
                };

                $scope.selectChannelPanel = function () {
                    $state.go('project.channel');
                };


                (function SettingUpChTable () {
                    $scope.channels = [];
                    var projectIcons =
                        ProjectMgr.loadIcon(project.prjPath, project.am.getIcon());
                    var channels = project.getAllChannels();
                    for (var i in channels) {
                    /*
                        $scope.channels.push({
                            desc: ProjectMgr.sdkset.getChannelDesc(project.channels[i].name),
                            isnew: project.channels[i].isnew,
                            name: project.channels[i].name,
                            outdated: project.channels[i].outdated,
                            data: project.channels[i]
                        });
                        */
                        $scope.channels.push(channels[i]);
                    }
                    
                    $scope.channel = null;
                    var selectedChannel = [];
                    var initShownChannel = function (nowChannel) {
                        if (project.orient === 'portrait') {
                            var scHeight = 180;
                            var scWidth = 120;
                        } else {
                            var scHeight = 120;
                            var scWidth = 180;
                        }
                        var iconshown = nowChannel.shownIcon;
                        if (!iconshown) {
                            iconshown = projectIcons['medium'] || projectIcons['high'] || projectIcons['xhigh'];
                        }
                        var sdk = null;
                        if (nowChannel.userSDK) {
                            sdk = project.getSDKCfg(nowChannel.userSDK);
                        }
                        $scope.channel = {
                            desc: nowChannel.desc,
                            splashscreen: nowChannel.splashscreen,
                            sdk: sdk,
                            data: nowChannel,
                            scWidth: scWidth,
                            scHeight: scHeight,
                            iconshown: iconshown,
                            icons: nowChannel.icons,
                            packageName: project.am.getPkgName() + nowChannel.packageName
                        };
                    }
                    $scope.installedChTable = {
                        data: 'channels',
                        columnDefs: [
                            {
                                displayName: '渠道列表',
                                field: 'desc',
                                width: '*',
                                resizable: false,
                                groupable: false
                            }
                        ],
                        multiSelect: false,
                        selectedItems: selectedChannel,
                        showSelectionCheckbox: false,
                        showGroupPanel: false,
                        showFooter: false,
                        afterSelectionChange: function () {
                            if (selectedChannel.length <= 0) {
                                return;
                            }
                            var nowChannel = selectedChannel[0];
                            initShownChannel(nowChannel);
                            $state.go('project.channel');
                        },
                        rowTemplate: '<div style="height: 100%" ng-class="{red: row.getProperty(\'outdated\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
                    };
                    $scope.count = 0;
                    var gridEventHandler = null;
                    $scope.$on('ngGridEventData', function(event) {
                        if (!event.targetScope.tab[1].active || 
                            $scope.installedChTable.gridId != event.targetScope.gridId) {
                            return;
                        }
                        /* something is rendered and nothing is selected */
                        if (event.targetScope.renderedRows.length > 0 && 
                            event.targetScope.selectedItems.length === 0) {
                            event.targetScope.selectionProvider.setSelection(
                                event.targetScope.renderedRows[0], true);
                        } else if (gridEventHandler) {
                            gridEventHandler();
                            gridEventHandler = null;
                        }
                    });

                    $scope.saveChannel = function () {
                        try {
                            $scope.channel.payLib = $scope.channel.sdk;
                            $scope.channel.userLib = $scope.channel.sdk;
                            var promise = ProjectMgr.setChannel(
                                project, $scope.channel.data, $scope.channel);
                            promise = WaitingDlg.wait(promise, '更新配置中');
                            promise.then(function (newcfg) {
                                delete $scope.channel.isdirty;
                            }, function (e) {
                                alert(e.message);
                            });
                        } catch (e) {
                            alert(e.message);
                        }
                    }
                    
                    $scope.selectChannelSDK = function () {
                        var instance = $modal.open( {
                            templateUrl: 'partials/selectsdk.html',
                            controller: 'SelectChannelController',
                            size: 'lg',
                            backdrop: false,
                            keyboard: false,
                            resolve: {
                                allsdks: function () {
                                    var sdks = project.getAllSDKs();
                                    var res = [];
                                    var requiredSDK = 
                                        $scope.channel.data.requiredSDK;
                                    for (var i in sdks) {
                                        if (sdks[i].sdkid === requiredSDK) {
                                            res.push(sdks[i]);
                                        }
                                    }
                                    return res;
                                }
                            }
                        });
                        instance.result.then(function (sdk) {
                            if (!$scope.channel.sdk ||
                                $scope.channel.sdk.name !== sdk.name) {
                                $scope.channel.isdirty = true;
                                $scope.channel.sdk = sdk;
                            }
                        }, function () {
                            console.log('dialog dismissed');
                        });
                    };

                    $scope.selectSpashScreen = function () {
                        var instance = $modal.open( {
                            templateUrl: 'partials/selectSplash.html',
                            controller: 'SelectSplashController',
                            size: 'lg',
                            backdrop: false,
                            keyboard: false,
                            resolve: {
                                images: function () {
                                    var obj = $scope.channel.data.metaInfo;
                                    var images = obj.getSplashScreen(
                                        project.orient);
                                    return images;
                                },
                                orient: function () {
                                    return project.orient;
                                }
                            }
                        });
                        instance.result.then(function (image) {
                            $scope.channel.splashscreen = image.path;
                            $scope.channel.splashscreenToCp = image;
                            $scope.channel.isdirty = true;
                        }, function () {
                            console.log('dialog dismissed');
                        });
                    };

                    $scope.selectIcon = function () {
                        var icons = projectIcons;
                        var images = $scope.channel.data.metaInfo.getIconOverlay(icons);
                        var instance = $modal.open( {
                            templateUrl: 'partials/selectIcon.html',
                            controller: 'SelectIconController',
                            size: 'lg',
                            backdrop: false,
                            keyboard: false,
                            resolve: {
                                images: function () {
                                    return images;
                                },
                                config: function () {
                                    if (!$scope.channel.icons) {
                                        return {
                                            position: 3
                                        };
                                    }
                                    return $scope.channel.icons;
                                },
                                project: function () {
                                    return $scope.project;
                                }
                            }
                        });
                        instance.result.then(function (infos) {
                            $scope.channel.icons = infos;
                            $scope.channel.iconshown = null;
                            $scope.channel.iconshown = 
                                infos.tempicons['medium'] || 
                                infos.tempicons['high'] ||
                                infos.tempicons['xhigh'];
                            $scope.channel.isdirty = true;

                        }, function () {
                            console.log('dialog dismissed');
                        });
                    }


                    $scope.addChannel = function () {
                        var instance = $modal.open( {
                            templateUrl: 'partials/addchannel.html',
                            controller: 'AddChannelController',
                            size: 'lg',
                            backdrop: false,
                            keyboard: false,
                            resolve: {
                                channels: function () {
                                    var channels = ProjectMgr.getAllChannels();
                                    var installedChannels = 
                                        $scope.channels.map(function (x) {
                                            return x.name;
                                    });
                                    var uninstalled = 
                                        channels.filter(function (x) { 
                                            for (var i in installedChannels) {
                                                if (installedChannels[i] === x.name) {
                                                    return false;
                                                }
                                            }
                                            return true;
                                    });
                                    return uninstalled;
                                }
                            }
                        });
                        instance.result.then(function (channel) {
                            var newChannel = ProjectMgr.newChannel(project, channel.name);
                            $scope.channels.push(newChannel);
                            var l = $scope.channels.length-1;
                            gridEventHandler = function () {
                                $scope.installedChTable.selectRow(
                                    l, true);
                            };
                        }, function () {
                            console.log('dialog dismissed');
                        });
                    };
                })();

                (function SettingUpSDKTable() {
                    $scope.selectedsdk = null;
                    var sdkset = project.getAllSDKs();
                    $scope.sdks = [{
                        'desc': '全局配置'
                    }];
                    for (var i in sdkset) {
                        $scope.sdks.push(sdkset[i]);
                    }
                    var selected = [];
                    $scope.installedSDKTable = {
                        data: 'sdks',
                        columnDefs: [
                            {
                                displayName: 'SDK列表',
                                field: 'desc',
                                width: '*',
                                resizable: false,
                                groupable: false
                            }
                        ],
                        multiSelect: false,
                        selectedItems: selected,
                        showSelectionCheckbox: false,
                        showGroupPanel: false,
                        showFooter: false,
                        afterSelectionChange: function () {
                            if (selected.length <= 0) {
                                return;
                            }
                            var sdk = selected[0];
                            if (sdk.sdkid) {
                                var params = {
                                    sdkname: sdk.sdkid
                                };
                                var cfg = sdk.cloneCfg();
                                console.log(cfg)
                                $scope.selectedsdk = {
                                    cfg: cfg,
                                    data: sdk,
                                    name: sdk.desc,
                                    outdated: false,
                                    updateFunc: function () {
                                        return ProjectMgr.updateSDKCfg(
                                            project, cfg, sdk);
                                    }
                                };
                                $state.go('project.othersdk', params);
                            } else {
                                var cfg = project.cloneGlobalCfg();
                                $scope.selectedsdk = {
                                    cfg: cfg,
                                    signcfg: project.getSignCfg(),
                                    desc: '全局配置',
                                    isnew: false,
                                    outdated: false,
                                    updateFunc: function () {
                                        return ProjectMgr.updateGlobalCfg(project, 
                                            cfg);
                                    }
                                };
                                $state.go('project.globalsdk');
                            }
                        },
                        rowTemplate: '<div style="height: 100%" ng-class="{red: row.getProperty(\'outdated\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
                    };
                    var gridEventHandler = null;
                    $scope.$on('ngGridEventData', function(event) {
                        if (!event.targetScope.tab[0].active || 
                            $scope.installedSDKTable.gridId != event.targetScope.gridId) {
                            return;
                        }
                        /* something is rendered and nothing is selected */
                        if (event.targetScope.renderedRows.length > 0 && 
                            event.targetScope.selectedItems.length === 0) {
                            event.targetScope.selectionProvider.setSelection(
                                event.targetScope.renderedRows[0], true);
                        } else if (gridEventHandler) {
                            gridEventHandler();
                            gridEventHandler = null;
                        }
                    });

                    $scope.addSDK = function () {
                        var instance = $modal.open( {
                            templateUrl: 'partials/addsdk.html',
                            controller: 'AddSDKController',
                            size: 'lg',
                            backdrop: false,
                            keyboard: false,
                            resolve: {
                                supportedSDK: function () {
                                    return ProjectMgr.getSupportedDKs();
                                }
                            }
                        });
                        instance.result.then(function (info) {
                            var promise =
                                ProjectMgr.newSDK(project, info.sdk.name, info.desc);
                            promise = WaitingDlg.wait(promise, '创建新的SDK配置');
                            promise.then(function (sdkcfg) {
                                $scope.sdks.push(sdkcfg);
                                var l = $scope.sdks.length-1;
                                gridEventHandler = function () {
                                    $scope.installedSDKTable.selectRow(
                                        l, true);
                                };
                            }, function (err) {
                                alert(err.message);
                            });
                        }, function () {
                            console.log('dialog dismissed');
                        });
                    };

                    $scope.updateCurrentCfg = function () {
                        var sdk = $scope.selectedsdk;
                        var promise = sdk.updateFunc();
                        promise = WaitingDlg.wait(promise, '更新配置中');
                        promise.then(function () {
                        }, function (e) {
                            alert(e.message);
                        });
                    };
                })();

            }]
        })
        .state('project.globalsdk', {
            url: '/sdk/globalsdk',
            templateUrl: 'partials/channelglobalcfg.html'
        })
        .state('project.othersdk', {
            url: '/sdk/:sdkname',
            templateUrl: function ($stateParams) {
                var fs = require('fs');
                var filename = 'partials/channels/' + $stateParams.sdkname + '.html';
                if (fs.existsSync(filename)) {
                    return filename;
                } else {
                    return 'partials/sdkdefault.xml';
                }
            }
        })
        .state('project.channel', {
            url: '/channel/:channelname',
            templateUrl: 'partials/channeldefault.html'
        })
}]);

function AddSDKController($scope, $modalInstance, supportedSDK) {
    $scope.selected = [];
    $scope.info = {
        desc: ''
    };
    $scope.addSDK = function () {
        $modalInstance.close({
            sdk: $scope.selected[0],
            desc: $scope.info.desc
        });
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.supportedSDK = [];
    for (var i in supportedSDK) {
        $scope.supportedSDK.push(supportedSDK[i]);
    }
    $scope.gridOptions = {
        data: 'supportedSDK',
        columnDefs: [
            {
                displayName: '支持的SDK',
                field: 'desc',
                width: '*',
                resizable: false,
                groupable: false
            }
        ],
        multiSelect: false,
        selectedItems: $scope.selected,
        showSelectionCheckbox: false,
        showGroupPanel: false,
        showFooter: false

    };
    window.setTimeout(function(){
        $(window).resize();
        $(window).resize();
    }, 100);
}

function SplashScreenController ($scope, $modalInstance, scData, landscape) {
    $scope.curimg = null;
    $scope.scData = scData;
    var self = this;
    this.table = {
        data: 'scData',
        columnDefs: [
            {
                displayName: '图片',
                field: 'path',
                width: '70%',
                resizable: false,
                groupable: false
            },
            {
                displayName: '持续时间',
                field: 'duration',
                width: '20%',
                resizable: false,
                groupable: false
            }
        ],
        multiSelect: false,
        selectedItems: self.curimg,
        showSelectionCheckbox: false,
        showGroupPanel: false,
        showFooter: false
    };
    if (landscape) {
        this.width = 480;     
        this.height = 320;     
    } else {
        this.height = 480;     
        this.width = 320;     
    }

    $scope.addImage = function () {
    };

    $scope.removeImage = function () {
    };
}

function IconDlgController ($scope, $modalInstance, project) {
}


var UpgradeController = function ($scope, $modalInstance, project, 
                                  outdatedChannels, ProjectMgr) {
    $scope.outdatedChannelData = outdatedChannels;
    $scope.outdatedChannels = {
        data: 'outdatedChannelData',
        columnDefs: [
            {
                displayName: '渠道列表',
                field: 'name',
                width: '30%',
                resizable: false,
                groupable: false
            },
            {
                displayName: 'SDK状态',
                field: 'depends',
                width: '70%',
                resizable: false,
                groupable: false,
                cellTemplate: '<div><div ng-repeat="d in row.entity[col.field]">{{d.desc}}({{d.from}} => {{d.to}}),</div></div>',
            }
        ],
        multiSelect: false,
        selectedItems: $scope.selected,
        showSelectionCheckbox: false,
        showGroupPanel: false,
        showFooter: false,
        rowTemplate: '<div style="height: 100%" ng-class="{outdated_reconfig: row.getProperty(\'needReconfig\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
    };

    $scope.upgrade = function () {
        var promise = ProjectMgr.upgradeProject(project);
        promise.then(function () {
            var promise = ProjectMgr.reloadProject(project);
            promise.then(function () {
                $modalInstance.close();
            });
        }, function () {
            
        });
    }
}

var SetSignController = function ($scope, $modalInstance, signcfg) {
    $scope.signcfgModel = signcfg;
    $scope.commit = function () {
        $modalInstance.close($scope.signcfgModel);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };

    $scope.setFiles = function(element) {
        $scope.$apply(function(scope) {
            $scope.signcfgModel.keystroke = element.files[0].path;
        }
      );
    };
};


var AddChannelController = function ($scope, $modalInstance, channels) {
    $scope.selected = [];
    $scope.addChannel = function () {
        $modalInstance.close($scope.selected[0]);
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.channels = channels;
    $scope.gridOptions = {
        data: 'channels',
        columnDefs: [
            {
                displayName: '未安装的渠道',
                field: 'desc',
                width: '*',
                resizable: false,
                groupable: false
            }
        ],
        multiSelect: false,
        selectedItems: $scope.selected,
        showSelectionCheckbox: false,
        showGroupPanel: false,
        showFooter: false

    };
    window.setTimeout(function(){
        $(window).resize();
        $(window).resize();
    }, 100);
};

/*
chameleonControllers
.controller('ProjectDetailCtrl', ['$scope', '$stateParams', '$state',
    'ProjectMgr', function($scope, $stateParams, $state, ProjectMgr) {
    console.log($stateParams)
    var projectPromise = ProjectMgr.loadProject($stateParams.projectId)
    $scope.project = null;
    projectPromise.then(function(obj) {
        $scope.project = obj;
        $scope.showChannel = function (channelName) {
            var params = {
                template: 'partials/channelglobalcfg.html',
                name: channelName
            }
            $state.go('channels', params);
        }
    }, function (err) {
        // TODO: error handling
    });

  }]);
*/

chameleonControllers
.controller('ChannelCfgController', ['$scope', '$stateParams',
    'ProjectMgr', function($scope, $stateParams, ProjectMgr) {
        console.log($stateParams);
  }]);

function BuildProjectController($scope, $modalInstance, $modal, project, ProjectMgr) {
    $scope.channels = [];
    var channels = project.getAllChannels();
    for (var i in channels) {
        $scope.channels.push({
            name: channels[i].name,
            status: 0
        });
    }
    $scope.compiling = false;    
    $scope.selectedChannels = [];
    $scope.channelTable = {
        data: 'channels',
        columnDefs: [
            {
                displayName: '渠道列表',
                field: 'name',
                width: '70%',
                resizable: false,
                groupable: false
            },
            {
                displayName: '状态',
                field: 'status',
                width: '30%',
                resizable: false,
                groupable: false,
                cellTemplate: '<div ng-show="row.entity[col.field] === 0"></div><div ng-show="row.entity[col.field] == 1"><img src="partials/ajax-loader.gif">编译中</div><div ng-show="row.entity[col.field] === 2"><img src="partials/tick_circle.png">编译完成</div><div ng-show="row.entity[col.field] === 3"><img src="partials/fails.png">编译失败</div>',
            }
        ],
        multiSelect: true,
        selectedItems: $scope.selectedChannels,
        showSelectionCheckbox: true,
        showGroupPanel: false,
        showFooter: true,
        beforeSelectionChange: function() {
            return !$scope.compiling;
        },
        footerTemplate: '<div class="ngTotalSelectContainer" ><div class="ngFooterTotalItems" ng-class="{\'ngNoMultiSelect\': !multiSelect}" ><span class="ngLabel">总渠道数 {{maxRows()}}</span></div><div class="ngFooterSelectedItems" ng-show="multiSelect"><span class="ngLabel">选中的渠道数 {{selectedItems.length}}</span></div></div>'
    };
    $scope.close = function () {
        $modalInstance.close();
    };
    $scope.isCollapsed = true;
    $scope.compileInfo = [];
    $scope.result = [];
    var showResult = function (r) {
        if (r.code == 0) {
            return '编译'+r.target+'成功';
        } else {
            return '编译'+r.target+'失败:\n' + r.s;
        }
    };
    $scope.showBuildLog = function () {
        $modal.open({
            templateUrl: 'partials/logpanel.html',
            controller: 'LogPanelController',
            resolve: {
                logs: function () {
                    return $scope.result.map(showResult);
                }
            }
        });
    };
    $scope.startCompile = function () {
        $scope.result = [];
        $scope.compiling = true;
        var compileQueue = $scope.selectedChannels.map(function (x) { return x.name;});
        var cpunum = require('os').cpus().length;
        var nowPos = 0;
        var pendingPromise = [];
        var doneCallback = function () {
            $scope.compiling = false;
        };
        var promiseDoneFunc = function (compileResult) {
            for (var i in $scope.channels) {
                if ($scope.channels[i].name === compileResult.target) {
                    if (compileResult.code !== 0) {
                        $scope.channels[i].status = 3;
                    } else {
                        $scope.channels[i].status = 2;
                    }
                    break;
                }
            }
            $scope.result.push(compileResult);
            doUntilDone();
        };
        var doUntilDone = function () {
            if (nowPos >= compileQueue.length) {
                if (pendingPromise.length === 0) {
                    return doneCallback();
                } else {
                    return;
                }
            }
            for (var i = pendingPromise.length; i < cpunum; ++i) {
                var target = compileQueue[nowPos];
                var promise = ProjectMgr.compileProject(project, target);
                promise.then(promiseDoneFunc);
                for (var i in $scope.channels) {
                    if ($scope.channels[i].name === target) {
                        $scope.channels[i].status = 1;
                    }
                }
                nowPos += 1;
                if (nowPos >= compileQueue.length) {
                    break;
                }
            }
        };
        doUntilDone();
    };
}


function LogPanelController($scope, $modalInstance, logs) {
    $scope.logs = logs;
}

function ManageServerController($scope, $modalInstance, $log, project, ProjectMgr, fileDialog) {
    $scope.svrinfo = project.__doc.svrinfo;
    if (!$scope.svrinfo) {
        $scope.svrinfo  = {
            nick: project.__doc._id.toString(),
            paycbUrl: ''
        };
    }
    
    $scope.close = function (dirty) {
        if (dirty) {
            $modalInstance.close({
                nick: $scope.svrinfo.nick,
                paycbUrl: $scope.svrinfo.paycbUrl
            })
        } else {
            $modalInstance.dismiss();
        }
    }

    $scope.openDump = function () {
        console.log($scope);
    }
    $scope.outputfile = ($scope.svrinfo.nick || $scope.prjid) + '.zip';
    $scope.project = project;
    var l = [];
    var channels = project.getAllChannels();
    for (var i in channels) {
        l.push(channels[i].desc);
    }
    $scope.channels = l.join(', ');

    $scope.setFiles = function(element) {
        $scope.$apply(function(scope) {
            $scope.gamePath = element.files[0].path;
        }
      );
    };
    $scope.dumpServerCfg = function () {
        var nick = project.__doc._id;
        if ($scope.svrinfo.nick) {
            nick = $scope.svrinfo.nick;
        }
        var AdmZip = require('adm-zip'); 
        var url = require('url');
        try {
            var zip = new AdmZip();
            var obj = url.parse($scope.svrinfo.paycbUrl);
            var host = obj.protocol+'//'+obj.host;
            var pathname = obj.pathname;
            var productCfg = {
                appcb: {
                    host: host,
                    payCbUrl: pathname
                }
            };
            zip.addFile(nick+'/product.json', 
                new Buffer(JSON.stringify(productCfg)), "");
            var channels = project.getAllChannels();
            for (var c in channels) {
                var ch = channels[c];
                var sdkName = ch.userSDK;
                var sdk = project.getSDKCfg(sdkName);
                if (sdk) {
                    zip.addFile(nick+'/'+ch.name+'.json', 
                        new Buffer(JSON.stringify(sdk.cloneCfg())), "");
                }
            }
            fileDialog.saveAs(function (filename) {
                zip.writeZip(filename+'.zip');
                alert('保存成功');
            }, $scope.svrinfo.nick+'.zip');
        } catch (e) {
            $log.log('Fail to output svr config ');
            $log.log(e);
            alert('导出失败: 未知错误');
        }
    };
    console.log($scope)
}

function SelectChannelController($scope, $modalInstance, allsdks) {
    $scope.selected = [];
    $scope.useSDK = function () {
        $modalInstance.close($scope.selected[0]);
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.allsdks = allsdks;
    $scope.gridOptions = {
        data: 'allsdks',
        columnDefs: [
            {
                displayName: '现有的SDK配置',
                field: 'desc',
                width: '*',
                resizable: false,
                groupable: false
            }
        ],
        multiSelect: false,
        selectedItems: $scope.selected,
        showSelectionCheckbox: false,
        showGroupPanel: false,
        showFooter: false

    };
    window.setTimeout(function(){
        $(window).resize();
        $(window).resize();
    }, 100);
}

function SelectSplashController($scope, $modalInstance, orient, images) {
    $scope.selected = [];
    $scope.useImage = function () {
        $modalInstance.close($scope.selected[0]);
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.images = images;
    if (orient === 'portrait') {
        $scope.width = 240;
        $scope.height = 360;
    } else {
        $scope.width = 360;
        $scope.height = 240;
    }
    $scope.url = null;
    $scope.gridOptions = {
        data: 'images',
        columnDefs: [
            {
                displayName: '现有的SDK配置',
                field: 'desc',
                width: '*',
                resizable: false,
                groupable: false
            }
        ],
        multiSelect: false,
        selectedItems: $scope.selected,
        showSelectionCheckbox: false,
        showGroupPanel: false,
        showFooter: false,
        afterSelectionChange: function () {
            if ($scope.selected.length <= 0) {
                return;
            }
            $scope.url = $scope.selected[0].path;
        }
    };
    window.setTimeout(function(){
        $(window).resize();
        $(window).resize();
    }, 100);
}

function SelectIconController($scope, $modalInstance, ProjectMgr, project, images, config) {
    $scope.url = null;
    $scope.selectedPosition = config.position;
    $scope.shownimages = {
        image: images,
        selected: {
            position: config.position
        }
    }
    $scope.dump = {}; 
    $scope.useImage = function () {
        var tempgenIcon = {};
        for (var i in images) {
            tempgenIcon[i] = ProjectMgr.getTempFile(project, 
                'icon-'+i+'-'+$scope.shownimages.selected.position+'.png');
        }
        $scope.dump.func(tempgenIcon);
        $modalInstance.close({
            position: $scope.shownimages.selected.position,
            tempicons: tempgenIcon
        });
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    }
    window.setTimeout(function(){
        $(window).resize();
        $(window).resize();
    }, 100);
}



