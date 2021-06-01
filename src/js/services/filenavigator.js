(function (angular) {
    'use strict';
    angular.module('FileManagerApp').service('fileNavigator', [
        'apiMiddleware', 'fileManagerConfig', 'item', function (ApiMiddleware, fileManagerConfig, Item) {

            var FileNavigator = function () {
                this.apiMiddleware = new ApiMiddleware();
                this.requesting = false;
                this.fileList = [];
                this.currentPath = this.getBasePath();
                this.history = [];
                this.error = '';
                this.rootFolderDetails = {};

                this.onRefresh = function () { };
            };

            FileNavigator.prototype.getBasePath = function () {
                var path = (fileManagerConfig.basePath || '').replace(/^\//, '');
                return path.trim() ? path.split('/') : [];
                // var path = fileManagerConfig.basePath;
                // return path;
            };

            FileNavigator.prototype.getRootPath = function () {
                let isRootPath = false;
                if(!this.currentPath || this.currentPath.length == 0)
                    isRootPath = true;
                else if(this.currentPath.slice(-1)[0] == "khalil")
                    isRootPath = true;
                return isRootPath;
            };

            FileNavigator.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {
                if (!data || typeof data !== 'object') {
                    this.error = 'Error %s - NFS service is not reachable.'.replace('%s', code);
                }
                if (code == 404) {
                    this.error = 'Error 404 - NFS service is not reachable.';
                }
                if (code == 200) {
                    this.error = null;
                }
                if (!this.error && data.result && data.result.error) {
                    this.error = data.result.error;
                }
                if (!this.error && data.error) {
                    this.error = data.error.message;
                }
                if (!this.error && defaultMsg) {
                    this.error = defaultMsg;
                }
                if (this.error) {
                    return deferred.reject(data);
                }
                return deferred.resolve(data);
            };

            FileNavigator.prototype.list = function () {
                console.log('currentPath', this.currentPath);
                return this.apiMiddleware.list(this.currentPath, this.deferredHandler.bind(this));
            };

            FileNavigator.prototype.refresh = function () {
                var self = this;
                // if (!self.currentPath.length) {
                //     self.currentPath = this.getBasePath();
                // }
                //var path = self.currentPath.join('/');
                // console.log('path', path);
                self.requesting = true;
                self.fileList = [];
                return self.list().then(function (data) {
                    // console.log('data', data);
                    // self.fileList = (data.result || []).map(function (file) {
                    //     return new Item(file, self.currentPath);
                    // });
                    //self.currentPath = data.path;
                    

                    fileManagerConfig.basePath = data.path;
                    self.currentPath = self.getBasePath();
                    var path = self.currentPath.join('/');
                    self.rootFolderDetails = new Item (data.fileDetails, self.currentPath);
                    self.fileList = (data.children || []).map(function (file) {
                        return new Item(file, self.currentPath);
                    });
                    // self.fileList = [{
                    //     date: "2020-03-03 15:31:40",
                    //     name: "appcompat",
                    //     rights: "-rw-r--r--",
                    //     size: 0,
                    //     type: "dir"
                    // }]
                    // console.log('fileList', self.fileList);
                    self.buildTree(path);
                    self.onRefresh();
                }).finally(function () {
                    self.requesting = false;
                });
            };

            FileNavigator.prototype.buildTree = function (path) {
                var flatNodes = [], selectedNode = {};

                function recursive(parent, item, path) {
                    var absName = path ? (path + '/' + item.model.fileName) : item.model.fileName;
                    if (parent.filePath && parent.filePath.trim() && path.trim().indexOf(parent.filePath) !== 0) {
                        parent.nodes = [];
                    }
                    if (parent.filePath !== path) {
                        parent.nodes.forEach(function (nd) {
                            recursive(nd, item, path);
                        });
                    } else {
                        for (var e in parent.nodes) {
                            if (parent.nodes[e].filePath === absName) {
                                return;
                            }
                        }
                        parent.nodes.push({ item: item, filePath: absName, nodes: [] });
                    }

                    parent.nodes = parent.nodes.sort(function (a, b) {
                        return a.filePath.toLowerCase() < b.filePath.toLowerCase() ? -1 : a.filePath.toLowerCase() === b.filePath.toLowerCase() ? 0 : 1;
                    });
                }

                function flatten(node, array) {
                    array.push(node);
                    for (var n in node.nodes) {
                        flatten(node.nodes[n], array);
                    }
                }

                function findNode(data, path) {
                    return data.filter(function (n) {
                        return n.filePath === path;
                    })[0];
                }

                //this.history[0].nodes = [];

                //!this.history.length && this.history.push({name: '', nodes: []});
                !this.history.length && this.history.push({ item: this.rootFolderDetails, filePath: path, nodes: [] });
                flatten(this.history[0], flatNodes);
                selectedNode = findNode(flatNodes, path);
                selectedNode && (selectedNode.nodes = []);

                for (var o in this.fileList) {
                    var item = this.fileList[o];
                    item instanceof Item && recursive(this.history[0], item, path);
                }
            };

            FileNavigator.prototype.folderClick = function (item) {

                // console.log('item', item);
                this.currentPath = [];
                if (item && item.isFolder()) {
                    this.currentPath = item.model.filePath; //item.model.fullPath().split('/').splice(1);
                    // console.log('this.currentPath', this.currentPath);
                }
                if (item.model.id) {
                    fileManagerConfig.queryParams = `?fileId=${item.model.id}`;
                } else {
                    this.fileList = [];
                    return
                }
                this.refresh();
            };

            FileNavigator.prototype.upDir = function () {
                if (this.currentPath) { //this.currentPath[0]
                    //this.currentPath = this.currentPath.slice(0, -1);
                    this.refresh();
                }
            };

            FileNavigator.prototype.goTo = function (index) {
                this.currentPath = this.currentPath.slice(0, index + 1);
                fileManagerConfig.queryParams = `?targetPath=${this.currentPath.join('/')}`;
                this.refresh();
            };

            FileNavigator.prototype.fileNameExists = function (fileName) {
                return this.fileList.find(function (item) {
                    return fileName && item.model.fileName.trim() === fileName.trim();
                });
            };

            FileNavigator.prototype.listHasFolders = function () {
                return this.fileList.find(function (item) {
                    return item.model.isFile === false;
                });
            };

            FileNavigator.prototype.getCurrentFolderName = function () {
                return this.currentPath.slice(-1)[0] || '/';
            };

            return FileNavigator;
        }]);
})(angular);
